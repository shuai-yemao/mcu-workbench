# CMSIS Core/Device 源码证据

- 仓库：[ARM-software/CMSIS_6](https://github.com/ARM-software/CMSIS_6)
- 分支：`main`
- 复核 commit：`7f62ddc8ab8e9af22039912b8f9f46a9290f49ba`
- 关注路径：`CMSIS/Core/`、`Device/`、启动和 Pack 描述

## Core 负责的内容

CMSIS Core 提供 Cortex-M 的编译器抽象、NVIC、SCB、SysTick、MPU、FPU 和启动支持。Core skill 负责把这些能力组织为芯片时钟、引脚、外设实例、中断和 DMA 初始化，不实现外部器件协议。

## 审计顺序

1. 先锁定 Cortex-M 型号、CMSIS 代际和 Device Pack。
2. 核对启动文件、向量表、时钟树、IRQ 优先级和 DMA 通道。
3. 再映射 GPIO/I2C/SPI/UART/ADC/TIM 到 BSP Port 可使用的能力。
4. 记录中断上下文、缓存一致性、低功耗唤醒和复位原因。

CMSIS 原生接口不创建项目 Adapter；需要项目隔离时由 BSP Port 或 OS Port 消化。
