---
name: service-log
description: "Service 业务服务：分级日志与业务过滤策略（可选环形缓冲/导出），以 service 对象管理生命周期，非驱动或 Vendor 封装。"
---

# service-log

Cursor 调用名是 `service-log`。工作流、目录和代码里的 canonical id 仍是 `service_log`。

执行前读取并遵守同插件中的 canonical skill，包括它引用的 references：

[service_log](../../skills/service/service_log/SKILL.md)

不要改写该 skill 的输入、输出、交接对象和禁止事项。本文件只提供 Cursor 可加载的连字符名称。
