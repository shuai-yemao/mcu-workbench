---
name: platform_mcu
description: 面向嵌入式工程设计和审查 platform_mcu 能力接口；当用户讨论 MCU 基础能力、DMA/Timer/ADC/Watchdog 资源、SPI/I2C 总线、Flash 设备、对象生命周期、统一错误码，或需要根据真实 platform_mcu 头文件更新平台契约时使用。平台接口必须保持芯片、HAL、RTOS 和外部器件协议无关。
---

# Platform MCU（MCU 能力接口与资源契约）

## 适用范围

本 Skill 面向 `03_Platform/platform_mcu` 的公开能力接口，以及供下层实现注入的后端契约。先读取实践工程的真实头文件、`platform_common` 公共对象模型和构建证据，再设计或修改接口。

当前实践工程的接口分组如下：

| 分组 | 公开文件 | 契约职责 |
| --- | --- | --- |
| 基础能力 | `platform_tick.h`、`platform_uart.h`、`platform_gpio.h`、`platform_irq.h` | 系统时基、异步串口、GPIO 引脚、中断状态 |
| 资源能力 | `plat_dma.h`、`plat_timer.h`、`plat_adc.h`、`plat_watchdog.h` | DMA 传输资源、统一启停定时器、基础采样、看门狗启停/喂狗 |
| 总线能力 | `plat_spi.h`、`plat_i2c.h` | MCU SPI/I2C 控制器与同步事务 |
| 总线设备 | `plat_flash.h` | 挂载于 SPI Bus 的 Flash 设备识别能力 |

文件名和命名以工程现状为准：已有基础接口使用 `platform_*`，资源/总线/设备接口使用 `plat_*`；更新 Skill 时不得把这两组名称擅自合并成另一套 API。

## 分层边界

依赖方向固定为：

```text
App → Service → Platform 接口 ← Impl / BSP → Vendor / HAL / RTOS
```

Platform MCU 只定义能力、状态、生命周期入口和抽象 Ops：

- 不包含 STM32 HAL/LL、CMSIS Device、寄存器、ESP-IDF、FreeRTOS 或其他厂商类型；
- 不实现硬件初始化、IRQ 处理、DMA 完成等待或软件 I2C 位时序；
- 不保存设备协议状态机、业务缓存、任务、锁或消息队列；
- 不实现外部器件协议。Flash 的 JEDEC ID 命令属于设备后端，Platform 只公开 `read_id` 能力；
- 不将原始 HAL/SDK 状态码向上泄漏，后端必须映射为 `platform_err_t`；
- 不为缺少芯片、引脚、外设实例和厂商源码证据的目标猜写 STM32 后端。

芯片绑定交给实现层，板级片选、引脚和器件装配交给 BSP/组合根；厂商 API 的版本、路径和差异交给 [`vendor_stm32`](../../vendor/vendor_stm32/SKILL.md)。

## 公共定义与对象模型

### 唯一公共出口

- 错误码只使用 `platform_error.h` 的 `platform_err_t` 与 `PLATFORM_ERR_*`；通过 `PLATFORM_IS_OK`/`PLATFORM_IS_ERR` 判定，不用 `-1`、私有错误码或 HAL 返回值。
- 基础类型只使用 `platform_type.h` 的 `uint8_t`、`uint16_t`、`uint32_t`、`bool_t` 等出口，不在 `platform_mcu` 重新定义类型。
- 对象身份和生命周期来自 `platform_common/object/platform_device.h`、`platform_object.h`、`platform_lifecycle.h`；不得复制一套 `magic/state/handle` 协议。

### 四元组结构

每一个承载身份的 MCU 能力对象都必须采用以下结构：

```c
struct platform_or_plat_device
{
    platform_device_t base;          /* 首字段，支持向上转型和身份校验。 */
    const xxx_cfg_t *cfg;             /* 静态配置，借用只读引用。 */
    xxx_ctx_t ctx;                    /* 实例运行状态和 backend_context。 */
    xxx_data_t data;                  /* 当前数据/统计快照。 */
    const xxx_ops_t *ops;             /* 注入的行为表，借用只读引用。 */
};
```

具体约束：

- `base` 必须是首字段；`platform_device_t` 内的 `platform_object_t` 负责身份和生命周期状态；
- `cfg`、`ops` 是调用者提供并保证生命周期的只读引用，不由对象释放；`ctx`、`data` 是对象实例内联存储，避免接口隐式堆分配；
- 后端句柄只能通过 `void *backend_context` 隔离，公共头不得出现 `SPI_HandleTypeDef`、`I2C_HandleTypeDef`、`GPIO_TypeDef`、RTOS 句柄等符号；
- 每类对象通过对应 `*_init()` 绑定名称、配置、Ops 和 `platform_lifecycle_ops_t`；初始化函数只建立公共身份与契约绑定，不冒充硬件初始化；
- 生命周期回调统一接收 `void *p_self` 并返回 `platform_err_t`，由公共管理器驱动 `init → start → process → stop → sleep/wakeup → deinit`；可选回调允许为 `NULL`，状态必须反映真实阶段。

输出代码前必须检查所有新对象的 `offsetof(concrete_type, base) == 0`，并确认没有隐式全局状态、动态分配或跨对象保存临时缓冲区。

## 能力契约

### 基础能力

| 文件 | 关键契约 | 资源/并发语义 |
| --- | --- | --- |
| `platform_tick.h` | `get_ms()`；配置含 `period_ms`，当前契约为 1 ms | 只读时间快照允许自然回绕；不在 Platform 内实现时基 |
| `platform_uart.h` | `write(data, len, timeout_ms)` | 缓冲区由调用者持有，仅借用至同步调用返回；超时返回 `PLATFORM_ERR_TIMEOUT` |
| `platform_gpio.h` | `set()`、`get()`、`toggle()` | 一个对象对应一个可独立配置的引脚；电平快照放在 `data` |
| `platform_irq.h` | `save()`、`restore(state)` | 状态令牌只可交还给产生它的同一 IRQ 对象；不得把临界区实现暴露到公共头 |

### 资源能力

| 文件 | 关键契约 | 生命周期语义 |
| --- | --- | --- |
| `plat_dma.h` | `start(source, destination, length)`、`stop()`、`get_state()` | 明确 controller/channel/request/direction；传输中缓冲区由调用者保持有效；状态为 IDLE/ACTIVE/ERROR |
| `plat_timer.h` | `start()`、`stop()`、`get_running()` | `PLAT_TIMER_MODE_ONE_SHOT` 与 `PLAT_TIMER_MODE_PERIODIC` 统一启动/停止语义；重复启动或未初始化操作按统一错误码处理 |
| `plat_adc.h` | `sample(timeout_ms, raw_value)` | 返回原始采样码和有效标志；同步采样超时使用 `PLATFORM_ERR_TIMEOUT`，不把电压换算或业务校准塞入 Platform |
| `plat_watchdog.h` | `start()`、`feed()`、`stop()` | 初始化配置包含 `timeout_ms/windowed`；运行期不支持停止时返回 `PLATFORM_ERR_NOT_SUPPORTED`，不得静默成功 |

### 总线与设备

总线对象与设备对象必须分开建模：

```text
plat_spi_device_t  ← plat_flash_device_t.cfg.p_bus
                         └── cfg.p_cs（BSP/device 拥有的片选 Ops）
plat_i2c_device_t  ← 设备地址作为每次事务参数传入
```

| 文件 | 关键契约 | 必须保持的边界 |
| --- | --- | --- |
| `plat_spi.h` | `transfer(tx, rx, length, timeout_ms)`、`get_busy()` | 表示 SPI 控制器 Bus；配置只含 controller/clock/word_bits/mode；不得包含 CS |
| `plat_i2c.h` | `write()`、`read()`、`write_read()`、`get_busy()` | 表示 I2C 控制器 Bus；设备地址是事务参数，不存入 Bus；不放器件寄存器协议 |
| `plat_flash.h` | `read_id(id, capacity, length, timeout_ms)` | 表示 SPI 上的 Flash Device；通过借用的 `p_bus` 和 `p_cs` 连接资源；当前只承诺设备识别，不宣称已有读/写/擦除能力 |

片选必须由 `plat_flash_cs_ops_t` 或等价的 BSP/device 资源控制，在一次设备事务前选择、完成或失败后释放；不能把 CS 字段添加到 `plat_spi_device_t`。`p_bus`、`p_cs` 不转移所有权，组合根必须保证其生命周期长于 Flash 对象。

## 同步调用、超时和错误码

SPI/I2C/UART/ADC/Flash 的带 `timeout_ms` 接口均为同步接口：调用者等待完整事务成功、失败或超时后返回。`timeout_ms` 的单位为毫秒，表示一次完整事务的最大允许耗时；`0` 表示不等待未立即完成的事务。后端必须保证：

1. 进入调用前检查对象身份、初始化状态、Ops、指针和长度；
2. 已有事务未结束时返回 `PLATFORM_ERR_BUSY`，不覆盖当前上下文；
3. 超过截止时间返回 `PLATFORM_ERR_TIMEOUT`，并完成必要的外设恢复/片选释放；
4. 空指针、零长度、地址宽度或容量不足返回 `PLATFORM_ERR_PARAM`；
5. 未初始化返回 `PLATFORM_ERR_NOT_INITIALIZED`，不支持的操作返回 `PLATFORM_ERR_NOT_SUPPORTED`；
6. 成功和失败都更新对象状态/统计，不能把失败伪装成成功；
7. 同步接口不保存调用者的临时缓冲区，也不在 ISR 中阻塞调用；线程安全和跨设备总线互斥由实现层注入的资源/锁策略保证，不在 Platform 头文件中引入 RTOS。

## STM32F411 后端落地门禁

需要为 STM32F411 落地 SPI/I2C/Flash 第一版时，先形成证据表：芯片精确型号、HAL/LL/CMSIS 版本、`SPIx/I2Cx` 实例、SCK/MISO/MOSI/SDA/SCL 引脚、Flash 型号、CS 引脚、时钟配置、启动文件和构建目标。缺少任一影响实现的证据时，只更新接口或输出阻塞项，不猜写后端。

实现顺序：

1. 在实现层绑定 SPI/I2C 控制器和生命周期 Ops，完成统一错误码映射；
2. 在 BSP/device 侧提供 Flash CS，并通过 `plat_flash_cfg_t.p_bus/p_cs` 装配；
3. 以同步超时为边界实现 `plat_i2c.write_read()` 和 `plat_spi.transfer()`；
4. 通过 Flash 后端发出设备识别事务，实现 `plat_flash.read_id()`；
5. 只有交叉编译、烧录、串口/RTT 观测或逻辑分析仪证据齐全时，才能报告“真实 I2C 器件 ID”或“真实 SPI/Flash ID”已打通。

代码静态检查、主机头文件语法检查和 Mock/Fake 只能证明接口/错误路径，不等于 STM32F411 实机验证。当前实践工程若没有 `.ioc`、HAL/CMSIS 源码、实例/引脚和器件连接证据，不得创建虚构的 `impl_mcu` 后端或宣称真实读 ID。

## 生成与审查门禁

生成或修改 `platform_mcu` 文件前必须读取：

- 对象四元组模板：[`platform_common` object-four-tuple-template](../platform_common/references/object-four-tuple-template.md)
- 代码格式、分层命名和注释唯一规则：[`style-profile.md`](../../tools/tools-quality/references/style-profile.md)
- 生成审查门禁：[`review-gates.md`](../../tools/tools-quality/references/review-gates.md)
- 软件层契约：[`software-layer-contract.md`](../../workflow/workflow-review-gate/references/software-layer-contract.md)
- 能力路由索引：[`capability-index.md`](references/capability-index.md)

交付前逐项检查：

- [ ] 文件是否存在于真实工程的 `03_Platform/platform_mcu/Inc`，命名是否与现有 `platform_*`/`plat_*` 契约一致；
- [ ] 对象是否 `base` 首字段并补齐 `cfg/ctx/data/ops`，生命周期是否委托 `platform_common`；
- [ ] 返回值是否全部为 `platform_err_t`，基础类型是否来自 `platform_type.h`；
- [ ] 公共头是否零芯片/HAL/RTOS/Vendor 类型，后端句柄是否被 `void *backend_context` 隔离；
- [ ] 是否明确所有权、借用缓冲区、阻塞属性、超时单位、ISR 限制、并发和失败后状态；
- [ ] SPI Bus 是否没有 CS，I2C Bus 是否没有固定设备地址，Flash Device 是否借用 Bus 与 device/BSP 片选；
- [ ] 是否区分静态、主机、交叉编译、烧录和实机观测证据；
- [ ] 运行 `git diff --check`、头文件主机语法检查、对象首字段静态断言及项目已有 Skill/插件测试；
- [ ] 未确认的芯片、板卡、引脚、器件和构建条件是否明确标为 `unverified`，没有被写成完成事实。

## 交接

- 公共对象、错误码和生命周期：[`platform_common`](../platform_common/SKILL.md)
- STM32 HAL/LL/CMSIS 与版本矩阵：[`vendor_stm32`](../../vendor/vendor_stm32/SKILL.md)
- 板级装配、片选、实例和 Port：[`impl_board`](../../impl/impl_board/SKILL.md)
- 外部 Flash/传感器等器件协议：[`impl_bsp`](../../impl/impl_bsp/SKILL.md)
- 真实构建、烧录和目标观测：[`tools-build`](../../tools/tools-build/SKILL.md)、[`tools-flash`](../../tools/tools-flash/SKILL.md)、[`tools-observability`](../../tools/tools-observability/SKILL.md)
