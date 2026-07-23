---
name: app-architecture
description: 设计嵌入式 APP 的 main、Manager、Task、Logic、UI 与 Profile 边界和启动流程。
---

# APP 架构

## 结构

- `main`：只做启动编排、时钟/平台初始化和 OS 启动。
- `manager`：拥有应用状态、资源策略和跨任务协调。
- `task`：拥有任务入口、队列消费和周期调度。
- `logic`：实现业务规则，不直接碰 HAL 或 RTOS 原生 API。
- `ui`：页面、事件和人机交互；通过 Logic/Manager 获取状态。
- `profile`：BLE、微信小程序或产品连接配置，隔离协议细节。

## 规则

APP 只能调用 OS Wrapper、BSP Wrapper 和 Middleware 公共 API。禁止直接调用 `xTask*`、厂商 HAL、BSP Port 或 `hal_driver`。

## 工作流

1. 从 `main` 还原启动链和初始化顺序。
2. 为每个 Manager/Task 标注状态、消息和资源所有权。
3. 把 UI 事件转换为 Logic 命令，把设备事件转换为 Manager 状态。
4. 输出任务表、状态流和可测试的函数边界。

## GR5526 交接

验收 `Src/app/main.c`、`manager/`、`task/`、`ux_logic/` 与 `lv_user_task_create()`；OS 并发接口交给 [`os-abstraction`](../../rtos/os-abstraction/SKILL.md)，界面能力交给 [`middleware-lvgl`](../../middleware/middleware-lvgl/SKILL.md)。

共享层契约见 [`software-layer-contract.md`](../workflow-project-integration/references/software-layer-contract.md)。
