# MCU-Workbench

嵌入式开发生命周期全覆盖的 Claude Code 插件，支持 76 个专业技能包。

## 功能

### 项目脚手架
```bash
/mcu new --platform stm32f4 --rtos freertos --name my_project
```

### 驱动代码生成
```bash
/mcu driver generate --peripheral oled --platform stm32f4
```

### 构建
```bash
/mcu build --target stm32f4
```

### 烧录（支持 OpenOCD / ST-Link / J-Link）
```bash
# ST-Link 烧录
/mcu flash --device stlink --platform stm32f4

# J-Link 烧录（新增）
/mcu flash --device jlink --platform stm32f4

# J-Link 烧录（多探针 + 供电）
/mcu flash --device jlink --platform stm32f4 --sn 123456789 --power
```

### 调试（支持 OpenOCD / J-Link / probe-rs）
```bash
# OpenOCD 调试（默认）
/mcu debug --device stlink --platform stm32f4

# J-Link GDB Server 调试（新增）
/mcu debug --device jlink --platform stm32f4 --debugger jlink

# probe-rs MCP 调试（新增）
/mcu debug --device jlink --platform stm32f4 --debugger probe-rs

# 串口监控
/mcu monitor --port COM3
```

### AI 辅助调试（J-Link + probe-rs MCP）
通过 `embedded-debugger-mcp` 实现 17 个 MCP 工具的 AI 调试：
- **探针管理**：list_probes, connect, disconnect
- **核心控制**：halt, resume, step, reset_target
- **内存操作**：read_memory_32/8, write_memory_32/8
- **断点管理**：set_breakpoint, clear_breakpoint
- **Flash 编程**：flash_erase, flash_program
- **RTT 日志**：rtt_attach, rtt_read

## 技能包（76 个）

### 调试工具
| 技能包 | 功能 |
|--------|------|
| `debug-jlink` | J-Link + probe-rs MCP AI 调试 |
| `debug-gdb-openocd` | GDB + OpenOCD 调试 |
| `cmbacktrace-debug` | ARM Cortex-M 崩溃追踪 |
| `rtos-debug` | FreeRTOS/RT-Thread 任务调试 |
| `embedded-debugger-framework` | 五层故障诊断方法论 |
| `ozone-module` | SEGGER Ozone 调试器指南 |
| `systemview-module` | SEGGER SystemView 实时分析 |
| `segger-rtt-module` | SEGGER RTT 日志集成 |

### 烧录工具
| 技能包 | 功能 |
|--------|------|
| `flash-jlink` | J-Link JLinkExe 烧录（多探针/供电/重试） |
| `flash-openocd` | OpenOCD 烧录 |
| `flash-keil` | Keil MDK 烧录 |
| `flash-platformio` | PlatformIO 烧录 |
| `flash-idf` | ESP-IDF esptool 烧录 |
| `gang-flash` | 多设备批量烧录 |

### 构建系统
| 技能包 | 功能 |
|--------|------|
| `build-cmake` | CMake 构建 |
| `build-keil` | Keil MDK 构建 |
| `build-iar` | IAR 构建 |
| `build-platformio` | PlatformIO 构建 |
| `build-idf` | ESP-IDF 构建 |

### 外设驱动
`i2c-bus` · `spi-bus` · `uart-module` · `adc-module` · `timer-module` · `dma-module` · `gpio-module` · `motor-control` · `watchdog-module`

### 通信协议
`can-debug` · `ble-module` · `wifi-module` · `lora-module` · `modbus-debug` · `mqtt-module` · `usb-module` · `gps-module` · `cellular-module` · `ymodem-module`

### RTOS
`freertos-module` · `rt-thread-module`

### 系统设计
`embedded-architect` · `bootloader-design` · `code-porting` · `lowpower-design` · `linker-scatter`

### 安全加密
`aes-module` · `crc-module` · `rsa-module` · `firmware-sign`

### 存储
`fatfs-module` · `sfud-module` · `sram-module`

### 知识库
`arm-core-registers` · `arm-interrupt-exception` · `arm-memory-architecture` · `chip-architecture` · `mcu-peripheral-registers` · `option-bytes`

### 其他
`map-analyzer` · `static-analysis` · `embedded-reviewer` · `serial-monitor` · `visa-debug` · `pcb-analysis` · `dsp-module` · `fft-module` · `lvgl-module` · `ota-package` · `ota-update-system` · `elog-module` · `devlog`

## 支持平台

| 平台 | 架构 | J-Link | 状态 |
|------|------|--------|------|
| STM32F1 | ARM Cortex-M3 | ✅ STM32F103C8 | ✅ 支持 |
| STM32F4 | ARM Cortex-M4 | ✅ STM32F411CE | ✅ 支持 |
| STM32F7 | ARM Cortex-M7 | ✅ STM32F767ZI | ✅ 支持 |
| GD32F1 | ARM Cortex-M3 | ✅ GD32F103C8 | ✅ 支持 |
| AT32F4 | ARM Cortex-M4 | ✅ AT32F403ACGT7 | ✅ 支持 |
| ESP32 | Xtensa LX6 | ❌ 不支持 | ✅ 支持 |
| ESP32-S3 | Xtensa LX7 | ❌ 不支持 | ✅ 支持 |
| ESP32-C3 | RISC-V | ❌ 不支持 | ✅ 支持 |

## 架构

采用分层架构设计：
- **App 层** - 应用层
- **中间件层** - 算法/协议
- **OS 层** - 操作系统
- **系统适配层** - 平台适配
- **BSP 层** - 外部设备驱动（桥接模式）
- **Core 层** - 厂商已包装
- **Driver 层** - 架构底层

## 开发

```bash
# 安装依赖
npm install

# 运行测试
npm test

# 构建插件
npm run build
```

## 许可证

MIT
