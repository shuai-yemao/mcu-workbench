# 无线和 RF

用于 BLE、Wi-Fi、LoRa、sub-GHz、GNSS、NFC、RF 收发器和 RF 前端器件。

## 通用提取项

- 主机接口：SPI、UART、SDIO、USB、I2C 或 GPIO 命令引脚。
- 复位、启动模式、固件下载和校准流程。
- 晶体/时钟要求和负载电容说明。
- 无线电状态机：sleep、standby、RX、TX、calibration。
- Packet format、FIFO、IRQ/status flags 和清除行为。
- 频率范围、信道规划、PLL 设置、数据率、调制、带宽。
- TX 功率表、PA/LNA 控制、天线开关引脚、法规约束。
- 时序：wakeup、PLL lock、RX/TX turnaround、packet timeout。
- NVM/OTP 校准数据和 firmware/patch 版本。

## 驱动风险

- 不要使用猜测的 RF 设置进行发射。
- 明确保留地区/法规配置。
- 需要加载固件的器件必须检查版本和启动状态。
- RF 校准和晶体微调常常影响基础通信可靠性。
