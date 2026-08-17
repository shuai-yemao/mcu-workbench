# Spec 开发力度与风险分级

## 目的

Spec 的力度必须与风险匹配：低风险、短生命周期工作减少文档负担；跨模块、不可逆、
敏感或多人协作工作增加约束、审查和验证。所有请求仍需经过 RCP 的事实与证据分诊，
但不再默认所有请求都生成同等重量的正式交付物。

## 基础力度

| 任务类型 | `spec_rigor` | 最小记录/交付物 | 是否进入代码施工 |
|---|---|---|---|
| 一次性原型、实验、明确不进入生产的验证 | `prototype` | 一段说明目标、临时边界、有效期和明确不承诺的内容；保留在 RCP/会话记录中 | 默认不进入正式代码施工；若转生产，必须升级 |
| 小型局部功能、单层、低耦合、可快速回滚 | `lightweight` | `spec.md`：范围、非目标、3–5 条验收标准、风险和回滚方式 | 可进入单项、局部施工；不得跨层或扩展为隐含需求 |
| 跨模块、跨层、公共接口、持久化状态、硬件/RTOS 资源或长期维护功能 | `full` | `spec.md`、`plan.md`、`task.md`、测试/检查证据 | 可以进入完整实施链路 |

项目正式任务文件沿用仓库规范的 `task.md`；外部材料出现 `tasks.md` 时只作为同义称呼，
不得因此改变既有项目文件契约。

## 风险叠加项

基础力度确定后，遇到以下风险必须追加门禁，不得降级：

| 风险信号 | 追加要求 |
|---|---|
| 支付、权限、隐私、密钥、身份、审计或合规 | `human_review`：完整 Spec + 人工审查；记录威胁、失败场景、审计要求和验证证据 |
| 多人或多 Agent 开发、长周期维护、多个仓库/团队依赖 | `versioned`：记录明确依赖、负责人、交接物、版本/提交和变更记录 |
| ISR/DMA、并发、内存所有权、实时性、启动/OTA、故障安全或关键硬件边界 | 至少升级到 `full`；按影响增加人工审查和目标/实物验证 |
| 不可逆数据变更、破坏兼容性、公共 API 或安全边界变化 | 至少 `full + human_review` |

多个叠加项同时命中时合并要求。`prototype` 不能覆盖敏感、不可逆或生产风险；
一旦原型结果要进入生产，必须重新走 `full` 及适用叠加项。

## 选择算法

1. 先根据任务类型选择基础 `spec_rigor`。
2. 再扫描影响范围、不可逆性/敏感性、协作复杂度、验证难度和工程资源风险。
3. 取最高基础力度，并合并全部叠加项；信息不足时按较高风险处理并提出补证问题。
4. 将 `spec_rigor`、`spec_overlays`、升级原因、最小交付物和降级/升级触发条件写入 RCP。
5. `workflow-review-gate` 复核选择；任何下游 Skill 不得自行降低力度。

## 门禁与交接

- `prototype`：RCP 记录最小提示词和临时边界后结束，不能分发实现 Skill。
- `lightweight`：Review Gate 仍必须放行精简 `spec.md`；若发现跨模块、跨层或资源风险，
  立即升级为 `full`，再进入 `plan.md`/`task.md` 链路。
- `full`：按现有 Review-Package → `spec.md` → `plan.md` → `task.md` → 执行 → 最终审查链路。
- `human_review`：人工审查结论是放行条件，不得由 Agent 自行代签。
- `versioned`：没有版本、负责人、依赖和变更记录时保持阻塞。

## 固定字段

```text
spec_rigor: prototype | lightweight | full
spec_overlays: [] | [human_review] | [versioned] | [human_review, versioned]
risk_reasons: <命中的风险信号及证据>
minimum_artifacts: <本次最低交付物>
escalation_triggers: <何时必须升级力度>
approval_required: none | review-gate | human-review
```
