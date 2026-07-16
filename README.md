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

### BSP 分层与 Unity 测试技能

插件会自动加载 `skills/embedded/` 下的技能。新增的四个技能根据 STM32F411CEU6_AHT21 工程中的 Driver、Handler、Adapter 和 Unity 实践整理，适用于新外设移植、平台绑定和目标板测试：

| 技能 | 用途 |
|------|------|
| `bsp-peripheral-driver` | 设计可注入依赖、可回滚、可测试的 BSP 外设 Driver |
| `bsp-peripheral-handler` | 管理多实例外设、队列/线程/事件和资源生命周期 |
| `embedded-adapter` | 将 BSP 抽象接口绑定到 MCU 外设、RTOS、时基和中断服务 |
| `embedded-unity-testing` | 从测试设计文档生成 Unity Mock 测试并验证 Keil/RTT 日志 |

这些技能与已有的 `peripheral-driver` 互补：`peripheral-driver` 侧重通用外设代码适配和骨架生成，`bsp-peripheral-driver` 侧重依赖注入、生命周期、错误回滚和单元测试边界。

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
