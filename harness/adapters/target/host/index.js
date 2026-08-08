/**
 * host 目标适配器 —— 阶段 1 首个目标(PC 模拟,无板评测)。
 * build/flash 为空实现(host 无需编译烧录);exec/measure 最小占位。
 */

/**
 * @returns {import('../../contracts/target-contract').TargetAdapter}
 */
function createHostTarget() {
  return {
    id: 'host',

    capabilities() {
      return {
        id: 'host',
        kind: 'host',
        toolchains: ['gcc'],
        measurable: ['accuracy', 'latency', 'ram']
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

module.exports = { createHostTarget };
