/**
 * campaign 端到端单测:grid-search 多轮迭代、retry 失败自愈、决策日志可审计、预算终止。
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { createHarness, createDefaultRegistry, policies } = require('../lib/index');

function basePipeline(engine = 'tflm') {
  return {
    schemaVersion: '1.0',
    name: 'campaign-demo',
    stages: [
      { id: 'collect', config: { samples: 100 } },
      { id: 'train', executor: 'mock' },
      { id: 'quantize', engine, scheme: 'int8' },
      { id: 'integrate', engine },
      { id: 'eval', engine, target: 'host', metrics: ['accuracy', 'latency', 'ram'] }
    ],
    gates: { minAccuracy: 0.85 }
  };
}

function makeHarness(registry) {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-cmpgn-'));
  return { h: createHarness({ baseDir, registry }), baseDir };
}

describe('campaign 多轮迭代', () => {
  test('grid-search:tflm → cubeai 两轮,决策日志逐轮记录,最优为 accuracy 最高', async () => {
    const { h, baseDir } = makeHarness(createDefaultRegistry({ probe: () => true }));
    const result = await h.campaign({
      pipeline: basePipeline('tflm'),
      policy: policies.createGridSearchPolicy({ grid: { engine: ['tflm', 'cubeai'], scheme: ['int8'] } }),
      maxRounds: 5
    });

    expect(result.rounds).toHaveLength(2);
    expect(result.status).toBe('completed'); // 两轮都 completed → 最后 stop 时 status completed
    expect(result.best).toBeTruthy();
    // 两个引擎都被尝试
    const engines = result.rounds.map((r) => r.evalReport.engine).sort();
    expect(engines).toEqual(['cubeai', 'tflm']);
    // 决策日志可审计:2 次 run 决策 + 1 次 stop 决策 = 3 条,含 context/action/reason/result
    const entries = h.decisions.load(result.campaignId);
    expect(entries).toHaveLength(3);
    expect(entries[0].action).toBe('next');
    expect(entries[0].reason).toContain('try combo');
    expect(entries[0].result.evalReport).toBeTruthy();
    expect(entries[1].reason).toContain('cubeai');
    expect(entries[2].action).toBe('stop');
    expect(entries[2].reason).toContain('grid exhausted');
    expect(h.decisions.listCampaigns()).toContain(result.campaignId);
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  test('retry:train 失败自动重试,超限停止且不空转', async () => {
    const { h, baseDir } = makeHarness(createDefaultRegistry({ probe: () => true }));
    const failingPipeline = {
      ...basePipeline('tflm'),
      stages: basePipeline('tflm').stages.map((s) =>
        s.id === 'train' ? { ...s, executor: 'local:node -e "process.exit(1)"' } : s
      )
    };
    const result = await h.campaign({
      pipeline: failingPipeline,
      policy: policies.createRetryPolicy({ maxRetries: 2 }),
      maxRounds: 5
    });

    // 1 初始 + 2 重试 = 3 轮,全部 failed,然后 stop(不空转)
    expect(result.rounds).toHaveLength(3);
    expect(result.rounds.every((r) => r.status === 'failed')).toBe(true);
    expect(result.status).toBe('stopped');
    // 决策日志:initial run + 2 次 rerun + 1 次 stop = 4 条
    const entries = h.decisions.load(result.campaignId);
    expect(entries).toHaveLength(4);
    expect(entries[0].action).toBe('next');
    expect(entries[0].reason).toContain('initial run');
    expect(entries[1].action).toBe('rerun');
    expect(entries[3].action).toBe('stop');
    expect(entries[3].reason).toContain('exceeded 2 retries');
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  test('预算耗尽:maxRounds 到达时终止', async () => {
    const { h, baseDir } = makeHarness(createDefaultRegistry({ probe: () => true }));
    // 自定义策略:永远 next(但 nextPipeline 不变)→ 跑满预算
    const foreverPolicy = {
      id: 'forever',
      analyze(ctx) {
        if (ctx.round >= ctx.maxRounds) return { action: 'stop', reason: 'budget exhausted' };
        return { action: 'next', reason: 'keep going', nextPipeline: ctx.pipeline };
      }
    };
    const result = await h.campaign({ pipeline: basePipeline('tflm'), policy: foreverPolicy, maxRounds: 3 });
    expect(result.rounds).toHaveLength(2); // 第 3 轮 analyze 直接 stop,不再 run
    expect(result.status).toBe('completed');
    // 决策日志:2 次 run 决策 + 1 次 stop = 3 条
    expect(h.decisions.load(result.campaignId)).toHaveLength(3);
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  test('plan 失败(引擎不兼容)立即停止并记录', async () => {
    const { h, baseDir } = makeHarness(createDefaultRegistry({ probe: () => true }));
    const badPipeline = {
      ...basePipeline('tflm'),
      stages: basePipeline('tflm').stages.map((s) => (s.id === 'eval' ? { ...s, target: 'qemu-stm32f4' } : s))
    };
    const result = await h.campaign({
      pipeline: badPipeline,
      policy: policies.createGridSearchPolicy({ grid: { engine: ['tflm'], scheme: ['int8'] } }),
      maxRounds: 3
    });
    expect(result.status).toBe('plan-failed');
    expect(result.rounds).toHaveLength(0);
    const entries = h.decisions.load(result.campaignId);
    expect(entries[0].action).toBe('stop');
    expect(entries[0].reason).toContain('plan failed');
    fs.rmSync(baseDir, { recursive: true, force: true });
  });
});
