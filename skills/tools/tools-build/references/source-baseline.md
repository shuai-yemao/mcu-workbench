# 构建工具源码基线

## CMake

- 仓库：[Kitware/CMake](https://github.com/Kitware/CMake)
- 分支：`master`
- 复核 commit：`42da7a30a907268206aad97f598fec6152aec1ee`
- 关注：`Source/`、`Modules/`、`Tests/`、`Templates/`

项目 reference 应优先解释 Toolchain、Preset、Generator、Cache、Target、CTest 和构建产物，不复制 CMake 源码。

## ESP-IDF

- 仓库：[espressif/esp-idf](https://github.com/espressif/esp-idf)
- 分支：`master`
- 复核 commit：`055ba9d3f9c6fd9a0efacd4993a2a942972dd65d`
- 关注：`components/`、`tools/`、`examples/`、目标配置和 Kconfig

构建前必须记录 ESP-IDF 版本、目标芯片、环境激活结果、`sdkconfig`、构建目录和 ELF/BIN/MAP 产物。`idf.py` 的配置、编译和烧录仍要与 `tools-flash` 分界。

## 项目证据

插件的 `commands/mcu-new.js` 生成 CMake 骨架，但不等同于完整交叉编译工程；实际工程必须补齐 compiler、linker script、startup、vendor sources 和 target definitions。
