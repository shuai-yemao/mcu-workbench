---
name: impl_bsp_handler
description: Impl 内 Handler 机制子层：实例注册、生命周期、队列、工作线程、ISR 延后、缓存与回调（D5 机制层）。
---

# Impl BSP · Handler 机制子层

先读取共享 [`BSP 架构专用契约`](../../bsp/references/bsp-architecture-contract.md)。Handler 管理设备生命周期、请求串行化、缓存、队列、线程、事件与恢复；不重复器件协议，也不访问具体 Driver 成员。跨设备共享总线互斥不属于 Handler，由 platform_mcu Bus 契约负责。

## 决策与设计产物

- 同步、短且无缓存的操作不创建线程；缓存、长耗时写入、DMA/IRQ、多实例或异步回调才使用队列/线程。
- 即使没有线程的同步 Handle，也要定义 `init`、业务操作和 `deinit` 的幂等性、失败状态与重复初始化规则；一次失败初始化不得保留旧的 ready 状态。
- 定义 `xxx_handler_driver_ops_t`，由公开注册函数接收 Driver；Handler 只调用泛化 Ops。Driver、Handler 与 Wrapper 的可注入函数统一以 `void *context` 为首参，Port 只传递函数表与上下文，不得写桥接函数或函数指针强转。
- Handle 是设备类别层，例如 `bsp_display_handle`；不得包含具体设备 Driver、配置头、寄存器常量或型号专属状态。设备型号、几何参数和能力由 Port 注入。
- Port 可持有具体 Handler/Driver 实例并创建后注入 OSAL 资源。Handle 使用注入的 OSAL Ops 管理自身缓存并发；platform_mcu Bus 契约负责跨设备共享总线互斥。
- 在设计记录中写明：队列消息类型、超时单位、线程入口、回调上下文、缓存与指针生命周期。
- ISR 仅调用 `FromISR` 注入接口投递事件；协议读写、解码和回调在任务上下文完成，回调位于锁/临界区外。
- 停止顺序固定为：停止投递 → 唤醒线程 → 自然退出 → 回收线程/队列/锁。默认禁止强制删除线程。

模块级仅导出 Handle 构造与 Driver 注册函数；其余操作放在实例 `pf_*` 或 `static` 函数中。实例、缓存、事件和恢复证据见 [`handler-evidence.md`](references/handler-evidence.md)，样例见 [`capability-index.md`](references/capability-index.md)。
共享温湿度案例见 [`bsp-aht21-case.md`](../../bsp/references/bsp-aht21-case.md)。
GPIO 输出类的同步生命周期、错误传播与 Fake 验证见 [`gpio-output-peripheral-checklist.md`](../../bsp/references/gpio-output-peripheral-checklist.md)。
跨 skill 通用错误模式与调试教训见 [`common-error-patterns.md`](../../bsp/references/common-error-patterns.md)。

生成 Handle 使用 `bsp_<type>_handle.c/.h`；例如 `bsp_externflash_handle_read_id`。每实例只允许一个回调与上下文，第二次注册必须返回已注册状态而不是静默覆盖。没有缓存、队列、异步、IRQ 延后或多实例需求的器件可省略工作线程，但仍保留同步 Handle API。

板级注入交给 [`impl_board`](../impl_board/SKILL.md)，器件协议交给 [`impl_bsp`](../impl_bsp/SKILL.md)。
