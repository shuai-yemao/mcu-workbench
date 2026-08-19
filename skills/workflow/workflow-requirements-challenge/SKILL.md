---
name: workflow-requirements-challenge
description: 需求约束后的澄清、目的与可行性质疑：先读取仓库规则和项目证据，通过每轮最多四个高影响问题完善 RCP，输出带证据的质疑结论并交给 workflow-review-gate；适用于进入代码前审查的架构、固件、硬件、工具链和插件变更请求。不得生成代码、设计方案或直接分发实现 Skill。
---

# 需求澄清与质疑

## 正式输出边界

本 Skill 只更新内部 RCP 状态，不生成或要求用户阅读 RCP Markdown。澄清问题、用户回答、证据等级、目的质疑、可行性质疑和阻塞项必须写入内部 Workflow State；完成后由 Review Gate 将有效约束整合到详细 `spec.md`。

## 职责与边界

本 Skill 位于 `workflow-requirements-router` 与 `workflow-review-gate` 之间。它把已经完成最小约束收集的需求转化为受控的工程约束和审查输入，不替代需求 Router、代码前审查门禁或集成规划。

本 Skill 负责：

- 质疑需求要解决的问题、预期价值和成功标准；
- 根据项目证据检查技术可行性、边界、依赖、资源和验证条件；
- 输出需求目的、可行性、范围和验收缺口的证据化结论；
- 将澄清问答、未决风险和补证结果回填 RCP；
- 在 RCP 完成后交给 `workflow-review-gate`，不在本 Skill 内进行方案选择。

本 Skill 不负责：

- 代替 `workflow-requirements-router` 收集完整项目约束；
- 生成代码、修改项目源码、构建、烧录或声称目标板验证通过；
- 直接交接 `workflow-integration-plan` 或任何实现层 Skill；
- 生成方案 A/B、推荐方案或要求用户选择方案；
- 用推测补齐 HAL、RTOS、板级资源、构建命令或验收证据。

## 固定输入

至少读取以下输入：

1. Router 生成的初步 RCP；
2. RCP 引用的项目文件、配置、日志或可复现命令；
3. 已有设计或实现方案（如果用户已经提供）。

RCP 的字段语义以 [`rcp-template.md`](../workflow-requirements-router/references/rcp-template.md) 为准，但 RCP 只作为内部状态，不作为用户项目 Markdown 输出。Router 交付的 RCP 状态为 `preliminary`；完成补证并形成目的/可行性质疑结论后，才形成可交给 `workflow-review-gate` 的正式内部 RCP。本 Skill 不包含方案选择或用户决策字段。必须同时读取 [`spec-rigor-by-risk.md`](../workflow-requirements-router/references/spec-rigor-by-risk.md)，复核 `spec_rigor`、`spec_overlays`、风险原因和升级触发条件；不得为了减少文档工作量而降低风险等级。

## 需求变化门禁

如果用户在代码施工过程中提出新需求，或改变范围、业务规则、状态/权限、接口约束、资源边界或验收标准，必须先停止实现层工作。先将变化记录为 RCP 变更，重新完成本 Skill 的补证和质疑，再交给 `workflow-review-gate` 更新 Review-Package 和 `spec.md`；Spec 未重新放行前不得修改代码、`plan.md` 或 `task.md` 的施工范围。

如果只是发现已有代码不满足未变化的 Spec，则不属于需求变化，可以回到任务执行流程先补失败测试，再在原范围内修复。不能把新需求伪装成代码缺陷，也不能先改代码再补写 Spec。

## RCP 完善问答阶段

本 Skill 不应拿到初步 RCP 后立即形成最终结论。先读取当前仓库和已有项目规则，执行 RCP 完整性检查，并通过分轮澄清问答把 RCP 补齐。

### 完整性检查

按以下顺序检查：

1. 项目绝对路径、分支/提交、芯片、板卡和目标交付物；
2. 当前问题、目标、成功标准和明确排除范围；
3. 硬件资源、软件环境、OS/RTOS、工具链和可用观测通道；
4. 功能、非功能、资源、实时性、并发、ISR、DMA 和内存约束；
5. App → Service → Platform ← Impl → Vendor 分层及允许/禁止依赖；
6. 验收等级、可复现命令、目标运行条件和实物证据边界；
7. 所有会改变方案、施工范围或验收结论的 `inferred`/`unverified` 项；
8. Spec 力度是否与风险匹配：任务类型、跨模块/跨层影响、不可逆性、敏感数据、协作复杂度、验证难度及 ISR/DMA/内存/实时性等工程风险。

能由项目文件、配置、日志或可复现命令确认的内容，先自行读取并回填 RCP；只有无法从项目确认且会影响决策的内容才询问用户。

### 分轮澄清问答

如果存在关键缺口：

1. 将状态置为 `待补证`；
2. 读取仓库规则、项目结构、现有实现、配置和验证入口；
3. 从以下四类中选择当前真正影响实现的缺口：
   - 第一版范围和非目标；
   - 关键业务规则；
   - 空状态、失败状态和权限边界；
   - 可以验证的验收标准。
4. 每轮最多提出 4 个问题；问题不足 4 个时不得为了凑数增加低价值问题；
5. 每个问题说明为什么需要、会影响哪些 RCP 字段，并给出基于现有证据的推荐；
6. 推荐是待用户确认的建议，不得当作 `confirmed` 或 `user-confirmed` 事实；
    7. 暂停形成质疑结论，等待用户回答；
8. 将每个回答分别回填 RCP 的人工补证记录及对应约束域，可信等级标记为 `user-confirmed`；
9. 重新执行完整性检查，继续下一轮澄清或形成质疑结论。

每个澄清问题必须记录：

```text
question_id:
category: scope | business-rule | state-permission | acceptance
question:
why_needed:
recommendation:
user_answer:
decision_owner: user
confidence: user-confirmed
affected_rcp_fields:
status: 已提问 | 已回答 | 已回填
```

澄清问题的推荐应优先选择能缩小第一版范围、减少实现歧义、明确失败恢复或形成可复现验收条件的答案。若项目证据已经足以确认某项，直接回填为 `confirmed`，不得重复询问用户。

    只有以下条件全部满足，才能从 `待补证` 进入质疑结论阶段：

    - 影响后续施工或审查的关键事实已达到 `confirmed` 或 `user-confirmed`；
- 目标、成功标准、范围和明确排除项已经记录；
- 分层、资源、并发和生命周期边界可以描述；
- 验收等级和验证条件可以区分；
- 没有未关闭的关键阻塞项。

如果用户暂时无法回答，保留问题、影响和阻塞状态，不得用推测补齐 RCP，也不得为了绕过补证而生成不可审计的实现方案或选择题。

## 质疑顺序

### 1. 目的质疑

依次检查：

- 当前需求描述的是问题、手段，还是某个预设实现；
- 谁受到问题影响，问题的工程影响是什么；
- 如果不做，实际风险、成本或验收损失是什么；
- 成功标准是否可观察、可测量、可复现；
- 是否存在更小范围的需求可以达到同一目的。

结论必须区分 `confirmed`、`user-confirmed`、`inferred` 和 `unverified`。目的不清时，不得把实现偏好写成需求事实。

### 2. 可行性质疑

至少检查：

- 现有项目、硬件、OS/RTOS、工具链和依赖是否提供必要前提；
- 目标方案是否违反 App → Service → Platform ← Impl → Vendor 依赖方向；
- 是否涉及未确认的 HAL、板级绑定、DMA、ISR、任务、锁或内存所有权；
- 资源、实时性、功耗、可靠性和并发约束是否可满足；
- 每个关键结论能否由静态、主机、交叉构建、目标运行或实物证据验收。

把“无法证明”记录为风险或阻塞，不把静态分析、主机测试或文档描述写成硬件结论。

### 3. 范围质疑

识别：

- 必须做、应该做和可以延后的内容；
- 直接范围、间接影响和明确不包含的内容；
- 前置条件、外部依赖、并行关系和阻塞项；
- 是否存在越层调用、重复实现、过度抽象或无法回滚的改动。

## 质疑结论与交接判定

只有 RCP 完成上述补证门禁后，才能形成最终质疑结论。本节只输出基于证据的约束、风险和缺口，不生成方案 A/B，不给出方案推荐，也不要求用户选择。

必须明确记录：

```text
purpose_conclusion: confirmed | user-confirmed | inferred | unverified
feasibility_conclusion: 可行 | 有条件可行 | 阻塞
scope_conclusion: <第一版范围与非目标是否清晰>
acceptance_gaps: <尚不能验证的验收项>
unresolved_risks: <未关闭风险>
required_review_gate_checks: <交给 Review Gate 的审查重点>
handoff_status: 可交接 | 阻塞
```

如果仍存在会改变施工范围、约束或验收结论的未决问题，保持 `阻塞` 并回传 Router 补证；不得通过生成多个方案或让用户选择来替代事实确认。方案设计和实现层分发由后续流程负责。

## 输出格式

固定输出以下结构：

```text
状态：分析中 | 待补证 | 可交接 | 阻塞
输入 RCP：<绝对路径或稳定产物标识>
参与 Agent：embedded-lead + 领域 Agent
已读证据：<绝对路径、配置键、命令或日志>

RCP 完整性检查：
- 已确认约束域：<domains>
- 尚缺约束域：<domains>
- 当前状态：<待补证/可形成质疑结论>
- 本轮澄清问题（最多 4 个）：<questions or none>

目的质疑：
- 需求目的：
- 关键疑点：
- 目的结论：

可行性质疑：
- 已确认前提：
- 风险与缺口：
- 可行性结论：

质疑结论：<目的、可行性、范围和验收结论>
RCP 回填：<challenge_result、补证记录、未决风险>
下游交接：<RCP 完成后交 workflow-review-gate；不得直接交实现层>
验证边界：<尚需静态/主机/构建/目标/实物证据>
下一步：<下一轮澄清问题或交给 workflow-review-gate 的最小动作>
```

Agent 协作输出仍必须包含 `Summary`、`Evidence`、`Changed files`、`Tests`、`Artifacts`、`Blockers` 和 `Next handoff`。本 Skill 默认只读，不产生代码文件；`Changed files` 应为 `none`，除非用户明确授权更新需求文档。

## 交接契约

选择完成后：

1. 将澄清问答、目的/可行性结论、验收缺口和未决风险写入 RCP；
2. 将完成补证后的 RCP 和本 Skill 的质疑结果交给 `workflow-review-gate`；
3. 由 `workflow-review-gate` 审查 RCP 和既有实现方案的工程证据并判定放行或阻塞；
4. 只有用户批准 H-01、且 Review Gate 完成后，才由 `workflow-integration-plan` 做分层审计、文件级计划和唯一实现层 Skill 分发。

如果 `workflow-review-gate` 发现新约束，必须回传 Router/本 Skill 更新 RCP，不得静默扩大施工范围或替用户补写事实。

## 验收标准

    - 需求没有完成最小 RCP 时，不能直接形成质疑结论；
    - 形成质疑结论前必须先完成 RCP 完整性检查；
- 每轮最多提出 4 个真正影响实现的问题，并在用户回答后分别回填 RCP；
- 澄清问题必须覆盖第一版范围/非目标、业务规则、状态/权限和可验证验收标准四类缺口；
- 每个问题必须说明影响并给出推荐，推荐不得冒充已确认事实；
- 能由项目证据确认的内容不得重复询问用户；
- 每个澄清问题都记录类别、原因、推荐、回答、影响字段和 `user-confirmed` 可信等级；
- 目的和可行性都被明确质疑，并携带证据等级；
- 本 Skill 不生成方案 A/B、不推荐方案、不要求用户选择；
- 完成 RCP 补证和质疑结论后才能进入 Review Gate；
- Review Gate 接收的是无方案选择依赖的正式 RCP；
- H-01～H-03 是唯一的例行用户审查闸门；Task 生成、任务执行和最终检查不设置逐项用户等待。
    - 质疑结论中的 `inferred`/`unverified` 内容不会被表述为已验证事实；
- 本 Skill 不生成代码、不构建、不烧录、不替代最终 Review。
