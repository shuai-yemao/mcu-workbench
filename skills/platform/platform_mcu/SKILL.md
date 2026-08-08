---
name: platform_mcu
description: Platform 纯定义：MCU 能力接口（GPIO、I2C、SPI、UART、ADC、TIM、DMA、中断、启动初始化）。
---

# Platform MCU（平台抽象 · 纯定义）

## 边界

Platform 只定义能力契约，**零实现，不绑定芯片**。本技能面向 MCU 内置资源的能力接口：时钟、引脚、外设实例、中断/DMA、总线契约和后端算法接口。它调用厂商 Driver 的原生接口由 Impl 承接，不创建 Adapter，也不实现外部器件协议。

## 公共定义来源

统一错误码、基础类型、对象模型与生命周期由 [`platform_common`](../platform_common/SKILL.md) 承载；本技能只负责 MCU 能力接口与后端契约。

## 工作流

从芯片参考手册和工程启动文件建立外设资源表，确认 IRQ/DMA/时钟依赖，再输出可被 Impl 使用的初始化和事务级传输**能力接口**。I2C/SPI/UART 仅描述 MCU 控制器和总线能力，不描述外部器件协议。

## I2C 后端边界

Platform I2C 公共接口提供初始化、释放、事务 read/write、memory read/write、可选 DMA/IRQ 启动、取消、状态码和带明确单位的超时；它不是只有读写函数的薄封装。Platform 只定义 `platform_i2c_ops_t` 与硬件/软件后端**接口**，不拥有锁、任务、业务缓存或设备协议；锁与回调上下文属于 Handler。Impl 可持有平台对象并选择后端，但不能包含器件协议或把自身变成软件时序后端。START、STOP、ACK、逐字节发送、SDA 方向和位时序只属于软件后端私有实现（Impl）。

## 生成契约

`mcu-workbench core --peripheral <name>` 每类外设只生成 `03_Platform/platform_mcu/Inc/platform_<name>.h` 和 `03_Platform/platform_mcu/Src/platform_<name>.c`。`iic` 仅是 CLI 输入别名，统一归一化为 `i2c`；公开文件名、API 和文档只能使用 `i2c`。公共头不包含 HAL、FreeRTOS、CMSIS-OS 或厂商类型；使用 `void *backend_context` 隔离平台上下文。

公共头不得暴露 `I2C_HandleTypeDef`、`GPIO_TypeDef`、RTOS 句柄或其他厂商类型。跨设备共享总线互斥由 Platform 总线实例契约负责，但只可调用公开 `osal_mutex_*` 或注入的 lock/unlock Ops，不得调用原生 RTOS API。历史上位于 BSP 的 GPIO 模拟 I2C 应迁移为 Impl 层软件时序后端（位时序私有实现）。

CMSIS Core/Device 的源码路径和审计顺序见 [`cmsis-core-map.md`](references/cmsis-core-map.md)。
寄存器、中断、内存、总线和 MCU 外设的完整能力资料见 [`capability-index.md`](references/capability-index.md)。
硬件 IIC 与软件 IIC 解耦案例见 [`core-iic-backends-case.md`](references/core-iic-backends-case.md)。

交接：厂商 HAL/LL/CMSIS 交给 [`vendor_stm32`](../../vendor/vendor_stm32/SKILL.md)，板上器件流程交给 [`impl_bsp`](../../impl/impl_bsp/SKILL.md)。

共享层契约见 [`software-layer-contract.md`](../../workflow/workflow-review-gate/references/software-layer-contract.md)。
