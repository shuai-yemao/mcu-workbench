---
name: middleware-lvgl
description: 集成 LVGL 核心、显示/输入接入、刷新调度和 GUI 性能优化。
---

# LVGL 中间件

## 边界

负责 LVGL 对象树、渲染/输入回调、刷新周期、内存和 GUI 性能。显示与触摸设备通过 BSP Wrapper 接入；任务、互斥和定时通过 OS Wrapper 接入；不直接调用 FreeRTOS、Core 或 Driver。

## 工作流

1. 先确定分辨率、刷新周期、绘制缓冲和输入事件模型。
2. 将 `flush_cb`、`read_cb` 和电源状态映射到 BSP Wrapper。
3. 用独立 GUI/输入任务驱动 `lv_timer_handler`，测量帧时延、内存和撕裂风险。

## GR5526

验收 `lvgl_*`、`lvgl_port.*`、`task_gui`、`task_indev`，并确认 `drv_adapter_disp_on` 等调用来自 BSP Wrapper，而非显示 hal_driver。

交接：设备绑定交给 [`bsp-adapter`](../../bsp/bsp-adapter/SKILL.md)，并发契约交给 [`os-abstraction`](../../rtos/os-abstraction/SKILL.md)。
