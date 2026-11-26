---
name: service-battery
description: "Service 业务服务：电量计算、电压/充电状态、低电量告警策略（带业务策略，非驱动封装）。"
---

# service-battery

Cursor 调用名是 `service-battery`。工作流、目录和代码里的 canonical id 仍是 `service_battery`。

执行前读取并遵守同插件中的 canonical skill，包括它引用的 references：

[service_battery](../../skills/service/service_battery/SKILL.md)

不要改写该 skill 的输入、输出、交接对象和禁止事项。本文件只提供 Cursor 可加载的连字符名称。
