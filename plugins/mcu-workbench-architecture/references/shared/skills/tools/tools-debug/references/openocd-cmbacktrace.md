# OpenOCD 与 CmBacktrace 源码证据

| 能力 | 来源 | 复核 commit |
| --- | --- | --- |
| GDB Server、Target、Flash Driver | [openocd-org/openocd](https://github.com/openocd-org/openocd) | `fc566d74005a4aefbe125b9b2f777d9514c60c87` |
| Cortex-M Fault、调用栈、addr2line | [armink/CmBacktrace](https://github.com/armink/CmBacktrace) | `3be35d99673805f258de5c2f156fac94eb896da4` |

## 诊断顺序

1. 保存 ELF/AXF、MAP、复位原因、Fault 寄存器、栈和实时日志。
2. 用 OpenOCD/GDB 确认目标连接、暂停状态、寄存器和内存读取是否可信。
3. 用 CmBacktrace/`addr2line` 将 PC/LR 映射到源码，区分编译优化造成的误差。
4. 修复后重新烧录并保留同一场景的回归证据。

J-Link 主机软件属于 SEGGER 专有工具，不用未验证的 GitHub 镜像替代；J-Link 相关流程只记录已安装版本和命令输出。
