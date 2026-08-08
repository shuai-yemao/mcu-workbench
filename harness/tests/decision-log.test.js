/**
 * 决策日志单测(D4-4 可审计地基):记录/加载/列表 + 文件结构。
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { DecisionLog } = require('../lib/policy/decision-log');

describe('DecisionLog', () => {
  let baseDir;
  let log;

  beforeEach(() => {
    baseDir = fs.mkdtempSync(path.join(os.tmpdir(), 'harness-dl-'));
    log = new DecisionLog({ baseDir }).ensure();
  });

  afterEach(() => {
    fs.rmSync(baseDir, { recursive: true, force: true });
  });

  test('record 落盘 JSON(context+action+reason+result)', () => {
    const entry = log.record({
      campaignId: 'cmp-abc',
      round: 1,
      context: { runId: 'r1', status: 'completed' },
      action: 'next',
      reason: 'try combo',
      result: { accuracy: 0.95 }
    });
    expect(entry.decidedAt).toBeTruthy();
    const file = path.join(baseDir, 'decisions', 'cmp-abc', '001.json');
    expect(fs.existsSync(file)).toBe(true);
    const loaded = JSON.parse(fs.readFileSync(file, 'utf8'));
    expect(loaded.action).toBe('next');
    expect(loaded.context.runId).toBe('r1');
    expect(loaded.result.accuracy).toBe(0.95);
  });

  test('load 按轮次排序返回全部决策', () => {
    log.record({ campaignId: 'cmp-x', round: 2, context: {}, action: 'stop', reason: 'done' });
    log.record({ campaignId: 'cmp-x', round: 1, context: {}, action: 'next', reason: 'start' });
    const entries = log.load('cmp-x');
    expect(entries).toHaveLength(2);
    expect(entries[0].round).toBe(1);
    expect(entries[1].round).toBe(2);
    expect(log.load('cmp-missing')).toHaveLength(0);
  });

  test('listCampaigns 枚举全部 campaign', () => {
    log.record({ campaignId: 'cmp-a', round: 1, context: {}, action: 'stop', reason: 'x' });
    log.record({ campaignId: 'cmp-b', round: 1, context: {}, action: 'stop', reason: 'x' });
    expect(log.listCampaigns().sort()).toEqual(['cmp-a', 'cmp-b']);
  });
});
