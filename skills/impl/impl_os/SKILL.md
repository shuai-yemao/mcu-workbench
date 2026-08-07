---
name: impl_os
description: Impl 落地：具体 RTOS（FreeRTOS）或裸机的 os_*_impl() 原生 Port 实现、调度调试和迁移验收。
---

# Impl OS（平台适配 · OS 绑定）

## 边界

处理具体 RTOS 或裸机运行时的原生配置与 `os_*_impl()` Port 实现：任务、队列、同步、定时器、堆、栈和调度诊断。稳定的项目接口由 [`platform_os`](../../platform/platform_os/SKILL.md) 定义；本层只负责把 Platform 接口落到具体 RTOS。

## 规则

FreeRTOS 类型和 `xTask*`/`xQueue*` 只能出现在 Impl 或本 skill 的配置 references 中；APP、Service 使用 `osal_*`。不要为 FreeRTOS 再创建第二套 Adapter。

Impl 先保持 OSAL 的超时单位、所有权和错误语义，再映射到 `xQueue*`、`xTask*` 等原生 API。Tickless、Idle Hook 和 Trace Hook 属于本层；任务看门狗、故障恢复和系统重启策略交给 [`software-system`](../../service/service_system/SKILL.md)（阶段 4 升格 service_system）。

源码目录、配置和端口映射见 [`freertos-source-map.md`](references/freertos-source-map.md)。

项目目录实例与调用链检查放在 [`freertos-source-map.md`](references/freertos-source-map.md)；通用入口不假设具体项目路径。源文件可以命名为 `os_impl_*.c`，内部函数统一采用 `os_*_impl()`。
