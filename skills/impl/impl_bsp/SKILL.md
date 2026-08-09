---
name: impl_bsp
description: Impl 落地：器件驱动实现（Driver 协议子层）+ Handler 机制子层（多实例/生命周期/缓存/重试），隔离 HAL/RTOS/板级绑定。
---

# Impl BSP（平台适配 · 器件驱动 + Handler 机制）

先读取共享 [`BSP 架构专用契约`](../../bsp/references/bsp-architecture-contract.md)，再从数据手册和原理图提取器件协议证据。

## 固定流程

1. 创建 `bsp_xxx_config.h`，集中地址、时序、能力开关和编译期限制；板级句柄不放入配置头。
2. 写出南北向接口表：北向为实例 `pf_*`；南向注入事务级总线、tick/delay、GPIO、IRQ、DMA、yield、trace。可注入函数以 `void *context` 为首参，确保 Port 可以直接组装 Ops。事务级 Bus Ops 至少说明 read/write/memory read/memory write 的地址、长度、超时单位和错误码；不得注入 START、STOP、ACK、send-byte、SDA 方向或临界区等软件 IIC 细节。
3. 定义实例状态：`is_inited`、注入 Ops、私有上下文和 `pf_*`；初始化失败回滚，反初始化可重复。
4. 默认采用 `instance_only`：模块级仅 `impl_xxx_driver_inst()`，其余函数为实例函数表或 `static`。兼容例外遵循 [`api-policy.md`](references/api-policy.md)。
5. 用 Fake Bus/Timebase/GPIO 覆盖成功、超时、重试和回滚路径，并把板级四级证据写入契约规定的位置。

GPIO 输出设备（LED、继电器、使能脚）遵循 [`GPIO 输出外设检查表`](../../bsp/references/gpio-output-peripheral-checklist.md)：逻辑状态与物理电平分离，必须保留极性、Core GPIO 上下文、失败状态和 deinit 规则，不能为套用通用器件模板虚构协议或 MCU Ops。

## Handler 机制子层（D5）

Handler 管理设备生命周期、请求串行化、缓存、队列、线程、事件与恢复；不重复器件协议，也不访问具体 Driver 成员。跨设备共享总线互斥不属于 Handler，由 `platform_mcu` Bus 契约负责。

- 同步、短且无缓存的操作不创建线程；缓存、长耗时写入、DMA/IRQ、多实例或异步回调才使用队列/线程。
- 即使没有线程的同步 Handle，也要定义 `init`、业务操作和 `deinit` 的幂等性、失败状态与重复初始化规则；一次失败初始化不得保留旧的 ready 状态。
- 定义 `xxx_handler_driver_ops_t`，由公开注册函数接收 Driver；Handler 只调用泛化 Ops。Driver、Handler 与 Wrapper 的可注入函数统一以 `void *context` 为首参，Port 只传递函数表与上下文，不得写桥接函数或函数指针强转。
- Handle 是设备类别层，例如 `bsp_display_handle`；不得包含具体设备 Driver、配置头、寄存器常量或型号专属状态。设备型号、几何参数和能力由 Port 注入。
- Port 可持有具体 Handler/Driver 实例并创建后注入 OSAL 资源。Handle 使用注入的 OSAL Ops 管理自身缓存并发；`platform_mcu` Bus 契约负责跨设备共享总线互斥。
- 在设计记录中写明：队列消息类型、超时单位、线程入口、回调上下文、缓存与指针生命周期。
- ISR 仅调用 `FromISR` 注入接口投递事件；协议读写、解码和回调在任务上下文完成，回调位于锁/临界区外。
- 停止顺序固定为：停止投递 → 唤醒线程 → 自然退出 → 回收线程/队列/锁。默认禁止强制删除线程。

生成 Handle 使用 `bsp_<type>_handle.c/.h`；例如 `bsp_externflash_handle_read_id`。每实例只允许一个回调与上下文，第二次注册必须返回已注册状态而不是静默覆盖。没有缓存、队列、异步、IRQ 延后或多实例需求的器件可省略工作线程，但仍保留同步 Handle API。模块级仅导出 Handle 构造与 Driver 注册函数；其余操作放在实例 `pf_*` 或 `static` 函数中。

## 生成目录与 DMA/IRQ

按设备类别创建 `04_Impl/impl_bsp/<type>/<DEVICE>/Inc|Src`，Driver 使用 `impl_<device>_driver.c/.h` 与独立的 `impl_<device>_config.h`；同一类别的 Handle 位于 `04_Impl/impl_bsp_handler/<type>/Inc|Src`（工程目录保持独立子层，D5）。Driver 必须把 platform_mcu 的 DMA/IRQ 完成事件转换为设备事件，不直接配置 HAL/NVIC，也不创建任务。生成代码采用 [`完整注释 Profile`](../../tools/tools-quality/references/generated-bsp-comment-profile.md) 的文件/API 注释和 `Includes`、`Private Defines`、`Private Types`、`Private State`、`Private Functions`、`Public Functions` 分区。

Port 可长期持有具体 Driver 并把其北向回调注册到 Wrapper；这种所有权不允许 Port 复制设备协议、命令常量或状态机。

## 禁止项

- 包含或调用 HAL、FreeRTOS、CMSIS-OS。
- 导出额外的 Driver 行为函数（除获批的 `legacy_event_api` 桥接）。
- 在 Driver 放置 Handler 的缓存、队列、线程或业务调度。

状态机、错误恢复和交接证据见 [`hal-driver-evidence.md`](references/hal-driver-evidence.md)；Handler 实例、缓存、事件和恢复证据见 [`handler-evidence.md`](references/handler-evidence.md)；器件样例见 [`capability-index.md`](references/capability-index.md)。
共享温湿度案例见 [`bsp-aht21-case.md`](../../bsp/references/bsp-aht21-case.md)。
GPIO 输出类的同步生命周期、错误传播与 Fake 验证见 [`gpio-output-peripheral-checklist.md`](../../bsp/references/gpio-output-peripheral-checklist.md)。
跨 skill 通用错误模式与调试教训见 [`common-error-patterns.md`](../../bsp/references/common-error-patterns.md)。

交接：MCU 外设实现交给 [`platform_mcu`](../../platform/platform_mcu/SKILL.md)，厂商库交给 [`vendor_stm32`](../../vendor/vendor_stm32/SKILL.md)，绑定交给 [`impl_board`](../impl_board/SKILL.md)。
