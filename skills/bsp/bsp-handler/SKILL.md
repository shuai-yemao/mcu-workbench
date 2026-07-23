---
name: bsp-handler
description: 设计 BSP 多实例、生命周期、缓存、队列、事件、资源所有权和错误恢复。
---

# BSP Handler

Handler 面向产品场景管理一个或多个器件实例，负责生命周期、缓存、队列、事件、互斥和恢复策略；不重复 hal_driver 的器件协议。

## 工作流

1. 画出实例、任务、队列和缓存的所有权图。
2. 定义 init/start/stop/sleep/recover 状态机及幂等性。
3. 通过 BSP Wrapper 访问设备，通过 OS Wrapper 管理并发。
4. 将板级绑定交给 [`bsp-adapter`](../bsp-adapter/SKILL.md)，器件原语交给 [`bsp-hal-driver`](../bsp-hal-driver/SKILL.md)。

GR5526 可用 `app_power_manager.c`、显示/触摸任务和 Flash 缓存验收睡眠唤醒与资源释放。
