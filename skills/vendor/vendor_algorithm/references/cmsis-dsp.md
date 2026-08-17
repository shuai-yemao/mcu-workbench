# CMSIS-DSP 源码证据

- 仓库：[ARM-software/CMSIS-DSP](https://github.com/ARM-software/CMSIS-DSP)
- 分支：`main`
- 复核 commit：`5f49c3d61be58e58cc51822a2d41c5238d7d4731`
- 关注路径：`Include/`、`Source/`、`Testing/`

## 责任边界

CMSIS-DSP 是算法实现和测试向量来源，不是采样驱动或任务调度层。采样由 Core/BSP 提供，调度由 OS Wrapper 提供，业务阈值和动作由 APP Logic 决定。

## 接入顺序

1. 锁定 Cortex-M 核心、浮点 ABI、编译器和定点/浮点表示。
2. 从输入单位、采样率、窗口长度和实时预算选择 API。
3. 先用 `Testing/` 思路建立主机向量，再在目标板测量周期、栈和工作区。
4. 记录缓冲区所有权、对齐、饱和/溢出和 DMA 缓存一致性。

禁止把 CMSIS-DSP API 直接扩散到 UI、BSP 或 Driver；通过算法模块的稳定接口交接。
