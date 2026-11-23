# 构建系统

选择与用户环境和厂商来源匹配的最小构建系统。

## 选择

- 当项目需要 IDE-neutral、多目标或可复用时，使用 CMake。
- 当源码树较小且工具链类似 GCC 时，使用 Makefile。
- 仅当用户明确需要该 IDE，或 SDK 与它强绑定时，使用厂商 IDE 文件。
- 仅对 Zephyr 项目使用 west 或 Zephyr 布局。
- 仅当板卡/framework 存在于 PlatformIO 且用户想用该生态时，使用 PlatformIO。

## 必需构建事实

- Compiler triplet 和可执行文件名。
- CPU、FPU、float ABI、endian 和 instruction set flags。
- 链接脚本路径和 memory map。
- 启动文件和系统初始化文件。
- Include directories、defines 和选定 SDK config headers。
- 适用时记录 libraries 和 specs flags，例如 nano/newlib/nosys。
- 输出格式：ELF、HEX、BIN、map file。

## CMake 形态

- 将工具链设置放在 toolchain file 或顶层受保护块中。
- 将 board/chip config 放在一个明显文件中。
- 最小项目使用显式 source lists。
- 当工具存在时，生成 `.elf`、`.hex`、`.bin` 和 `.map` 目标。

## Makefile 形态

- 将 MCU flags、链接脚本、sources、includes 和 defines 放在靠前位置。
- 使用 GCC 时启用自动依赖生成。
- 提供 `all`、`clean` 和可选 `flash` 目标。
- 不要把必需的专有工具藏在未解释变量后面。

## 验证

工具已安装时运行构建。否则，验证文件存在、include paths、链接脚本引用、重复 startup 文件和明显的源码扩展名不匹配。
