# 来源接收

阅读厂商材料前使用此参考。

## 输入分类

- Datasheet：电气限制、封装引脚、外部芯片协议、memory map 摘要。
- Reference manual：MCU 外设寄存器、时钟、中断、复位行为。
- Programming manual：内核、调试、异常模型、启动模式、flash 编程。
- Startup file：向量名、reset handler、弱 IRQ handlers、system init hook。
- Linker script：flash/RAM origin 和 length、stack/heap、vector placement。
- SDK driver：规范寄存器顺序、时钟使能、轮询循环、timeout。
- Board files 或 schematic：晶振、LED、按键、传感器总线、上拉、片选、复位和 IRQ 引脚。
- Example project：可工作的 build flags、include paths、linker 选择、system clock、HAL/LL 依赖。

## 接收问题

- 使用的精确目标芯片、封装和板卡是什么？
- 目标是 bare-metal、RTOS、bootloader 还是 external-chip demo？
- 应使用哪个编译器和构建系统？
- 哪些文件是已知可工作的厂商来源，哪些是用户代码？
- 请求的最小硬件验证是什么？

## 来源优先级

引脚和时钟值优先使用板级特定示例代码。寄存器名优先使用 reference manual 和厂商头文件。链接脚本优先使用相同芯片容量和工具链的版本。SDK 示例优先于复制的论坛片段。

## 红旗

- Startup file 和 linker script 针对不同 MCU family 或内存大小。
- 向量名与厂商头文件 IRQ 名称不匹配。
- 时钟代码假设了板上不存在的晶振。
- 示例复制了整个 SDK，但 include path 边界不清。
- 外设引脚配置缺少 alternate-function 来源证明。
- 外部驱动 demo 漏掉上拉、复位、片选或中断接线。
