/**
 * 基线库与回归单测(D3-2/D3-3):BaselineStore 读写比较 + 端到端回归(建基→超阈值 gated)。
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { BaselineStore, baselineKey } = require('../lib/baseline/baseline-store');
const { createHarness, createDefaultRegistry } = require('../lib/index');

function evalCmd(accuracy) {
  return `local:node -e "console.log(JSON.stringify({accuracy:${accuracy},latencyMs:10,ramBytes:100,flashBytes:200}))"`;
}

function basePipeline(accuracy, baseline) {
  return {
    schemaVersion: '1.0',
    name: 'baseline-demo',
    stages: [
      { id: 'collect', config: { samples: 100 } },
      { id: 'train', executor: 'mock' },
      { id: 'quantize', engine: 'tflm', scheme: 'int8' },
      { id: 'integrate', engine: 'tflm' },
      { id: 'eval', engine: 'tflm', target: 'host', metrics: ['accuracy'], measurement: evalCmd(accuracy) }
    ],
    gates: { minAccuracy: 0.8 },
    baseline
  };
}

describe('BaselineStore', () => {
  let baseDir;
  let store;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-bl-'));
    store = new BaselineStore({ baseDir }).ensure();
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  test('save/load/list 与键消毒', () => {
    const key = baselineKey({ engine: 'tflm', target: 'host', dataset: 'abc123' });
    expect(key).toBe('tflm_host_abc123');
    store.save(key, { accuracy: 0.9, latencyMs: 10, runId: 'r1' });
    const loaded = store.load(key);
    expect(loaded.accuracy).toBe(0.9);
    expect(store.list()).toContain(key);
    expect(store.load('missing')).toBeUndefined();
  });

  test('compare:超阈值判定', () => {
    const baseline = { accuracy: 0.9, latencyMs: 10 };
    expect(store.compare({ accuracy: 0.89, latencyMs: 12 }, baseline, { maxAccuracyDrop: 0.02, maxLatencyRise: 5 }).pass).toBe(true);
    expect(store.compare({ accuracy: 0.87, latencyMs: 12 }, baseline, { maxAccuracyDrop: 0.02 }).pass).toBe(false);
    expect(store.compare({ accuracy: 0.89, latencyMs: 16 }, baseline, { maxLatencyRise: 5 }).pass).toBe(false);
  });
});

describe('基线回归端到端(runner 第 4 层 gate)', () => {
  test('首次 run 建基线;二次 run 指标下降超阈值 → gated evidence=baseline', async () => {
    const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-bl-e2e-'));
    try {
      const h = createHarness({ baseDir, registry: createDefaultRegistry({ probe: () => true }) });

      // 第一次:accuracy 0.90 → 建基线
      h.createPipeline(basePipeline(0.9, { enabled: true, maxAccuracyDrop: 0.02 }));
      const r1 = await h.run();
      expect(r1.status).toBe('completed');
      const e1 = r1.stages.find((s) => s.id === 'eval');
      expect(e1.gate.evidence).toBe('baseline-created');

      // 第二次:accuracy 0.85 → drop 0.05 > 0.02 → gated
      h.createPipeline(basePipeline(0.85, { enabled: true, maxAccuracyDrop: 0.02 }));
      const r2 = await h.run();
      expect(r2.status).toBe('failed');
      const e2 = r2.stages.find((s) => s.id === 'eval');
      expect(e2.status).toBe('gated');
      expect(e2.gate.evidence).toBe('baseline');
      expect(e2.gate.reasons.join()).toContain('accuracy dropped');

      // 基线文件已落盘
      const blDir = path.join(baseDir, 'baselines');
      expect(fs.readdirSync(blDir).length).toBeGreaterThan(0);
    } finally {
      fs.rmSync(baseDir, { recursive: true, force: true });
    }
  });

  test('指标持平/上升 → 通过并更新基线(evidence baseline-ok)', async () => {
    const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-bl-e2e2-'));
    try {
      const h = createHarness({ baseDir, registry: createDefaultRegistry({ probe: () => true }) });
      h.createPipeline(basePipeline(0.9, { enabled: true, maxAccuracyDrop: 0.02 }));
      await h.run();
      h.createPipeline(basePipeline(0.92, { enabled: true, maxAccuracyDrop: 0.02 }));
      const r2 = await h.run();
      expect(r2.status).toBe('completed');
      expect(r2.stages.find((s) => s.id === 'eval').gate.evidence).toBe('baseline-ok');
    } finally {
      fs.rmSync(baseDir, { recursive: true, force: true });
    }
  });
});
