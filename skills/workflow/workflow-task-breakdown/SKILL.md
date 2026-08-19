---
name: workflow-task-breakdown
description: 将已审查通过的 plan.md 结合真实项目文件拆分为有顺序、单一责任、可独立验证的实施任务，并生成 task.md；不得修改代码、spec.md 或 plan.md 的范围。
---

# 实施任务拆解

## 适用范围

本 Skill 位于 `workflow-integration-plan` 与 `workflow-task-execution` 之间。它消费经过方案审查通过的 `plan.md`、放行后的 `spec.md` 以及真实项目文件，把实施路线拆成有依赖顺序、单一责任、可独立验证的小任务，并生成 `task.md`。`lightweight` 默认只生成一个局部、可独立验证的任务；`full` 按完整计划拆解多个任务。`prototype` 不进入本 Skill。本 Skill 不重新选择方案、不重新设计架构、不生成代码，不得修改 `spec.md` 或 `plan.md`。

固定输出路径：

```text
<project_root>/00_Docs/04_需求文档/task.md
```

## 输入与前置门禁

必须读取：

1. `spec.md`：需求、约束、范围、禁止事项和验收边界；
2. `plan.md`：用户选择并审查通过的实施路线；
3. 目标项目真实文件、目录、构建配置、启动流程、日志和现有验证记录；
4. `workflow-integration-plan` 的实现层 Skill 交接信息。

以下任一条件不满足时，保持 `阻塞`，不得生成可交付的 `task.md`：

- `spec.md` 不存在、过期或门禁状态不是放行；
- `plan.md` 不存在、状态不是 `approved`，或方案审查仍有未关闭阻塞；
- 目标项目绝对路径未确认或无法访问；
- 关键文件、依赖、接口、构建入口或验收条件无法由项目证据确认。

如果新事实会改变 `spec.md` 的需求/约束或 `plan.md` 的实施路线，必须回传 `workflow-review-gate` 或 `workflow-integration-plan`，不得在任务拆解阶段静默修订。

## 需求变化门禁

用户提出需求变化时，先停止生成或更新 `task.md`。如果变化影响 `spec.md`，必须回传 `workflow-requirements-challenge`/`workflow-review-gate`，等待最新 Spec 放行，再由 `workflow-integration-plan` 更新并审查 `plan.md`；只有新的计划通过后才能重新拆解任务。不得先修改任务清单或代码来适应尚未放行的需求。

任务拆解必须继承 [SOLID 代码施工硬门禁](../workflow-review-gate/references/solid-code-gate.md)，为每个涉及代码的任务
标注适用原则、独立验证方式和证据位置。无法拆成可验证的 SOLID 检查点时，任务保持阻塞，
不得以“实现时再判断”代替拆解。

## 工作流

1. 读取 `spec.md` 和 `plan.md`，提取目标、非目标、阶段、文件施工顺序、依赖、阶段级主 Agent/协作 Agent、主实现 Skill/辅助 Skill、资源约束和验收条件。
2. 读取每个任务涉及的真实项目文件和构建/测试入口，确认任务名称、文件路径、符号、前置条件和验证命令不是凭空推测。
3. 将计划拆成任务图：为每个任务分配唯一 ID，标出前置任务、可并行任务和串行边界；`lightweight` 必须证明单任务足以覆盖已放行范围，否则升级 `spec_rigor` 为 `full` 并回传 Review Gate。
4. 检查任务粒度：每个任务只承担一个可描述的结果，修改范围连续且有限，完成后能够独立验证或明确验证前置条件。
5. 为每个任务补齐执行步骤、输出物、验证方法、预期结果、失败处理、回滚方式，并从阶段级基线分配一个主 Agent、必要协作 Agent、一个主实现 Skill 和必要辅助 Skill；分配必须有证据和理由。
6. 按依赖关系进行拓扑排序，形成从基础准备到集成回归的执行顺序；发现循环依赖时阻塞并回传。
7. 生成 `task.md`，保留 `spec.md`/`plan.md` 的来源 ID、证据路径、可信等级和未验证项。
8. 将 `task.md` 与 `spec.md`、`plan.md` 一起交给 `workflow-task-execution`；由它以 `auto_until_final_check` 模式按依赖连续推进，内部仍保持每项任务独立记录并交给原定的唯一实现层 Skill。Task 生成和单项任务完成不设置用户等待；全部任务完成后，由 `workflow-final-review` 依据三者、执行记录和最终变更集执行审查。

## 任务拆解规则

### 必须满足

- 一个任务只有一个主要目标和一个可观察完成结果；
- 任务有明确的输入、输出、前置条件、主 Agent、协作 Agent、主实现 Skill 和辅助 Skill；
- 任务之间通过文件、接口、产物或验证结果交接，不通过隐含口头约定交接；
- 任务顺序由真实依赖决定，不按文档章节机械排列；
- 每个任务至少有一个静态、主机、构建、目标运行或实物验证入口；
- 验证命令必须记录绝对 `cwd`、参数、预期结果和产物位置；
- 任务必须区分 `confirmed`、`user-confirmed`、`inferred`、`unverified`；
- 任务不得越过 `spec.md` 的范围、接口、资源、并发、ISR、DMA 和生成边界。

### 不允许

- 把整个 `plan.md` 复制成一条大任务；
- 把一个任务拆成没有独立结果的伪步骤；
- 把“修改所有相关文件”“完成测试”等无法验收的笼统描述当作任务；
- 把未确认的文件、API、硬件资源或构建命令写成 ready；
- 把静态检查、主机测试或代码生成描述成目标板验证；
- 在 `task.md` 中新增需求、改变用户选择或替换 `plan.md` 的方案；
- 为了并行而让两个任务同时修改同一资源且没有明确所有权；
- 将阻塞项隐藏在任务备注中而仍标记任务为 ready。

## 任务粒度判断

如果一个任务同时包含以下两个或更多独立结果，应继续拆分：

- 新增公共接口与实现后端；
- 修改生成配置与手工源码；
- 修改协议驱动与业务缓存/重试策略；
- 完成代码改动与完成目标板验证；
- 解决多个没有共同失败原因的错误路径。

可以保留在同一任务中的内容：同一文件内为完成一个接口契约所必需的声明、实现和最小单元验证；但必须在任务说明中写清所有权、生命周期和验证边界。

## 固定输出

```text
状态：分析中 | 待补证 | 可交付 | 阻塞
Spec 力度：<prototype | lightweight | full>
风险叠加门禁：<none | human_review | versioned | both>
输入 spec.md：<absolute path>
输入 plan.md：<absolute path>
项目路径与提交：<absolute path @ branch/commit>
已读证据：<absolute paths, commands, logs>
任务总数：<number>
关键串行链：<T-001 → T-002 → ...>
可并行组：<groups or none>
阻塞项：<none or blockers>
输出 task.md：<absolute path or not generated>
阶段级 Agent/Skill 基线：<plan.md 中的分配表>
下游执行 Skill：workflow-task-execution
下一步：<补证 / 交付 task.md / 回传 plan.md or spec.md>
```

## task.md 模板要求

生成文件必须遵循 [`task-template.md`](references/task-template.md)，至少包含：

1. 元数据、输入文件、状态和可信等级约定；
2. 总体目标、非目标、任务图和关键串行链；
3. 任务索引、依赖关系和可并行分组；
4. 每个任务的目标、范围、文件、前置条件、Agent/Skill 分配、步骤、输出、验证和回滚；
5. 任务级资源/并发/ISR/DMA/内存/生成边界；
6. 任务级验收与证据记录；
7. 阻塞项、未验证项、变更回传规则和下游交接。

## 任务项固定字段

每个任务至少使用以下字段：

```text
task_id: T-###
order: <topological order>
parallel_group: <group or none>
title: <one-line result>
objective: <single observable outcome>
source_plan_ids: <plan IDs>
source_spec_ids: <spec/checklist IDs>
owner_agent: <canonical primary agent>
support_agents: <canonical agents or none>
owner_skill: <canonical primary implementation Skill>
supporting_skills: <canonical supporting Skills or none>
allocation_evidence: <plan/spec/project evidence and reason>
scope: <in-scope files and behavior>
non_scope: <explicitly excluded>
dependencies: <task IDs and external prerequisites>
preconditions: <confirmed facts/configuration>
steps: <ordered execution steps>
outputs: <files/artifacts/state>
verification_level: static | host | build | target | physical
verification_command_or_condition: <absolute cwd + command or hardware condition>
expected_result: <observable pass condition>
failure_handling: <diagnosis/retry/degrade/return path>
rollback: <reversible action>
confidence: confirmed | user-confirmed | inferred | unverified
status: ready | blocked | not-run | pass | fail
blockers: <none or blockers>
```

## 交接与回传

- 只有 `task.md` 状态为 `可交付`，且所有 ready 任务都能追溯到 `spec.md`、`plan.md` 及阶段级 Agent/Skill 基线时，才交给 `workflow-task-execution`；
- `workflow-task-execution` 必须按任务顺序或明确的并行组执行，内部一次只修改一个任务的范围，不得跳过前置任务；在 `auto_until_final_check` 模式下，当前任务通过 AI 审查和验证后自动继续下一项，无需用户逐项确认；
- 新事实不改变范围时，回填对应任务和 `task.md` 并保留证据；
- 新事实改变范围、接口、层归属、用户选择或验收标准时，停止执行并回传上游；
- 代码、补丁或 diff 完成后，交接 `spec.md`、`plan.md`、`task.md`、运行记录和最终变更集给 `workflow-final-review`。

## 硬边界

- 不生成或修改业务代码；
- 不替用户选择方案；
- 不重新审查需求门禁，不替代 `workflow-review-gate`；
- 不重新设计或扩大 `plan.md`；
- 不直接调用实现层 Skill 或执行代码；
- 不直接分发多个实现层 Skill；
- 不把低等级验证表述为高等级验证；
- 不在插件仓库内生成目标项目的 `task.md`，固定写入目标项目文档目录。
