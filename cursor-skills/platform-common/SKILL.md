---
name: platform-common
description: "基于目标工程真实文件设计和审查 Platform 公共类型、错误码、对象模型、直接生命周期回调、设备/服务注册管理器与版本查询；不绑定芯片、HAL、RTOS 或 Vendor。"
---

# platform-common

Cursor 调用名是 `platform-common`。工作流、目录和代码里的 canonical id 仍是 `platform_common`。

执行前读取并遵守同插件中的 canonical skill，包括它引用的 references：

[platform_common](../../skills/platform/platform_common/SKILL.md)

不要改写该 skill 的输入、输出、交接对象和禁止事项。本文件只提供 Cursor 可加载的连字符名称。
