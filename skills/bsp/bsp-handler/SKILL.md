---
name: bsp-handler
description: Use when a BSP device requires instance registration, lifecycle management, queues, worker threads, ISR deferral, caching, or callbacks above its Driver.
---

# BSP Handle

先读取共享 [`BSP 架构专用契约`](../references/bsp-architecture-contract.md)。Handler 管理设备生命周期、请求串行化、缓存、队列、线程、事件与恢复；不重复器件协议，也不访问具体 Driver 成员。跨设备共享总线互斥不属于 Handler，由 Core Bus 负责。

## 决策与设计产物

- 同步、短且无缓存的操作不创建线程；缓存、长耗时写入、DMA/IRQ、多实例或异步回调才使用队列/线程。
- 定义 `xxx_handler_driver_ops_t`，由公开注册函数接收 Driver；Handler 只调用泛化 Ops。Port 可持有具体 Handler/Driver 实例并注入 OSAL 资源，但任务入口、循环、缓存、重试与回调实现必须归 Handler。
- 在设计记录中写明：队列消息类型、超时单位、线程入口、回调上下文、缓存与指针生命周期。
- ISR 仅调用 `FromISR` 注入接口投递事件；协议读写、解码和回调在任务上下文完成，回调位于锁/临界区外。
- 停止顺序固定为：停止投递 → 唤醒线程 → 自然退出 → 回收线程/队列/锁。默认禁止强制删除线程。

模块级仅导出 Handle 构造与 Driver 注册函数；其余操作放在实例 `pf_*` 或 `static` 函数中。实例、缓存、事件和恢复证据见 [`handler-evidence.md`](references/handler-evidence.md)，样例见 [`capability-index.md`](references/capability-index.md)。
共享温湿度案例见 [`bsp-aht21-case.md`](../references/bsp-aht21-case.md)。
跨 skill 通用错误模式与调试教训见 [`../references/common-error-patterns.md`](../references/common-error-patterns.md)。

生成 Handle 使用 `bsp_<type>_handle.c/.h`；例如 `bsp_externflash_handle_read_id`。每实例只允许一个回调与上下文，第二次注册必须返回已注册状态而不是静默覆盖。没有缓存、队列、异步、IRQ 延后或多实例需求的器件可省略工作线程，但仍保留同步 Handle API。

板级注入交给 [`bsp-port`](../bsp-port/SKILL.md)，器件协议交给 [`bsp-hal-driver`](../bsp-hal-driver/SKILL.md)。
