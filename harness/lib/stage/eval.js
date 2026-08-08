/**
 * eval 阶段 —— 评测编排(契约修正 #2 后的评测入口)。
 * 由 measurement provider(mock / local:<cmd>)完成测量,产出 eval-report artifact;
 * 引擎不再承担 evaluate——评测是跨引擎的共性协议。
 * Gate 阈值与基线回归在 runner 层判定。
 */

const { runMeasurement } = require('../eval/measurement');

module.exports = {
  id: 'eval',
  inputs: ['runtime-bundle', 'dataset'],
  output: 'eval-report',

  /**
   * @param {{ stage: object, registry: object, store: object, run: object, inputs: object }} ctx
   */
  async run(ctx) {
    const engine = ctx.registry.getEngine(ctx.stage.engineId);
    if (!engine) throw new Error(`engine not found: ${ctx.stage.engineId}`);
    const target = ctx.registry.getTarget(ctx.stage.targetId);
    if (!target) throw new Error(`target not found: ${ctx.stage.targetId}`);
    const bundle = ctx.inputs['runtime-bundle'];
    const dataset = ctx.inputs['dataset'];
    if (!bundle || !dataset) throw new Error('eval requires completed integrate (bundle) and collect (dataset) stages');

    const metrics = runMeasurement({
      mode: ctx.stage.measurement || 'mock',
      bundle,
      dataset
    });
    const content = JSON.stringify({
      engine: engine.id,
      target: target.capabilities().id,
      dataset: dataset.id,
      model: bundle.id,
      ...metrics
    });
    return ctx.store.writeArtifact({
      kind: 'eval-report',
      content,
      lineage: [bundle.id, dataset.id],
      producer: { stage: 'eval', runId: ctx.run.runId, engine: engine.id }
    });
  }
};
