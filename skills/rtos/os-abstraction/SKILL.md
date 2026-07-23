---
name: os-abstraction
description: 定义 OSAL、OS Wrapper、OS Port 以及任务、队列、同步、定时和内存抽象。
---

# OS 抽象

## 边界

Wrapper 提供稳定的 `osal_*` 公共接口和项目错误码；Port 提供 `os_impl_*` 实现并绑定 FreeRTOS、RT-Thread 或裸机。Wrapper 不包含 RTOS 头文件，Port 不承载业务逻辑。

## 接口族

任务、队列、信号量、互斥锁、事件、软件定时器、延时、内存和临界区分别定义句柄所有权、超时单位、ISR 可用性和错误语义。

## 工作流

1. 先列出调用方需要的最小接口，不复制原生 RTOS API。
2. 决定句柄生命周期、静态/动态内存和 ISR 边界。
3. 实现 Wrapper，再由 Port 注入具体 OS；用 Fake/Mock 验证上层。
4. 只有出现具体 FreeRTOS 配置时交接 [`rtos-freertos`](../rtos-freertos/SKILL.md)。

## 禁止

不在 OSAL 中放 BSP 设备协议，不让 APP 或 Middleware 绕过 Wrapper 调用原生 RTOS。

共享层契约见 [`software-layer-contract.md`](../../workflow/workflow-project-integration/references/software-layer-contract.md)。
