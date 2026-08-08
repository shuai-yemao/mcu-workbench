/**
 * tflm × host 端到端验收测试(阶段 1 里程碑):真实用法路径——
 * 读 pipeline 文件 → createPipeline → plan → run → report,验证 eval-report 产物合法且过 Gate。
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { createHarness } = require('../lib/index');
const { validateArtifactMeta, verifyChecksum } = require('../lib/validate/artifact-validator');

const DEMO_PIPELINE = {
  schemaVersion: '1.0',
  name: 'keyword-spotting-gr5526',
  project: './target',
  stages: [
    { id: 'collect', config: { samples: 5000 } },
    { id: 'train', executor: 'mock' },
    { id: 'quantize', engine: 'tflm', scheme: 'int8' },
    { id: 'integrate', engine: 'tflm' },
    { id: 'eval', engine: 'tflm', target: 'host', metrics: ['accuracy', 'latency', 'ram'] }
  ],
  gates: { minAccuracy: 0.9, maxLatencyMs: 50 }
};

describe('tflm × host 端到端(MVP 里程碑)', () => {
  let baseDir;
  let pipelineFile;

  beforeAll(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-e2e-'));
    pipelineFile = path.join(baseDir, 'pipeline.json');
    fs.writeFileSync(pipelineFile, JSON.stringify(DEMO_PIPELINE, null, 2));
  });

  afterAll(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  test('读文件 → 规划 → 执行 → 报告 全链跑通', async () => {
    const h = createHarness({ baseDir: path.join(baseDir, '.mcu-workbench') });

    // 1. 从文件载入 pipeline
    const spec = JSON.parse(fs.readFileSync(pipelineFile, 'utf8'));
    h.createPipeline(spec);

    // 2. 规划期校验
    const plan = h.plan();
    expect(plan.ok).toBe(true);

    // 3. 执行
    const run = await h.run();
    expect(run.status).toBe('completed');

    // 4. 报告
    const { run: runRecord, evalReport } = h.report({ runId: run.runId });
    expect(runRecord.stages).toHaveLength(5);
    expect(evalReport.accuracy).toBeGreaterThanOrEqual(0.9);
    expect(evalReport.latencyMs).toBeLessThanOrEqual(50);

    // 5. 产物可审计:eval-report meta 合法 + checksum 通过
    const evalStage = run.stages.find((s) => s.id === 'eval');
    const found = h.store.findMetaById(evalStage.artifactId);
    expect(found).toBeTruthy();
    const meta = found.meta;
    expect(validateArtifactMeta(meta).ok).toBe(true);
    expect(verifyChecksum(meta, h.store.readContent({ id: meta.id, path: found.dir }))).toBe(true);

    // 6. 血缘链完整:eval-report 引用 bundle 与 dataset
    expect(meta.lineage).toHaveLength(2);
  });

  test('run 记录自包含(含 gates 快照),resume 不依赖外部文件', async () => {
    const h = createHarness({ baseDir: path.join(baseDir, '.mcu-workbench') });
    // 第一遍:train executor 失败(非 gate 失败)
    h.createPipeline({
      ...DEMO_PIPELINE,
      stages: DEMO_PIPELINE.stages.map((s) => (s.id === 'train' ? { ...s, executor: 'local:node -e "process.exit(1)"' } : s))
    });
    const failed = await h.run();
    expect(failed.status).toBe('failed');
    const runId = failed.runId;

    // run 记录已写入 gates 快照
    const runFile = fs.readFileSync(path.join(h.store.baseDir, 'runs', `${runId}.json`), 'utf8');
    expect(JSON.parse(runFile).gates).toEqual({ minAccuracy: 0.9, maxLatencyMs: 50 });

    // 新实例(无 pipeline 上下文)仅凭 runId resume:executor 重建为 mock,从 train 继续
    const h2 = createHarness({ baseDir: h.store.baseDir });
    const resumed = await h2.resume({ runId });
    expect(resumed.status).toBe('completed');
  });
});
