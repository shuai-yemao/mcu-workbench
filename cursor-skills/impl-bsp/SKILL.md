---
name: impl-bsp
description: "Impl 落地：器件 Driver 协议子层 + 同类 Driver Handle 机制子层（多实例/生命周期/缓存/重试），隔离 HAL/RTOS/板级绑定。"
---

# impl-bsp

Cursor 调用名是 `impl-bsp`。工作流、目录和代码里的 canonical id 仍是 `impl_bsp`。

执行前读取并遵守同插件中的 canonical skill，包括它引用的 references：

[impl_bsp](../../skills/impl/impl_bsp/SKILL.md)

不要改写该 skill 的输入、输出、交接对象和禁止事项。本文件只提供 Cursor 可加载的连字符名称。
