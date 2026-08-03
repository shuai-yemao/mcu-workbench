---
name: workflow-ai-collab
description: 基于目标项目真实风格协作生成、重构或审查嵌入式 C 代码。用户要求 AI 辅助开发、逐函数生成、构造嵌入式编码 Prompt 或协调生成到验证流程时使用。
---

# 嵌入式 AI 协作

## 职责

编排需求澄清、架构接口、逐函数生成、独立审查和验证；不以旧模板覆盖目标项目的命名、注释或格式。项目风格和审查门禁由 [`tools-quality`](../../tools/tools-quality/SKILL.md) 定义。

## 五阶段流程

1. **需求与证据**：确认目标模块、硬件/SDK、接口、构建命令、验收条件和可修改范围。
2. **架构与接口**：交给 `system-architect` 审查层边界和公开契约；接口未确认前不生成实现。
3. **逐函数生成**：由 `firmware-engineer` 每次实现一个可验证边界；生成前读取风格 profile 和 [Prompt 契约](references/prompt-contract.md)。
4. **独立审查**：由 `verification-engineer` 使用 `tools-quality` 区分风格、功能和安全问题。
5. **验证与交接**：由 `toolchain-engineer` 复现构建；需要板级证据时交给 `hardware-integration`；`embedded-lead` 汇总证据和未决项。

对分层外设生成，阶段计划必须在生成前列出四张表：现状表、边界表、文件修改表、验收表。随后输出 generation manifest：设备 profile、类别 Handle、Core/Driver/OSAL Ops 映射、资源生命周期、阻塞/ISR 限制、注释 profile 与未验证项。每层生成后先经独立审查和 `tools-quality` 门禁，再进入下一层；Core 与 BSP Driver/Handle/Port/Wrapper 分开生成和验证。

## 执行证据协议

每次执行命令前，先在运行记录中声明 `tool_root`、`firmware_root` 和该命令的绝对 `cwd`；记录命令、退出码、产物绝对路径与 SHA-256、证据等级（静态/主机/目标/实物）和重试次数。工具仓库与固件仓库不共享相对路径，禁止用错误工作目录下的“路径不存在”替代代码失败。

## 硬规则

- 未完成需求证据、接口边界和项目风格解析前，不生成代码。
- 目标 `osal.h`、Core 公共头或平台绑定缺失时，生成结果必须标记 `UNRESOLVED_OSAL_API`，不得将示例 OSAL API 描述为已可编译。
- 默认逐函数生成；每个函数完成后执行针对性构建或测试，再继续下一项。
- 不引用归档 workflow 或不存在的 agent 名称；迁移资料只见 [能力索引](references/capability-index.md)。
- 不把主机测试或静态检查写成板级验证结论。
- 运行记录必须能区分工具仓库和固件仓库；同一根因最多自动修复并重试三次，超过后停止并交接阻塞。

## 参考

- [协作阶段与交接](references/collaboration-protocol.md)
- [生成 Prompt 契约](references/prompt-contract.md)
- [迁移比对资料](references/capability-index.md)
