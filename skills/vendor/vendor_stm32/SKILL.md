---
name: vendor_stm32
description: Vendor 底座登记：CMSIS、STM32 HAL/LL/SPL、ESP-IDF Driver、寄存器和厂商 SDK（源码只登记映射，不复制进仓库）。
---

# 厂商 Driver（Vendor 底座）

## 边界

Driver 是芯片厂商提供或维护的底层库，直接操作 CPU 和片上外设。保持官方 API、头文件和版本约束，不增加项目 Adapter 层。本技能属 **Vendor 层**：只提供底座能力，不反向调用 App / Service / Platform / Impl 任何符号。

## 工作流

确认芯片系列、SDK 版本和生成配置，定位初始化、寄存器、HAL/LL/SPL 调用，再把可用能力交给 Platform 接口或 Impl。厂商 API 的差异放入本 skill 的项目 references，不复制成平行入口。

STM32 HAL、ESP-IDF 和 CMSIS 的版本/路径矩阵见 [`vendor-source-matrix.md`](references/vendor-source-matrix.md)。
HAL/SPL 的完整调用流程、示例和版本差异见 [`capability-index.md`](references/capability-index.md)。
Vendor 源码登记规范（来源/版本/路径 + patch）见 [`vendor_mapping.md`](../references/vendor_mapping.md)。

## 禁止

不在 Driver 中放业务、外部器件协议、RTOS Wrapper 或 Middleware 适配代码。任何移植差异应由 Platform 配置或 Impl 消化。

厂商 `HAL_*`/LL/CMSIS API 只能由 Impl 的后端或确有职责的底层 Port 使用；APP、Service 和器件 Driver 不得直接调用。厂商状态映射为项目错误码的责任属于 Platform 边界，而不是外部器件 Driver。

共享层契约见 [`software-layer-contract.md`](../../workflow/workflow-review-gate/references/software-layer-contract.md)。
