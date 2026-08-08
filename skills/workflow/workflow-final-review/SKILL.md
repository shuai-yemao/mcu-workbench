---
name: workflow-final-review
description: 在最终代码、补丁或 git diff 就绪后执行独立代码审查编排，作为输出前的最后一层门禁，按 `tools-quality` 的 profile 与门禁输出结构化审查报告；默认不生成实现、不自动修复。用户要求审查最终代码、补丁或 diff，或协调审查到验证流程时使用。
---

# 最终代码 Review 编排（输出前最后一层门禁）

## 职责

编排对已产出最终代码、补丁或 `git diff` 的独立代码审查：确认审查范围与证据，按 `tools-quality` 的 profile 与门禁区分风格、功能、接口/资源所有权、ISR/DMA/并发、安全与分层边界问题。默认只交付结构化审查报告，不生成实现、不自动修复、不将静态或主机检查表述为板级验证。项目风格与审查规则来源是 [`tools-quality`](../../tools/tools-quality/SKILL.md)。

## 触发时机

在以下时机触发：

- 实现 Skill（`app-architecture`、`platform_os`、`platform_bsp`、`impl_board`、`impl_bsp`、`impl_bsp_handler`、`platform_mcu`、`impl_os`、`vendor_stm32` 等）已输出最终代码、补丁或 `git diff`；
- `workflow-integration-plan` 在代码产物就绪后交接最终代码/变更集与验收清单；
- 用户要求对现有代码、补丁或 diff 做独立审查。

若输入仍处于需求或生成阶段，先交给 `workflow-review-gate`（需求/方案阶段）或对应实现 Skill；本 Skill 不承担代码生成阶段。

## 输入

1. 最终代码/变更集：目标文件路径、补丁或 `git diff`；
2. 相关接口与约束：当前接口、资源所有权、错误处理与硬件约束；
3. 构建或测试入口：可复现命令、绝对工作目录与产物路径；
4. 目标工程风格证据：`tools-quality` 的 [style-profile 编码规范](../../tools/tools-quality/references/style-profile.md) 及来源。

## 审查流程

1. **范围与证据**：确认被审版本/diff、审查基线、构建与测试入口，声明 `tool_root`、`firmware_root` 与命令绝对 `cwd`。
2. **风格与门禁**：由 `verification-engineer` 按 `tools-quality` 的 [style-profile 编码规范](../../tools/tools-quality/references/style-profile.md) 与 [生成代码审查门禁](../../tools/tools-quality/references/review-gates.md) 分离风格与功能/安全问题；用户或项目明确采用其他约定时以该约定优先。
3. **功能与接口/资源所有权**：由 `system-architect` 与 `verification-engineer` 核对接口契约、调用链、错误路径与资源生命周期。
4. **ISR/DMA/并发与安全**：由 `verification-engineer`（并发）与 `hardware-integration`（板级证据）核对 ISR 阻塞、DMA 缓冲、数组边界与硬件约束。
5. **分层边界**：核对是否遵守 Adapter 只属于 OS 和 BSP、Core/Middleware/Driver 不创建 Adapter 等契约。
6. **报告与交接**：由 `embedded-lead` 汇总为固定结构审查报告，标注阻塞项与待补验证。

每个步骤只记录已执行的验证与证据等级；`firmware-engineer` 仅在需要澄清代码入口、数据流或可修改范围时参与，`toolchain-engineer` 仅在需要复现构建/测试时参与。

## 固定输出

审查报告必须包含：

- 审查范围与证据：被审文件/diff、版本、证据来源与等级；
- 按严重级别分组的问题：阻塞/高/中/低；
- 定位：`relative/path:line`；
- 影响：触发路径与失败后果；
- 修复建议：只给出建议，不直接修改；
- 已执行/待补验证：静态/主机/构建/目标运行/实物分别记录；
- 阻塞项与未验证假设。

报告契约见 [Review 输入/输出契约](references/prompt-contract.md)。

## 只读边界（硬规则）

- 本 Skill 默认只输出结构化审查报告，不生成实现、不自动修复、不产生替换代码或修复补丁。
- 未确认被审版本/diff 与审查基线前，不开始审查。
- 不将静态检查、主机测试或日志推断写成目标运行或实物验证结论。
- 不引用归档 workflow 或不存在的 agent 名称；迁移资料只见 [能力索引](references/capability-index.md)。
- 运行记录必须能区分工具仓库和固件仓库；命令、退出码、产物绝对路径与 SHA-256、证据等级和重试次数必须可追溯。

## 参考

- [Review 编排与交接](references/collaboration-protocol.md)
- [Review 输入/输出契约](references/prompt-contract.md)
- [迁移比对资料](references/capability-index.md)
- [项目风格 profile](../../tools/tools-quality/references/style-profile.md)
- [生成代码审查门禁](../../tools/tools-quality/references/review-gates.md)
