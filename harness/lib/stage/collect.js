/**
 * collect 阶段 —— 数据采集。
 * 两种模式:
 *   - config.datasetDir:导入本地数据目录(登记清单+哈希,不复制文件;split 可选)
 *   - config.samples:合成数据集(默认,MVP 占位)
 * 数据集划分/校准集由 dataset-manager 提供(splitDataset / makeCalibrationSet)。
 */

const { importDir } = require('../dataset/dataset-manager');

module.exports = {
  id: 'collect',
  inputs: [],
  output: 'dataset',

  /**
   * @param {{ stage: object, store: object, run: object }} ctx
   */
  async run(ctx) {
    const config = ctx.stage.config || {};
    if (config.datasetDir) {
      return importDir({
        store: ctx.store,
        runId: ctx.run.runId,
        dir: config.datasetDir,
        split: config.split || 'train',
        maxFiles: config.maxFiles
      });
    }
    const samples = config.samples || 100;
    const content = JSON.stringify({
      kind: 'synthetic',
      samples,
      note: '合成数据集占位;真实数据用 config.datasetDir 导入',
      split: 'train'
    });
    return ctx.store.writeArtifact({
      kind: 'dataset',
      content,
      lineage: [],
      labels: { split: 'train' },
      producer: { stage: 'collect', runId: ctx.run.runId }
    });
  }
};
