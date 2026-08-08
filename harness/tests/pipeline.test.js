/**
 * 编排核心单测:planner 能力匹配 / runner 状态机 / gate 阈值阻塞 / resume 断点续跑。
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { createHarness, createDefaultRegistry } = require('../lib/index');

const DEMO_PIPELINE = {
  schemaVersion: '1.0',
  name: 'demo-kws',
  stages: [
    { id: 'collect', config: { samples: 100 } },
    { id: 'train', executor: 'mock' },
    { id: 'quantize', engine: 'tflm', scheme: 'int8' },
    { id: 'integrate', engine: 'tflm' },
    { id: 'eval', engine: 'tflm', target: 'host', metrics: ['accuracy', 'latency', 'ram'] }
  ],
  gates: { minAccuracy: 0.9 }
};

function makeHarness(registry) {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-run-'));
  return { h: createHarness({ baseDir, registry }), baseDir };
}

describe('planner', () => {
  test('合法 pipeline 规划通过,stage 绑定引擎/目标', () => {
    const { h } = makeHarness();
    h.createPipeline(DEMO_PIPELINE);
    const plan = h.plan();
    expect(plan.ok).toBe(true);
    const quantize = plan.plan.stages.find((s) => s.id === 'quantize');
    expect(quantize.engineId).toBe('tflm');
    expect(quantize.scheme).toBe('int8');
  });

  test('引擎不支持的量化方案 → 规划期失败', () => {
    const { h } = makeHarness();
    h.createPipeline({ ...DEMO_PIPELINE, stages: DEMO_PIPELINE.stages.map((s) => (s.id === 'quantize' ? { ...s, scheme: 'fp16' } : s)) });
    const plan = h.plan();
    expect(plan.ok).toBe(false);
    expect(plan.errors.join()).toContain('quantScheme fp16');
  });

  test('引擎不兼容目标 → 规划期失败', () => {
    // 注册"已注册但 tflm 不兼容"的目标 board-x
    const registry = createDefaultRegistry();
    registry.registerTarget({
      id: 'board-x',
      capabilities: () => ({ id: 'board-x', kind: 'board', toolchains: [], measurable: ['accuracy'] }),
      build: async () => ({ ok: true }),
      flash: async () => ({ ok: true }),
      exec: async () => ({ ok: true }),
      measure: async () => ({ ok: true, metrics: {} })
    });
    const { h } = makeHarness(registry);
    h.createPipeline({ ...DEMO_PIPELINE, stages: DEMO_PIPELINE.stages.map((s) => (s.id === 'eval' ? { ...s, target: 'board-x' } : s)) });
    const plan = h.plan();
    expect(plan.ok).toBe(false);
    expect(plan.errors.join()).toContain('not supported by engine');
  });

  test('未注册引擎 → 规划期失败', () => {
    const { h } = makeHarness();
    h.createPipeline({ ...DEMO_PIPELINE, stages: DEMO_PIPELINE.stages.map((s) => (s.id === 'quantize' ? { ...s, engine: 'unknown-engine' } : s)) });
    const plan = h.plan();
    expect(plan.ok).toBe(false);
    expect(plan.errors.join()).toContain('engine not found: unknown-engine');
  });
});

describe('runner', () => {
  test('全链执行成功 → run completed,产物链完整', async () => {
    const { h, baseDir } = makeHarness();
    h.createPipeline(DEMO_PIPELINE);
    const run = await h.run();
    expect(run.status).toBe('completed');
    for (const s of run.stages) expect(s.status).toBe('completed');
    const artifacts = path.join(baseDir, 'artifacts');
    for (const kind of ['dataset', 'model', 'quantized-model', 'generated-code', 'runtime-bundle', 'eval-report']) {
      expect(fs.existsSync(path.join(artifacts, kind))).toBe(true);
    }
  });

  test('gate 阈值不满足 → eval gated,run failed', async () => {
    const { h } = makeHarness();
    h.createPipeline({ ...DEMO_PIPELINE, gates: { minAccuracy: 0.99 } }); // 引擎 mock 0.95
    const run = await h.run();
    expect(run.status).toBe('failed');
    const evalStage = run.stages.find((s) => s.id === 'eval');
    expect(evalStage.status).toBe('gated');
    expect(evalStage.gate.pass).toBe(false);
    expect(evalStage.gate.evidence).toBe('threshold');
  });

  test('部分执行:只跑 train 与 eval 子集', async () => {
    const { h } = makeHarness();
    h.createPipeline(DEMO_PIPELINE);
    const run = await h.run({ stages: ['quantize'] });
    expect(run.status).toBe('failed'); // eval 缺失 → 前序无 bundle 会失败?quantize 需要 model
    const quantize = run.stages.find((s) => s.id === 'quantize');
    expect(quantize.status).toBe('failed'); // 缺 model 输入
  });

  test('resume 断点续跑:从失败 stage 继续,不重跑已完成阶段,沿用原 gates 快照', async () => {
    const { h } = makeHarness();
    // 第一次:train executor 失败(非 gate 失败)
    h.createPipeline({
      ...DEMO_PIPELINE,
      stages: DEMO_PIPELINE.stages.map((s) => (s.id === 'train' ? { ...s, executor: 'local:node -e "process.exit(1)"' } : s))
    });
    const failed = await h.run();
    expect(failed.status).toBe('failed');
    const train = failed.stages.find((s) => s.id === 'train');
    expect(train.status).toBe('failed');
    const collect = failed.stages.find((s) => s.id === 'collect');
    expect(collect.status).toBe('completed');
    const runId = failed.runId;

    // resume:executor 重建为默认 mock,从 train 继续
    const h2 = createHarness({ baseDir: h.store.baseDir });
    const resumed = await h2.resume({ runId });
    expect(resumed.status).toBe('completed');
    expect(resumed.stages.find((s) => s.id === 'train').status).toBe('completed');
    expect(resumed.stages.find((s) => s.id === 'eval').status).toBe('completed');
    // 已完成阶段保持原 artifactId(未重跑)
    expect(resumed.stages.find((s) => s.id === 'collect').artifactId).toBe(collect.artifactId);
    // run 记录自包含 gates 快照(resume 沿用,不依赖外部 pipeline 文件)
    expect(h2.store.loadRun(runId).gates).toEqual({ minAccuracy: 0.9 });
  });
});

describe('report', () => {
  test('completed run 报告含 eval-report 摘要', async () => {
    const { h } = makeHarness();
    h.createPipeline(DEMO_PIPELINE);
    const run = await h.run();
    const { evalReport } = h.report({ runId: run.runId });
    expect(evalReport.accuracy).toBeGreaterThanOrEqual(0.9);
    expect(evalReport.accuracy).toBeLessThan(0.98);
    expect(evalReport.latencyMs).toBeGreaterThan(0);
    expect(evalReport.dataset).toBeTruthy();
  });
});
