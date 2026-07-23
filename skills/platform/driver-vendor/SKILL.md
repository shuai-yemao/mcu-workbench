---
name: driver-vendor
description: 使用 CMSIS、STM32 HAL/LL/SPL、ESP-IDF Driver、寄存器和厂商 SDK。
---

# 厂商 Driver

## 边界

Driver 是芯片厂商提供或维护的底层库，直接操作 CPU 和片上外设。保持官方 API、头文件和版本约束，不增加项目 Adapter 层。

## 工作流

确认芯片系列、SDK 版本和生成配置，定位初始化、寄存器、HAL/LL/SPL 调用，再把可用能力交给 Core 或 BSP Port。厂商 API 的差异放入本 skill 的项目 references，不复制成平行入口。

## 禁止

不在 Driver 中放业务、外部器件协议、RTOS Wrapper 或 Middleware 适配代码。任何移植差异应由 Core 配置或 BSP Port 消化。

共享层契约见 [`software-layer-contract.md`](../../workflow/workflow-project-integration/references/software-layer-contract.md)。
