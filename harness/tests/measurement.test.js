/**
 * 评测 executor 单测:mock 确定性 / local 脚本解析 / 非法输出拒绝。
 */

const { runMeasurement, deriveSeed } = require('../lib/eval/measurement');

const REF_A = { id: 'aaaa11111111', path: '/x/bundle-a' };
const REF_B = { id: 'bbbb22222222', path: '/x/bundle-b' };

describe('measurement', () => {
  test('mock 确定性:同 bundle+dataset 两次结果一致', () => {
    const a1 = runMeasurement({ mode: 'mock', bundle: REF_A, dataset: REF_A });
    const a2 = runMeasurement({ mode: 'mock', bundle: REF_A, dataset: REF_A });
    expect(a1).toEqual(a2);
  });

  test('mock 指标范围:accuracy 0.900-0.979,latency 10-39ms', () => {
    const results = [];
    for (let i = 0; i < 20; i += 1) {
      results.push(runMeasurement({ mode: 'mock', bundle: { id: `id${i}`.padEnd(12, '0'), path: '/x' }, dataset: REF_B }));
    }
    for (const r of results) {
      expect(r.accuracy).toBeGreaterThanOrEqual(0.9);
      expect(r.accuracy).toBeLessThan(0.98);
      expect(r.latencyMs).toBeGreaterThanOrEqual(10);
      expect(r.latencyMs).toBeLessThan(40);
      expect(r.measurement).toBe('mock');
    }
  });

  test('不同 bundle 产出不同指标(可区分)', () => {
    const a = runMeasurement({ mode: 'mock', bundle: REF_A, dataset: REF_A });
    const b = runMeasurement({ mode: 'mock', bundle: REF_B, dataset: REF_B });
    expect(a.accuracy).not.toBe(b.accuracy);
  });

  test('local 脚本:解析 stdout JSON 指标', () => {
    const cmd = 'local:node -e "console.log(JSON.stringify({accuracy:0.88,latencyMs:7.5,ramBytes:2048,flashBytes:4096}))"';
    const report = runMeasurement({ mode: cmd, bundle: REF_A, dataset: REF_B });
    expect(report.accuracy).toBe(0.88);
    expect(report.latencyMs).toBe(7.5);
    expect(report.ramBytes).toBe(2048);
    expect(report.measurement).toBe(cmd);
  });

  test('local 脚本:缺 accuracy 字段被拒绝', () => {
    const cmd = 'local:node -e "console.log(JSON.stringify({latencyMs:5}))"';
    expect(() => runMeasurement({ mode: cmd, bundle: REF_A, dataset: REF_B })).toThrow(/numeric accuracy/);
  });

  test('local 脚本:非 JSON 输出被拒绝', () => {
    const cmd = 'local:node -e "console.log(\'oops\')"';
    expect(() => runMeasurement({ mode: cmd, bundle: REF_A, dataset: REF_B })).toThrow();
  });

  test('不支持的 mode 被拒绝', () => {
    expect(() => runMeasurement({ mode: 'remote:api', bundle: REF_A, dataset: REF_B })).toThrow(/unsupported measurement/);
  });

  test('deriveSeed 稳定且分布', () => {
    expect(deriveSeed('a', 'b')).toBe(deriveSeed('a', 'b'));
    expect(deriveSeed('a', 'b')).toBeGreaterThanOrEqual(0);
    expect(deriveSeed('a', 'b')).toBeLessThan(100);
  });
});
