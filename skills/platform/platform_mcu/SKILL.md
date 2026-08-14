---
name: platform_mcu
description: 面向嵌入式工程设计和审查 platform_mcu 能力接口；当用户讨论 MCU 基础能力、DMA/Timer/ADC/Watchdog 资源、SPI/I2C 总线、事件回调、复位原因或 HardFault 契约时使用。平台接口必须保持芯片、HAL、RTOS 和外部器件协议无关。
---

# Platform MCU（MCU 能力接口与资源契约）

## 适用范围

本 Skill 面向目标工程 `03_Platform/platform_mcu` 的公开能力接口，以及供下层实现注入的后端契约。开始设计或修改前，必须读取目标工程真实头文件、`platform_common` 公共对象模型和可复现构建证据；没有硬件证据时只更新平台契约，不猜写后端。

当前目标工程以 `platform_` 统一命名 MCU 能力接口，共 13 个公开头文件；当前目录只有公共接口头文件，没有由此推导出的对应 `.c` 实现：

| 能力分组 | 公开文件 | 对象/职责 |
| --- | --- | --- |
| 基础能力 | `platform_tick.h`、`platform_gpio.h`、`platform_irq.h`、`platform_event.h` | 系统时基、GPIO 引脚、中断状态令牌、固定大小事件值与回调配置 |
| 资源能力 | `platform_adc.h`、`platform_dma.h`、`platform_timer.h`、`platform_watchdog.h` | 同步/异步采样、DMA 传输、定时器启停、看门狗控制 |
| 总线与通信 | `platform_i2c.h`、`platform_spi.h`、`platform_uart.h` | I2C/SPI 总线事务、UART 同步/异步收发 |
| 故障诊断 | `platform_reset_reason.h`、`platform_hardfault.h` | 复位原因值契约、ARM HardFault 现场/处理契约 |

完整的文件、类型、初始化入口和 Ops 映射见 [`platform-mcu-interface-contract.md`](references/platform-mcu-interface-contract.md)。

## 分层边界

依赖方向固定为：

```text
App → Service → Platform 接口 ← Impl / BSP → Vendor / HAL / RTOS
```

Platform MCU 只定义能力、状态、生命周期入口和抽象 Ops：

- 不包含 STM32 HAL/LL、CMSIS Device、寄存器、ESP-IDF、FreeRTOS 或其他厂商类型；
- 不实现硬件初始化、IRQ 处理、DMA 完成等待或软件 I2C 位时序；
- 不保存设备协议状态机、业务缓存、任务、锁或消息队列；
- 不实现外部器件协议；外部 Flash、传感器等器件属于 `platform_bsp`/`impl_bsp` 的独立需求，不因使用 SPI 自动进入 `platform_mcu`；
- 不将原始 HAL/SDK 状态码向上泄漏，后端必须映射为 `platform_err_t`；
- 不为缺少芯片、引脚、外设实例和厂商源码证据的目标猜写后端。

芯片绑定交给 Impl，板级片选、引脚和器件装配交给 BSP/组合根；厂商 API 的版本、路径和差异交给 [`vendor_stm32`](../../vendor/vendor_stm32/SKILL.md)。

## 公共定义与对象模型

### 唯一公共出口

- 错误码只使用 `platform_error.h` 的 `platform_err_t` 与 `PLATFORM_ERR_*`，通过 `PLATFORM_IS_OK`/`PLATFORM_IS_ERR` 判定；
- 基础类型只使用 `platform_type.h` 的 `uint8_t`、`uint16_t`、`uint32_t`、`bool_t` 等出口，不在 `platform_mcu` 重新定义类型；
- 对象身份和生命周期来自 `platform_common` 的 `core/inc`、`object/inc`、`manager/inc`、`diag/inc`；不得复制另一套 `magic/state/handle` 协议。对应公共 Skill 见 [`platform_common`](../platform_common/SKILL.md)。

### 设备四元组

每一个承载 Platform 身份的 MCU 能力对象都必须采用以下布局：

```c
struct platform_xxx_device
{
    platform_device_t base;       /* 首字段，支持公共对象身份校验。 */
    const xxx_cfg_t *cfg;          /* 静态配置，借用只读引用。 */
    xxx_ctx_t ctx;                 /* 实例运行状态和 backend_context。 */
    xxx_data_t data;               /* 当前数据/统计快照。 */
    const xxx_ops_t *ops;          /* 注入的行为表，借用只读引用。 */
};
```

必须满足：

- `base` 是首字段；`platform_device_t` 内的 `platform_object_t` 承载公共身份和生命周期状态；
- `cfg`、`ops` 是调用者提供并保证生命周期的只读借用引用，Platform 不释放；`ctx`、`data` 是对象内联状态；
- 后端句柄只能通过 `void *backend_context` 隔离，公共头不得出现 HAL、CMSIS Device 或 RTOS 句柄；
- 每类对象通过对应 `platform_*_init()` 绑定名称、配置、Ops 和 `platform_lifecycle_ops_t`；初始化只建立公共身份和契约绑定，不冒充硬件初始化；
- 生命周期使用 `platform_lifecycle_ops_t` 的 `supported_actions + invoke(p_self, action)` 分发契约，由公共管理器驱动动作；不要按旧的 7 个直接回调字段生成接口；
- 异步能力通过 `platform_event_t` 与 `platform_event_callback_cfg_t` 传递完成、错误和中止等事件；回调上下文、执行上下文和缓冲区借用期限必须在具体能力头中明确；
- 输出代码前检查 `offsetof(concrete_type, base) == 0`，并确认没有隐式全局状态、动态分配或跨对象保存临时缓冲区。

## 能力契约

### 基础与资源能力

| 文件 | 关键 Ops/数据 | 资源、并发和生命周期语义 |
| --- | --- | --- |
| `platform_tick.h` | `pf_get_ms()`；配置含 `period_ms`，当前目标契约为 1 ms | 只读时间快照允许自然回绕；时基实现属于 Impl |
| `platform_uart.h` | `pf_write(data, len, timeout_ms)` | 缓冲区由调用者借用至同步返回；超时返回 `PLATFORM_ERR_TIMEOUT`；不得在 ISR 中阻塞 |
| `platform_gpio.h` | `pf_set()`、`pf_get()`、`pf_toggle()` | 一个对象对应一个独立配置引脚；逻辑电平快照保存在 `data` |
| `platform_irq.h` | `pf_save()`、`pf_restore(state)` | 状态令牌只能交还给产生它的同一 IRQ 对象；保存/恢复不阻塞 |
| `platform_adc.h` | `pf_sample(timeout_ms, p_raw_value)` | 返回原始采样码；输出由调用者提供；不把电压换算和业务校准塞入 Platform |
| `platform_dma.h` | `pf_start()`、`pf_stop()`、`pf_get_state()` | 明确 controller/channel/request/direction；传输期间源/目标缓冲区必须保持有效；状态为 IDLE/ACTIVE/ERROR |
| `platform_timer.h` | `pf_start()`、`pf_stop()`、`pf_get_running()` | `platform_TIMER_MODE_ONE_SHOT` 与 `platform_TIMER_MODE_PERIODIC` 统一启停语义 |
| `platform_watchdog.h` | `pf_start()`、`pf_feed()`、`pf_stop()` | 配置含 `timeout_ms/windowed`；后端不支持运行期停止时返回 `PLATFORM_ERR_NOT_SUPPORTED` |

### 总线与事件能力

总线对象与设备对象必须分开建模：

```text
platform_spi_device_t  ← 外部器件由 BSP/Impl 按独立需求绑定
platform_i2c_device_t  ← 设备地址作为每次事务参数传入
```

| 文件 | 关键 Ops/配置 | 必须保持的边界 |
| --- | --- | --- |
| `platform_spi.h` | `pf_transfer(tx, rx, length, timeout_ms)`、`pf_get_busy()`；配置含 controller/clock/word_bits/mode | 表示 SPI 控制器 Bus；不包含 CS |
| `platform_i2c.h` | `pf_write()`、`pf_read()`、`pf_write_read()`、`pf_get_busy()`；配置含 controller/clock/address_mode | 表示 I2C 控制器 Bus；设备地址是事务参数，不存入 Bus；不放器件寄存器协议 |
| `platform_event.h` | `platform_event_t`、`platform_event_callback_cfg_t` | 纯事件值与回调配置，不是独立设备对象；回调生命周期由使用它的 ADC/DMA/GPIO/UART/SPI/I2C 对象约定 |

SPI Bus 不持有外部器件协议或固定片选；具体片选和器件协议由 BSP/Impl 绑定，并单独声明所有权和生命周期。

## 同步调用、超时和错误码

SPI/I2C/UART/ADC 的带 `timeout_ms` 同步接口：调用者等待完整事务成功、失败或超时后返回。异步接口不以 `timeout_ms` 返回完整结果，而以事件回调报告完成、错误或中止。`timeout_ms` 单位为毫秒，表示一次完整同步事务的最大允许耗时；`0` 表示不等待未立即完成的事务。

后端必须保证：

1. 调用前检查对象身份、初始化状态、Ops、指针和长度；
2. 已有事务未结束时返回 `PLATFORM_ERR_BUSY`，不覆盖当前上下文；
3. 超过截止时间返回 `PLATFORM_ERR_TIMEOUT`，并完成必要的外设恢复/片选释放；
4. 空指针、零长度、地址宽度或容量不足返回 `PLATFORM_ERR_PARAM`；
5. 未初始化返回 `PLATFORM_ERR_NOT_INITIALIZED`，不支持的操作返回 `PLATFORM_ERR_NOT_SUPPORTED`；
6. 成功和失败都更新对象状态/统计，不能把失败伪装成成功；
7. 同步接口不保存调用者的临时缓冲区，也不在 ISR 中阻塞调用；线程安全和跨设备总线互斥由 Impl 注入的资源/锁策略保证，不在 Platform 头文件中引入 RTOS。

## STM32F411 后端落地门禁

需要为 STM32F411 落地 SPI/I2C/UART 等 MCU 能力第一版时，先形成证据表：芯片精确型号、HAL/LL/CMSIS 版本、外设实例、相关引脚、时钟配置、启动文件和构建目标。外部 Flash 型号和 CS 属独立 BSP/Device 需求。缺少任一影响实现的证据时，只更新接口或输出阻塞项，不猜写后端。

实现层的顺序是：

1. 绑定 SPI/I2C 控制器和生命周期 Ops，完成统一错误码映射；
2. 以同步超时和异步事件回调为边界实现 `platform_i2c`、`platform_spi`、`platform_uart` 等事务；
3. 绑定 ADC/DMA/GPIO 的事件回调时，明确 ISR/任务上下文和缓冲区生命周期；
4. 由 `impl_mcu` 提供复位原因读取和 HardFault 现场处理；
5. 只有交叉编译、烧录、串口/RTT 观测或逻辑分析仪证据齐全时，才能报告真实外设行为已打通。

代码静态检查、主机头文件语法检查和 Mock/Fake 只能证明接口/错误路径，不等于 STM32F411 实机验证。没有 `.ioc`、HAL/CMSIS 源码、实例/引脚和器件连接证据时，不得创建虚构后端或宣称真实读 ID。

## 生成与审查门禁

生成或修改 `platform_mcu` 文件前必须读取：

- 对象四元组模板：[`object-four-tuple-template.md`](../platform_common/references/object-four-tuple-template.md)
- 代码格式、分层命名和注释规则：[`style-profile.md`](../../tools/tools-quality/references/style-profile.md)
- 生成审查门禁：[`review-gates.md`](../../tools/tools-quality/references/review-gates.md)
- 软件层契约：[`software-layer-contract.md`](../../workflow/workflow-review-gate/references/software-layer-contract.md)
- 能力路由索引：[`capability-index.md`](references/capability-index.md)

交付前逐项检查：

- [ ] 文件是否存在于真实工程的 `03_Platform/platform_mcu`，命名是否与 13 个 `platform_*` 头文件契约一致；
- [ ] 对象是否 `base` 首字段并补齐 `cfg/ctx/data/ops`，生命周期是否委托 `platform_common`；
- [ ] 返回值是否全部为 `platform_err_t`，基础类型是否来自 `platform_type.h`；
- [ ] 公共头是否零芯片/HAL/RTOS/Vendor 类型，后端句柄是否被 `void *backend_context` 隔离；
- [ ] 是否明确所有权、借用缓冲区、阻塞属性、超时单位、ISR 限制、并发和失败后状态；
- [ ] SPI Bus 是否没有固定外部器件协议/片选，I2C Bus 是否没有固定设备地址，异步接口是否明确事件和缓冲区边界；
- [ ] 是否区分静态、主机、交叉编译、烧录和实机观测证据；
- [ ] 运行 `git diff --check`、头文件主机语法检查、对象首字段静态断言及项目已有 Skill/插件测试；
- [ ] 未确认的芯片、板卡、引脚、器件和构建条件是否明确标为 `unverified`，没有被写成完成事实。

## 交接

- 公共对象、错误码和生命周期：[`platform_common`](../platform_common/SKILL.md)
- STM32 HAL/LL/CMSIS 与版本矩阵：[`vendor_stm32`](../../vendor/vendor_stm32/SKILL.md)
- 板级装配、片选、实例和 Port：[`impl_board`](../../impl/impl_board/SKILL.md)
- 外部 Flash/传感器等器件协议：[`impl_bsp`](../../impl/impl_bsp/SKILL.md)
- 真实构建、烧录和目标观测：[`tools-build`](../../tools/tools-build/SKILL.md)、[`tools-flash`](../../tools/tools-flash/SKILL.md)、[`tools-observability`](../../tools/tools-observability/SKILL.md)
