---
name: core-mcu
description: 组织 MCU 内部 GPIO、I2C、SPI、UART、ADC、TIM、DMA、中断和启动初始化。
---

# Core MCU

## 边界

Core 只面向 MCU 内置资源，负责时钟、引脚、外设实例、中断/DMA 和初始化顺序。它调用厂商 Driver 的原生接口，不创建 Adapter，也不实现外部器件协议。

## 工作流

从芯片参考手册和工程启动文件建立外设资源表，确认 IRQ/DMA/时钟依赖，再输出可被 BSP Port 使用的初始化和传输能力。I2C/SPI/UART 仅描述 MCU 控制器，不描述传感器协议。

CMSIS Core/Device 的源码路径和审计顺序见 [`cmsis-core-map.md`](references/cmsis-core-map.md)。

交接：厂商 HAL/LL/CMSIS 交给 [`driver-vendor`](../driver-vendor/SKILL.md)，板上器件流程交给 [`bsp-hal-driver`](../../bsp/bsp-hal-driver/SKILL.md)。

共享层契约见 [`software-layer-contract.md`](../../workflow/workflow-project-integration/references/software-layer-contract.md)。
