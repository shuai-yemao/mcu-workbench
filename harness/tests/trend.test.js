/**
 * 趋势单测:多次 run 的指标序列。
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { createHarness, createDefaultRegistry } = require('../lib/index');

function pipeline(accuracy) {
  return {
    schemaVersion: '1.0',
    name: 'trend-demo',
    stages: [
      { id: 'collect', config: { samples: 100 } },
      { id: 'train', executor: 'mock' },
      { id: 'quantize', engine: 'tflm', scheme: 'int8' },
      { id: 'integrate', engine: 'tflm' },
      {
        id: 'eval',
        engine: 'tflm',
        target: 'host',
        metrics: ['accuracy'],
        measurement: `local:node -e "console.log(JSON.stringify({accuracy:${accuracy},latencyMs:10,ramBytes:100,flashBytes:200}))"`
      }
    ]
  };
}

describe('trend 趋势', () => {
  test('≥3 次 run 输出指标序列(按 runId 顺序)', async () => {
    const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-trend-'));
    try {
      const h = createHarness({ baseDir, registry: createDefaultRegistry({ probe: () => true }) });
      const runIds = [];
      for (const acc of [0.9, 0.91, 0.92]) {
        h.createPipeline(pipeline(acc));
        const run = await h.run();
        runIds.push(run.runId);
      }

      const points = h.trend({ runIds });
      expect(points).toHaveLength(3);
      expect(points.map((p) => p.accuracy)).toEqual([0.9, 0.91, 0.92]);
      expect(points[0].engine).toBe('tflm');
      expect(points[0].at).toBeTruthy();
    } finally {
      fs.rmSync(baseDir, { recursive: true, force: true });
    }
  });

  test('无效 runId 被跳过', () => {
    const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-trend2-'));
    try {
      const h = createHarness({ baseDir });
      expect(h.trend({ runIds: ['nope'] })).toHaveLength(0);
    } finally {
      fs.rmSync(baseDir, { recursive: true, force: true });
    }
  });
});
