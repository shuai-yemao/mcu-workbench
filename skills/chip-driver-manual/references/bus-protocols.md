# 总线协议

当驱动必须通过主机接口与芯片通信时，使用此参考。

## I2C 和 SMBus

提取：

- 7-bit 或 10-bit 从机地址，以及地址引脚公式。
- 寄存器或存储地址宽度。
- 是否需要 repeated-start。
- 多字节读/写的自动递增行为。
- 各电压范围下的最高总线频率。
- 上拉、开漏和总线电容要求。
- ACK/NACK 行为、clock stretching、busy 轮询、PEC 和 SMBus 超时。
- 特殊复位或总线恢复序列。

驱动风险：

- 不要把 8-bit 地址常量当成 7-bit 地址使用。
- 当器件有 page write 时，在页/块边界拆分写入。
- 许多 I2C 读序列在要求时需要最后一个字节 NACK。

## SPI、QSPI 和 OSPI

提取：

- SPI mode：CPOL、CPHA。
- 各电压和命令下的最高时钟。
- 位序。
- 命令、地址、dummy、数据阶段布局。
- 地址宽度和端序。
- 片选 setup、hold、高电平时间和多字节事务规则。
- 状态/busy 轮询和 write-enable latch 行为。
- 半双工/全双工要求和 MISO 三态行为。

驱动风险：

- 如果 CS 必须保持有效，不要拆分事务。
- 当需要 write-enable 时，不要直接发出 program/erase。
- 不要假设 dummy cycles 在所有读取模式中固定不变。

## UART 和帧式串口

提取：

- 波特率和容差。
- 帧格式：数据位、校验、停止位。
- 包分帧、checksum/CRC、转义和命令/响应时序。
- 唤醒、复位、bootloader 和流控引脚。
- 响应超时和重试规则。

## 1-Wire

提取：

- ROM commands 和 function commands。
- 时序 slot、复位脉冲、presence pulse。
- 强上拉要求。
- CRC 多项式。
- 寄生供电约束。

## MDIO 和 Ethernet PHY

提取：

- Clause 22 或 Clause 45 访问。
- PHY 地址 strap 引脚。
- 寄存器页或 MMD 设备。
- 复位 strap 采样、链路状态、auto-negotiation、中断引脚。
- RGMII/RMII/MII 时序和延迟配置。

## 并口、显示和流式总线

提取：

- 总线宽度、像素/数据格式、端序/位打包。
- 命令/数据选择行为。
- 时钟极性、setup/hold、消隐、帧时序。
- DMA 或 FIFO 要求。
- 复位和退出睡眠延迟。
