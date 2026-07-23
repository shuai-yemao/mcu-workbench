---
name: rtos-freertos
description: FreeRTOS 专用配置、原生 Port 实现、调度调试和迁移验收。
---

# FreeRTOS

## 边界

只处理 FreeRTOS 原生配置与 `os_impl_*` Port：任务、队列、同步、定时器、堆、栈和调度诊断。稳定的项目接口由 [`os-abstraction`](../os-abstraction/SKILL.md) 定义。

## 规则

FreeRTOS 类型和 `xTask*`/`xQueue*` 只能出现在 Port 或本 skill 的配置 references 中；APP、BSP、Middleware 使用 `osal_*`。不要为 FreeRTOS 再创建第二套 Adapter。

## GR5526 验收

检查 `components/graphics/lvgl_port/os_adapter/FreeRTOS/src/os_impl_*.c` 是否只做原生 API 绑定，并验证 `osal_task_create → os_impl_task_create → xTaskCreate` 的调用链。
