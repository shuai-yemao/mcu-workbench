# 0004 · 统一错误码并入 platform_mcu 头文件规范

- 状态: accepted
- 日期: 2026-08-07
- 相关决策: D4

## Context

现状 osal_*/BSP 函数表/Core 事务 API 三套错误码分散，无统一基线；是否另设 platform_common 技能待定。

## Decision

统一错误码（platform_error.h）、类型、对象协议并入 platform_mcu 头文件规范章节，不另设 platform_common 技能（遵循 D12 不凑层）。

## Consequences

错误码单一事实源；platform_mcu 同时承担 MCU 接口与公共规范职责，文档需明确边界。
