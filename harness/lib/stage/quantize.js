/**
 * quantize 阶段 —— 量化(调引擎 quantize,产物由本 stage 落盘保证血缘)。
 */

module.exports = {
  id: 'quantize',
  inputs: ['model', 'dataset'],
  output: 'quantized-model',

  /**
   * @param {{ stage: object, registry: object, store: object, run: object, inputs: object }} ctx
   */
  async run(ctx) {
    const engine = ctx.registry.getEngine(ctx.stage.engineId);
    if (!engine) throw new Error(`engine not found: ${ctx.stage.engineId}`);
    const model = ctx.inputs['model'];
    if (!model) throw new Error('quantize requires a completed model stage');

    const payload = await engine.quantize({
      artifact: model,
      dataset: ctx.inputs['dataset'],
      scheme: ctx.stage.scheme || 'int8'
    });
    return ctx.store.writeArtifact({
      kind: payload.kind,
      content: payload.content,
      labels: payload.labels,
      lineage: [model.id],
      producer: { stage: 'quantize', runId: ctx.run.runId, engine: engine.id }
    });
  }
};
