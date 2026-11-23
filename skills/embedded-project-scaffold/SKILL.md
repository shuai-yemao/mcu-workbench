---
name: embedded-project-scaffold
description: >-
  基于厂商 datasheet、reference manual、SDK 示例、板级原理图、启动文件、链接脚本、HAL/LL 驱动、寄存器头文件和工具链说明，构建最小嵌入式固件项目脚手架。用于 Codex 需要为
  MCU、RTOS、bare-metal、bootloader、外设 bring-up、传感器/IC 驱动 demo、BSP、board-support package 或厂商示例裁剪任务创建、适配或审查最小可构建嵌入式项目。也用于用户只提供芯片/板卡型号和参数，并希望
  Codex 在脚手架生成前寻找官方手册、SDK、示例和依赖下载链接；仅在用户明确要求或文件明显轻量时下载文件。
---

# Embedded Project Scaffold

## 目的

使用此 skill 将厂商资料转化为最小、可构建的嵌入式项目。优先建立一个小而可检查的项目，在添加可选框架代码前，先证明时钟、启动、引脚、链接脚本、构建系统和一个请求的硬件路径可用。

## 轻量边界

保持此 skill 轻量。用 LLM 推理理解厂商手册、选择项目形态、裁剪示例、映射文件并做工程权衡。脚本只用于确定性的项目清点和静态健全性检查。除非用户明确要求，不要创建包管理器、代码生成框架、板卡数据库或完整厂商 SDK 导入器。

当必须从 datasheet 或 reference manual 中提取芯片参数时，如果 `$chip-driver-manual` 可用，使用它而不是在这里重复提取规则。

## 工作流

1. 确认目标 MCU/芯片/板卡、请求功能、构建主机、编译器、调试探针、RTOS/bare-metal 偏好和可用来源材料。
2. 搜索、下载或生成前，阅读 `references/clarification-gate.md`。如果必要信息缺失或含糊，停止并向用户提出简洁问题，不要猜测。
3. 如果用户只提供型号/参数或要求获取资料，阅读 `references/material-acquisition.md` 并收集官方链接、依赖说明和下载检查清单。仅当用户明确要求自动下载，或文件很小、公开、直链且低风险时下载文件。
4. 检查厂商文件前，阅读 `references/source-intake.md`。
5. 阅读一个项目形态参考：
   - `references/bare-metal.md`：启动、链接、时钟、GPIO、UART、定时器、中断和简单外设 bring-up。
   - `references/rtos.md`：FreeRTOS、Zephyr-like、ThreadX、CMSIS-RTOS 或厂商 RTOS 示例。
   - `references/external-driver-demo.md`：驱动外部传感器、EEPROM、flash、电源 IC、显示器或接口芯片的最小项目。
   - `references/bootloader.md`：bootloader、app image、向量重定位、flash 布局、DFU、OTA 或双镜像工作。
6. 决定 build、flash 或 debug 命令前，阅读 `references/toolchain-environment.md` 并运行 `scripts/detect_environment.mjs`。只检测已安装工具；不要自动安装编译器、SDK、探针、驱动或 IDE。
7. 创建 Makefile、CMake、west、PlatformIO、厂商 IDE 或混合构建文件前，阅读 `references/build-systems.md`。
8. 生成编译、烧录或调试脚本前，阅读 `references/build-flash-debug-scripts.md`。
9. 从厂商 SDK 或示例复制代码前，阅读 `references/vendor-reduction.md`。
10. 完成实现或审查前，阅读 `references/bringup-checklist.md`。
11. 可选运行 `scripts/project_inventory.mjs <source-dir>`，在选择文件前汇总厂商源码树。
12. 仅对 agent 或用户显式选择的 URL 使用 `scripts/download_materials.mjs <manifest.json> <output-dir>`，并且只有在 `references/material-acquisition.md` 的下载策略允许时使用；不要将它作为网页爬虫或 SDK 依赖解析器。
13. 创建最小有用项目，并保持清晰的归属边界：
   - `src/`：用户代码。
   - `include/`：项目公共头文件。
   - `startup/`：启动汇编/C 和向量表文件。
   - `ld/` 或 `linker/`：链接脚本。
   - `drivers/`：复制或裁剪的厂商/外设驱动。
   - `boards/` 或 `bsp/`：需要时存放板级引脚/时钟/配置文件。
   - `third_party/` 或 `vendor/`：仅用于基本原样复制的文件。
14. 保留厂商许可证头和源文件来源。不要悄悄重写生成的厂商文件。
15. 仅在项目运行需要时，在项目输出中添加构建说明。除非用户请求可分发模板，否则避免额外文档文件。
16. 当检测到兼容构建环境时生成构建脚本。仅当检测到兼容探针工具或用户指定探针时，生成 flash/debug 脚本。
17. 运行可用构建，或至少运行静态检查。如果没有编译器/工具链，运行 `scripts/check_scaffold.mjs <project-dir>` 并明确报告缺失工具链。

## 工程规则

- 只从已确认来源事实生成，或清楚标记假设。
- 当用户未提供时，不要猜测具体 MCU、板卡、封装、链接内存大小、晶振值、引脚映射、启动模式、探针、RTOS 或破坏性硬件动作。
- 优先裁剪已知可工作的厂商示例，而不是从零发明启动、链接、时钟或中断代码。
- 将第一个项目目标保持狭窄：blink、UART hello、寄存器读取、JEDEC ID、WHOAMI、EEPROM read/write 或一个请求的外设事务。
- 将可移植驱动代码与板级接线和 MCU 外设 glue 分离。
- 时钟树、memory map、向量表、pinmux 和中断名都应可追溯到源文件或手册。
- 对未确认的板级引脚、晶振值、flash/RAM 大小、调试探针配置或外设实例保留 TODO 标记。
- 除非用户或源项目要求，不要混用 HAL、LL、寄存器级、Arduino、Zephyr 和 RTOS 风格。
- 修改寄存器时，保留保留位、复位值和厂商初始化顺序。
- 优先使用确定性的构建入口：`Makefile`、`CMakeLists.txt`、`west.yml`、`platformio.ini` 或厂商项目文件。避免隐藏的 IDE-only 步骤。
- 永远不要自动安装工具链、SDK、USB 驱动、调试探针软件、IDE 或包管理器。如果缺失，明确告诉用户需要安装什么以及原因。
- 对依赖复杂的厂商栈，优先使用官方 SDK/CMSIS Pack/HAL 包链接和用户提供的归档，而不是零散下载源文件。
- 当工具存在时，创建适合主机 shell 和项目构建系统的简单 `scripts/build`、`scripts/flash` 和 `scripts/debug` 入口。保持命令可见且可编辑。

## 预期输出

创建任务应产生：

- 请求位置中的最小项目树。
- 已知时给出构建入口和准确命令。
- 检测到的编译、构建、烧录和调试环境；或缺失工具及安装建议。
- 当本地环境支持时，生成 build、flash 和 debug 脚本。
- 来源映射，列出哪些厂商/手册文件影响了启动、链接、时钟、引脚、驱动和构建 flags。
- 影响硬件正确性的取值开放问题。
- bring-up 检查清单和本地已验证内容。

审查任务应先输出带文件/行引用的发现项，然后输出缺失来源风险，最后输出建议的项目结构或构建修复。

对不清楚的用户选择，如果缺失信息会影响项目身份、内存布局、时钟、引脚、构建系统、烧录、调试或硬件安全，先询问再继续。仅对目录名或注释措辞等无害风格选择使用保守默认值。

## Agent 兼容性

此 skill 与 agent 无关，可供 Codex、Claude Code 或其他能读取此目录的 LLM agent 使用。安装路径、调用示例、预期输入/输出、工作流和安全边界见 `README.md`。
