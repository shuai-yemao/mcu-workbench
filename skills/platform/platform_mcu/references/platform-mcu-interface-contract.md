# Platform MCU 接口契约与证据边界

## 事实来源

本参考基于目标工程当前工作树的只读检查：

- `03_Platform/platform_mcu/plat_*.h`；
- `03_Platform/platform_config/platform_mcu_config.h`；
- `04_Impl/impl_mcu/stm32f411_plat_*.c`；
- 根 `CMakeLists.txt` 与 `06_Toolchain/cubemx/stm32f411ceu6/CMakeLists.txt`。

该目标工程当前存在未提交改动和目录迁移痕迹，因此以下内容是 `flat-logical-resource`
profile 的源码快照，不是所有项目的唯一形式。对象/Ops 模型见主 Skill 的兼容章节；
没有目标公共头证据时不得自动生成 `platform_*_device_t`、`platform_*_init()` 或 Model `.c`。

## Flat profile 文件和职责映射

| 公共文件 | 主要类型/入口 | 契约重点 |
| --- | --- | --- |
| `plat_tick.h` | `plat_tick_get_ms()`、`plat_delay_ms()` | Tick 为毫秒 32 位计数器；允许自然回绕；延时不在 ISR 使用 |
| `plat_gpio.h` | `plat_gpio_level_t`、`plat_gpio_write/read()` | 逻辑 GPIO ID；不暴露端口/Pin 类型 |
| `plat_uart.h` | `plat_uart_write/read()` | 同步借用缓冲区；支持超时和部分接收实际长度 |
| `plat_spi.h` | `plat_spi_transfer()` | 总线事务；不包含外部器件协议和 CS |
| `plat_i2c.h` | `plat_i2c_write/read/is_busy()` | 7 位设备地址作为事务参数；不包含寄存器协议 |
| `plat_adc.h` | `plat_adc_sample()` | 返回原始采样码；电压换算/校准/滤波在上层 |
| `plat_dma.h` | `plat_dma_transfer_t`、`plat_dma_result_t`、submit/abort/query | 非阻塞搬运；缓冲区借用到终态；不拥有外设事务完成语义 |
| `plat_timer.h` | `plat_timer_config_t`、start/stop/is_running | 周期单位为微秒；配置不被后端保存 |
| `plat_irq.h` | enable/disable/clear_pending/set_priority/is_enabled | 只控制逻辑 IRQ/NVIC 线路，不替代外设标志处理 |
| `plat_watchdog.h` | `plat_watchdog_start/feed()` | 单个已配置看门狗的基础控制；喂狗策略归 Service |
| `plat_flash.h` | `plat_flash_read/write/erase()` | 逻辑 Flash 相对偏移；地址、容量、擦除几何在 Impl |

`platform_mcu_config.h` 提供 `plat_*_id_t` 逻辑枚举和 IRQ 优先级宏。逻辑 ID 是公共
资源槽位；物理 HAL 句柄、GPIO 引脚、DMA 映射、时钟和 CubeMX 生命周期属于 Impl/Board。
配置中带有板级语义的条目必须标记 `mixed`，不能从单个工程推广成通用 MCU API。

## Flat profile 的实现映射

| Impl 文件模式 | 真实职责 | 禁止上移到公共头 |
| --- | --- | --- |
| `stm32f411_plat_gpio.c` | 逻辑 GPIO ID → `GPIO_TypeDef`/Pin，调用 HAL | 端口、Pin、极性的 HAL 类型 |
| `stm32f411_plat_i2c.c` | 逻辑 I2C ID → `I2C_HandleTypeDef`，执行同步事务和状态映射 | HAL 句柄与 HAL 状态值 |
| `stm32f411_plat_spi.c` | 逻辑 SPI ID → `SPI_HandleTypeDef`，执行同步事务和超时 | HAL 句柄、CS 细节和器件命令 |
| `stm32f411_plat_uart.c` | 逻辑 UART ID → `UART_HandleTypeDef`，执行同步收发 | UART HAL 句柄 |
| `stm32f411_plat_adc.c` | 逻辑 ADC ID → ADC 通道，轮询采样和 HAL 状态映射 | ADC 通道宏和校准实现 |
| `stm32f411_plat_dma.c` | 逻辑 DMA ID → CubeMX DMA 句柄，提交/中止/状态查询 | Stream/Channel、DMA 句柄和 HAL 状态 |
| `stm32f411_plat_timer.c` | 逻辑 Timer ID → TIM 句柄，计算周期并启停 | 定时器时钟树、寄存器和 HAL 句柄 |
| `stm32f411_plat_irq.c` | 逻辑 IRQ ID → NVIC IRQ，控制线路状态 | CMSIS/NVIC 枚举 |
| `stm32f411_plat_tick.c` | HAL Tick 和阻塞延时转发 | `HAL_GetTick/HAL_Delay` |
| `stm32f411_plat_watchdog.c` | 已生成 IWDG 句柄的启动/喂狗 | IWDG 句柄和寄存器配置 |
| `stm32f411_plat_flash.c` | 内部 Flash Sector 7 的读/4 字节写/整扇区擦除 | 绝对地址、Sector 宏和电压范围 |

当前文件是否进入每个构建目标必须以 CMake/工程源文件清单确认；物理文件存在不等于
已链接，也不等于已经烧录或在目标板上运行。

## 统一所有权和验证边界

1. Platform 公共 API 不分配内存、不保存调用者的临时缓冲区；异步 DMA 只借用源/目标
   缓冲区到终态。
2. `platform_err_t` 的错误映射由 Impl 完成；HAL/SDK 状态码不可泄漏到 Service 或公共头。
3. 同步总线、Flash 擦除、ADC 轮询等可能阻塞的操作不得在 ISR 调用；IRQ/DMA 回调只做
   有界事件确认或投递。
4. 共享总线的线程安全、锁、重试和公平调度以目标工程证据为准，不能因为公共 API 使用
   逻辑 ID 就假设已经具备互斥。
5. 静态扫描只能证明文件、类型和依赖边界；主机 Fake 只能证明逻辑/错误路径；交叉构建
   只能证明目标代码可链接；烧录、串口/RTT、逻辑分析仪和 DWT 才分别证明对应目标事实。

## Object/Ops profile 的迁移提示

若目标公共头确实使用 `platform_device_t + cfg/ctx/data/ops`，则另行记录：

- `base` 首字段、`void *backend_context` 和借用引用生命周期；
- Platform Model 与 Impl 生命周期的唯一构造定义；
- Ops 回调的上下文、线程/ISR 属性和 DMA 缓冲区边界；
- Impl 不得 include Platform `.c`，也不得复制 Model 构造逻辑。

这些条目是另一种 profile 的门禁，不得反向改写当前 `plat_*` 工程的证据。
