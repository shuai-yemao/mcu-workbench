# Claude 分层管理

`workflow-claude-layering` 为目标固件工程在创建起始阶段设计并维护通用根 `Claude.md`、通用五层规则，以及项目根及架构目录
`README.md` 的受管区块，以及 `.mcu-workbench/rules/mcu-workbench/` 中的路径规则。
它不接管项目自定义规则，也不会在未使用 `--write` 时修改目标工程。

```powershell
node scripts/claude-layer-api.js design --root D:\firmware
node scripts/claude-layer-api.js bootstrap --root D:\firmware --write --rules-confirmed
node scripts/claude-layer-api.js scan --root D:\firmware
node scripts/claude-layer-api.js init --root D:\firmware
node scripts/claude-layer-api.js init --root D:\firmware --write
node scripts/claude-layer-api.js sync --root D:\firmware --write
node scripts/claude-layer-api.js validate --root D:\firmware --strict
```

新工程必须先执行 `design`，确认 `mcu-workbench-five-layer-v1`、依赖方向
`App → Service → Platform ← Impl → Vendor`、README 范围和排除项；随后以
`bootstrap --rules-confirmed --write` 作为创建工程的第一阶段。规则未确认时，bootstrap 返回
`RULES_NOT_CONFIRMED` 且不写入任何 Claude 文件。Claude 文件和五层规则保持通用；工程骨架生成后运行 `sync --write`，只更新 README、架构报告和状态快照。

`design` 是只读动作；`bootstrap` 的 `--write` 是唯一的创建起始写入门禁。已有工程仍使用
`init`/`sync`，其写入行为保持显式 `--write`。

扫描默认识别 App、Service、Platform、Impl、Vendor（兼容旧式 App/BSP/Core/Driver/Middlewares/OS 目录），
并使用 CMake、CubeMX、FreeRTOS 配置以及 C/C++ include 作为静态证据。Vendor 底座（HAL/CMSIS/FreeRTOS/LVGL 等）
归入 vendor 层，并生成通用 `50-vendor.md` 规则；旧 `claude-layer.json` 的 layout 旧键（middleware/os/bsp/core/driver）
读取时自动归一化到五层键。无法确认的路径保留为 `unverified`；默认只告警，`--strict` 时校验失败。

README 管理默认覆盖项目根，以及存在的 `00_Config`、`00_Docs`、`01_App`、`02_Service`、`03_Platform`、
`04_Impl`、`05_Vendor`、`06_Toolchain`、`99_Utils` 目录及其两级子目录；`00_文档`、`build` 不纳入范围。
Claude 文件和五层规则只包含通用架构约束；项目构建、芯片、RTOS、目录和 include 证据写入架构报告、状态快照和 README。

生成区块采用“解释优先、索引辅助”格式：说明目录用途、架构位置、Mermaid 依赖关系、职责边界、
目录内容、直接文件逐项说明、阅读顺序、修改约束和验证方式；工程根、架构层、模块、`inc`、`src`、Vendor 目录按类型生成不同解释重点。直接文件说明优先读取源码头部 `@brief`/`@file`、include 和可识别符号；没有源码证据时标记为文件名/目录结构推断。配置、规则、状态和架构报告统一归档到 `.mcu-workbench/` 下。
已有 README 只追加或更新 `mcu-workbench:readme-managed` 区块，手写内容保留。可在
`.mcu-workbench/claude-layer.json` 中调整 `readme.roots`、`readme.maxDepth` 和 `readme.excludeDirectories`。

CI 应只运行 `validate`，不能调用带 `--write` 的命令。静态规则校验与固件构建、
烧录和实机验证是不同证据等级。
