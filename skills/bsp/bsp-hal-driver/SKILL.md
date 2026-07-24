---
name: bsp-hal-driver
description: 实现板上器件的协议、初始化、读写、睡眠唤醒和 hal_driver 状态机。
---

# BSP hal_driver

## 职责

面向一个具体器件或芯片，封装寄存器/总线序列、复位、探测、配置、读写、错误恢复和睡眠唤醒。它调用 Core 提供的 MCU 外设接口，不调用 Driver 以外的上层 Adapter。

## 输出

给 BSP Port 提供清晰的 `init/read/write/control/sleep/wakeup` 原语、错误码和时序前置条件；不管理跨实例队列或业务状态。

## 工作流

先从数据手册确定协议，再实现最小状态机，最后用 Wrapper/Port 注入的总线和时间接口验证。显示、Flash、Touch 分别保持独立驱动，避免互相持有资源。

状态机、错误恢复和交接证据见 [`hal-driver-evidence.md`](references/hal-driver-evidence.md)。
器件 Driver 的协议流程、参考资料和样例见 [`capability-index.md`](references/capability-index.md)。

交接：总线和 MCU 内设交给 [`core-mcu`](../../platform/core-mcu/SKILL.md)，厂商库交给 [`driver-vendor`](../../platform/driver-vendor/SKILL.md)，绑定交给 [`bsp-adapter`](../bsp-adapter/SKILL.md)。
