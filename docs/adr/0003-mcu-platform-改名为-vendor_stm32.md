# 0003 · mcu-platform 改名为 vendor_stm32

- 状态: accepted
- 日期: 2026-08-07
- 相关决策: D3

## Context

mcu-platform 技能与目标 Platform 层重名，且其内容（CMSIS/HAL/LL/SPL/寄存器/SDK）本质是厂商底座，应归 Vendor 层。

## Decision

技能改名 vendor_stm32 并归 vendor 层；mcu-platform 及旧别名（platform-stm32-hal 等）保留为 MIGRATION_MAP 别名。

## Consequences

命名消除歧义；vendor 层按厂商命名（vendor_stm32/vendor_lvgl/…），旧调用名兼容。
