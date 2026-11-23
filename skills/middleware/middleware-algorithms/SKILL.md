---
name: middleware-algorithms
description: 组织 DSP、FFT、电机控制及其他可复用嵌入式算法中间件。
---

# 算法中间件

## 边界

提供确定性、可测试的算法 API、数值约束、缓冲区策略和性能基线。算法不创建 Adapter、不直接操作外设；采样和执行调度由 APP/OS/BSP 负责。

## 工作流

明确输入输出单位、采样率、定点/浮点和实时预算，先用主机测试向量验证，再接入任务或 DMA 缓冲。DSP、FFT、电机控制按 references 维护变体。

CMSIS-DSP 的源码路径、浮点 ABI 和性能验收见 [`cmsis-dsp.md`](references/cmsis-dsp.md)。
DSP、FFT 和电机控制的算法选择、实现步骤与性能基线见 [`capability-index.md`](references/capability-index.md)。

交接：采样外设交给 [`core-mcu`](../../platform/core-mcu/SKILL.md)，实时调度交给 [`os-abstraction`](../../rtos/os-abstraction/SKILL.md)。
