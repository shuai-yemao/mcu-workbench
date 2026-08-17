---
name: workflow-final-review
description: 在最终代码、补丁或 git diff 就绪后执行独立代码审查编排，作为输出前的最后一层门禁，按 `tools-quality` 的 profile 与门禁完成格式/必要注释整改闭环并输出结构化审查报告；不修复功能或架构问题。用户要求审查最终代码、补丁或 diff，或协调审查到验证流程时使用。
---

# 最终代码 Review 编排（输出前最后一层门禁）

## 职责

编排对已产出最终代码、补丁或 `git diff` 的独立代码审查：确认审查范围与证据，先完成格式与注释完整性门禁，再按 `tools-quality` 的 profile 与门禁区分风格、功能、接口/资源所有权、ISR/DMA/并发、安全与分层边界问题。格式或必要注释初检失败时，必须在本门禁内完成受限整改并同条件复检；复检失败或无法执行时，最终结论必须为阻塞。本 Skill 只允许修复格式和必要注释，不生成实现、不修复功能或架构问题、不将静态或主机检查表述为板级验证。项目风格与审查规则来源是 [`tools-quality`](../../tools/tools-quality/SKILL.md)。

## 触发时机

在以下时机触发：

- 实现 Skill（`app-architecture`、`platform_os`、`platform_bsp`、`impl_board`、`impl_bsp`、`platform_mcu`、`impl_os`、`vendor_mcu` 等）已输出最终代码、补丁或 `git diff`；
- `workflow-integration-plan` 在代码产物就绪后交接最终代码/变更集与验收清单；
- 用户要求对现有代码、补丁或 diff 做独立审查。

若输入仍处于需求或生成阶段，先交给 `workflow-review-gate`（需求/方案阶段）或对应实现 Skill；本 Skill 不承担代码生成阶段。

## 输入

1. 最终代码/变更集：目标文件路径、补丁或 `git diff`；
2. 相关接口与约束：当前接口、资源所有权、错误处理与硬件约束；
3. 构建或测试入口：可复现命令、绝对工作目录与产物路径；
4. 上游施工边界：需求实施链路必须提供放行后的 `spec.md`、经用户选择和方案审查通过的 `plan.md`、由其拆解并达到 `可交付` 的 `task.md`、`workflow-task-execution` 的逐项执行记录（包括 Agent/Skill 分配、前置失败测试/检查、实现后检查和状态回写）、`workflow-review-gate` 放行结论和上游交接信息；用户直接提交现有 diff 审查时，明确该链路缺失；
5. 目标工程风格证据：用户明确要求、目标工程 `.clang-format`/`.editorconfig` 或等效配置、相邻源码，以及 `tools-quality` 的 [style-profile 编码规范](../../tools/tools-quality/references/style-profile.md)；记录它们的优先级和偏差。

## 审查流程

1. **范围与证据**：确认被审版本/diff、审查基线、构建与测试入口，声明 `tool_root`、`firmware_root` 与命令绝对 `cwd`。
2. **格式与注释初检**：由 `verification-engineer` 必须检查格式和注释完整性。按“用户明确要求 → 目标工程已确认的 `.clang-format`/`.editorconfig` 或等效配置 → 相邻源码 → `tools-quality` 的 [style-profile 编码规范](../../tools/tools-quality/references/style-profile.md)”确定规则；若前三层没有覆盖规则，采用 profile 的 80 列基线。检查行宽、缩进/排版、文件或模块说明、公开 API Doxygen、`@param`、`@retval`、必要的 `@note`/`@warning`，以及所有权、阻塞/ISR/DMA/并发、硬件约束、错误恢复和非显然步骤所需的注释。记录命令、绝对 `cwd`、工具版本、退出码、检查范围和 `relative/path:line`。
3. **受限整改与同条件复检**：初检失败时，只允许格式化和补充/更正必要注释；不得修改函数签名、控制流、常量/宏取值、数据结构、资源/错误路径、包含依赖或分层关系。整改前后审阅 `git diff`；若发现超出范围的差异，停止整改并以阻塞项交回对应实现 Skill。对相同文件范围用初检所用工具和注释清单复检，并执行 `git diff --check`。工具不可用、检查不可复现或复检仍失败时不得放行。
4. **风格与门禁分类**：由 `verification-engineer` 按 [项目代码审查门禁](../../tools/tools-quality/references/review-gates.md) 将格式/注释、功能和安全问题分开报告；功能或安全问题不得由格式/注释整改掩盖。
5. **功能与接口/资源所有权**：由 `system-architect` 与 `verification-engineer` 核对接口契约、调用链、错误路径与资源生命周期。
6. **ISR/DMA/并发与安全**：由 `verification-engineer`（并发）与 `hardware-integration`（板级证据）核对 ISR 阻塞、DMA 缓冲、数组边界与硬件约束。
7. **分层边界**：核对是否遵守 Adapter 只属于 OS 和 BSP、Core/Middleware/Driver 不创建 Adapter 等契约。
8. **报告与交接**：由 `embedded-lead` 汇总为固定结构审查报告，保留初检问题、受限整改、差异审阅与复检证据，并明确格式/注释门禁结论、阻塞项与待补验证。

每个步骤只记录已执行的验证与证据等级；`firmware-engineer` 仅在需要澄清代码入口、数据流或可修改范围时参与，`toolchain-engineer` 仅在需要复现构建/测试时参与。

## 固定输出

审查报告必须包含：

- 审查范围与证据：被审文件/diff、版本、证据来源与等级；
- 格式检查证据：插件 profile、目标工程格式配置偏差、命令、绝对 cwd、工具版本、退出码和检查范围；
- 注释完整性证据：文件头、公开 API Doxygen、参数/返回值、必要约束、关键步骤和注释语言检查结果；
- 整改闭环证据：初检问题、仅限格式/注释的整改文件与理由、整改后 `git diff` 审阅、同条件复检命令和退出码；
- 按严重级别分组的问题：阻塞/高/中/低；
- 定位：`relative/path:line`；
- 影响：触发路径与失败后果；
- 修复建议：格式/注释问题记录已执行的受限整改；其他问题只给出建议，不直接修改；
- 已执行/待补验证：静态/主机/构建/目标运行/实物分别记录；
- 阻塞项与未验证假设；
- 最终门禁结论：`通过` 或 `阻塞`。只有受限整改后同条件复检和 `git diff --check` 全部通过时才可通过；格式或注释检查失败时只能为 `阻塞`。

报告契约见 [Review 输入/输出契约](references/prompt-contract.md)。

## 整改边界（硬规则）

- 本 Skill 仅可对已确认范围内的格式和必要注释写回；不生成实现、不修复功能/安全/架构问题、不产生超出上述范围的替换代码或修复补丁。
- 注释不得逐行复述代码、推测硬件事实或掩盖功能问题；语言遵从项目约定，未约定时使用中文。
- 未确认被审版本/diff 与审查基线前，不开始审查。
- 不将静态检查、主机测试或日志推断写成目标运行或实物验证结论。
- 不引用归档 workflow 或不存在的 agent 名称；迁移资料只见 [能力索引](references/capability-index.md)。
- 运行记录必须能区分工具仓库和固件仓库；命令、退出码、产物绝对路径与 SHA-256、证据等级和重试次数必须可追溯。

## 参考

- [Review 编排与交接](references/collaboration-protocol.md)
- [Review 输入/输出契约](references/prompt-contract.md)
- [迁移比对资料](references/capability-index.md)
- [项目风格 profile](../../tools/tools-quality/references/style-profile.md)
- [项目代码审查门禁](../../tools/tools-quality/references/review-gates.md)
