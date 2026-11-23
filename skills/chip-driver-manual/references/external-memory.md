# 外部存储器

用于 EEPROM、NOR flash、NAND flash、FRAM、SRAM、PSRAM 和类似外部存储芯片。

## 通用提取项

- 存储类型、容量、组织、地址范围和地址宽度。
- 主机接口：I2C、SPI、QSPI、parallel 或其他。
- 器件地址、片选或命令 opcode。
- read、write、program、erase、status、reset、write-enable 和 protection 操作。
- 页大小、写入/program 大小、擦除块/扇区大小和对齐限制。
- Busy 指示：ACK polling、状态位、ready/busy 引脚或固定延迟。
- 最大 write/program/erase 时间和推荐 timeout。
- Endurance、retention 和数据完整性说明。
- 写保护引脚、块保护位、lock bits、OTP/security 区域。
- 上电延迟、deep-power-down 行为、复位行为和 brownout 警告。

## I2C EEPROM 重点

- 7-bit 从机地址公式和地址引脚行为。
- 存储 word address 宽度：8、16 或更宽。
- Page write 大小和 page wrap 行为。
- 是否允许 partial page write。
- 写周期时间和 ACK polling 流程。
- Current address read、random read 和 sequential read 序列。
- WP 引脚极性和受保护范围。

## SPI NOR/FRAM 重点

- Opcode 表。
- 地址字节和 3-byte/4-byte 模式。
- 每种读取模式的 dummy cycles。
- Write-enable latch 和状态寄存器位。
- Page program 大小。
- Sector/block/chip erase 大小和时序。
- Quad-enable 或 XIP 配置。
- 适用时记录 SFDP 是否可用。

## NAND 重点

- Page、spare/OOB、block、plane 和 die 组织。
- 坏块标记规则。
- ECC 强度要求。
- Program/read/erase 序列。
- Ready/busy 行为和状态码。

## 驱动风险

- 在页边界拆分 write/program。
- 在擦除块边界拆分 erase。
- 不要覆盖 page-wrapped 数据。
- 下一次操作前轮询 busy/ready。
- 除非有意修改，否则保持保护位。
- 在上层存储设计中考虑 endurance 限制。
