---
name: bsp-adapter
description: Use when binding BSP Driver or Handle interfaces to Core, GPIO, buses, timebase, RTOS, or exposing them through BSP Port and Wrapper.
---

# BSP Adapter

先读取共享 [`BSP 架构专用契约`](../references/bsp-architecture-contract.md)。固定调用链为 `APP/Middleware → Wrapper → Port → Handler → Driver → Core Bus`；Port 负责装配依赖和完成就绪门控。

## Port

为每个抽象函数建立“抽象函数 → 平台 API → 参数/状态转换 → 阻塞与 ISR 限制”映射表。Port 只构造、注册并注入 Core Bus、OSAL、时基和 Driver Ops；不得调用 HAL、实现软件 IIC 或持有业务状态。生产 Port 与 Fake Port 使用同形函数表。显示类 Port 还必须说明像素缓冲的所有者、可访问上下文及 flush 完成前后的有效期。

## Wrapper

Wrapper 只包含 Port 公共头文件，不能包含 Driver、Handle、HAL、RTOS 或具体总线实现。它提供稳定的上层 API，不持有平台句柄，也不绕过 Port 调用实例内部函数。

器件协议交给 [`bsp-hal-driver`](../bsp-hal-driver/SKILL.md)，资源/并发交给 [`bsp-handler`](../bsp-handler/SKILL.md)。Wrapper/Port 证据见 [`bsp-layer-evidence.md`](references/bsp-layer-evidence.md)，器件适配和 Fake Port 样例见 [`capability-index.md`](references/capability-index.md)。
共享温湿度案例见 [`bsp-aht21-case.md`](../references/bsp-aht21-case.md)。

全局分层见 [`software-layer-contract.md`](../../workflow/workflow-project-integration/references/software-layer-contract.md)。
