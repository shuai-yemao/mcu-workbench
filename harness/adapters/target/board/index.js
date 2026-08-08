/**
 * board 目标适配器 —— 真实板卡(工厂,参数化 mcu/toolchain/flasher)。
 * 阶段 2 占位:flash/exec 空实现;真实烧录走主插件 tools-flash 能力(阶段 3 接入)。
 * requires: flasher 命令(st-flash 等)。
 */

/**
 * @param {{ id: string, mcu: string, toolchain: string, flasher: string }} opts
 * @returns {import('../../contracts/target-contract').TargetAdapter & { requires: string[] }}
 */
function createBoardTarget({ id, mcu, toolchain, flasher }) {
  return {
    id,
    requires: [flasher],

    capabilities() {
      return {
        id,
        kind: 'board',
        mcu,
        toolchains: [toolchain],
        measurable: ['accuracy', 'latency', 'ram', 'flash', 'power']
      };
    },

    async build() {
      return { ok: true };
    },

    async flash() {
      return { ok: true };
    },

    async exec() {
      return { ok: true, outputs: {} };
    },

    async measure({ metrics }) {
      const values = {};
      for (const metric of metrics) values[metric] = 0;
      return { ok: true, metrics: values };
    }
  };
}

module.exports = { createBoardTarget };
