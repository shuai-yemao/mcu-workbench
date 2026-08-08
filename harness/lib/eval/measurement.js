/**
 * Measurement —— 评测 executor 抽象(D3-1,契约修正 #2 后的评测入口)。
 * 评测(精度/延迟/内存)是跨引擎的共性测量协议,由 eval stage 编排本模块完成。
 * 两种模式:
 *   - mock:确定性指标(由 bundle+dataset id 派生,同一产物两次 run 结果稳定,基线可回归)
 *   - local:<cmd>:执行外部评测脚本(stdout 输出 JSON { accuracy, latencyMs, ramBytes, flashBytes }),
 *     环境变量注入 BUNDLE_ID / DATASET_ID / BUNDLE_PATH / DATASET_PATH
 * 真实测量(推理比对/计时)由外部脚本或后续 target 能力承担,harness 只定义协议。
 */

const { execSync } = require('child_process');

/** 派生确定性 hash(0-99) */
function deriveSeed(bundleId, datasetId) {
  const src = `${bundleId}${datasetId}`;
  let seed = 0;
  for (const ch of src) seed = (seed * 31 + ch.charCodeAt(0)) % 100000;
  return seed % 100;
}

/**
 * 执行评测,返回指标对象。
 * @param {{ mode?: string, bundle: { id: string, path: string }, dataset: { id: string, path: string } }} input
 * @returns {{ accuracy: number, latencyMs: number, ramBytes: number, flashBytes: number, measurement: string }}
 */
function runMeasurement({ mode = 'mock', bundle, dataset }) {
  if (mode === 'mock') {
    const seed = deriveSeed(bundle.id, dataset.id);
    return {
      accuracy: Math.round((0.9 + (seed % 80) / 1000) * 1000) / 1000, // 0.900 - 0.979(恒 >= 0.9)
      latencyMs: 10 + (seed % 30),
      ramBytes: 4096 + (seed % 5) * 1024,
      flashBytes: 8192 + (seed % 9) * 1024,
      measurement: 'mock'
    };
  }
  if (mode.startsWith('local:')) {
    const cmd = mode.slice('local:'.length);
    const env = {
      ...process.env,
      BUNDLE_ID: bundle.id,
      DATASET_ID: dataset.id,
      BUNDLE_PATH: bundle.path,
      DATASET_PATH: dataset.path
    };
    let out;
    try {
      out = execSync(cmd, { encoding: 'utf8', maxBuffer: 1 << 20, env });
    } catch (err) {
      throw new Error(`measurement script failed: ${err.message}`);
    }
    const report = JSON.parse(out);
    for (const field of ['accuracy', 'latencyMs']) {
      if (typeof report[field] !== 'number') {
        throw new Error(`measurement script must output numeric ${field}`);
      }
    }
    return {
      accuracy: report.accuracy,
      latencyMs: report.latencyMs,
      ramBytes: report.ramBytes || 0,
      flashBytes: report.flashBytes || 0,
      measurement: mode
    };
  }
  throw new Error(`unsupported measurement mode: ${mode}(支持 mock / local:<cmd>)`);
}

module.exports = { runMeasurement, deriveSeed };
