---
name: platform_os
description: Platform 纯定义：OS 能力接口（OSAL、任务、队列、同步、定时、内存抽象），零实现不绑 RTOS。
---

# Platform OS（平台抽象 · 纯定义）

## 边界

Platform 定义稳定的 `osal_*` 公共接口和项目错误码；Impl 以 `os_*_impl()` 实现并绑定 FreeRTOS、RT-Thread 或裸机。`osal_internal_*.h` 只是 Wrapper 与 Port 的内部边界，不构成第三层。Impl 可使用公开 `osal_*` 创建并注入 Handler 所需资源，但任务入口、任务循环、缓存和设备生命周期逻辑仍归 Handler。

## 接口族

任务、队列、信号量、互斥锁、软件定时器、延时、时基、内存和临界区分别定义句柄所有权、超时单位、ISR 可用性和错误语义。事件、Notify、取消等能力只有在当前 Impl 已实现并经过测试时才可加入公共接口。

## 工作流

1. 先列出调用方需要的最小接口，不复制原生 RTOS API。
2. 决定句柄生命周期、静态/动态内存和 ISR 边界。
3. 定义接口，再由 Impl 创建并注入已确认的 OSAL 资源；明确创建者、Handle 所有者、失败回收、超时单位和 ISR 可用性，并用 Fake/Mock 验证上层。
4. 只有出现具体 RTOS 或裸机运行时配置时交接 [`impl_os`](../../impl/impl_os/SKILL.md)。

接口验收矩阵见 [`osal-contract.md`](references/osal-contract.md)。

## 禁止

不在 OSAL 中放 BSP 设备协议，不让 APP 或 Service 绕过接口调用原生 RTOS。

共享层契约见 [`software-layer-contract.md`](../../workflow/workflow-review-gate/references/software-layer-contract.md)。
固定源码映射案例见 [`osal-freertos-case.md`](references/osal-freertos-case.md)。
