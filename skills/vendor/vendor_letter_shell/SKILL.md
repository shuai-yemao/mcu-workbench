---
name: vendor_letter_shell
description: Vendor 底座登记：letter_shell 嵌入式串口命令行 shell 源码与知识，支持命令段导出、参数解析、历史、Tab 补全与变量导出；当用户提到 letter_shell、嵌入式 shell、命令行、SHELL_EXPORT_CMD、串口命令、shellPrint、串口调试命令时使用。
---

# letter_shell 串口命令行

## 边界

letter_shell 把 C 函数注册成串口命令，在任务上下文中运行，通过 UART 提供命令行交互。它不直接依赖 RTOS——只调用 `read/write/lock/unlock` 四个回调，底层由 OSAL 包装 FreeRTOS 等，核心不接触任何 RTOS 原语。

UART 通道与物理收发属于 [`core-mcu`](../../platform/platform_mcu/SKILL.md) 或 [`vendor_stm32`](../../vendor/vendor_stm32/SKILL.md)；日志输出建议用 RTT/ELOG（[`tools-observability`](../../tools/tools-observability/SKILL.md)），不要在 ISR 里直接调 `shellPrint`。

## 工作流

先注册命令（推荐 `SHELL_EXPORT_CMD` 段导出），再实现端口层四个回调与任务承载，最后在 FreeRTOS 任务中调用启动入口。

- 新命令只需写一个函数 + 一行 `SHELL_EXPORT_CMD` 宏，链接器自动收集到 `.shellCommand` 段，零样板。
- 命令函数签名 `int func(int argc, char *argv[])`，参数全是字符串，用 `atoi/strtol` 自行转换。
- 命令函数必须能返回，不能在里面死循环，否则 shell 任务被卡死。
- 多任务并发打印开 `SHELL_USING_LOCK`，用 OSAL 互斥锁（递归性质，同任务多次打印不死锁）。

详细注册与移植见 [`command-export-and-porting.md`](references/command-export-and-porting.md)。

## 交接

UART 物理通道交给 [`core-mcu`](../../platform/platform_mcu/SKILL.md)；任务与信号量交给 [`os-adapter`](../../platform/platform_os/SKILL.md)；运行时观测（RTT/日志）交给 [`tools-observability`](../../tools/tools-observability/SKILL.md)。
