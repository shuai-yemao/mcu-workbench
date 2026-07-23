---
name: workflow-router
description: 为嵌入式请求选择一个最小主 skill，并明确必要的下游交接。
---

# 软件请求路由

## 分诊顺序

1. 读取目标工程、构建日志、启动文件和现有架构笔记，先确认事实。
2. 按责任选择一个主 skill：业务/UI 用 `app-architecture`；OSAL 用 `os-abstraction`；器件绑定/协议/实例分别用 `bsp-adapter`、`bsp-hal-driver`、`bsp-handler`；MCU/厂商库用 `core-mcu`、`driver-vendor`；通用能力用四个 `middleware-*`；跨层系统能力用 `software-system`。
3. 只有存在直接依赖时追加交接 skill，并写明输入、输出、资源所有权。

## 硬规则

- Adapter 只存在于 OS、BSP，且由 Wrapper 与 Port 组成。
- Core、Middleware、Driver 不创建 Adapter。
- 不用本 skill 实现具体 HAL、器件协议、RTOS 或 UI 代码。

## 最小路由表

| 请求 | 主 skill | 常见交接 |
|---|---|---|
| GR5526 启动、Manager、Task、UI | `app-architecture` | `os-abstraction`, `middleware-lvgl` |
| OSAL 或任务/队列接口 | `os-abstraction` | `rtos-freertos` |
| Display/Flash/Touch 绑定 | `bsp-adapter` | `bsp-hal-driver`, `core-mcu` |
| 多实例、缓存、睡眠恢复 | `bsp-handler` | `bsp-adapter`, `os-abstraction` |
| MQTT/BLE/CAN 等 | `middleware-communication` | `bsp-adapter` |

完整边界见 [`workflow-project-integration`](../workflow-project-integration/SKILL.md)。
