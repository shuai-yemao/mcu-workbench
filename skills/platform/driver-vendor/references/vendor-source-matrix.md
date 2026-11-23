# 厂商 Driver 源码矩阵

| 平台 | 源码仓库与 commit | 关注路径 | 交接给 |
| --- | --- | --- | --- |
| STM32F4 | [stm32f4xx-hal-driver](https://github.com/STMicroelectronics/stm32f4xx-hal-driver) · `1f6451c3e07728b4c830744de380e56bf5bc0026` | `Inc/`、`Src/`、Release Notes | `core-mcu` / BSP Port |
| ESP32 | [esp-idf](https://github.com/espressif/esp-idf) · `055ba9d3f9c6fd9a0efacd4993a2a942972dd65d` | `components/`、`tools/`、Kconfig、目标配置 | `core-mcu` / `tools-build` |
| Cortex-M | [CMSIS_6](https://github.com/ARM-software/CMSIS_6) · `7f62ddc8ab8e9af22039912b8f9f46a9290f49ba` | Core、Device、Pack | `core-mcu` |

## 规则

- 先确认芯片系列、SDK/HAL 版本和生成配置，再引用官方 API。
- STM32 HAL 的 HAL/LL、CMSIS Core、CMSIS Device 必须保持同一兼容矩阵。
- ESP-IDF 的 Component、Kconfig、CMake 和目标芯片版本必须一起记录。
- Driver 只提供原生厂商能力，不创建 Adapter、不放业务、不放 OS Wrapper。
- 外部器件协议交给 `bsp-hal-driver`，板级绑定交给 `bsp-adapter`，MCU 资源编排交给 `core-mcu`。
