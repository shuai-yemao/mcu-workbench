---
name: tools-linker
description: 负责 Keil scatter、GCC linker script、IAR icf、内存布局和链接错误；当用户提到 ROM/RAM 溢出、region overflow 或链接脚本时使用。
---

# 链接与内存工具

## 职责

统一分析链接脚本、内存区域、段布局、Bootloader/APP 分区和 map 结果。先确认编译器格式，再选择 `.sct`、`.ld` 或 `.icf` 变体。

## 工作流

1. 读取芯片内存表、启动文件和目标分区约束。
2. 对照链接脚本与 map 文件，定位首个溢出或符号冲突。
3. 输出修改后的区域/段策略和重新链接验证命令。

详细模板见 [`tool-linker-scatter`](references/tool-linker-scatter/GUIDE.md)；构建命令交接 [`tools-build`](../tools-build/SKILL.md)。
scatter/linker 的完整语法、样例和故障处理见 [`capability-index.md`](references/capability-index.md)。
