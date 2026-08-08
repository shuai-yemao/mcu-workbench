/**
 * qemu 目标适配器 —— Cortex-M 仿真(阶段 2 占位,真实仿真执行待阶段 3 评测体系)。
 * requires: qemu-system-arm。
 */

/**
 * @returns {import('../../contracts/target-contract').TargetAdapter & { requires: string[] }}
 */
function createQemuTarget() {
  return {
    id: 'qemu-stm32f4',
    requires: ['qemu-system-arm'],

    capabilities() {
      return {
        id: 'qemu-stm32f4',
        kind: 'sim',
        mcu: 'STM32F4',
        toolchains: ['arm-none-eabi-gcc'],
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

module.exports = { createQemuTarget };
