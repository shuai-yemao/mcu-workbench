---
name: vendor_mcu
description: Vendor MCU 能力底座：完整保留 STM32、AT32、ESP32 官方 SDK、生成工程、Startup/System、HAL/LL/CMSIS 与工程配置。
---

# Vendor MCU 能力底座

## 边界

本技能登记目标工程 `05_Vendor/vendor_mcu/` 中的 MCU 官方底座。STM32、AT32、ESP32 的官方 SDK、CMSIS、HAL/LL、Startup、System、寄存器头、生成工程和工程配置保持完整，不把厂商工程拆成插件自有的平行实现。本技能属 **Vendor 层**：只提供底座能力，不反向调用 App / Service / Platform / Impl 任何符号。

目标工程可按芯片族建立 `stm32/`、`at32/`、`esp32/` 子目录；CubeMX 生成的 `.ioc`、AT32 Workbench 工程、ESP-IDF 的 `sdkconfig` 和初始工程文件都属于该芯片底座的可追溯内容。目标工程 Git 统一管理整个 `05_Vendor/`，而不是由插件仓库携带这些实际源码。

## 工作流

确认芯片系列、SDK 版本、生成器和生成配置，定位初始化、寄存器、HAL/LL/SPL 调用，再由 `platform/impl` 形成上层可用能力。厂商 API 的差异由 Impl 后端消化，不复制成平行入口；Service、App 和 Platform 公共头不得直接 include 本底座。

STM32 HAL、ESP-IDF 和 CMSIS 的版本/路径矩阵见 [`vendor-source-matrix.md`](references/vendor-source-matrix.md)。
HAL/SPL 的完整调用流程、示例和版本差异见 [`capability-index.md`](references/capability-index.md)。
Vendor 内容、完整性和元数据规范见 [`vendor-content-contract.md`](../references/vendor-content-contract.md)。来源/版本/生成器/路径登记见 [`vendor_mapping.md`](../references/vendor_mapping.md)。

## 禁止

不在 Driver 中放业务、外部器件协议、RTOS Wrapper 或 Middleware 适配代码。任何移植差异应由 Platform 配置或 Impl 消化。

厂商 `HAL_*`/LL/CMSIS/SDK API 只能由 Impl 的后端或确有职责的底层 Port 使用；APP、Service 和 Platform 公共头不得直接调用。厂商状态映射为项目错误码的责任属于 Platform/Impl 契约边界，而不是外部器件 Driver。

共享层契约见 [`software-layer-contract.md`](../../workflow/workflow-review-gate/references/software-layer-contract.md)。
