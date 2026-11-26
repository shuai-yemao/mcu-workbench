# 接口 IC

用于扩展器、桥接器、PHY、收发器、hub、retimer 和协议接口芯片。

## 通用提取项

- 主机接口和下游接口。
- 地址/strap 引脚和复位 strap 采样。
- Device ID、revision 和 capability registers。
- 模式选择引脚或寄存器。
- command-byte、register-pointer、page-select 或 bank-select 行为。
- 中断/状态/故障引脚和标志清除行为。
- 如果芯片桥接数据，记录 FIFO、buffer 或 packet format。
- 时钟输入/输出要求。
- Link、bus 或 line state machine。
- 端接、偏置、阻抗和电平要求。
- 低功耗、suspend、wake 和 remote-wakeup 行为。

## 器件重点

- IO expanders：方向、pull、极性、interrupt-on-change、output latch 行为。
- Ethernet PHYs：MDIO clause、PHY 地址、复位 straps、auto-negotiation、link status、RGMII delays。
- USB bridges/hubs：descriptors、endpoint/pipe model、suspend/resume、firmware loading。
- CAN/LIN/RS485：standby/silent 模式、fault flags、slew-rate/termination 控制。

## 驱动风险

- Straps 通常只在复位期间采样。
- 寄存器 bank/page 选择会改变后续寄存器地址的含义。
- 某些 I2C 器件在复位后的读操作前需要 command byte/register pointer。
- Link status 位可能是 latched-low 或 read-clear。
- 共享中断引脚需要读取所有相关状态寄存器。
