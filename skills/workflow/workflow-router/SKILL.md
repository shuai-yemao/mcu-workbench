---
name: workflow-router
description: 为 STM32、ESP32、Cortex-M 和通用嵌入式请求选择最小且边界清晰的 MCU-Workbench skill 集合。当用户只描述目标或问题、尚未确定应该使用构建、平台、总线、BSP、测试或调试 skill 时使用。
---

# 嵌入式工作流分诊

## 目标

只完成三件事：确定问题所在层级、选择一个主 skill、列出最多两个必要的交接 skill。不要在这里重复 HAL 配置、设备协议、测试实现或构建命令。

## 分诊顺序

1. **确认证据与约束**：读取项目说明、构建日志、报错、目标 MCU、SDK/工具链和已改文件；不根据“看起来像”直接改代码。
2. **定位架构层**：
   - MCU/CubeMX/HAL/寄存器 → `platform-*`
   - I2C/SPI/UART、通信协议或 MCU 外设 → `bus-*`、`peripheral-*`、`protocol-*`
   - 外部器件适配、设备 API、服务或平台绑定 → `bsp-*`
   - RTOS、中间件、启动、低功耗或看门狗 → `rtos-*`、`middleware-*`、`system-*`
   - 构建、烧录、调试、日志、质量或发布 → `tool-*`、`debug-*`、`observability-*`、`quality-*`、`release-*`
3. **选择主 skill**：优先选择职责最窄、最接近用户目标的 skill。例如“让 AHT21 跑起来”先是 `bsp-device-adaptation`；“AHT21 的驱动失败后不能恢复”是 `bsp-device-driver`；“三路 AHT21 共用队列”是 `bsp-device-service`。
4. **显式交接**：只有当下一层确实必需时才追加 skill。每次交接需说明输入、输出和谁拥有硬件/资源。

## 常见路由

| 用户目标 | 主 skill | 常见交接 |
|---|---|---|
| STM32 HAL 初始化、DMA 或 CubeMX 问题 | `platform-stm32-hal` | `bus-*` 或 `peripheral-*` |
| I2C/SPI/UART 信号、时序或错误恢复 | 相应 `bus-*` | `bsp-device-driver` |
| 接入新传感器、显示器、串行 Flash | `bsp-device-adaptation` | `bsp-device-driver` |
| 实现器件状态、错误回滚和 Mock 接口 | `bsp-device-driver` | `bsp-platform-adapter`、`quality-unity-testing` |
| 多实例、线程、队列或事件调度 | `bsp-device-service` | `bsp-platform-adapter` |
| 构建失败 | 对应 `tool-build-*` | `debug-*` 仅在已构建可执行物后使用 |
| 板子无法烧录或在线调试 | `tool-flash-*` 或 `debug-*` | `observability-*` |

## 禁止事项

- 不把“嵌入式”当作触发所有 79 个 skill 的理由。
- 不绕过项目中的构建日志、数据手册、波形或可复现错误。
- 不在分诊阶段强制使用 OOP、某个 RTOS 或某个工具链。
- 不把不同层的失败合并为同一结论；需要先给出下一步可验证的证据。
