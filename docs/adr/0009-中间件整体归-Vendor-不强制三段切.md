# 0009 · 中间件整体归 Vendor，不强制三段切

- 状态: accepted
- 日期: 2026-08-07
- 相关决策: D9

## Context

用户修正：Middleware 是 vendor 层的。中间件源码/移植/知识整体属底座，不需要强制拆出 platform_gui/impl_gui_port 等空层技能。

## Decision

middleware-* 7 个技能整体归位 vendor-*（vendor_lvgl/vendor_stack/vendor_fatfs/vendor_fal/vendor_flashdb/vendor_letter_shell/vendor_dsp），不强制三段切。

## Consequences

技能跟随现有归属；中间件能力接口若后续需要，由 Service 按业务域承接，不强行造层。
