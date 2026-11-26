# Datasheet 分诊

打开芯片文档后先使用此参考。目标是在编写驱动代码前，决定需要加载哪些参考，以及哪些事实仍然缺失。

## 来源分类

为每个来源打标签：

- `datasheet`：引脚、电气限制、功能、时序、封装、高层操作。
- `reference_manual`：寄存器表、外设行为、memory map、时钟、复位。
- `programming_manual`：命令序列、固件 API、启动/配置流程。
- `application_note`：推荐电路、示例、边界情况。
- `sdk_example`：可执行初始化和事务模式。
- `vendor_header`：寄存器地址、位掩码、枚举名。
- `errata`：与其他手册不同的已记录偏差。

如果唯一来源是 datasheet，且它缺少寄存器/命令细节，将驱动生成标记为不完整。

## 器件分类

选择最接近的类别：

- `mcu_peripheral`：MCU/SoC 内部外设控制器，例如 UART、SPI、I2C、ADC、GPIO、timer、DMA。
- `external_memory`：EEPROM、NOR/NAND flash、FRAM、SRAM、PSRAM、eMMC 类存储器。
- `sensor`：温度、IMU、压力、光照、磁传感、电流/功率监测、电量计、编码器。
- `power_ic`：PMIC、LDO、DCDC、充电器、监控器、电源开关、负载开关、理想二极管。
- `interface_ic`：IO 扩展器、桥接器、带寄存器的电平转换器、Ethernet PHY、CAN/LIN/RS485 收发器、USB 桥。
- `analog_mixed_signal`：ADC、DAC、放大器、比较器、模拟开关、隔离转换器、混合信号控制 IC。
- `display_touch_audio`：LCD/OLED 驱动、触控控制器、音频 codec、音频放大器。
- `wireless_rf`：BLE、Wi-Fi、LoRa、sub-GHz、GNSS、NFC、RF 收发器/前端。

不确定时，按驱动必须做什么来分类：配置寄存器、发送命令、轮询状态、流式传输数据或控制引脚。

## 接口分类

识别每个主机接口：

- I2C 或 SMBus
- SPI、QSPI、OSPI、Microwire
- UART 或帧式串口
- 1-Wire
- MDIO
- USB
- CAN、LIN、Ethernet
- Parallel、RGB、MIPI DSI/CSI、I2S、PCM、PDM
- 仅 GPIO 控制

当需要任何事务格式、总线模式、地址、命令或时序时，加载 `bus-protocols.md`。

## 缺失来源风险

编码前标记这些风险：

- Datasheet 引用了单独的寄存器表或 programming guide。
- 存在寄存器表，但缺少复位值或访问类型。
- 时序表提取乱码，或列含义不清。
- 封装/pinout 变体会影响引脚或地址。
- SDK 示例与 datasheet 矛盾。
- Errata 可能影响初始化、时序或状态标志。
- 电气要求取决于电压范围、温度等级或总线电容。

## 搜索词

结合芯片特定术语和以下通用术语：

- identity：`part number`、`device ID`、`who am i`、`revision`、`silicon ID`
- interface：`I2C`、`SPI`、`SDA`、`SCL`、`CS`、`SCLK`、`MOSI`、`MISO`、`UART`、`command`
- register：`register map`、`address`、`offset`、`reset`、`access`、`reserved`、`bit`
- flow：`initialization`、`startup`、`power-up`、`reset`、`sequence`、`calibration`
- status：`busy`、`ready`、`fault`、`interrupt`、`status`、`clear`
- timing：`t`、`min`、`max`、`setup`、`hold`、`write cycle`、`conversion time`
