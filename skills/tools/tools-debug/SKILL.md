---
name: tools-debug
description: 负责 GDB/OpenOCD、Ozone、PlatformIO、RTOS、HardFault 和崩溃现场诊断；当用户提到断点、单步、core dump、死锁、栈溢出或 HardFault 时使用。
---

# 调试与故障诊断

## 职责

统一处理调试会话、断点/单步、寄存器和栈分析、RTOS 任务状态、崩溃回溯及现场复现。先保留 ELF/AXF、map、寄存器和日志证据，再选择工具变体。

## 变体

GDB/OpenOCD、Ozone、PlatformIO、RTOS、CmBacktrace 和诊断框架分别见：

- [`debug-gdb-openocd`](references/debug-gdb-openocd/GUIDE.md)
- [`debug-ozone`](references/debug-ozone/GUIDE.md)
- [`debug-platformio`](references/debug-platformio/GUIDE.md)
- [`debug-rtos`](references/debug-rtos/GUIDE.md)
- [`debug-crash-backtrace`](references/debug-crash-backtrace/GUIDE.md)
- [`debug-diagnostic-framework`](references/debug-diagnostic-framework/GUIDE.md)

## 输出

按“现象 → 证据 → 根因 → 修复 → 回归验证”输出，区分目标板证据与主机推断。日志采集交接 [`tools-observability`](../tools-observability/SKILL.md)。
