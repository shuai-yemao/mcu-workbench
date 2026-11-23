---
name: impl-mcu
description: "Impl MCU：把 Platform MCU 能力绑定到具体 MCU、HAL/LL、CMSIS、SDK 和生成工程；支持同名 flat `plat_*` 实现与注入 Ops 两种 profile，不承载器件协议、业务策略或 RTOS 任务。"
---

# impl-mcu

Cursor 调用名是 `impl-mcu`。工作流、目录和代码里的 canonical id 仍是 `impl_mcu`。

执行前读取并遵守同插件中的 canonical skill，包括它引用的 references：

[impl_mcu](../../skills/impl/impl_mcu/SKILL.md)

不要改写该 skill 的输入、输出、交接对象和禁止事项。本文件只提供 Cursor 可加载的连字符名称。
