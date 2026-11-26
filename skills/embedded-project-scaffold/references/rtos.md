# RTOS 最小项目

用于 FreeRTOS、CMSIS-RTOS、Zephyr-like、ThreadX 或厂商 RTOS 项目。

## 最小组成

- Bare-metal 所需的全部启动、链接、时钟和板级要求。
- RTOS kernel 源码或包引用。
- 与 CPU 时钟、heap、tick rate、中断优先级模型和 port 匹配的 RTOS config header。
- 一个证明调度可用的 task 或 thread，以及一个硬件路径。

## 检查

- SysTick 或 timer source 不应同时被冲突的 HAL 代码使用。
- 中断优先级规则匹配 RTOS port。
- Heap 和 stack 大小适合链接内存。
- `assert`、malloc 和 newlib/thread-safety 选择是明确的。
- 关键 ISR API 只在允许的中断优先级范围内使用。

## 保持小型

除非它们是请求的功能，否则避免复制 demo applications、networking、filesystems、USB、GUI 或 tracing。
