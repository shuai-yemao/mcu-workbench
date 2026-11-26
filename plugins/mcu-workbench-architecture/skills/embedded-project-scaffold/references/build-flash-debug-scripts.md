# Build、Flash 和 Debug 脚本

在脚手架和环境检测明确后使用。

## 生成脚本

仅为可安全推断的命令创建脚本。

推荐布局：

- Windows：`scripts/build.ps1`、`scripts/flash.ps1`、`scripts/debug.ps1`。
- POSIX：`scripts/build.sh`、`scripts/flash.sh`、`scripts/debug.sh`。
- 保留根目录构建入口，例如 `Makefile` 或 `CMakeLists.txt`。

## Build 脚本

- 对 Makefile 项目，从项目根目录调用 `make` 或 `mingw32-make`。
- 对 CMake 项目，配置到 `build/`，然后用 `cmake --build build` 构建。
- 构建文件支持时输出 ELF、HEX、BIN 和 MAP。
- 打印预期输出路径。

## Flash 脚本

仅当目标、输出产物和烧录工具都已知时生成。

示例：

- OpenOCD：需要 interface config、target config 和产物路径。
- ST-LINK CLI：需要产物路径和目标连接模式。
- J-Link：需要 device name、interface、speed 和产物路径。
- ESP tooling：需要 serial port，或保留清楚的 TODO。

除非用户明确请求且有来源支持，绝不要擦除全片 flash、写 option bytes/fuses、锁定器件或修改安全设置。

## Debug 脚本

当 GDB server 或探针工作流已知时生成。

- 适用时提供一个启动 server 的命令。
- 提供一个用 ELF 文件启动 GDB 的命令。
- 仅当对目标安全时，包含 reset/halt/load 命令。
- 将 probe serial number、port 和 speed 保持为可配置变量。

## 用户说明

告诉用户：

- 如何构建。
- 会生成哪些二进制文件。
- 如支持，如何烧录。
- 如支持，如何启动调试会话。
- 如果跳过脚本，说明缺少哪些工具。
