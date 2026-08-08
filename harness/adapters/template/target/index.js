/**
 * 目标适配器模板 —— 复制本文件到你的适配器目录(如 adapters/target/my-board/index.js),
 * 按注释替换实现。校验:node scripts/validate-harness-adapter.js --kind target <路径>
 * 契约见 docs/embedded-ai-harness-contributing.md 与 harness/lib/contracts/target-contract.ts。
 */

/**
 * 目标工厂 —— 必须导出(名称 create*Target)。
 * kind: host(PC 模拟) | sim(仿真) | board(真实板卡)
 * @returns {import('../../../contracts/target-contract').TargetAdapter & { requires: string[] }}
 */
function createTemplateTarget() {
  return {
    /** 唯一 id:planner/registry 按此引用(如 pipeline.stages[].target) */
    id: 'template-target',

    /** 工具链依赖声明(可选):缺失时 registry 标记不可用 */
    requires: [],

    capabilities() {
      return {
        id: 'template-target',
        kind: 'host',
        mcu: undefined,
        toolchains: ['gcc'],
        /** 可测量指标:accuracy | latency | ram | flash | power */
        measurable: ['accuracy', 'latency', 'ram']
      };
    },

    /** 编译固件(host 可空实现) */
    async build() {
      return { ok: true };
    },

    /** 烧录(host 空实现;board 调 st-flash/esptool 等) */
    async flash() {
      return { ok: true };
    },

    /** 执行推理/采集 */
    async exec() {
      return { ok: true, outputs: {} };
    },

    /** 测量指标 */
    async measure({ metrics }) {
      const values = {};
      for (const metric of metrics) values[metric] = 0;
      return { ok: true, metrics: values };
    }
  };
}

module.exports = { createTemplateTarget };
