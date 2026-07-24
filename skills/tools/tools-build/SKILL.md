---
name: tools-build
description: 负责嵌入式工程配置、编译、构建产物定位和构建错误诊断；当用户提到 CMake、Keil、IAR、ESP-IDF、PlatformIO 构建时使用。
---

# 构建工具

## 职责

统一处理工程配置、编译命令、工具链选择、构建产物和可复现构建。先识别工程格式和目标工具链，再读取对应 reference。

## 变体

- CMake：读取 [`tool-build-cmake`](references/tool-build-cmake/GUIDE.md)。
- ESP-IDF：读取 [`tool-build-esp-idf`](references/tool-build-esp-idf/GUIDE.md)。
- IAR：读取 [`tool-build-iar`](references/tool-build-iar/GUIDE.md)。
- Keil：读取 [`tool-build-keil`](references/tool-build-keil/GUIDE.md)。
- PlatformIO：读取 [`tool-build-platformio`](references/tool-build-platformio/GUIDE.md)。

CMake 和 ESP-IDF 的源码版本、路径及工程证据见 [`source-baseline.md`](references/source-baseline.md)。
所有构建变体的完整流程、脚本和参考资料汇总在 [`capability-index.md`](references/capability-index.md)。

## 输出

给出构建前置条件、实际命令、产物路径、首个根因和可复现验证步骤。不要把烧录、在线调试或 OTA 逻辑混入构建流程。
