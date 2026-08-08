/**
 * 策略单测:grid-search 组合序列与耗尽 / feedback 达标与换方案 / retry 限次。
 */

const { createGridSearchPolicy, createFeedbackPolicy, createRetryPolicy, applyCombo } = require('../lib/policy/policy');

const BASE = {
  schemaVersion: '1.0',
  name: 'p',
  stages: [
    { id: 'collect', config: { samples: 10 } },
    { id: 'train', executor: 'mock' },
    { id: 'quantize', engine: 'tflm', scheme: 'int8' },
    { id: 'integrate', engine: 'tflm' },
    { id: 'eval', engine: 'tflm', target: 'host' }
  ],
  gates: { minAccuracy: 0.9 }
};

describe('grid-search 策略', () => {
  test('穷举 engine × scheme 组合序列', () => {
    const policy = createGridSearchPolicy({ grid: { engine: ['tflm', 'cubeai'], scheme: ['int8'] } });
    const ctx = { pipeline: BASE, history: [], round: 1, maxRounds: 10 };

    const d1 = policy.analyze(ctx);
    expect(d1.action).toBe('next');
    expect(d1.nextPipeline.stages.find((s) => s.id === 'eval').engine).toBe('tflm');

    const d2 = policy.analyze(ctx);
    expect(d2.nextPipeline.stages.find((s) => s.id === 'quantize').engine).toBe('cubeai');

    const d3 = policy.analyze(ctx);
    expect(d3.action).toBe('stop');
    expect(d3.reason).toContain('grid exhausted');
  });

  test('applyCombo 只改 quantize/integrate/eval 的 engine 与 quantize 的 scheme', () => {
    const next = applyCombo(BASE, { engine: 'cubeai', scheme: 'fp16' });
    expect(next.stages.find((s) => s.id === 'eval').engine).toBe('cubeai');
    expect(next.stages.find((s) => s.id === 'integrate').engine).toBe('cubeai');
    expect(next.stages.find((s) => s.id === 'quantize').scheme).toBe('fp16');
    expect(next.stages.find((s) => s.id === 'collect').engine).toBeUndefined(); // collect 不绑引擎
  });
});

describe('feedback 策略', () => {
  test('达标 → stop', () => {
    const policy = createFeedbackPolicy();
    const ctx = { pipeline: BASE, history: [{ status: 'completed', evalReport: { accuracy: 0.95 } }], round: 1, maxRounds: 5 };
    const d = policy.analyze(ctx);
    expect(d.action).toBe('stop');
    expect(d.reason).toContain('target met');
  });

  test('不达标 → 换更宽量化方案(int8 → fp16)', () => {
    const policy = createFeedbackPolicy();
    const ctx = { pipeline: BASE, history: [{ status: 'completed', evalReport: { accuracy: 0.85 } }], round: 1, maxRounds: 5 };
    const d = policy.analyze(ctx);
    expect(d.action).toBe('next');
    expect(d.reason).toContain('try scheme fp16');
    expect(d.nextPipeline.stages.find((s) => s.id === 'quantize').scheme).toBe('fp16');
  });

  test('方案穷尽 → stop', () => {
    const policy = createFeedbackPolicy();
    const ctx = {
      pipeline: { ...BASE, stages: BASE.stages.map((s) => (s.id === 'quantize' ? { ...s, scheme: 'fp32' } : s)) },
      history: [{ status: 'completed', evalReport: { accuracy: 0.85 } }],
      round: 1,
      maxRounds: 5
    };
    const d = policy.analyze(ctx);
    expect(d.action).toBe('stop');
    expect(d.reason).toContain('all schemes tried');
  });
});

describe('retry 策略', () => {
  test('completed → stop', () => {
    const policy = createRetryPolicy({ maxRetries: 3 });
    const d = policy.analyze({ history: [{ status: 'completed' }] });
    expect(d.action).toBe('stop');
  });

  test('失败重试,超限 → stop', () => {
    const policy = createRetryPolicy({ maxRetries: 2 });
    const failed = { status: 'failed', gate: undefined };
    expect(policy.analyze({ history: [failed] }).action).toBe('rerun');
    expect(policy.analyze({ history: [failed, failed] }).action).toBe('rerun');
    const d = policy.analyze({ history: [failed, failed, failed] });
    expect(d.action).toBe('stop');
    expect(d.reason).toContain('exceeded 2 retries');
  });

  test('gate 失败同样走重试并记录原因', () => {
    const policy = createRetryPolicy({ maxRetries: 1 });
    const d = policy.analyze({ history: [{ status: 'gated', gate: { reasons: ['accuracy too low'] } }] });
    expect(d.action).toBe('rerun');
    expect(d.reason).toContain('accuracy too low');
  });
});
