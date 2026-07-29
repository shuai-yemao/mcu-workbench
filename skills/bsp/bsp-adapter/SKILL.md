---
name: bsp-adapter
description: Use when binding BSP Driver or Handle interfaces to Core, GPIO, buses, timebase, RTOS, or exposing them through BSP Port and Wrapper.
---

# BSP Adapter

先读取共享 [`BSP 架构专用契约`](../references/bsp-architecture-contract.md)。固定运行时调用链为 `APP/Middleware → Wrapper → Port → Handler → Driver → Core Bus`；Port 仅是装配和板级绑定点，不是业务实例所有者。

## Port

为每个抽象函数建立“抽象函数 → 平台 API → 参数/状态转换 → 阻塞与 ISR 限制”映射表。Port 可调用 HAL/LL 做 GPIO、时钟、DMA、NVIC、总线初始化/反初始化和时基绑定；每次直接 HAL 调用都必须记录用途。

- 允许：选择并绑定 Core 硬件/软件总线后端，填充 Core Bus、OSAL、时基与 Driver Ops。
- 禁止：用 `HAL_I2C_*`/`HAL_SPI_*`/`HAL_UART_*` 直接执行器件事务，保存器件协议状态，或实现 START、STOP、ACK、逐字节收发等软件总线时序。
- Wrapper 静态拥有 Driver、Handler 与生命周期状态；Port 只写入调用方提供的装配存储，返回后不得保存这些实例的引用。
- 生产 Port 与 Fake Port 必须使用同形装配函数表。生产实现绑定 STM32 Core 后端，Fake 实现注入 Fake Bus、时基和 OSAL，Wrapper 代码不因测试而分叉。

## Wrapper

Wrapper 只包含 Port 公共头文件，不能包含 HAL、RTOS、具体总线实现或具体 Driver/Handler 的公共类型。它提供稳定的上层 API，并私有静态持有由 Port 装配的实例；不持有平台句柄，也不绕过 Port 调用实例内部函数。

器件协议交给 [`bsp-hal-driver`](../bsp-hal-driver/SKILL.md)，资源/并发交给 [`bsp-handler`](../bsp-handler/SKILL.md)。Wrapper/Port 证据见 [`bsp-layer-evidence.md`](references/bsp-layer-evidence.md)，器件适配和 Fake Port 样例见 [`capability-index.md`](references/capability-index.md)。
共享温湿度案例见 [`bsp-aht21-case.md`](../references/bsp-aht21-case.md)。

全局分层见 [`software-layer-contract.md`](../../workflow/workflow-project-integration/references/software-layer-contract.md)。
