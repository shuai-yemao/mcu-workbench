# 显示、触控和音频

用于显示驱动、触控控制器、音频 codec、D 类放大器和相关控制芯片。

## 显示驱动

- 接口：SPI、parallel、RGB、MIPI DSI、I2C command channel。
- 复位和 sleep-out 延迟。
- 命令集、地址窗口、像素格式、方向和颜色顺序。
- 帧存大小、局部刷新、tearing effect 引脚、背光控制。
- 初始化命令序列和厂商特定 magic values。

## 触控控制器

- 接口地址和中断/复位引脚。
- 坐标格式、最大触点数、报告长度、手势/状态标志。
- 固件/配置加载要求。
- 中断清除行为和 debounce/filter 设置。

## 音频 Codec 和放大器

- 控制总线和音频数据总线：I2C/SPI 加 I2S/PCM/PDM/TDM。
- 时钟树：MCLK、BCLK、LRCLK、PLL、采样率约束。
- 寄存器页、复位序列、上电/掉电 pop 抑制。
- 路由/mixer 设置、增益刻度、mute、volume、jack detect、中断。
- 数据格式：采样宽度、对齐、端序、slot 映射。

## 驱动风险

- 当取值未公开文档说明时，保留厂商初始化序列。
- 遵守较长的复位、sleep-out、PLL lock 和放大器使能延迟。
- 将 UI/显示方向与总线像素格式分开处理。
