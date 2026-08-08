/**
 * quantize 阶段 —— 量化(调引擎 quantize,产物由本 stage 落盘保证血缘)。
 * D2-4:校准集自动挂载——优先用数据集的 calibration 子集(resolveCalibrationSet)。
 */

const { resolveCalibrationSet } = require('../dataset/dataset-manager');

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

    const calibration = await resolveCalibrationSet({ store: ctx.store, datasetRef: ctx.inputs['dataset'] });
    const payload = await engine.quantize({
      artifact: model,
      dataset: calibration || ctx.inputs['dataset'],
      scheme: ctx.stage.scheme || 'int8'
    });
    return ctx.store.writeArtifact({
      kind: payload.kind,
      content: payload.content,
      labels: payload.labels,
      lineage: [model.id, calibration ? calibration.id : ctx.inputs['dataset'] ? ctx.inputs['dataset'].id : undefined].filter(Boolean),
      producer: { stage: 'quantize', runId: ctx.run.runId, engine: engine.id }
    });
  }
};
