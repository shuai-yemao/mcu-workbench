/**
 * DecisionLog —— 自动决策记录(D4-4,可审计地基)。
 * 每次策略决策写 .mcu-workbench/decisions/<campaignId>/<round>.json:
 *   { campaignId, round, context, action, reason, result, decidedAt }
 * 保证"自动化但不失控"——所有自动动作可回溯、可解释。
 */

const fs = require('fs');
const path = require('path');

class DecisionLog {
  /** @param {{ baseDir: string }} opts */
  constructor({ baseDir }) {
    this.dir = path.join(baseDir, 'decisions');
  }

  ensure() {
    fs.mkdirSync(this.dir, { recursive: true });
    return this;
  }

  /**
   * 记录一次自动决策。
   * @param {{ campaignId: string, round: number, context: object, action: string, reason: string, result?: object }} input
   */
  record({ campaignId, round, context, action, reason, result }) {
    this.ensure();
    const entry = {
      campaignId,
      round,
      context,
      action,
      reason,
      result,
      decidedAt: new Date().toISOString()
    };
    const dir = path.join(this.dir, campaignId);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${String(round).padStart(3, '0')}.json`);
    fs.writeFileSync(file, JSON.stringify(entry, null, 2));
    return entry;
  }

  /**
   * 加载某 campaign 的全部决策(按轮次排序)。
   * @param {string} campaignId
   */
  load(campaignId) {
    const dir = path.join(this.dir, campaignId);
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .sort()
      .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')));
  }

  /** 列出全部 campaign id */
  listCampaigns() {
    if (!fs.existsSync(this.dir)) return [];
    return fs.readdirSync(this.dir).filter((d) => fs.statSync(path.join(this.dir, d)).isDirectory());
  }
}

module.exports = { DecisionLog };
