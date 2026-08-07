---
name: vendor_dsp
description: Vendor 底座登记：DSP、FFT、电机控制及其他可复用嵌入式算法库源码与知识（如 CMSIS-DSP）。
---

# 算法中间件

## 边界

提供确定性、可测试的算法 API、数值约束、缓冲区策略和性能基线。算法不创建 Adapter、不直接操作外设；采样和执行调度由 APP/OS/BSP 负责。

传感器滤波、融合和派生指标应以带明确单位与时间戳的物理量快照为输入；不直接读取具体器件 Driver，也不绑定器件时序。

## 工作流

明确输入输出单位、采样率、定点/浮点和实时预算，先用主机测试向量验证，再接入任务或 DMA 缓冲。DSP、FFT、电机控制按 references 维护变体。

CMSIS-DSP 的源码路径、浮点 ABI 和性能验收见 [`cmsis-dsp.md`](references/cmsis-dsp.md)。
DSP、FFT 和电机控制的算法选择、实现步骤与性能基线见 [`capability-index.md`](references/capability-index.md)。

交接：公共算法不触碰设备；任何 Middleware Port 获取设备能力只能经 BSP Wrapper（[`bsp-wrapper`](../../platform/platform_bsp/SKILL.md)），调度、任务和等待只能经 [`os-adapter`](../../platform/platform_os/SKILL.md) 提供的 OS Wrapper。`core-mcu` 只承载底层 MCU 公共能力，不是 Middleware 的设备直连入口。
