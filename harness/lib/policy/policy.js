/**
 * Policy —— 可插拔自动化策略(D4-1/D4-2)。
 * 策略接口:analyze(ctx) → { action: 'stop' | 'next' | 'rerun', reason, nextPipeline? }
 *   - stop:终止 campaign(达标/预算耗尽/无路可走)
 *   - next:换下一组配置(需 nextPipeline 完整 pipeline 定义)
 *   - rerun:同配置重跑(失败自愈)
 * ctx = { pipeline, history: [{ runId, status, evalReport, gate }], round, maxRounds }
 * 内置策略(grid-search / feedback / retry);新策略按同接口扩展。
 */

/** 把 grid 组合应用到 pipeline 的 quantize/integrate/eval 阶段 */
function applyCombo(pipeline, combo) {
  const stages = pipeline.stages.map((s) => {
    let next = s;
    if (combo.engine && (s.id === 'quantize' || s.id === 'integrate' || s.id === 'eval')) {
      next = { ...next, engine: combo.engine };
    }
    if (combo.scheme && s.id === 'quantize') {
      next = { ...next, scheme: combo.scheme };
    }
    return next;
  });
  return { ...pipeline, stages };
}

/**
 * D4-2 网格搜索策略:穷举 (engine × scheme) 组合,确定性可复现。
 * @param {{ grid?: { engine?: string[], scheme?: string[] } }} opts
 */
function createGridSearchPolicy({ grid = { engine: ['tflm', 'cubeai'], scheme: ['int8'] } } = {}) {
  const combos = [];
  for (const engine of grid.engine || [null]) {
    for (const scheme of grid.scheme || [null]) {
      combos.push({ engine, scheme });
    }
  }
  let index = 0;

  return {
    id: 'grid-search',
    analyze(ctx) {
      if (index >= combos.length) {
        return { action: 'stop', reason: `grid exhausted after ${combos.length} combos` };
      }
      const combo = combos[index];
      index += 1;
      return {
        action: 'next',
        reason: `try combo ${JSON.stringify(combo)} (round ${ctx.round}/${ctx.maxRounds})`,
        nextPipeline: applyCombo(ctx.pipeline, combo)
      };
    }
  };
}

/**
 * 反馈闭环策略:目标指标不达标 → 逐步放宽量化方案(int8 → fp16 → fp32)。
 * @param {{ targetAccuracy?: number }} opts 缺省取 pipeline.gates.minAccuracy
 */
function createFeedbackPolicy({ targetAccuracy } = {}) {
  const SCHEME_ORDER = ['int8', 'fp16', 'fp32'];
  return {
    id: 'feedback',
    analyze(ctx) {
      // 首轮(无反馈)→ 跑初始配置
      if (ctx.history.length === 0) {
        return { action: 'next', reason: 'initial run', nextPipeline: ctx.pipeline };
      }
      const last = ctx.history[ctx.history.length - 1];
      const target = targetAccuracy ?? ctx.pipeline.gates?.minAccuracy ?? 0.9;

      if (last.status === 'completed' && last.evalReport && last.evalReport.accuracy >= target) {
        return { action: 'stop', reason: `target met: accuracy ${last.evalReport.accuracy} >= ${target}` };
      }
      if (ctx.round >= ctx.maxRounds) {
        return { action: 'stop', reason: `budget exhausted (round ${ctx.round}/${ctx.maxRounds})` };
      }
      const current = ctx.pipeline.stages.find((s) => s.id === 'quantize')?.scheme || 'int8';
      const nextIndex = SCHEME_ORDER.indexOf(current) + 1;
      if (nextIndex >= SCHEME_ORDER.length) {
        return { action: 'stop', reason: `all schemes tried (${SCHEME_ORDER.join(' → ')})` };
      }
      const nextScheme = SCHEME_ORDER[nextIndex];
      const stages = ctx.pipeline.stages.map((s) => (s.id === 'quantize' ? { ...s, scheme: nextScheme } : s));
      return {
        action: 'next',
        reason: `accuracy ${last.evalReport ? last.evalReport.accuracy : 'n/a'} < ${target}, try scheme ${nextScheme}`,
        nextPipeline: { ...ctx.pipeline, stages }
      };
    }
  };
}

/**
 * 失败自愈策略:非通过状态 → 同配置重试,限 maxRetries 轮(D4-3)。
 * @param {{ maxRetries?: number }} opts
 */
function createRetryPolicy({ maxRetries = 3 } = {}) {
  return {
    id: 'retry',
    analyze(ctx) {
      // 首轮(无反馈)→ 跑初始配置
      if (ctx.history.length === 0) {
        return { action: 'next', reason: 'initial run', nextPipeline: ctx.pipeline };
      }
      const last = ctx.history[ctx.history.length - 1];
      if (last.status === 'completed') {
        return { action: 'stop', reason: 'run completed' };
      }
      const attempts = ctx.history.filter((h) => h.status === 'failed' || h.status === 'gated').length;
      if (attempts > maxRetries) {
        return { action: 'stop', reason: `exceeded ${maxRetries} retries` };
      }
      const detail = last.gate ? last.gate.reasons.join('; ') : 'stage error';
      return { action: 'rerun', reason: `retry ${attempts}/${maxRetries} after ${last.status}: ${detail}` };
    }
  };
}

module.exports = { createGridSearchPolicy, createFeedbackPolicy, createRetryPolicy, applyCombo };
