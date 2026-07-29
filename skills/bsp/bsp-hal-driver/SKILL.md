---
name: bsp-hal-driver
description: Use when implementing, refactoring, or reviewing a BSP device Driver that isolates device protocol from HAL, RTOS, and board bindings.
---

# BSP Driver

先读取共享 [`BSP 架构专用契约`](../references/bsp-architecture-contract.md)，再从数据手册和原理图提取器件协议证据。

## 固定流程

1. 创建 `bsp_xxx_config.h`，集中地址、时序、能力开关和编译期限制；板级句柄不放入配置头。
2. 写出南北向接口表：北向为实例 `pf_*`；南向注入事务级总线、tick/delay、GPIO、IRQ、DMA、yield、trace。不得注入 START、STOP、ACK、SDA 方向或临界区等软件 IIC 细节。
3. 定义实例状态：`is_inited`、注入 Ops、私有上下文和 `pf_*`；初始化失败回滚，反初始化可重复。
4. 默认采用 `instance_only`：模块级仅 `bsp_xxx_driver_inst()`，其余函数为实例函数表或 `static`。兼容例外遵循 [`api-policy.md`](references/api-policy.md)。
5. 用 Fake Bus/Timebase/GPIO 覆盖成功、超时、重试和回滚路径，并把板级四级证据写入契约规定的位置。

## 禁止项

- 包含或调用 HAL、FreeRTOS、CMSIS-OS。
- 导出额外的 Driver 行为函数（除获批的 `legacy_event_api` 桥接）。
- 在 Driver 放置 Handler 的缓存、队列、线程或业务调度。

状态机、错误恢复和交接证据见 [`hal-driver-evidence.md`](references/hal-driver-evidence.md)；器件样例见 [`capability-index.md`](references/capability-index.md)。
共享温湿度案例见 [`bsp-aht21-case.md`](../references/bsp-aht21-case.md)。

交接：MCU 外设实现交给 [`core-mcu`](../../platform/core-mcu/SKILL.md)，厂商库交给 [`driver-vendor`](../../platform/driver-vendor/SKILL.md)，绑定交给 [`bsp-adapter`](../bsp-adapter/SKILL.md)。
