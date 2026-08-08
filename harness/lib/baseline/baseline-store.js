/**
 * BaselineStore —— 基线库(D3-2)。
 * 存储:.mcu-workbench/baselines/<engine>_<target>_<dataset>.json(最新良态基线)
 * 回归:compare 按阈值(accuracy 下降 / latency 上升)判定,供 gate 第 4 层使用。
 */

const fs = require('fs');
const path = require('path');

/** 基线文件名键(engine_target_dataset 消毒) */
function baselineKey({ engine, target, dataset }) {
  return `${engine}_${target}_${dataset}`.replace(/[^a-zA-Z0-9_-]/g, '_');
}

class BaselineStore {
  /** @param {{ baseDir: string }} opts */
  constructor({ baseDir }) {
    this.dir = path.join(baseDir, 'baselines');
  }

  ensure() {
    fs.mkdirSync(this.dir, { recursive: true });
    return this;
  }

  filePath(key) {
    return path.join(this.dir, `${key}.json`);
  }

  /** @param {string} key */
  load(key) {
    const file = this.filePath(key);
    if (!fs.existsSync(file)) return undefined;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  }

  /**
   * 保存基线(最近良态)。
   * @param {string} key
   * @param {object} report { accuracy, latencyMs, ramBytes, flashBytes, engine, target, dataset, runId }
   */
  save(key, report) {
    this.ensure();
    fs.writeFileSync(this.filePath(key), JSON.stringify({ ...report, savedAt: new Date().toISOString() }, null, 2));
    return key;
  }

  list() {
    if (!fs.existsSync(this.dir)) return [];
    return fs.readdirSync(this.dir).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''));
  }

  /**
   * 基线回归判定(D3-3)。
   * @param {object} report 本次 eval-report
   * @param {object} baseline 已存基线
   * @param {{ maxAccuracyDrop?: number, maxLatencyRise?: number }} rules
   * @returns {{ pass: boolean, reasons: string[] }}
   */
  compare(report, baseline, rules = {}) {
    const reasons = [];
    if (rules.maxAccuracyDrop !== undefined) {
      const drop = baseline.accuracy - report.accuracy;
      if (drop > rules.maxAccuracyDrop) {
        reasons.push(`accuracy dropped ${drop.toFixed(3)} > max ${rules.maxAccuracyDrop}(基线 ${baseline.accuracy} → 本次 ${report.accuracy})`);
      }
    }
    if (rules.maxLatencyRise !== undefined) {
      const rise = report.latencyMs - baseline.latencyMs;
      if (rise > rules.maxLatencyRise) {
        reasons.push(`latency rose ${rise.toFixed(1)}ms > max ${rules.maxLatencyRise}ms(基线 ${baseline.latencyMs} → 本次 ${report.latencyMs})`);
      }
    }
    return { pass: reasons.length === 0, reasons };
  }
}

module.exports = { BaselineStore, baselineKey };
