/**
 * collect 阶段 —— 数据采集(最小实现:合成数据集占位)。
 * 真实传感器采集/导入在阶段 2(数据集管理)接入。
 */

module.exports = {
  id: 'collect',
  inputs: [],
  output: 'dataset',

  /**
   * @param {{ stage: object, store: object, run: object }} ctx
   */
  async run(ctx) {
    const config = ctx.stage.config || {};
    const samples = config.samples || 100;
    const content = JSON.stringify({
      kind: 'synthetic',
      samples,
      note: 'MVP: 合成数据集占位,阶段 2 接入真实采集'
    });
    return ctx.store.writeArtifact({
      kind: 'dataset',
      content,
      lineage: [],
      producer: { stage: 'collect', runId: ctx.run.runId }
    });
  }
};
