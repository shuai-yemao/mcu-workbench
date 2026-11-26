# MCU 外设

用于 MCU 或 SoC 内部外设控制器。另见 `register-model.md`。

## 通用提取项

- 外设类型和实例。
- 基地址和总线域。
- 时钟源、时钟门控、分频器和频率限制。
- 复位寄存器、位、极性和必要释放顺序。
- Pinmux、封装引脚可用性和电气模式。
- IRQ 号、共享线、中断使能、pending 和标志清除序列。
- DMA request ID、方向、宽度和 FIFO 行为。
- 寄存器表、偏移、复位值、访问类型和字段描述。
- 初始化序列和必要的 busy/ready 轮询。

## 外设特定重点

- GPIO：方向、输入/输出、set/clear/toggle、pull、drive、中断 edge/level。
- UART/USART：波特率公式、oversampling、帧格式、FIFO、TX/RX 标志、错误标志。
- I2C：时序公式、ACK/NACK、START/STOP、bus busy、arbitration、timeout、DMA。
- SPI：CPOL/CPHA、frame size、prescaler、NSS/CS、FIFO、busy/overrun、DMA。
- ADC：参考源、时钟、采样时间、通道映射、校准、触发、数据对齐。
- Timer/PWM：计数器宽度、prescaler、period、compare、preload、polarity、dead time、update flags。
- DMA：request mapping、transfer width、burst、circular mode、linked list、中断清除。
- Clock/reset：oscillator/PLL、muxes、dividers、gates、reset dependencies。
