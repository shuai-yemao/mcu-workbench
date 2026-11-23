---
name: platform_mcu
description: 面向嵌入式工程设计和审查 Platform MCU 能力契约；根据目标工程证据选择扁平逻辑资源 API 或对象/Ops API，保持公共接口不泄漏芯片、HAL、RTOS、Vendor 和外部器件协议。
---

# Platform MCU（MCU 能力契约）

## 适用范围

本 Skill 负责 `03_Platform/platform_mcu` 的公共 MCU 能力接口、逻辑资源配置和
与 Impl 的契约边界。开始设计或修改前，必须读取目标工程真实头文件、配置、调用者、
构建清单和验证记录；目录名或旧参考文件不能单独证明当前架构。

当前插件支持两种已知接口 profile：

| profile | 公共 API 形态 | Impl 绑定形态 | 适用证据 |
| --- | --- | --- | --- |
| `flat-logical-resource` | `plat_<capability>.h`，函数直接接收 `plat_*_id_t` | `stm32f411_plat_*.c` 等文件实现同名 `plat_*` 符号，内部映射 HAL/SDK 句柄 | 当前目标工程快照 |
| `object-ops` | `platform_<capability>.h`，对象、`cfg/ctx/data/ops` 和生命周期 | Impl/Board 注入 `Ops/context`，Platform Model 只构造公共对象 | 其他目标工程真实公共头和构建证据确认后才可采用 |

不能因为插件已有 `object-ops` 模板，就把采用 `flat-logical-resource` 的目标工程报告为
“缺少 Platform 对象”；也不能把 F411 的 `plat_*` 命名、逻辑 ID 或 HAL 映射复制成所有 MCU
的公共规范。profile 必须在 RCP/Spec 中记录为 `confirmed`、`mixed` 或 `unverified`。

## 顶层边界

依赖方向固定为：

```text
App → Service → Platform 接口 ← Impl → Vendor/HAL/SDK
```

Platform MCU 可以定义 GPIO、Tick、Timer、UART、SPI、I2C、ADC、DMA、IRQ、Watchdog、
内部/逻辑 Flash 等 MCU 能力，但不负责：

- 芯片寄存器、HAL/LL、CMSIS Device、ESP-IDF、FreeRTOS 或其他 Vendor 类型；
- 外部 Flash、传感器、显示器等器件协议、寄存器命令、片选策略和业务缓存；
- Service 的单位换算、滤波、重试策略、喂狗策略或产品状态机；
- 把 DMA 完成直接解释成 SPI/UART/ADC 事务完成；
- 把文件存在、静态扫描或 Platform 构造描述成目标板已运行。

Impl MCU 负责芯片/SDK 绑定、逻辑资源到物理资源的映射、HAL/SDK 状态码映射、超时和
硬件恢复；`impl_board` 负责板级资源和组合根；器件 Driver/Handle 由 `impl_bsp` 负责。

## Flat Logical Resource profile（当前目标工程基线）

目标工程当前 `03_Platform/platform_mcu` 的公共文件是扁平 `plat_*.h`，配置单独位于
`03_Platform/platform_config/platform_mcu_config.h`。当前工作树可确认的能力包括：

| 公共头 | 公开职责 | 典型契约 |
| --- | --- | --- |
| `plat_tick.h` | Tick 和阻塞延时 | `plat_tick_get_ms()`、`plat_delay_ms()`；32 位 Tick 自然回绕 |
| `plat_gpio.h` | 逻辑 GPIO 读写 | `plat_gpio_write/read(plat_gpio_id_t, ...)` |
| `plat_uart.h` | 同步收发 | 调用者借用缓冲区至返回，超时单位为 ms |
| `plat_spi.h` | 同步 SPI 事务 | 公共头不放 CS 和器件协议 |
| `plat_i2c.h` | 同步 I2C 事务 | 设备地址是事务参数，不是固定器件协议 |
| `plat_adc.h` | 同步原始 ADC 采样 | 不在 Platform 做电压换算、校准和滤波 |
| `plat_dma.h` | 非阻塞 DMA 传输和状态 | 源/目标缓冲区由调用者保持有效；DMA 不拥有外设事务语义 |
| `plat_timer.h` | 单次/周期 Timer 启停和状态 | 配置只在调用期间借用，周期单位为 us |
| `plat_irq.h` | 逻辑 NVIC 线路控制 | 不替代外设状态清除和事务完成处理 |
| `plat_watchdog.h` | 已配置硬件看门狗启动/喂狗 | 不承载 Service 喂狗策略；当前最小接口无停止/重配置 |
| `plat_flash.h` | 逻辑 Flash 同步读/写/擦除 | 地址、容量、擦除几何留在 Impl；不隐式擦除 |

`platform_mcu_config.h` 的枚举是逻辑资源契约，不是 STM32 HAL 句柄导出。逻辑资源名、
数量、IRQ 优先级和别名必须以目标工程配置为证据；物理控制器、DMA Stream/Channel、GPIO
引脚和 CubeMX 初始化仍属于 Impl/Board/Vendor。若配置中出现明显板级语义，记录为
`mixed`，不要把它反向推广为芯片无关的公共类型。

### Flat profile 的资源与错误规则

- 函数返回 `platform_err_t` 时统一使用 `PLATFORM_ERR_*`；Tick 这类纯读接口可以按真实
  头文件返回基础类型，不能为了统一形式伪造错误码。
- 同步接口的输入/输出缓冲区仅借用到函数返回，Impl 不保存临时地址，不在 ISR 中阻塞。
- 超时参数必须写明单位；`0`、`HAL_MAX_DELAY` 或“不等待”的语义必须以真实公共头和
  后端实现为准，不能由参数名推断。
- DMA 提交成功后，缓冲区直到 `COMPLETE/ERROR/ABORTED` 前必须保持有效；查询结果不
  转移缓冲区所有权，也不代表 SPI/UART/ADC 的完整事务已完成。
- 失败路径必须说明 BUSY、TIMEOUT、NOT_INITIALIZED、NOT_SUPPORTED、PARAM 和 FAIL
  的映射，以及超时/错误后的外设、片选和锁是否已收敛。

## Object/Ops profile（兼容模型）

只有目标工程公共头真实存在以下契约时，才使用对象模型：

```c
struct platform_xxx_device
{
    platform_device_t base;       /* 首字段。 */
    const xxx_cfg_t *cfg;         /* 调用者借用。 */
    xxx_ctx_t ctx;                /* 含不透明后端上下文。 */
    xxx_data_t data;              /* 状态/统计快照。 */
    const xxx_ops_t *ops;         /* 调用者借用。 */
};
```

对象模型的 `platform_<capability>_init()`、Platform Model、`void *backend_context`、
生命周期和 Ops 规则属于该 profile，不得强行套到 `plat_*` 平面函数上。若目标工程同时
存在两套命名或目录迁移，必须标记 `mixed/unverified`，并在计划中分别列出兼容入口、
重复符号和构建清单风险。

## 总线、DMA、IRQ 与器件边界

```text
Platform MCU Bus/IRQ/DMA 能力
        ↓
Impl MCU：HAL/SDK 句柄、物理资源、状态映射
        ↓
BSP Driver/Handle：器件协议、队列、缓存、重试、回调
```

- SPI Bus 不固定外部器件 CS；I2C Bus 不固定器件寄存器协议；地址/片选必须在器件或
  Board/Port 证据中确认。
- IRQ 只负责抽象线路/状态入口；ISR 只确认硬件事件、保存有限状态或投递通知，不执行
  器件协议、阻塞等待、动态分配或上层业务回调。
- DMA 只管理搬运描述、状态和错误；外设模块负责事务完成语义，Driver/Handle 在非 ISR
  上下文推进状态机。
- Cache、对齐、DMA 可访问区域和 CPU/DMA 所有权必须在目标 MCU/构建证据中确认；插件
  规则只能要求记录这些项，不能凭 MCU 家族名称猜测。

## 生成和审查门禁

生成或修改 Platform MCU 资料前必须读取：目标 `platform_mcu` 公共头、逻辑资源配置、
Impl 文件、CMake/工程源文件清单、`platform_common` 类型/错误码以及相关验证记录。

交付前检查：

- [ ] 已确定 profile，且没有把 `platform_*` 对象模型误写成 `plat_*` 当前事实；
- [ ] Platform 公共头不包含 HAL、CMSIS Device、RTOS、Vendor、Board 或 Impl 类型；
- [ ] 逻辑 ID 与物理资源映射分离，未把 F411 Stream/Channel、引脚或句柄写入公共契约；
- [ ] `impl_mcu` 仅包含真实存在的 Platform 公共头，并承担 HAL/SDK 调用和错误映射；
- [ ] `impl_mcu` 没有被误分为 BSP Driver、BSP Handle、Board 组合根或 Vendor 源码；
- [ ] 所有权、阻塞/ISR、超时单位、DMA 缓冲区生命周期和失败后状态有证据；
- [ ] 文件存在与构建接入分开核验，CMake/工程清单中的源文件路径真实存在；
- [ ] 静态、主机、交叉构建、烧录、目标运行和物理测量证据分别记录；
- [ ] 未确认事项标记为 `unverified`，不把生成器、Mock 或静态检查写成实机结论。

交接：

- 公共类型/错误码/对象生命周期：[`platform_common`](../platform_common/SKILL.md)；
- 芯片 HAL/LL/CMSIS/SDK 版本：[`vendor_mcu`](../../vendor/vendor_mcu/SKILL.md)；
- 芯片绑定和 Platform 实现：[`impl_mcu`](../../impl/impl_mcu/SKILL.md)；
- 板级资源、器件协议和装配：[`impl_board`](../../impl/impl_board/SKILL.md)、
  [`impl_bsp`](../../impl/impl_bsp/SKILL.md)。
