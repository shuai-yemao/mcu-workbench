---
name: impl_bsp
description: Impl 落地：器件 Driver 协议子层 + 同类 Driver Handle 机制子层（多实例/生命周期/缓存/重试），隔离 HAL/RTOS/板级绑定。
---

# Impl BSP（平台适配 · 器件 Driver + 同类 Driver Handle）

先遵循全项目 [`软件层契约`](../../workflow/workflow-review-gate/references/software-layer-contract.md)，
再读取 [`BSP 专项实现契约`](../../bsp/references/bsp-architecture-contract.md)，并从数据手册和原理图提取器件协议证据。

## 固定流程

1. 创建 `bsp_xxx_config.h`，集中地址、时序、能力开关和编译期限制；板级句柄不放入配置头。
2. 写出南北向接口表：Driver 北向为实例操作；南向根据目标 `platform_mcu` profile 使用事务级 Bus、tick/delay、GPIO、IRQ、DMA、yield、trace。`object-ops` 可注入以 `void *context` 为首参的 Ops；`flat-logical-resource` 可直接调用真实存在的 `plat_i2c_*`、`plat_spi_*`、`plat_gpio_*`、`plat_dma_*` 和 `plat_tick_*` 公共函数，但不得因此 include HAL。事务级 Bus 至少说明地址、长度、超时单位和错误码；不得注入 START、STOP、ACK、send-byte、SDA 方向或临界区等软件 IIC 细节。
3. Driver 与 Handle 均按 `cfg / ctx / data / ops` 定义。Driver `ctx` 只保存 resource 提供并由 Port 注入的 MCU/Core 上下文；Handle `cfg` 保存同一类别 Driver 集合，`ctx` 保存调度/选择上下文，`data` 保存聚合缓存和运行状态。
4. 定义实例状态：`is_inited`、注入 Ops、私有上下文和设备操作；初始化失败回滚，反初始化可重复。
5. 默认采用 `instance_only`：模块级仅导出构造函数和必要生命周期入口；其余行为放在对象 `ops` 或 `static` 函数中。兼容例外遵循 [`api-policy.md`](references/api-policy.md)。
5. 用 Fake Bus/Timebase/GPIO 覆盖成功、超时、重试和回滚路径，并把板级四级证据写入契约规定的位置。

GPIO 输出设备（LED、继电器、使能脚）遵循 [`GPIO 输出外设检查表`](../../bsp/references/gpio-output-peripheral-checklist.md)：逻辑状态与物理电平分离，必须保留极性、Core GPIO 上下文、失败状态和 deinit 规则，不能为套用通用器件模板虚构协议或 MCU Ops。

## Handle 机制子层（D5）

Handle 只组合**同一设备类别**的多个 Driver，管理设备生命周期、请求串行化、缓存、队列、线程、事件与恢复；不重复器件协议，也不访问 Driver 私有成员。不同设备类别的组合属于 Service，不属于 Handle。跨设备共享总线互斥不属于 Handle，由 `platform_mcu` Bus 契约负责。

- 同步、短且无缓存的操作不创建线程；缓存、长耗时写入、DMA/IRQ、多实例或异步回调才使用队列/线程。
- 即使没有线程的同步 Handle，也要定义 `init`、业务操作和 `deinit` 的幂等性、失败状态与重复初始化规则；一次失败初始化不得保留旧的 ready 状态。
- 定义私有的 `impl_<type>_handle_ops_t`，Handle 只通过它访问 Driver 的稳定操作；该 `ops` 不放进 Platform 公共结构，不作为跨模块注册接口。Driver、Handle 和 Platform 绑定的可注入函数统一以 `void *context` 为首参，Port 只传递函数表与上下文，不得写桥接函数或函数指针强转。
- Handle 是设备类别层，例如 `impl_display_handle_t`；可以持有同类 Driver 指针数组及其数量，但不得混入其他类别 Driver、配置头、寄存器常量或型号专属协议状态。设备型号、几何参数和能力由各 Driver 配置与 Port 注入。
- Handle 的 `ops` 仅内部使用；对 Platform 暴露 `impl_<type>_handle_init/read/write/control/...()` 等独立函数声明，Port 将这些函数绑定到 `platform_<type>_ops_t`，Platform 不感知 Handle 类型。
- Port 可持有具体 Driver/Handle 实例并创建后注入 OSAL 资源。Handle 使用注入的 OSAL 接口管理自身并发；`platform_mcu` Bus 契约负责跨设备共享总线互斥。
- 在设计记录中写明：队列消息类型、超时单位、线程入口、回调上下文、缓存与指针生命周期。
- ISR 仅调用 `FromISR` 注入接口投递事件；协议读写、解码和回调在任务上下文完成，回调位于锁/临界区外。
- 停止顺序固定为：停止投递 → 唤醒线程 → 自然退出 → 回收线程/队列/锁。默认禁止强制删除线程。

### 异步 DMA/IRQ 调用链

```text
platform_mcu IRQ/DMA
        → Driver event snapshot
        → Handle/Worker wakeup
        → Driver process_async()
        → next transaction or completion callback
```

Driver 只能保存事件快照并推进自己的器件状态；Handle 负责把事件与请求、队列、超时、取消和
回调关联起来。用户回调默认位于 Worker/调用者上下文，不能在 ISR、锁或临界区内执行。

### 资源与内存默认策略

Handle 默认使用 Port 注入的静态对象、固定容量 Driver 集合、有界队列和固定 DMA 缓冲区。动态内存
不是绝对禁止，但必须在设备 profile 中给出分配点、失败回滚、峰值、释放者和异步生命周期，并经过
单独审查。任何异步接口不得保存调用者临时栈变量或在 DMA 完成前回收借用缓冲区。

Port 可以提供签名适配函数，但适配函数只能完成参数/上下文转换，不能包含协议、重试、缓存或业务
逻辑；优先直接传递 context-first Ops，禁止函数指针强转。

生成 Handle 使用 `impl_<type>_handle.c/.h`；例如 `impl_storage_handle_read_id`。每个 Handle 实例只允许一个回调与上下文，第二次注册必须返回已注册状态而不是静默覆盖。没有缓存、队列、异步、IRQ 延后或多实例需求的器件可省略工作线程，但仍保留同步 Handle API。模块级只导出 Handle 构造和 Platform-facing 独立函数；Handle 内部 Driver 集合由 Port 一次性注入，不提供按运行期类型替换的注册槽。

## 生成目录与 DMA/IRQ

按设备实例创建 `04_Impl/impl_bsp/impl_bsp_hal_driver/<DEVICE>/Inc|Src`，Driver 使用 `impl_<device>_driver.c/.h` 与独立的 `impl_<device>_config.h`；同一类别的 Handle 位于 `04_Impl/impl_bsp/impl_bsp_handle/<type>/Inc|Src`，Board Port 位于扁平目录 `04_Impl/impl_bsp/impl_bsp_port/Inc|Src`。Port 文件名采用 Handle 文件名追加 `_port`，例如 `impl_storage_handle_port.c/.h`。Driver 必须把 platform_mcu 的 DMA/IRQ 完成事件转换为设备事件，不直接配置 HAL/NVIC，也不创建任务。Handle 只接收同类 Driver 集合并聚合事件，不直接处理中断寄存器。生成代码统一采用 [`项目风格 profile`](../../tools/tools-quality/references/style-profile.md) 的文件/API 注释和源文件分区。

Port 可长期持有具体 Driver 和 Handle，并把 Handle 的独立公开函数绑定到 Platform Device Ops；这种所有权不允许 Port 复制设备协议、命令常量或状态机。

## 禁止项

- 包含或调用 HAL、FreeRTOS、CMSIS-OS。
- 导出额外的 Driver 行为函数（除获批的 `legacy_event_api` 桥接）。
- 在 Driver 放置 Handle 的缓存、队列、线程或业务调度。

状态机、错误恢复和交接证据见 [`hal-driver-evidence.md`](references/hal-driver-evidence.md)；Handle 实例、缓存、事件和恢复证据见 [`handler-evidence.md`](references/handler-evidence.md)；器件样例见 [`capability-index.md`](references/capability-index.md)。
共享温湿度案例见 [`bsp-aht21-case.md`](../../bsp/references/bsp-aht21-case.md)。
GPIO 输出类的同步生命周期、错误传播与 Fake 验证见 [`gpio-output-peripheral-checklist.md`](../../bsp/references/gpio-output-peripheral-checklist.md)。
跨 skill 通用错误模式与调试教训见 [`common-error-patterns.md`](../../bsp/references/common-error-patterns.md)。

交接：MCU 外设实现交给 [`platform_mcu`](../../platform/platform_mcu/SKILL.md)，厂商库交给 [`vendor_mcu`](../../vendor/vendor_mcu/SKILL.md)，绑定交给 [`impl_board`](../impl_board/SKILL.md)。
