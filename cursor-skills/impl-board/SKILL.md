---
name: impl-board
description: "Impl 落地：板级组合根——构造实例、注入 Ops、资源绑定（board_resource_config + board_bsp_register）。"
---

# impl-board

Cursor 调用名是 `impl-board`。工作流、目录和代码里的 canonical id 仍是 `impl_board`。

执行前读取并遵守同插件中的 canonical skill，包括它引用的 references：

[impl_board](../../skills/impl/impl_board/SKILL.md)

不要改写该 skill 的输入、输出、交接对象和禁止事项。本文件只提供 Cursor 可加载的连字符名称。
