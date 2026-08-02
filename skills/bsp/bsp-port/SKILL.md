---
name: bsp-port
description: Use when binding BSP Driver or Handle interfaces to Core, GPIO, buses, timebase, RTOS, or exposing them through BSP Port and Wrapper.
---

# BSP Port

先读取共享 [`BSP 架构专用契约`](../references/bsp-architecture-contract.md)。`drv_adapter_*.c/.h` 是 BSP Wrapper（历史名 Adapter），`drv_adapter_port_*.c/.h` 是 BSP Port。固定运行时调用链为 `APP → APP Facade（可选）→ Wrapper → Port 回调 → Handler → Driver → Core Bus`；启动时由 Port 把函数表注册到 Wrapper。

## Port

为每个抽象函数建立“抽象函数 → Core/Handle API → 参数/状态转换 → 阻塞与 ISR 限制”映射表。生成 Port 不直接调用 HAL/LL；平台初始化与总线绑定应封装在 Core 后端或注入 Ops。

- 允许：持有具体 Driver/Handler/平台对象，选择并绑定 Core 后端，并创建后注入 Handler 所需 OSAL 任务、队列或同步资源。
- 禁止：放置设备命令、寄存器语义、协议状态机、软件 IIC/SPI 位时序，或在 Port 定义 Handler 的任务入口、业务循环、重试、缓存更新和回调逻辑。
- Handler 的业务缓存只能保留在 Handler 实例；Port 不得维护重复的 `latest`/`cache` 数据副本。
- 生产 Port 与 Fake Port 必须注册同形函数表。生产实现绑定 STM32/Core/OSAL，Fake 实现绑定 Fake Bus/时基/OSAL，Wrapper 代码不因测试而分叉。

## Wrapper

Wrapper 只包含标准类型头和自身公共声明，不能包含 Port、HAL、RTOS、Core 或具体 Driver/Handler。它静态持有 `xxx_drv_t` 抽象函数表、提供注册入口和稳定转发 API；不持有平台句柄或具体实例，也不绕过函数表调用。

`User_Task/*/Platform/*_port/` 不是 BSP Port，而是 APP Facade/Task Adapter：只能转发到 BSP Wrapper 公共 API，不得包含 HAL、Core、Driver、Handler 或 OSAL。

## 生成契约

目录和名称固定为 `Bsp/Porting/<type>/drv_adapter_port_<type>.c/.h` 与 `Bsp/Wrapper/<type>/drv_adapter_wrapper_<type>.c/.h`，不得使用错误的 Wrapper 拼写。Port 只导出一个 `drv_adapter_port_<type>_register()`；私有装配区可以绑定 Core、Driver、Handle，运行时转发只能调用 Handle API。Wrapper 只能包含标准头和自身头，通过函数表注册/转发；APP 只调用 Wrapper。生成 Port 不直接调用 HAL，平台实现应通过 Core 后端注入。

器件协议交给 [`bsp-hal-driver`](../bsp-hal-driver/SKILL.md)，资源/并发交给 [`bsp-handler`](../bsp-handler/SKILL.md)。Wrapper/Port 证据见 [`bsp-layer-evidence.md`](references/bsp-layer-evidence.md)，器件适配和 Fake Port 样例见 [`capability-index.md`](references/capability-index.md)。
共享温湿度案例见 [`bsp-aht21-case.md`](../references/bsp-aht21-case.md)。
跨 skill 通用错误模式与调试教训见 [`../references/common-error-patterns.md`](../references/common-error-patterns.md)。

全局分层见 [`software-layer-contract.md`](../../workflow/workflow-project-integration/references/software-layer-contract.md)。
