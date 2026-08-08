---
name: harness-pipeline
description: 嵌入式 AI 流水线编排入口。当用户需要把 AI 模型落地到嵌入式目标(数据→训练→量化→集成→验证)并产出可审计评测报告时使用;由 agent 直接调用 harness lib Programmatic API 编排,无 CLI。
---

# Harness Pipeline 编排

嵌入式 AI 开发流程自动化(ADR H13:无 Node CLI,lib API + skill 编排)。

## 流程

```text
createPipeline → plan → run → report
```

1. **定位产物根**:目标工程 `.mcu-workbench/`(不存在则创建)。
2. **载入 pipeline**:读取/构造 `pipeline.json`(结构见下文),调 `createPipeline(spec)` 校验结构。
3. **规划校验**:调 `plan()`,能力不匹配(量化方案/算子/目标/可测指标)在规划期报错,不拖到运行期。
4. **执行**:`await run()`;产物写 `.mcu-workbench/artifacts/<kind>/<id>/`(内容寻址,不可变),Run 记录写 `.mcu-workbench/runs/`。
5. **门禁**:每阶段产物过三层 Gate(schema → checksum → 阈值)。gate 不通过 → stage=gated、run=failed,必须解决后 `resume({ runId })` 从失败阶段续跑,不重跑已完成阶段。
6. **报告**:`report({ runId })` 取 eval-report 摘要,作为最终交付证据。

## Programmatic API(供 agent 直调)

```js
const path = require('path');
const { createHarness } = require('./harness/lib'); // 相对目标工程解析

const h = createHarness({ baseDir: path.join(process.cwd(), '.mcu-workbench') });
h.createPipeline({
  schemaVersion: '1.0',
  name: 'keyword-spotting',
  stages: [
    { id: 'collect',   config: { samples: 5000 } },
    { id: 'train',     executor: 'mock' },
    { id: 'quantize',  engine: 'tflm', scheme: 'int8' },
    { id: 'integrate', engine: 'tflm' },
    { id: 'eval',      engine: 'tflm', target: 'host', metrics: ['accuracy', 'latency', 'ram'] }
  ],
  gates: { minAccuracy: 0.9 }
});
const plan = h.plan();            // 能力静态校验
const run = await h.run();        // 执行(返回 run 记录,含各 stage gate 结果)
const { evalReport } = h.report({ runId: run.runId });
```

## Gate 解读与交接

- `stage.gate`:三层判定结果(`pass/reasons/evidence`);evidence ∈ schema|checksum|threshold
- run 记录是**单一事实源**:pipeline 名、各 stage 状态/产物 id/gate/错误、时间戳
- 产物血缘:每个 artifact 的 `lineage` 回答"从哪来",`checksum` 防篡改——评测证据可审计
- 交付:eval-report + run 记录路径,交接给 `workflow-final-review` 或 `tools-quality` 作为发布门禁输入(ADR H05)

## 边界

- 本 skill 只编排 harness 流水线;固件开发流程仍走现有 workflow 五入口,交接点在 integrate 产物
- train 阶段 MVP 支持 `mock` / `local:<cmd>` executor;真实训练接入既有流程,不重复造框架
- 引擎/目标当前内置 tflm × host;新增适配器走 `registry.registerEngine/registerTarget`(契约见 harness/lib/contracts/)
