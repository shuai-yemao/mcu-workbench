/**
 * train 阶段 —— 模型训练(executor 抽象,ADR:train 不绑引擎)。
 * MVP 支持两种 executor:
 *   - "mock":内置模拟训练(端到端演示/测试用,零外部依赖)
 *   - "local:<cmd>":执行本地命令(如 python3 train.py),接入既有训练流程
 * 远程 executor(remote:<api>)留待后续阶段。
 */

const { execSync } = require('child_process');

module.exports = {
  id: 'train',
  inputs: ['dataset'],
  output: 'model',

  /**
   * @param {{ stage: object, store: object, run: object, inputs: object }} ctx
   */
  async run(ctx) {
    const dataset = ctx.inputs['dataset'];
    const executor = ctx.stage.executor || 'mock';
    let content;

    if (executor === 'mock') {
      content = JSON.stringify({
        engine: 'none',
        op: 'train',
        dataset: dataset ? dataset.id : undefined,
        mock: true,
        epochs: 10,
        finalAccuracy: 0.96
      });
    } else if (executor.startsWith('local:')) {
      const cmd = executor.slice('local:'.length);
      content = execSync(cmd, { encoding: 'utf8', maxBuffer: 1 << 20 });
    } else {
      throw new Error(`unsupported executor: ${executor}(MVP 支持 mock / local:<cmd>)`);
    }

    return ctx.store.writeArtifact({
      kind: 'model',
      content,
      lineage: dataset ? [dataset.id] : [],
      producer: { stage: 'train', runId: ctx.run.runId }
    });
  }
};
