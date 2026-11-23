---
name: service-ota
description: "Service 业务服务：固件下载、校验、跳转、回滚策略（带业务策略，非驱动封装）。"
---

# service-ota

Cursor 调用名是 `service-ota`。工作流、目录和代码里的 canonical id 仍是 `service_ota`。

执行前读取并遵守同插件中的 canonical skill，包括它引用的 references：

[service_ota](../../skills/service/service_ota/SKILL.md)

不要改写该 skill 的输入、输出、交接对象和禁止事项。本文件只提供 Cursor 可加载的连字符名称。
