---
name: impl_mcu
description: Impl 落地：platform_mcu 能力接口在具体芯片上的移植实现（GPIO/I2C/SPI/UART/ADC/TIM/DMA/中断/启动 Port），隔离厂商 HAL 与平台契约。
---

# Impl MCU（平台适配 · 芯片移植）

## 边界

处理 `platform_mcu` 能力接口在具体芯片上的 `mcu_*_impl()` 原生 Port 实现：GPIO、I2C、SPI、UART、ADC、TIM、DMA、中断与启动（vector table / SystemInit）。稳定的项目接口由 [`platform_mcu`](../../platform/platform_mcu/SKILL.md) 定义；厂商源码底座（CMSIS/HAL/LL/SPL）由 [`vendor_stm32`](../../vendor/vendor_stm32/SKILL.md) 登记，本层只做接口到芯片的移植适配。

## 规则

芯片头文件、寄存器操作和厂商类型只能出现在 Impl 或 Vendor；App、Service 使用 `platform_mcu` 接口。不要为同一外设重复封装厂商 HAL——HAL 已由 vendor 登记，本层只补 `platform_mcu` 契约到 HAL 的映射（含错误码与超时语义对齐）。

时钟树、引脚复用（AF）、中断向量与启动文件属于本层；电源/低功耗策略交给 `service_power`/`service_system`，外设能力定义交给 `platform_mcu`。

源文件可命名为 `mcu_*_impl.c`，内部函数统一采用 `mcu_*_impl()`。
