/**
 * harness Programmatic API(ADR H13:无 Node CLI,agent 直调此出口)。
 * 用法:
 *   const { createHarness } = require('../harness/lib');
 *   const h = createHarness({ baseDir: path.join(project, '.mcu-workbench') });
 *   h.createPipeline(spec); await h.run(); h.report({ runId });
 */

const { RunStore } = require('./pipeline/run-store');
const { Runner } = require('./pipeline/runner');
const { planPipeline } = require('./pipeline/planner');
const { validatePipeline } = require('./validate/pipeline-validator');
const { Registry, createDefaultRegistry } = require('./registry');
const { compareRuns } = require('./report/compare');
const { trendRuns } = require('./report/trend');
const { BaselineStore } = require('./baseline/baseline-store');
const { DecisionLog } = require('./policy/decision-log');
const { runCampaign } = require('./campaign/campaign');
const policies = require('./policy/policy');
const adapterCheck = require('./adapter-check');
const dataset = require('./dataset/dataset-manager');

/**
 * 创建 harness 实例。
 * @param {{ baseDir: string, registry?: object }} opts baseDir = 目标工程 .mcu-workbench/
 */
function createHarness({ baseDir, registry = createDefaultRegistry() }) {
  if (!baseDir) throw new Error('baseDir is required (目标工程 .mcu-workbench/ 路径)');
  const store = new RunStore({ baseDir });
  const baselineStore = new BaselineStore({ baseDir });
  const decisionLog = new DecisionLog({ baseDir });
  const runner = new Runner({ registry, store, baselineStore });
  let pipeline;

  return {
    store,
    registry,

    /** 载入并校验 pipeline 定义 */
    createPipeline(spec) {
      const verdict = validatePipeline(spec);
      if (!verdict.ok) throw new Error(`invalid pipeline: ${verdict.errors.join('; ')}`);
      pipeline = spec;
      return pipeline;
    },

    /** 规划期静态校验(能力匹配,不满足即失败) */
    plan() {
      if (!pipeline) throw new Error('createPipeline first');
      return planPipeline({ pipeline, registry });
    },

    /** 执行流水线(可部分执行 stages 子集) */
    async run({ stages } = {}) {
      if (!pipeline) throw new Error('createPipeline first');
      const p = planPipeline({ pipeline, registry });
      if (!p.ok) throw new Error(`plan failed: ${p.errors.join('; ')}`);
      return runner.run({ pipeline, plan: p.plan, stages });
    },

    /** 断点续跑:从失败 stage 继续 */
    resume({ runId }) {
      return runner.resume({ runId });
    },

    /** 汇总报告:run 记录 + eval-report 摘要 */
    report({ runId }) {
      return runner.report({ runId });
    },

    /** 多 run 对比聚合(不同引擎/目标组合) */
    compare({ runIds }) {
      return compareRuns({ store, runIds });
    },

    /** 历史趋势:多次 run 指标序列 */
    trend({ runIds }) {
      return trendRuns({ store, runIds });
    },

    /** 基线库(读取/管理;写入由 runner 在 eval gate 通过时自动完成) */
    baseline: baselineStore,

    /** 自动决策日志(D4-4:可审计地基) */
    decisions: decisionLog,

    /** 多轮智能迭代:run → 策略分析 → 决策日志 → 下一轮(D4-1) */
    campaign({ pipeline: spec, policy, maxRounds = 10 }) {
      const verdict = validatePipeline(spec);
      if (!verdict.ok) throw new Error(`invalid pipeline: ${verdict.errors.join('; ')}`);
      return runCampaign({ registry, runner, store, decisionLog, pipeline: spec, policy, maxRounds });
    },

    /** 数据集管理工具(importDir/splitDataset/makeCalibrationSet/...) */
    dataset
  };
}

module.exports = {
  createHarness,
  createDefaultRegistry,
  Registry,
  RunStore,
  planPipeline,
  validatePipeline,
  policies,
  adapterCheck
};
