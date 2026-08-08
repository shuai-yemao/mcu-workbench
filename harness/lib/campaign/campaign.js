/**
 * Campaign —— 多轮 run 编排(D4-1:智能化在 runner 之外,单次执行保持确定性)。
 * 每轮:policy.analyze(决策)→ 应用 nextPipeline → run(确定性)→ 决策日志(带结果)
 * 终止:policy.stop | plan 失败 | 预算耗尽
 * 每次自动决策写入 DecisionLog(decisions/<campaignId>/<round>.json),可审计(D4-4)。
 */

const { planPipeline } = require('../pipeline/planner');

/**
 * @param {{ registry: object, runner: object, store: object, decisionLog: object, pipeline: object, policy: object, maxRounds?: number }} input
 * @returns {Promise<{ campaignId: string, status: string, rounds: object[], best?: object }>}
 */
async function runCampaign({ registry, runner, store, decisionLog, pipeline, policy, maxRounds = 10 }) {
  const campaignId = `cmp-${Date.now().toString(36)}`;
  const history = [];
  let current = pipeline;
  let status = 'running';

  for (let round = 1; round <= maxRounds; round += 1) {
    // 先决策:本轮跑什么(nextPipeline)或是否终止
    const decision = policy.analyze({ pipeline: current, history, round, maxRounds });
    if (decision.action === 'stop') {
      status = history.length && history[history.length - 1].status === 'completed' ? 'completed' : 'stopped';
      decisionLog.record({ campaignId, round, context: { roundsDone: history.length }, action: 'stop', reason: decision.reason });
      break;
    }
    if (decision.nextPipeline) current = decision.nextPipeline;

    // 规划期校验(能力匹配;不兼容组合在此失败,不浪费 run)
    const plan = planPipeline({ pipeline: current, registry });
    if (!plan.ok) {
      status = 'plan-failed';
      decisionLog.record({
        campaignId,
        round,
        context: { pipelineName: current.name },
        action: 'stop',
        reason: `plan failed: ${plan.errors.join('; ')}`
      });
      break;
    }

    const run = await runner.run({ pipeline: current, plan: plan.plan });
    const evalStage = run.stages.find((s) => s.id === 'eval');
    let evalReport;
    if (run.status === 'completed' && evalStage && evalStage.artifactId) {
      const found = store.findMetaById(evalStage.artifactId);
      if (found) {
        evalReport = JSON.parse(store.readContent({ id: evalStage.artifactId, path: found.dir }).toString('utf8'));
      }
    }
    history.push({
      runId: run.runId,
      status: run.status,
      evalReport,
      gate: evalStage ? evalStage.gate : undefined
    });

    decisionLog.record({
      campaignId,
      round,
      context: { runId: run.runId, status: run.status },
      action: decision.action,
      reason: decision.reason,
      result: { evalReport }
    });
  }

  if (history.length >= maxRounds && status === 'running') status = 'budget-exhausted';

  const completed = history.filter((h) => h.evalReport);
  const best = completed.length
    ? completed.reduce((a, b) => (b.evalReport.accuracy > a.evalReport.accuracy ? b : a))
    : undefined;

  return {
    campaignId,
    status,
    rounds: history,
    best: best ? { runId: best.runId, accuracy: best.evalReport.accuracy } : undefined
  };
}

module.exports = { runCampaign };
