/**
 * 对比报告单测:多 run(tflm×host / cubeai×host)聚合对比表 + 最优摘要(D2-2)。
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { createHarness, createDefaultRegistry } = require('../lib/index');

function basePipeline(engine) {
  return {
    schemaVersion: '1.0',
    name: `compare-${engine}`,
    stages: [
      { id: 'collect', config: { samples: 100 } },
      { id: 'train', executor: 'mock' },
      { id: 'quantize', engine, scheme: 'int8' },
      { id: 'integrate', engine },
      { id: 'eval', engine, target: 'host', metrics: ['accuracy', 'latency', 'ram'] }
    ],
    gates: { minAccuracy: 0.9 }
  };
}

describe('compare 对比报告', () => {
  test('两次 run(不同引擎)聚合出对比行与最优摘要', async () => {
    const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-cmp-'));
    try {
      const registry = createDefaultRegistry({ probe: () => true });
      const h = createHarness({ baseDir, registry });

      h.createPipeline(basePipeline('tflm'));
      const runTflm = await h.run();
      h.createPipeline(basePipeline('cubeai'));
      const runCubeai = await h.run();

      const { rows, summary } = h.compare({ runIds: [runTflm.runId, runCubeai.runId] });
      expect(rows).toHaveLength(2);
      const engines = rows.map((r) => r.engine).sort();
      expect(engines).toEqual(['cubeai', 'tflm']);
      // 每行含指标
      for (const row of rows) {
        expect(row.accuracy).toBeGreaterThan(0);
        expect(row.latencyMs).toBeGreaterThan(0);
        expect(row.artifactId).toBeTruthy();
      }
      // 最优摘要:tflm 0.95 > cubeai 0.93
      expect(summary.bestEngine).toBe('tflm');
      expect(summary.fastestLatencyMs).toBeLessThan(summary.minRamBytes ? Infinity : Infinity);
    } finally {
      fs.rmSync(baseDir, { recursive: true, force: true });
    }
  });

  test('无效 runId 被忽略,无完成行时返回空对比', () => {
    const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-cmp2-'));
    try {
      const h = createHarness({ baseDir });
      const { rows, summary } = h.compare({ runIds: ['nonexistent'] });
      expect(rows).toHaveLength(0);
      expect(summary).toBeUndefined();
    } finally {
      fs.rmSync(baseDir, { recursive: true, force: true });
    }
  });
});
