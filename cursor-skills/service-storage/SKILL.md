---
name: service-storage
description: "Service 业务服务：参数存取、KV、分区管理、掉电安全（带业务策略，非驱动封装）。"
---

# service-storage

Cursor 调用名是 `service-storage`。工作流、目录和代码里的 canonical id 仍是 `service_storage`。

执行前读取并遵守同插件中的 canonical skill，包括它引用的 references：

[service_storage](../../skills/service/service_storage/SKILL.md)

不要改写该 skill 的输入、输出、交接对象和禁止事项。本文件只提供 Cursor 可加载的连字符名称。
