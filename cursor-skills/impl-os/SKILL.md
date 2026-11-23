---
name: impl-os
description: "Impl 落地：具体 RTOS（尤其 FreeRTOS）或裸机的 impl_os_*() 后端实现、配置审查、调度诊断和迁移验收。用户提到 OSAL、任务/队列/同步、Timer、heap、FreeRTOSConfig、FromISR、tick、临界区或 RTOS Port 时使用本 Skill。"
---

# impl-os

Cursor 调用名是 `impl-os`。工作流、目录和代码里的 canonical id 仍是 `impl_os`。

执行前读取并遵守同插件中的 canonical skill，包括它引用的 references：

[impl_os](../../skills/impl/impl_os/SKILL.md)

不要改写该 skill 的输入、输出、交接对象和禁止事项。本文件只提供 Cursor 可加载的连字符名称。
