---
name: bsp-wrapper
description: 定义平台无关的 BSP Wrapper 函数表注册与稳定转发边界。
---

# BSP Wrapper

## 边界

`drv_adapter_*.c/.h` 是 BSP Wrapper。它只保存抽象函数表、提供注册入口并转发稳定 API；不得包含 HAL、RTOS、Core 或具体 Driver/Handler 对象。

平台对象绑定、Core 后端选择和 OSAL 资源注入由 [`bsp-port`](../bsp-port/SKILL.md) 负责；器件协议与业务运行时状态分别交给 [`bsp-hal-driver`](../bsp-hal-driver/SKILL.md) 和 [`bsp-handler`](../bsp-handler/SKILL.md)。

共享层契约见 [`bsp-architecture-contract.md`](../references/bsp-architecture-contract.md)。
