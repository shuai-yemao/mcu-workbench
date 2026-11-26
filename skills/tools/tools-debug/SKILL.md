---
name: tools-debug
description: 负责 GDB/OpenOCD、Ozone、PlatformIO、RTOS、HardFault 和崩溃现场诊断；当用户提到断点、单步、core dump、死锁、栈溢出或 HardFault 时使用。
---

# 调试与故障诊断

## 职责

统一处理调试会话、断点/单步、寄存器和栈分析、RTOS 任务状态、崩溃回溯及现场复现。先保留 ELF/AXF、map、寄存器和日志证据，再选择工具变体。

## 四流选择（先选路，再选工具）

> 嵌入式问题定位的核心不是"哪个工具最好用"，而是"当前问题该走哪条流"：日志流回答"运行中发生了什么"，调试流回答"现场为何崩溃/卡死"，静态分析流回答"代码本身有没有明显缺陷"，方法论流保证"先找根因再修复"。任何问题都必须服从方法论流。

| 问题现象 | 走哪条流 | 入口 skill | 典型工具 |
|---|---|---|---|
| 偶发异常、长稳失败、事件时序、丢包/溢出、崩溃前足迹 | 日志流 | `tools-observability` | ELOG/RTT/SystemView/面包屑/SWV |
| 崩溃、HardFault、死锁、栈溢出、离线才复现、谁改了变量 | 调试流 | `tools-debug` | GDB/Ozone/CmBacktrace/离线断点/RTOS |
| 编码期/构建期缺陷预防、注释、格式、代码审查和静态规则 | 质量检查流 | `tools-quality` | 注释/格式/Cppcheck/MISRA（`advisory` 或 `final-gate`） |
| 资源占用、Map 分析和行为验证 | 项目验证流 | `tools-verification` | Map/RAM/ROM/栈、Unity/Fake 和项目验证 |
| 任何问题的流程纪律、问题模板 | 方法论流 | `tools-debug` → `debug-diagnostic-framework` | 四阶段 + 11 项 checklist |

**选流判断**：能复现且需要看现场 → 调试流；不能频繁复现或需长稳观察 → 日志流；**断点调试时问题消失** → 交接日志流/SystemView 非侵入手段（断点改变时序本身就是线索）。日志流捕获现象，调试流定位现场，静态分析防止复发，方法论流保证流程可重复。

## 变体

GDB/OpenOCD、Ozone、PlatformIO、RTOS、CmBacktrace 和诊断框架分别见：

- [`debug-gdb-openocd`](references/debug-gdb-openocd/GUIDE.md)
- [`debug-ozone`](references/debug-ozone/GUIDE.md)
- [`debug-platformio`](references/debug-platformio/GUIDE.md)
- [`debug-rtos`](references/debug-rtos/GUIDE.md)
- [`debug-crash-backtrace`](references/debug-crash-backtrace/GUIDE.md)（含 OS 异步栈回溯）
- [`debug-diagnostic-framework`](references/debug-diagnostic-framework/GUIDE.md)（含四阶段流程 + 11 项 checklist）
- [`debug-offline-breakpoint`](references/debug-offline-breakpoint/GUIDE.md)（FPB / DWT / BKPT / Flash Patch / MPU）

OpenOCD、CmBacktrace 和 J-Link 的证据边界见 [`openocd-cmbacktrace.md`](references/openocd-cmbacktrace.md)。
所有调试变体的完整故障流程、脚本和平台案例见 [`capability-index.md`](references/capability-index.md)。

## 输出

按“现象 → 证据 → 根因 → 修复 → 回归验证”输出，区分目标板证据与主机推断。日志采集交接 [`tools-observability`](../tools-observability/SKILL.md)。
