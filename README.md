# MCU-Workbench

嵌入式开发生命周期全覆盖的 Claude Code 插件。

## 功能

### 项目脚手架
```bash
/mcu new --platform stm32f4 --rtos freertos --name my_project
```

### 驱动代码生成
```bash
/mcu driver generate --peripheral oled --platform stm32f4
```

### 构建和烧录
```bash
/mcu build --target stm32f4
/mcu flash --device stlink
```

### 调试辅助
```bash
/mcu debug --device stlink --platform stm32f4
/mcu monitor --port COM3
```

## 支持平台

| 平台 | 架构 | 状态 |
|------|------|------|
| STM32F1/F4/F7 | ARM Cortex-M | ✅ 支持 |
| GD32F1 | ARM Cortex-M3 | ✅ 支持 |
| AT32F4 | ARM Cortex-M4 | ✅ 支持 |
| ESP32/S3/C3 | Xtensa/RISC-V | ✅ 支持 |
| AVR | AVR | 🔜 计划中 |
| 8051 | 8051 | 🔜 计划中 |

## 支持 OS

- FreeRTOS
- RT-Thread
- 裸机

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
