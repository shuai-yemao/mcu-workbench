---
name: workflow-ai-collab
description: 基于目标项目真实风格协作生成、重构或审查嵌入式 C 代码。用户要求 AI 辅助开发、逐函数生成、构造嵌入式编码 Prompt 或协调生成到验证流程时使用。
---

# 嵌入式 AI 协作

## 职责

编排需求澄清、架构接口、逐函数生成、独立审查和验证；不以旧模板覆盖目标项目的命名、注释或格式。项目风格和审查门禁由 [`tools-ai-code-quality`](../../tools/tools-ai-code-quality/SKILL.md) 定义。

## 五阶段流程

1. **需求与证据**：确认目标模块、硬件/SDK、接口、构建命令、验收条件和可修改范围。
2. **架构与接口**：交给 `system-architect` 审查层边界和公开契约；接口未确认前不生成实现。
3. **逐函数生成**：由 `firmware-engineer` 每次实现一个可验证边界；生成前读取风格 profile 和 [Prompt 契约](references/prompt-contract.md)。
4. **独立审查**：由 `verification-engineer` 使用 `tools-ai-code-quality` 区分风格、功能和安全问题。
5. **验证与交接**：由 `toolchain-engineer` 复现构建；需要板级证据时交给 `hardware-integration`；`embedded-lead` 汇总证据和未决项。

## 硬规则

- 未完成需求证据、接口边界和项目风格解析前，不生成代码。
- 默认逐函数生成；每个函数完成后执行针对性构建或测试，再继续下一项。
- 不引用归档 workflow 或不存在的 agent 名称；迁移资料只见 [能力索引](references/capability-index.md)。
- 不把主机测试或静态检查写成板级验证结论。

## 参考

- [协作阶段与交接](references/collaboration-protocol.md)
- [生成 Prompt 契约](references/prompt-contract.md)
- [迁移比对资料](references/capability-index.md)
