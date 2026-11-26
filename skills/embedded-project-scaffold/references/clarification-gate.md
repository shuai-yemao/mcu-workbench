# 澄清关口

搜索、下载或生成项目前使用此参考。

## 规则

如果必要信息缺失或含糊，停止并询问用户。不要根据流行度推断具体板卡、MCU 变体、内存大小、封装、晶振、引脚映射、构建系统、调试探针、RTOS 或硬件动作。

## 最小必要信息

对任何生成项目，都需要：

- 精确 MCU 或 SoC 料号；当 memory/package 变体会影响启动或链接文件时，也需包含这些变体。
- 板卡名称或自定义硬件描述。
- 第一个 bring-up 目标，例如 LED blink、UART hello、I2C WHOAMI、SPI JEDEC ID、ADC read、RTOS task 或 bootloader layout。
- 偏好的项目风格或框架：bare-metal register、vendor HAL/LL、CMSIS、RTOS、Zephyr、Arduino、PlatformIO 或 vendor IDE。
- 用户关心时，提供偏好的构建系统或工具链：CMake、Makefile、Keil、IAR、STM32CubeIDE、GCC、west、PlatformIO。
- 输出目录。

对 flash/debug 脚本，还需要：

- 调试探针/工具，例如 ST-LINK、J-Link、CMSIS-DAP、DAPLink、serial bootloader、USB DFU 或 vendor CLI。
- 需要时提供连接接口和目标配置，例如 SWD/JTAG、OpenOCD interface file、J-Link device name 或 serial port。

对板级代码，还需要或从来源确认：

- 时钟源和频率。
- LED/button/UART/I2C/SPI 引脚和 alternate functions。
- 相关时确认外部芯片 reset、chip-select、write-protect、interrupt、address pins 和 bus voltage。

## 简洁提问

只询问下一步所需的问题。优先用一个紧凑问题加检查清单。如果用户说选择默认值，当默认值会影响硬件正确性时，先说明拟定默认值并请求确认。

含糊请求示例：

`请补充：1. STM32完整型号；2. 开发板/自定义板；3. 目标功能；4. 希望用 HAL/LL/寄存器/CMSIS/RTOS；5. 构建方式；6. 输出目录。`

## 无需询问即可继续的情况

只有当缺失项无害且可逆时才继续：

- 目录命名。
- 格式和注释风格。
- 是否包含不触碰硬件的可选便利脚本。
- 静态分析或源码清点。

## 永远不要猜

不要猜测可能导致项目静默失败或损坏硬件的取值：

- Flash/RAM 大小和链接布局。
- 其他芯片的启动文件或向量表。
- 晶振频率、PLL 设置、电压缩放或 flash wait states。
- 引脚映射、alternate function、drive strength、pull-ups、chip-select 极性或 reset 极性。
- Flash erase/write 范围、option bytes、fuses、boot 配置、readout protection 或电源 IC 设置。
- Probe 类型、serial port、target voltage、reset mode 或 debug speed。
