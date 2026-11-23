---
name: vendor_algorithm
description: Vendor 算法底座：按需保留 Ring Buffer、FFT、DSP 及其他确定性算法实现与知识。
---

# Vendor Algorithm（算法底座）

## 边界

提供确定性、可测试的算法实现、数值约束、缓冲区策略和性能基线。目标工程只把实际使用的 Ring Buffer、FFT、DSP 内容放入 `05_Vendor/vendor_algorithm/<selected-library>/`；算法不创建 Adapter、不直接操作外设，采样和执行调度由 APP/OS/BSP 负责。

目标工程 Git 管理该目录中的选定源码、许可证和版本元数据。插件仓库只保存本 Skill 的知识与路由规则，不携带目标工程算法源码。

传感器滤波、融合和派生指标应以带明确单位与时间戳的物理量快照为输入；不直接读取具体器件 Driver，也不绑定器件时序。

## 工作流

明确输入输出单位、采样率、定点/浮点和实时预算，先用主机测试向量验证，再接入任务或 DMA 缓冲。Ring Buffer、DSP、FFT 按 references 维护变体；上层调用必须经过 `platform_middleware` 的算法 API 和 `impl_middleware` 适配，不得由 Service/App 直接 include 算法头。

CMSIS-DSP 的源码路径、浮点 ABI 和性能验收见 [`cmsis-dsp.md`](references/cmsis-dsp.md)。
DSP、FFT 和电机控制的算法选择、实现步骤与性能基线见 [`capability-index.md`](references/capability-index.md)。

交接：公共算法不触碰设备；中间件实现由 `impl_middleware` 经 Platform API 接入，必要的采样设备能力通过 [`platform_bsp`](../../platform/platform_bsp/SKILL.md) 的内部适配角色获取，调度、任务和等待能力通过 [`platform_os`](../../platform/platform_os/SKILL.md) 获取。`platform_mcu` 只承载 MCU 公共能力，不是 Vendor 或 App 的设备直连入口。
