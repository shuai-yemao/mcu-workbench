# 外部驱动 Demo

用于与外部芯片通信的最小 MCU 项目。

## 输入

- 外部芯片 datasheet 和可选 driver manual。
- I2C/SPI/UART/GPIO 相关的 MCU reference manual 或 HAL 文档。
- 板级原理图或接线说明。
- 总线事务的厂商示例。

从外部芯片手册中提取命令字节、地址、时序、寄存器表、状态标志或初始化序列时，使用 `$chip-driver-manual`。

## 项目形态

- `drivers/<chip>/`：可移植芯片驱动代码。
- `bsp/` 或 `boards/`：MCU 总线函数、复位引脚、中断引脚和延迟。
- `src/main.c`：一个可见验证点，例如 WHOAMI、JEDEC ID、EEPROM write/read、sensor sample、display init 或 charger status。

## 驱动边界

- 可移植驱动接收总线回调，而不是直接调用某个厂商 HAL，除非用户想要锁定厂商的 demo。
- 板级 glue 负责 chip select、reset、IRQ、bus instance 和 delays。
- 驱动暴露 initialization、probe、一个 read/write 操作和错误码。

## 硬件风险

- 确认总线电压、上拉、地址引脚、片选极性、复位时序、写保护和电源时序。
- 对 EEPROM/flash，除非用户确认，否则避免破坏性 erase/write 测试。
- 对电源 IC，除非有明确且来源支持的意图，否则避免改变充电、电压、电流、watchdog 或 ship-mode 设置。
