---
name: platform-middleware
description: "Platform 中间件 API：每个中间件默认只提供一个稳定公共头和固定后端实现；LVGL 以唯一 platform_gui.h 暴露契约，具体 API 由 Impl Adapter 落地，不绑定 Vendor/HAL/RTOS。"
---

# platform-middleware

Cursor 调用名是 `platform-middleware`。工作流、目录和代码里的 canonical id 仍是 `platform_middleware`。

执行前读取并遵守同插件中的 canonical skill，包括它引用的 references：

[platform_middleware](../../skills/platform/platform_middleware/SKILL.md)

不要改写该 skill 的输入、输出、交接对象和禁止事项。本文件只提供 Cursor 可加载的连字符名称。
