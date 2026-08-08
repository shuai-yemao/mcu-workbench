/**
 * eval 阶段 —— 评测(引擎 evaluate → eval-report;Gate 阈值在 runner 层判定)。
 */

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

    const payload = await engine.evaluate({ bundle, target, dataset });
    return ctx.store.writeArtifact({
      kind: payload.kind,
      content: payload.content,
      labels: payload.labels,
      lineage: [bundle.id, dataset.id],
      producer: { stage: 'eval', runId: ctx.run.runId, engine: engine.id }
    });
  }
};
