# MCU-Workbench

嵌入式开发生命周期全覆盖的 Claude Code 插件。

## 功能

- 项目脚手架：快速创建符合分层架构的嵌入式项目
- 驱动代码生成：自动生成外部设备驱动（BSP 层）
- 构建和烧录：一键编译和烧录固件
- 调试辅助：启动 GDB 调试和串口监控

## 支持平台

- STM32F1/F4/F7
- GD32F1, AT32F4
- ESP32/S3/C3
- AVR, 8051

## 使用方法

```bash
/mcu new --platform stm32f4 --rtos freertos --name my_project
/mcu driver generate --peripheral oled --platform stm32f4
/mcu build --target stm32f4
/mcu flash --device stlink
```
