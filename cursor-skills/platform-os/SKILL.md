---
name: platform-os
description: "Platform OS：定义不泄漏 RTOS 原生类型的 OS 能力契约，并根据目标工程证据识别直接后端或显式 Impl 桥接。用户提到 OSAL、任务/队列/同步/Timer/heap、公共句柄、超时单位、ISR 或 OS 分层时使用本 Skill。"
---

# platform-os

Cursor 调用名是 `platform-os`。工作流、目录和代码里的 canonical id 仍是 `platform_os`。

执行前读取并遵守同插件中的 canonical skill，包括它引用的 references：

[platform_os](../../skills/platform/platform_os/SKILL.md)

不要改写该 skill 的输入、输出、交接对象和禁止事项。本文件只提供 Cursor 可加载的连字符名称。
