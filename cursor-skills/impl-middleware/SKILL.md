---
name: impl-middleware
description: "Impl 中间件接入：默认提供 Platform 直接调用的 impl_xxx.c/.h Adapter；必要时拆出 Vendor Port，隔离 EasyLogger、RTT、FatFs、Crypto、LVGL 或通信 Vendor；绑定目标工程 05_Vendor 中按需保留的中间件/算法内容。"
---

# impl-middleware

Cursor 调用名是 `impl-middleware`。工作流、目录和代码里的 canonical id 仍是 `impl_middleware`。

执行前读取并遵守同插件中的 canonical skill，包括它引用的 references：

[impl_middleware](../../skills/impl/impl_middleware/SKILL.md)

不要改写该 skill 的输入、输出、交接对象和禁止事项。本文件只提供 Cursor 可加载的连字符名称。
