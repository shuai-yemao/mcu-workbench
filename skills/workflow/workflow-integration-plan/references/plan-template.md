# 集成实施计划（plan.md）

> 本模板由 `workflow-integration-plan` 按 `spec_rigor` 生成：`full` 模式完成两个方案比较、用户选择及选定方案审查；`lightweight` 模式只生成一个紧凑方案并记录其审查依据；`prototype` 不生成本文件。
>
> `spec.md` 是需求与约束依据；本文件是用户选择并审查通过后的实施路线。不得在本文件中新增 `spec.md` 之外的需求、硬件前提或验收标准。

## 1. 元数据与状态

| 字段 | 内容 |
|---|---|
| request_id | `<REQ-...>` |
| 生成时间 | `<YYYY-MM-DDTHH:mm:ss+08:00>` |
| 计划版本 | `<v0.1>` |
| 计划状态 | `selected` / `reviewing` / `approved` / `blocked` |
| 项目路径 | `<目标项目绝对路径>` |
| 分支/提交 | `<branch or commit>` |
| 输入 spec.md | `<absolute path>` |
| 输入 Review-Package | `<absolute path or artifact id>` |
| Spec 力度 | `lightweight` / `full` |
| 风险叠加门禁 | `none` / `human_review` / `versioned` / `both` |
| 选定方案 | `方案 A` / `方案 B` / `紧凑方案` |
| 方案选择人 | `<user>` |
| 用户审查状态 | `awaiting_user_review` / `approved` / `rejected` |
| 方案审查结论 | `通过` / `需修订` / `阻塞` |

## 2. 一句话说明

- 要解决的问题：`<plain-language problem>`
- 计划做什么：`<plain-language implementation summary>`
- 明确不做什么：`<non-goals>`
- 预期结果：`<observable result>`

## 3. 输入依据与工程事实

| ID | 事实或约束 | 证据（文件/配置/命令） | 可信等级 | 对计划的影响 |
|---|---|---|---|---|
| E-01 | `<fact or constraint>` | `<relative/path:line or reproducible command>` | `confirmed` / `user-confirmed` | `<impact>` |

`spec.md` 中的事实、清单 ID 和证据位置必须保留；新增项目事实必须经过当前工作区验证并标记可信等级。

## 4. 两个候选方案与用户选择记录

### 方案 A：`<name>`

- 适用场景：`<when to use>`
- 做什么：`<plain-language summary>`
- 主要改动：`<layers/directories/file types>`
- 优点：`<pros>`
- 缺点：`<cons>`
- 成本：`<implementation and verification cost>`
- 风险：`<risks>`
- 验收方式：`<verification levels and conditions>`
- 回滚方式：`<rollback>`

### 方案 B：`<name>`

- 适用场景：`<when to use>`
- 做什么：`<plain-language summary>`
- 主要改动：`<layers/directories/file types>`
- 优点：`<pros>`
- 缺点：`<cons>`
- 成本：`<implementation and verification cost>`
- 风险：`<risks>`
- 验收方式：`<verification levels and conditions>`
- 回滚方式：`<rollback>`

### 方案对比

| 维度 | 方案 A | 方案 B | 结论依据 |
|---|---|---|---|
| 易理解程度 | `<评价>` | `<评价>` | `<evidence>` |
| 改动范围 | `<评价>` | `<评价>` | `<evidence>` |
| 实现复杂度 | `<评价>` | `<评价>` | `<evidence>` |
| 运行时资源 | `<评价>` | `<评价>` | `<evidence>` |
| 架构风险 | `<评价>` | `<评价>` | `<evidence>` |
| 可验证性 | `<评价>` | `<评价>` | `<evidence>` |
| 回滚难度 | `<评价>` | `<评价>` | `<evidence>` |
| 后续扩展性 | `<评价>` | `<评价>` | `<evidence>` |

### 用户选择

```text
selected_option: A | B
decision_owner: user
decision_rationale: <用户选择理由>
rejected_option: A | B
new_constraints: <选择引入的新约束；没有则填 none>
```

## 5. 选定方案概览

- 选定方案：`<A or B>`
- 选定原因：`<plain-language rationale>`
- 与 `spec.md` 的一致性：`<how scope and constraints are preserved>`
- 施工边界：`<in-scope>`
- 非目标：`<out-of-scope>`
- 主要风险：`<risks>`

## 6. 分层、调用链与接口边界

```text
App → Service → Platform ← Impl → Vendor
```

- 目标调用链：`<confirmed call chain>`
- 各层职责：`<App/Service/Platform/Impl/Vendor responsibilities>`
- 允许依赖：`<allowed dependencies>`
- 禁止依赖：`<forbidden dependencies>`
- Wrapper/Port/Driver/Handle/Handler 边界：`<when applicable>`
- 接口输入、输出和所有权：`<ownership and lifetime>`
- 阻塞、线程安全和可重入性：`<contract>`

## 7. 文件施工顺序

| ID | 阶段 | 动作 | 文件或目录 | 所属层 | 施工内容与理由 | 责任 Skill | 前置条件 | 生成/覆盖边界 | 状态 |
|---|---|---|---|---|---|---|---|---|---|
| P-01 | `<1>` | `新增/修改/不修改` | `<relative path>` | `<layer>` | `<what and why>` | `<canonical skill>` | `<dependency>` | `<CubeMX/USER CODE/生成边界>` | `ready/blocked` |

施工顺序必须能从前置条件和依赖关系复现；不得把未确认的文件、目录或 API 写成 ready。

## 8. 阶段计划与交接

| 阶段 | 目标 | 输入 | 输出 | 完成条件 | 交接对象 |
|---|---|---|---|---|---|
| 1 | `<goal>` | `<inputs>` | `<artifacts>` | `<observable condition>` | `<skill/agent>` |

## 8A. 下游执行 Agent 与 Skill 基线

该表是下游任务拆解和单项执行的分配依据。每个阶段只能有一个主实现 Skill；辅助 Skill 只提供领域约束、验收依据或工具知识，不直接并行修改代码。

| 阶段/ID | 主 Agent | 协作 Agent | 主实现 Skill | 辅助 Skill | 分配理由与证据 | 状态 |
|---|---|---|---|---|---|---|
| `<P-01>` | `<canonical agent>` | `<agents or none>` | `<canonical implementation skill>` | `<skills or none>` | `<plan/spec/project evidence>` | `ready/blocked` |

## 9. 资源、并发与生命周期约束

- 任务、优先级、栈和周期：`<constraints>`
- 队列、通知、信号量和互斥量：`<constraints>`
- ISR 允许/禁止调用：`<constraints>`
- DMA 缓冲区、Cache、对齐和所有权：`<constraints>`
- 静态分配、内存池或堆：`<constraints>`
- 初始化、运行、错误恢复和释放顺序：`<lifecycle>`
- 超时、重试、降级和取消：`<recovery>`

## 10. 代码生成约束

| ID | 约束类别 | 必须遵守 | 禁止事项 | 证据 | 状态 |
|---|---|---|---|---|---|
| G-01 | `<layer/interface/concurrency/generation>` | `<constraint>` | `<forbidden change>` | `<spec/checklist evidence>` | `ready/blocked` |

## 11. 验收与验证计划

| ID | 证据等级 | 验收项 | 命令/条件 | 预期结果 | 责任 Skill | 产物 | 状态 |
|---|---|---|---|---|---|---|---|
| V-01 | `静态/主机/构建/目标运行/实物` | `<criterion>` | `<absolute cwd + command or hardware condition>` | `<pass condition>` | `<skill>` | `<artifact>` | `not-run/pass/fail/blocked` |

静态、主机、构建、目标运行和实物证据必须分开记录；低等级证据不能替代高等级结论。

## 12. 方案审查记录

Plan 经 H-03 用户批准后，自动进入 `workflow-task-breakdown` 和 `workflow-task-execution`。Task 生成、单项任务执行、AI 审查、测试和最终检查不设置例行用户等待；只有无法依据已批准 Spec/Plan 消除、且需要新增用户决策的硬阻塞才暂停。

| 审查项 | 责任 Agent | 结论 | 证据 | 修订或后续动作 |
|---|---|---|---|---|
| 分层和接口 | `system-architect` | `可采用/需修订/阻塞` | `<evidence>` | `<action>` |
| 文件和数据流 | `firmware-engineer` | `可采用/需修订/阻塞` | `<evidence>` | `<action>` |
| 验收和回归 | `verification-engineer` | `可采用/需修订/阻塞` | `<evidence>` | `<action>` |
| 硬件边界 | `hardware-integration` | `可采用/需修订/阻塞/不适用` | `<evidence>` | `<action>` |
| 工具链和产物 | `toolchain-engineer` | `可采用/需修订/阻塞/不适用` | `<evidence>` | `<action>` |

### 审查结论

- 可采用项：`<items>`
- 已完成修订：`<items>`
- 未关闭阻塞：`<items or none>`
- 是否改变 `spec.md`：`否 / 是，已退回 workflow-review-gate`
- 最终结论：`通过 / 阻塞`

## 13. 回滚与失败处理

- 代码或配置回滚方式：`<rollback>`
- 中途失败后的保留状态：`<state>`
- 验收失败后的定位顺序：`<sequence>`
- 不可恢复情况：`<condition and escalation>`

## 14. 下游交接

- 正式需求/约束输入：`<absolute path>/spec.md`
- 正式实施计划：`<absolute path>/plan.md`
- 阶段级 Agent/Skill 基线：`<本文件第 8A 节>`
- 每项任务的主 Agent、协作 Agent、主实现 Skill 和辅助 Skill：`<由 workflow-task-breakdown 回填到 task.md>`
- 执行分配规则：`workflow-task-execution` 在同一时刻只修改一个任务的范围，先复核分配，再交给一个主实现 Skill；任务通过后在 `auto_until_final_check` 模式自动继续，辅助 Skill 不直接并行改代码
- 目标文件范围：`<files>`
- 执行前必须确认：`<facts>`
- 禁止扩大：`<scope and boundary>`
- 实现完成后交接：`workflow-final-review`
- 未验证项：`<items>`
- 回传规则：`<new facts or scope changes return to workflow-review-gate>`

## 15. 当前状态与下一步

- 当前状态：`approved / blocked`
- 当前唯一动作：`<分发实现 Skill / 回传 Review Gate / 等待补证>`
- 阻塞项：`<none or blockers>`
