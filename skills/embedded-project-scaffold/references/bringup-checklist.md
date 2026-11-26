# Bring-Up 检查清单

完成脚手架前运行此检查。

## 项目完整性

- 只有一个 startup/vector source 处于启用状态。
- 链接脚本匹配目标内存大小和工具链。
- CPU/FPU/compiler flags 匹配目标内核。
- Include paths 指向预期的厂商头文件。
- 没有残留的陈旧生成绝对路径。
- 复制的厂商文件保留许可证头。

## 硬件完整性

- 时钟源和频率已确认，或标记为 TODO。
- GPIO alternate functions 和引脚都有来源支持。
- Reset、boot、chip select、write protect 和 interrupt 引脚已纳入考虑。
- 当硬件可能失败时，轮询循环带 timeout。
- 除非用户请求，否则非易失写入、flash 擦除、option bytes、电源设置和大电流输出都应受保护或省略。

## 验证

- 已运行构建命令，或报告缺失工具链。
- 构建不可用时，已运行静态脚手架检查。
- 输出产物已命名且容易找到。
- 第一次硬件测试应小而可逆。
