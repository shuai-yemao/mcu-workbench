# Platform MCU 真实接口契约

## 事实来源

本参考以 `D:\zhuomian\embedded_framework` 的 `5ce8efbb` 为事实来源，目标路径为 `03_Platform/platform_mcu/Inc/*.h` 与 `03_Platform/platform_mcu/src/*.c`。目标工程当前有 11 个头文件、11 个源文件；每个源文件实现对应的 `platform_*_init()`，并调用公共 `platform_device_init()`。

这是 Platform 接口映射，不是 STM32 HAL 后端说明。目标工程没有在本契约中提供足够的 `.ioc`、HAL 版本、外设实例、引脚或板级连接证据，因此这些内容保持 `unverified`。

## 统一对象与初始化契约

11 个对象均使用以下结构顺序：

```c
platform_device_t base;
const xxx_cfg_t *cfg;
xxx_ctx_t ctx;
xxx_data_t data;
const xxx_ops_t *ops;
```

- `base` 必须位于偏移 0，供 `platform_common` 进行身份和生命周期管理；
- `cfg`、`ops` 是调用者提供的借用只读引用；Platform 不释放；
- `ctx` 和 `data` 是对象自己的内联运行状态；
- `ctx.backend_context` 是后端不透明指针，公共头不得暴露 HAL、寄存器或 RTOS 句柄；
- `platform_*_init()` 只绑定公共身份、名称、配置、Ops 和生命周期表，不执行具体硬件动作；
- 所有初始化和 Ops 返回值使用 `platform_err_t`，错误通过 `PLATFORM_ERR_*` 表达。

## 11 个接口映射

| 文件 | 对象/初始化入口 | 配置与状态重点 | Ops | 资源和并发边界 |
|---|---|---|---|---|
| `platform_adc.h` | `platform_adc_device_t` / `platform_adc_init()` | controller、channel、resolution、reference；ctx ready；data raw/计数/valid | `pf_sample(timeout_ms, p_raw_value)` | 同步采样；输出由调用者提供；不在 ISR 中阻塞 |
| `platform_dma.h` | `platform_dma_device_t` / `platform_dma_init()` | controller、channel、request、direction；data 保存源/目标/长度/进度/state | `pf_start()`、`pf_stop()`、`pf_get_state()` | 异步传输期间源/目标缓冲区必须保持有效；状态 IDLE/ACTIVE/ERROR |
| `platform_flash.h` | `platform_flash_device_t` / `platform_flash_init()` | 借用 `p_bus`、`p_cs`、capacity/page/sector；ctx ready/identified；data 保存最多 8 字节 ID | `pf_read_id()`；CS `pf_select()`/`pf_deselect()` | Flash 是 SPI 上的 Device；CS 属于 device/BSP；当前只承诺识别能力 |
| `platform_gpio.h` | `platform_gpio_device_t` / `platform_gpio_init()` | pin、direction、pull；ctx backend/ready；data level | `pf_set()`、`pf_get()`、`pf_toggle()` | 一个对象对应一个独立引脚；端口和寄存器只在后端解释 |
| `platform_i2c.h` | `platform_i2c_device_t` / `platform_i2c_init()` | controller、clock、address_mode；ctx ready/busy；data transfer/error 计数 | `pf_write()`、`pf_read()`、`pf_write_read()`、`pf_get_busy()` | 地址是每次事务参数；缓冲区同步借用；不放器件协议 |
| `platform_irq.h` | `platform_irq_device_t` / `platform_irq_init()` | 配置和 backend_context；data 保存最近状态；state 为 `uint32_t` 令牌 | `pf_save()`、`pf_restore()` | 令牌只能交还给产生它的同一对象；不得阻塞 |
| `platform_spi.h` | `platform_spi_device_t` / `platform_spi_init()` | controller、clock、word_bits、mode；ctx ready/busy；data transfer/error 计数 | `pf_transfer()`、`pf_get_busy()` | 表示 Bus，不包含 CS；缓冲区同步借用 |
| `platform_tick.h` | `platform_tick_device_t` / `platform_tick_init()` | period_ms；ctx ready；data elapsed_ms | `pf_get_ms()` | 只读快照允许自然回绕；时基实现由后端提供 |
| `platform_timer.h` | `platform_timer_device_t` / `platform_timer_init()` | period_ms、ONE_SHOT/PERIODIC；ctx ready/running；data start/stop 计数 | `pf_start()`、`pf_stop()`、`pf_get_running()` | 统一启停语义；硬件定时器配置属于后端 |
| `platform_uart.h` | `platform_uart_device_t` / `platform_uart_init()` | controller、baudrate、data_bits、stop_bits、parity；ctx ready；data tx 计数/错误计数 | `pf_write()` | 同步写；调用者借用发送缓冲区至返回；超时统一映射 |
| `platform_watchdog.h` | `platform_watchdog_device_t` / `platform_watchdog_init()` | timeout_ms、windowed；ctx ready/running；data start/feed 计数 | `pf_start()`、`pf_feed()`、`pf_stop()` | 运行期不支持停止时返回 `PLATFORM_ERR_NOT_SUPPORTED`；具体复位行为由后端负责 |

## 统一事务规则

适用于带 `timeout_ms` 的 SPI、I2C、UART、ADC 和 Flash 操作：

1. `timeout_ms` 单位为毫秒，表示一次完整同步事务的最大耗时；`0` 表示不等待未立即完成的事务；
2. 调用者提供的输入/输出缓冲区只在同步调用期间借用，后端不得保存临时缓冲区指针；
3. 忙状态返回 `PLATFORM_ERR_BUSY`，超时返回 `PLATFORM_ERR_TIMEOUT`，参数/长度/容量错误返回 `PLATFORM_ERR_PARAM`；
4. 未初始化返回 `PLATFORM_ERR_NOT_INITIALIZED`，不支持的操作返回 `PLATFORM_ERR_NOT_SUPPORTED`；
5. 超时或失败后必须完成后端恢复、总线状态收敛和 Flash 片选释放；
6. 同步事务不允许在 ISR 中阻塞调用，跨设备总线锁和线程安全由 Impl 注入，不泄漏 RTOS 类型。

## 不得从本参考推断的内容

- STM32F411 的具体 SPI/I2C/UART/ADC/TIM/DMA/IWDG 实例；
- GPIO、总线、片选和中断的具体引脚；
- HAL/LL/CMSIS 版本、时钟树、DMA 请求映射和启动文件；
- Flash 型号、JEDEC 命令细节和真实读写擦除能力；
- 交叉编译、烧录、串口/RTT、逻辑分析仪和目标板运行结果。

这些内容必须由 `impl_board`、`impl_bsp`、`vendor_stm32` 和目标工程的实际配置/运行证据提供。
