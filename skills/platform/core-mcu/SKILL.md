---
name: core-mcu
description: 组织 MCU 内部 GPIO、I2C、SPI、UART、ADC、TIM、DMA、中断和启动初始化。
---

# Core MCU

## 边界

Core 只面向 MCU 内置资源，负责时钟、引脚、外设实例、中断/DMA、总线契约和后端算法。它调用厂商 Driver 的原生接口，不创建 Adapter，也不实现外部器件协议。

## 工作流

从芯片参考手册和工程启动文件建立外设资源表，确认 IRQ/DMA/时钟依赖，再输出可被 BSP Port 使用的初始化和事务级传输能力。I2C/SPI/UART 仅描述 MCU 控制器和总线，不描述外部器件协议。

## IIC 后端边界

Core IIC 公共接口提供初始化、释放、read/write、memory read/write、可选 DMA、状态码和带明确单位的超时。Core 拥有 `iic_bus_ops_t`、共享总线锁和硬件/软件后端；Port 可持有平台对象、选择后端并提供通用 HAL 回调，但不能包含器件协议或把自身变成软件时序后端。START、STOP、ACK、逐字节发送、SDA 方向和位时序只属于软件后端私有实现。

公共头不得暴露 `I2C_HandleTypeDef`、`GPIO_TypeDef`、RTOS 句柄或其他厂商类型。跨设备共享总线互斥由 Core 总线实例负责，但只可调用公开 `osal_mutex_*` 或注入的 lock/unlock Ops，不得调用原生 RTOS API。历史上位于 BSP 的 GPIO 模拟 IIC 应迁移为 Core Software IIC 后端。

CMSIS Core/Device 的源码路径和审计顺序见 [`cmsis-core-map.md`](references/cmsis-core-map.md)。
寄存器、中断、内存、总线和 MCU 外设的完整能力资料见 [`capability-index.md`](references/capability-index.md)。
硬件 IIC 与软件 IIC 解耦案例见 [`core-iic-backends-case.md`](references/core-iic-backends-case.md)。

交接：厂商 HAL/LL/CMSIS 交给 [`driver-vendor`](../driver-vendor/SKILL.md)，板上器件流程交给 [`bsp-hal-driver`](../../bsp/bsp-hal-driver/SKILL.md)。

共享层契约见 [`software-layer-contract.md`](../../workflow/workflow-project-integration/references/software-layer-contract.md)。
