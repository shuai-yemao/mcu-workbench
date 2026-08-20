---
name: impl_mcu
description: Impl MCU：把 Platform MCU 能力绑定到具体 MCU、HAL/LL、CMSIS、SDK 和生成工程；支持同名 flat `plat_*` 实现与注入 Ops 两种 profile，不承载器件协议、业务策略或 RTOS 任务。
---

# Impl MCU（MCU/HAL/SDK 适配）

## 适用范围

本 Skill 负责 `04_Impl/impl_mcu` 的芯片实现：逻辑资源到物理外设/句柄的映射、HAL/LL/
CMSIS/SDK 调用、状态码映射、超时、硬件恢复和 IRQ/DMA 资源落地。它不是 `vendor_mcu`
源码登记，也不是 `impl_board` 组合根，更不是 `impl_bsp` 的外部器件 Driver/Handle。

固定顶层依赖为：

```text
App → Service → Platform MCU 公共契约 ← Impl MCU → Vendor/HAL/SDK
```

## 两种实现 profile

### Flat logical resource profile

目标工程当前使用这一形态：

```text
plat_i2c.h / plat_spi.h / plat_dma.h
        ↑ 同名公共函数
stm32f411_plat_i2c.c / stm32f411_plat_spi.c / stm32f411_plat_dma.c
        ↓ 逻辑 ID → CubeMX/HAL 句柄、GPIO、DMA、NVIC
05_Vendor 或 CubeMX 生成 HAL
```

典型特征：

- Impl 源文件 include `plat_*.h` 和真实的 CubeMX 头（如 `adc.h`、`i2c.h`、`spi.h`、
  `dma.h`、`tim.h`、`usart.h`、`iwdg.h`）以及 HAL 头；
- Impl 直接实现公共声明的 `plat_*` 符号，不要求额外的 `impl_mcu` 公共头、Ops 表或
  `backend_context`；
- 通过 `platform_mcu_config.h` 的 `plat_*_id_t` 把逻辑资源映射到 HAL 句柄/通道/IRQ；
- 资源表、句柄指针和状态快照可以是 Impl 私有静态存储，不能泄漏到 Platform 公共头；
- 失败必须映射到 `platform_err_t`，不能把 `HAL_StatusTypeDef` 向上层传播。

文件名应反映芯片和实现的绑定，例如 `stm32f411_plat_gpio.c`。不要把 `stm32f411_*`
实现放入 `03_Platform`，也不要把 `plat_*` 公共头复制到 Impl。

### Object/Ops profile

当目标 Platform 公共头真实定义对象和 Ops 时，Impl 可以提供 `Ops/context`、后端生命
周期回调和资源绑定；Platform Model 负责公共对象构造。此时必须保持：

- HAL/SDK 类型只在 Impl；公共 `void *backend_context` 的解释只在 Impl；
- Impl 不 include Platform `.c`，不重复定义 `platform_*_init()`；
- Ops 的每个回调明确输入/输出、所有权、超时、线程/ISR 上下文和失败状态；
- `impl_mcu` 不把设备协议、队列、缓存、重试策略或 Service 业务塞入 MCU 适配层。

两种 profile 可以在一个迁移工程中暂时共存，但必须按文件和构建目标标记 `mixed`，并
列出重复符号、旧目录、include 路径和 CMake 源清单风险；不能用一套门禁误判另一套。

## 能力分工

| 能力 | Impl MCU 负责 | 交给其他层 |
| --- | --- | --- |
| GPIO | 逻辑 ID、端口/Pin、极性/模式与 HAL 调用 | 板级命名/资源选择由 Board 证据确认 |
| SPI/I2C/UART | 句柄选择、同步事务、超时、HAL 错误映射 | 器件命令、CS、地址寄存器和协议由 BSP |
| ADC | 通道选择、采样启动/停止、轮询/DMA 绑定 | 电压换算、校准策略和滤波由 Service/产品层 |
| DMA | 句柄、方向/宽度/地址模式、启动/中止/状态 | 外设完整事务完成语义由对应能力/Driver |
| Timer/Tick | 硬件周期计算、Tick/Delay 转发和启停 | 调度、周期任务和业务超时由 OS/Service |
| IRQ | NVIC/IRQ 映射、线路使能和基础状态 | 外设事件状态机和器件回调由对应模块 |
| Watchdog | IWDG/硬件启动与喂狗 | 喂狗策略、任务存活和故障处理由 Service |
| Flash | 内部/逻辑 Flash 读写擦、地址/粒度/恢复 | 分区、KV、文件系统和外部 Flash 协议由存储/BSP |

## 资源、并发与内存门禁

- 先确认 MCU 精确型号、HAL/LL/CMSIS/SDK 版本、CubeMX 生成头、外设实例、时钟、引脚、
  DMA 映射和构建目标；缺少关键证据时只输出接口/适配计划，使用 `UNRESOLVED_MCU_API`
  或同等标记，不猜写后端。
- 同步函数不能在 ISR 阻塞；DMA 缓冲区必须在完成、错误或中止前保持有效，明确 CPU/DMA
  所有权、对齐、Cache 和可访问内存区域。
- 静态资源表、HAL 句柄和错误状态的生命周期由 Impl 拥有；不使用不可控动态分配；资源
  初始化失败要有回滚或安全终态。
- 超时应使用已确认的单位和单调/可回绕安全的 Tick 计算；超时或 HAL 失败后完成必要的
  Stop/Abort/Unlock/Lock、总线恢复、片选释放和状态收敛。
- 任何回调都必须标记 ISR 或任务上下文；ISR 不做器件协议、复杂日志、动态分配和上层
  业务回调。线程安全不能因“单个逻辑 ID”而默认成立。

## 交付检查

- [ ] Platform 公共头无 HAL、CMSIS Device、RTOS、Vendor、Board 和 Impl 类型；
- [ ] Flat profile 的 `plat_*` 声明与 Impl 同名定义各只有一个，Object/Ops profile 无重复 Model；
- [ ] 逻辑 ID 与物理句柄/引脚/DMA/NVIC 映射留在 Impl/Board；
- [ ] 只有真实目标工程存在的 CubeMX/HAL/SDK 头和符号才进入适配代码；
- [ ] 错误码、超时、ISR、DMA、缓冲区所有权和失败后状态有文件证据；
- [ ] 构建清单真实包含目标 Impl 源文件，文件存在不等于已链接；
- [ ] 静态检查、主机 Fake、交叉构建、烧录、目标运行和物理测量分级报告；
- [ ] 未确认的硬件和工具条件明确标记 `unverified`。

交接：Platform 公共契约交给 [`platform_mcu`](../../platform/platform_mcu/SKILL.md)，
芯片底座交给 [`vendor_mcu`](../../vendor/vendor_mcu/SKILL.md)，板级组合交给
[`impl_board`](../impl_board/SKILL.md)，器件协议交给 [`impl_bsp`](../impl_bsp/SKILL.md)，
构建/烧录/目标观测交给对应 `tools-*` Skill。
