---
name: service-watchdog
description: "Service 业务服务：喂狗策略、任务存活监控、复位诊断（带业务策略，非驱动封装）。"
---

# service-watchdog

Cursor 调用名是 `service-watchdog`。工作流、目录和代码里的 canonical id 仍是 `service_watchdog`。

执行前读取并遵守同插件中的 canonical skill，包括它引用的 references：

[service_watchdog](../../skills/service/service_watchdog/SKILL.md)

不要改写该 skill 的输入、输出、交接对象和禁止事项。本文件只提供 Cursor 可加载的连字符名称。
