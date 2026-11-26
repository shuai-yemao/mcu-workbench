# 工具链环境

生成 build、flash 或 debug 命令前使用。

## 规则

检测工具并报告缺失项。不要自动安装编译器、SDK、USB 驱动、探针软件、IDE、包管理器或厂商工具。

## 检测

运行此 skill 中的 `scripts/detect_environment.mjs`。同时检查项目文件和厂商说明，确定所需工具。

常见工具：

- Compiler：`arm-none-eabi-gcc`、`riscv-none-elf-gcc`、`riscv64-unknown-elf-gcc`、`xtensa-esp32-elf-gcc`、`gcc`、`clang`。
- Build：`make`、`mingw32-make`、`cmake`、`ninja`、`west`、`pio`。
- Flash/debug：`openocd`、`JLinkExe`、`JLinkGDBServer`、`STM32_Programmer_CLI`、`st-flash`、`pyocd`、`probe-rs`、`esptool.py`、`bossac`、`avrdude`、`gdb-multiarch`、`arm-none-eabi-gdb`。
- Vendor CLIs：仅当已安装且项目明确针对该厂商时使用。

## 决策

- 如果 compiler 缺失，仍然搭建项目并提供安装指导。
- 如果 build tools 缺失，生成项目文件，但不要声称项目已构建。
- 如果 flash/debug tools 缺失，跳过 flash/debug 脚本；仅在有用时创建禁用模板。
- 如果存在多个兼容工具，优先选择与已选构建系统和厂商示例匹配的工具。
- 如果探针未知，询问或为 interface、target、serial number、speed 和 reset mode 保留 TODO。

## 报告

包含：

- 可获得时，报告检测到的 compiler 和 version。
- 检测到的 build system tools。
- 检测到的 flash/debug tools。
- 缺失的必要工具，以及建议安装名称或厂商下载页。
- 用户安装缺失工具后可运行的命令。
