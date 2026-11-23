# Bare-Metal 最小项目

用于不带 RTOS 的 MCU 项目。

## 最小组成

- 带向量表和 reset handler 的启动文件。
- 匹配精确 flash/RAM 布局的链接脚本。
- 系统初始化或时钟配置。
- 器件头文件或寄存器定义。
- 一条用于引脚和时钟的板级初始化路径。
- `main.c`，包含一个狭窄验证点，例如 blink、UART hello、timer tick 或外设读取。

## 启动检查

- 向量表放在正确的 flash 地址。
- 栈顶符号与链接脚本匹配。
- Reset handler 复制 data、清零 bss、按需调用 system init，然后进入 `main`。
- IRQ 名称与器件头文件匹配。

## 时钟和引脚

- 从板级文档或示例确认振荡源和频率。
- 访问 GPIO/外设前先使能外设时钟。
- 根据板级/来源证据配置 alternate functions、pull-ups、output speed 和 drive mode。
- 对未确认引脚添加 TODO，不要猜测。

## 最小驱动

- 将 MCU 特定 glue 放在 `bsp/` 或 `boards/` 下。
- 将可复用外设协议代码放在 `drivers/` 下。
- 轮询循环使用 timeout。
- 除非是有意设置的 bring-up 断点，否则避免永久阻塞。
