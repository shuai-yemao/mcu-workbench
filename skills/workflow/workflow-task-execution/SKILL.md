---
name: workflow-task-execution
description: 在 Plan 用户批准后，以 auto_until_final_check 模式按 task.md 的依赖顺序连续执行实施任务；内部每次只处理一个任务，先依据 plan.md/task.md 分配所需 Agent、主实现 Skill 和辅助 Skill，再补充证明当前行为缺失的测试，实施、AI 审查、检查、更新 task.md 状态并自动推进；发现 Spec 矛盾或关键决定缺失时立即阻塞，不自行扩展范围。
---

# 任务单项执行

## Task 测试与最终 Verify 边界

当前任务的执行顺序固定为：必要的失败测试/检查 → 实现当前 Task → 测试当前 Task → AI 审查 → 记录结果。Task 级测试不等同最终 Verify；只有全部 Task 完成并通过各自测试后，才能进入最终 Verify。Verify 对照 Spec 验收标准审查整体结果，发现偏差必须回到 Spec，不能在 Verify 阶段直接修补后放行。

## 适用范围

本 Skill 位于 `workflow-task-breakdown` 与具体实现层 Skill 之间，负责读取 `plan.md` 的阶段级基线和 `task.md` 的任务级分配，为当前任务确定所需 Agent、一个主实现 Skill 和必要辅助 Skill，再逐项交给实现 Skill 执行并控制验证闭环。本 Skill 不重新拆解任务、不选择方案、不修改 `spec.md` 或 `plan.md` 的范围，不代替实现 Skill 编写业务代码。

固定输入：

```text
<project_root>/00_Docs/04_需求文档/spec.md
<project_root>/00_Docs/04_需求文档/plan.md
<project_root>/00_Docs/04_需求文档/task.md
```

## 前置门禁

开始任何任务前必须读取：

1. 项目规则和目标工程 `AGENTS.md`/等效约束；
2. `spec.md` 的范围、非目标、关键业务规则、权限/状态边界和验收标准；
3. `plan.md` 的选定方案、文件范围和实施顺序；
4. `task.md` 的任务依赖、当前状态、任务级 Agent/Skill 分配和上一次运行记录；
5. 当前工作区 `git status`、相关源码、测试入口和构建配置。

以下任一条件不满足时，状态为 `阻塞`，不得修改代码：

- `spec.md`、`plan.md` 或 `task.md` 缺失、过期或状态未达到交接要求；
- `plan.md` 缺少当前阶段的 Agent/Skill 基线，或 `task.md` 缺少可追溯的任务级分配；
- 分配的 Agent 不在已注册 Agent 集合中、主实现 Skill 不在 canonical Skill 集合中，或存在多个主实现 Skill；
- 当前任务的前置任务没有 `pass`/`完成` 证据；
- 当前任务不是依赖图中最早的可执行任务；
- Spec 内存在互相矛盾的范围、约束、状态、权限、接口或验收要求；
- 缺少会影响实现的关键决定，例如接口所有权、错误行为、权限边界、资源归属、线程模型、目标平台或验收条件；
- 当前任务需要扩大 `spec.md`/`plan.md` 范围才能完成。

阻塞时必须指出冲突/缺口、证据位置、影响任务和需要谁作决定；不得自行选择解释、扩大范围或继续后续任务。

## 需求变化硬门禁

执行期间出现新需求，或用户/项目事实改变 `spec.md` 的范围、业务规则、状态/权限、接口、资源边界或验收标准时，立即将当前任务置为 `blocked` 并停止代码修改。先回传 `workflow-requirements-challenge`/`workflow-review-gate` 更新并重新放行 Spec；如果风险使 `spec_rigor` 或 `spec_overlays` 升级，再由 `workflow-integration-plan` 更新 `plan.md`、`workflow-task-breakdown` 更新 `task.md`，最后重新分配和执行任务。

不得先改代码再补写 Spec，不得通过勾选任务、修改任务描述或增加临时验收项绕过门禁。已有未提交改动只能在重新读取最新 Spec 后重新评估，未经授权不得丢弃。若需求未变化而只是实现不满足 Spec，才执行本 Skill 已规定的“先补失败测试、再实现、再验证”流程。若施工中发现局部任务实际触及跨层、公共接口、敏感/不可逆操作或关键硬件资源，必须暂停并升级 Spec 力度，不得继续按 lightweight 施工。

## SOLID 硬门禁

每个任务都必须遵守 [SOLID 代码施工硬门禁](../workflow-review-gate/references/solid-code-gate.md)。开始实现前确认任务涉及的 SRP、OCP、LSP、ISP、DIP
及其验收证据；执行后逐项回写 `solid_status`、证据位置和未验证项。若发现职责混杂、
扩展点破坏、替换契约不成立、接口过胖或高层依赖具体实现，立即置为 `blocked`，不得
用注释、任务状态或临时测试绕过。

## Agent 与 Skill 分配协议

分配的目的是让当前任务拥有清晰的执行责任和所需知识边界；它不是把多个 Agent 或 Skill 并行派去修改同一份代码。

### 分配来源与优先级

按以下优先级形成当前任务的分配：

1. `task.md` 当前任务的 `owner_agent`、`support_agents`、`owner_skill`、`supporting_skills`；
2. `plan.md` 对应阶段的 Agent/Skill 基线；
3. 目标项目规则、真实文件、构建/测试入口和任务所属层的证据。

如果任务级分配缺失，但阶段级基线和项目证据能够唯一确定分配，可以补齐并回写 `task.md`；如果存在多个合理主 Agent、多个主实现 Skill，或需要新增未确认的 Agent/Skill，必须阻塞并回传 `workflow-task-breakdown` 或 `workflow-integration-plan`。

### 分配结果

当前任务必须形成以下分配记录：

```text
allocation_id: <task_id + execution timestamp>
primary_agent: <one canonical agent>
support_agents: <zero or more canonical agents>
primary_implementation_skill: <one canonical implementation Skill>
supporting_skills: <zero or more canonical Skills>
allocation_basis: <plan/task/spec/project evidence>
scope_boundary: <what the assigned agents and Skills may do>
```

主 Agent 对当前任务结果负责；协作 Agent 只提供审查、硬件、工具链、验证或领域意见。主实现 Skill 是唯一允许实际修改当前任务代码的 Skill；辅助 Skill 只能提供约束、接口知识、验证依据或工具使用规则，不得擅自扩大文件范围或并行改代码。

可分配的 canonical Agent 必须来自当前插件已注册集合，例如 `embedded-lead`、`system-architect`、`firmware-engineer`、`hardware-integration`、`toolchain-engineer`、`verification-engineer` 和 `knowledge-engineer`；可分配 Skill 必须能在当前 catalog 中解析。不能把不存在的角色名或临时提示词写成分配结果。

## 自动任务执行规则

Plan 通过后，执行模式为 `auto_until_final_check`。每次内部仍只处理一个任务并完整记录，但任务通过后自动选择下一个依赖已满足的任务，不等待用户逐项审查：

1. 从 `task.md` 中选择依赖已完成、状态为 `ready` 的最早任务；若存在多个可并行任务，也只能选择其中一个。
2. 依据上述协议解析并复核该任务所需的 Agent 与 Skill，生成 `allocation_id`；分配缺失、冲突或无法由证据唯一确定时，将任务标记为 `blocked` 并停止。
3. 将该任务标记为 `in_progress`，记录执行开始时间、当前提交和分配记录；不得同时处理其他任务或顺手修复无关问题。
4. 再次核对 Spec/Plan/Task 是否一致；发现矛盾或关键决定缺失，立即将任务标记为 `blocked` 并停止。
5. 明确该任务的单一目标、文件范围、主 Agent、协作 Agent、主实现 Skill、辅助 Skill、输出物和验收标准。
6. 在实现代码前，先补充一个能够证明当前行为缺失、不满足或无法验证的测试/检查；记录测试路径、命令、绝对 `cwd`、预期失败条件和实际结果。
7. 只将当前任务交给已分配的主实现 Skill；禁止提前修改后续任务文件、接口或业务行为。
8. 实现当前任务后运行规定的相关检查，包括测试、静态检查、构建或目标验证；按静态、主机、构建、目标运行和实物证据分别记录。
9. 审阅 `git diff` 和变更范围，确认没有混入其他任务或无关修复。
10. 只有验收标准全部满足时，才将当前任务更新为 `pass`/`完成`；否则更新为 `blocked`/`fail`，保留失败证据和下一步补证动作。
11. 输出本次任务报告并写入执行记录；若没有硬阻塞或需求变化，自动进入下一个依赖已满足的任务。
12. 全部任务完成后先执行最终 Verify；Verify 通过后才交给 `workflow-final-review`，完成最终检查后输出通知；Verify 发现偏差时回到 Spec，不自动执行提交、推送、烧录或发布。

“先补测试”是行为任务的硬门禁。若当前任务属于纯文档、目录登记或无法建立自动化测试的配置变更，也必须先补充能证明当前状态缺失的静态检查、配置断言或可复现检查；如果连这种检查也无法建立，先阻塞并说明原因。

## Spec 冲突与关键决定缺失

以下情况必须立即停止：

- `spec.md` 的直接范围与非目标互相冲突；
- `spec.md` 的接口、依赖方向、资源所有权或生命周期约束互相冲突；
- `spec.md` 没有定义实现所需的错误、空状态、失败恢复或权限行为；
- `plan.md` 选择的路线超出 `spec.md`，或 `task.md` 与 `plan.md` 文件范围不一致；
- 验收标准无法映射到可执行的测试/检查；
- 当前实现需要新增未确认的 HAL、RTOS、硬件、任务、DMA、内存或构建前提。

阻塞报告必须使用：

```text
阻塞类型：Spec 矛盾 | 关键决定缺失 | 证据缺失 | 任务依赖未完成 | 验收不可验证
冲突/缺口：<具体描述>
证据：<absolute path or relative/path:line>
影响任务：<task id>
影响范围：<files/interfaces/acceptance>
不能自行决定的原因：<reason>
需要上游补充：<specific decision or evidence>
下一步：<回传 workflow-requirements-challenge / workflow-review-gate / workflow-integration-plan>
```

## 测试先行记录

实现前的测试/检查必须记录：

| 字段 | 内容 |
|---|---|
| task_id | `<T-###>` |
| 当前行为 | `<observed current behavior>` |
| 缺失证明 | `<why current behavior fails the task acceptance>` |
| 测试/检查文件 | `<relative path>` |
| 命令 | `<absolute cwd + command>` |
| 预期结果 | `<expected failing result before implementation>` |
| 实际结果 | `<exit code/output/artifact>` |
| 证据等级 | `static/host/build/target/physical` |

测试必须针对当前任务的行为或约束，不能只增加一个永远通过的占位测试。

## 任务完成记录

任务完成或阻塞时，必须回写 `task.md` 当前任务：

- 状态：`in_progress` → `pass`/`完成`，或 `blocked`/`fail`；
- Agent/Skill 分配记录：`allocation_id`、主 Agent、协作 Agent、主实现 Skill、辅助 Skill、分配依据和边界；
- 实际修改文件和输出物；
- 测试先行记录；
- 实现后检查命令、绝对 `cwd`、退出码和产物；
- 对应验收标准及逐项结果；
- 未验证项、失败原因和回传动作；
- 当前提交/变更集标识。

不得把“代码已修改”“编译通过”直接写成全部验收通过；必须按任务清单中的证据等级逐项说明。

## 固定输出

```text
状态：执行中 | 完成 | 阻塞 | 失败
当前任务：<task_id + title>
前置任务证据：<completed task ids and artifacts>
Agent/Skill 分配：<allocation_id, primary/support agents, primary/supporting skills, evidence>
Spec/Plan/Task 一致性：通过 | 阻塞
测试先行：<test path, command, expected failure, actual result>
实现变更：<files and concise behavior summary>
运行检查：<commands, absolute cwd, exit codes, artifacts>
验收标准：<criterion-by-criterion result>
task.md 回写：<status and evidence location>
未验证项：<items>
下一步：<停止等待下一次调用 / 回传上游>
```

## 交接边界

- 只向分配记录中的一个主实现 Skill 交接当前任务；可同时邀请必要的协作 Agent 和辅助 Skill 提供知识或审查，但不得分配多个主实现 Skill 修改代码；
- 主 Agent、协作 Agent、主实现 Skill 和辅助 Skill 必须接收当前任务的范围、依赖、测试先行要求和验收标准；
- 当前任务 `pass` 后，在 `auto_until_final_check` 模式下自动选择下一个依赖已满足的任务；
- 当前任务 `blocked` 时不得跳到后续任务；
- 普通测试失败、格式失败或可由既有 Spec/Plan 解释的实现失败，必须先由 AI 自动诊断、修复和复测；不得直接等待用户。
- 只有无法依据既有 Spec/Plan 解决、需要新增用户决策的硬阻塞，才暂停并输出一个明确问题。
- 所有代码、测试、构建、目标运行和实物证据必须回写到当前任务；
- 全部任务完成后，将 `spec.md`、`plan.md`、`task.md`、运行记录和最终变更集交给 `workflow-final-review`。

## 硬边界

- 不在同一任务记录中混淆多个任务；允许在 `auto_until_final_check` 模式下按依赖连续执行多个任务；
- 不跳过前置任务；
- 不在实现前省略缺失行为测试/检查；
- 不跳过 Agent/Skill 分配或把未注册的角色/Skill 写成已分配；
- 不自行解决 Spec 矛盾或补写关键决定；
- 不扩大范围、不修改用户选择、不替换 `plan.md`；
- 不将静态/主机证据表述为目标板或实物验证；
- 不把最终检查完成后的用户通知当作提交、推送、烧录或发布授权；
- 不得跳过 [SOLID 代码施工硬门禁](../workflow-review-gate/references/solid-code-gate.md)；
- 不在插件仓库内生成目标项目的 `task.md` 更新。
