---
name: workflow-claude-layering
description: 当用户要为嵌入式固件工程在创建起始阶段设计/引导，或后续初始化、扫描、更新、审计、校验 Claude Code 多文件规则（Claude.md、.claude/rules、README、规则漂移、分层上下文）时使用。存量工程先扫描真实证据；新工程先设计并确认规则，再生成 Claude 文件。
---

# Claude 分层管理工作流

## 职责

为目标固件工程维护受管的 Claude 上下文：创建阶段生成通用根 `Claude.md` 和五层规则，项目根和架构目录生成
`README.md` 解释型受管区块，并将项目实际证据保存到分层扫描快照和架构报告。

本 Skill 编排规则设计、创建起始引导、扫描、预览、同步和校验；不替代
`workflow-review-gate` / `workflow-integration-plan` 进行产品架构审查，不生成固件业务代码，
也不把静态检查描述为目标板验证。

## 触发与输入

使用 `node scripts/claude-layer-api.js <action> --root <firmware-root>`（插件根目录下执行，经
`lib/claude-layer.js` Programmatic API；无 Node CLI），其中 action 为：

- `design`：只读输出规则 profile、依赖方向、Claude 文件清单、README 范围和创建顺序；新工程必须先执行。
- `bootstrap`：项目创建起始阶段的写入入口；没有规则确认时返回 `RULES_NOT_CONFIRMED`，只有追加
  `--rules-confirmed --write` 才能生成通用根 `Claude.md`、通用五层规则、配置/状态文件和 README。
- `scan`：只读扫描目录、README 范围、CMake、CubeMX、FreeRTOS 和 C/C++ include 证据。
- `init`：建立首次配置与受管产物计划，包括项目根和配置范围内的 README。
- `sync`：依据已有配置重新扫描并更新 README、架构报告和状态快照；不把项目事实写回通用 Claude 文件和五层规则。
- `validate`：检查扫描快照、README 缺失/漂移、受管文件和现有架构契约。

`design`、`scan` 和没有 `--write` 的动作不写目标工程。`init` 与 `sync` 默认只显示计划。
只有规则已确认且用户明确要求写入时，`bootstrap` 才追加 `--rules-confirmed --write`；普通存量工程的
`init`/`sync` 仍只在用户明确要求时追加 `--write`。
`--strict` 把 `unverified` 路径从告警提升为错误。

统一管理根目录为 `.mcu-workbench/`：配置、状态、架构扫描报告和通用规则均放在此目录下。
配置位于 `.mcu-workbench/claude-layer.json`（旧版 `claude-layering.json` 自动读取兼容）。
`layout` 可为 `app`、`service`、`platform`、`impl`、`vendor` 指定正则表达式数组，覆盖默认目录识别；
旧键（`middleware`、`os`、`bsp`、`core`、`driver`）读取时自动归一化（middleware→vendor、os→impl、bsp→impl、core→platform、driver→impl）并输出迁移告警。
`readme` 可配置 `enabled`、`roots`、`maxDepth` 和 `excludeDirectories`；默认按工程五层目录约定管理
`00_Config`、`00_Docs`、`01_App`、`02_Service`、`03_Platform`、`04_Impl`、`05_Vendor`、
`06_Toolchain`、`99_Utils`，最大深度为 2，并排除 `00_文档`、`build`。项目根 `README.md` 始终纳入管理。

## 受管文件边界

| 文件 | 所有权 | 规则 |
|---|---|---|
| `Claude.md` | 共享 | 仅更新 `mcu-workbench:managed` 标记区块；保留其他手写内容。 |
| 项目根及 `readme.roots` 范围内目录的 `README.md` | 共享 | 仅更新 `mcu-workbench:readme-managed` 标记区块；缺失文件仅在 `--write` 时创建；保留其他手写内容。 |
| `.mcu-workbench/rules/mcu-workbench/` | 本 Skill | 生成通用五层规则；使用 profile 的标准层路径，不写入项目扫描证据。 |
| `.claude/rules/` 的其他文件 | 用户/项目 | 不读取后重写，不删除。 |
| `.mcu-workbench/claude-layer*.json` | 本 Skill | `architecture.profile` 与 `rulesConfirmed` 记录创建前规则决策，state 由扫描器生成；旧版 `claude-layering*.json` 只读兼容；旧 layout 键（middleware/os/bsp/core/driver）读取时自动归一化到五层键。 |
| `.mcu-workbench/architecture/claude-layer-map.md` | 本 Skill | 记录静态扫描事实与未确认项。 |

从旧版本迁移时，`sync --write` 只删除旧 `.claude/rules/mcu-workbench/` 下的插件受管规则和旧
`docs/architecture/claude-layer-map.md`；不会删除 `.claude/rules/` 的其他规则或 `docs/architecture/` 的其他文档。

若工程已有 `AGENTS.md`，受管区块引用 `@AGENTS.md`，不复制其内容。

## 工作流

### 新工程创建链

```text
design（只读规则方案）
  → 用户确认 profile/依赖方向/目录范围/排除项
  → bootstrap --rules-confirmed --write（创建起始阶段，必须先于业务骨架）
  → 生成项目目录、源码和构建配置
  → sync --write（更新 README、架构报告和状态快照，不改写通用规则）
  → validate / validate --strict
```

`bootstrap` 生成的 Claude 文件和五层规则必须是通用模板，不得把当前项目专属的目录、源码、include、芯片和 RTOS
写入规则。项目骨架完成后 `sync` 才能建立实际目录和 include 快照，但快照只进入
`.mcu-workbench/architecture/claude-layer-map.md`、状态和 README。

README 采用“解释优先、索引辅助”的输出模板。受管区块必须包含：

- `这是什么`：用通俗语言说明目录解决什么问题；
- `在系统中的位置`：用 Mermaid 展示当前目录与 App/Service/Platform/Impl/Vendor 的关系；
- `主要职责` 和 `依赖边界`：说明允许依赖与禁止越层；
- `目录内容`：自动列出子目录明细，以及当前目录每个直接文件的文件类型、作用说明、关键接口/宏/类型、直接 include 和证据来源；
- `阅读顺序`：告诉读者应先看接口、配置、实现还是下级 README；
- `修改与验证`：说明修改前应确认的接口、所有权、生命周期、ISR/DMA/并发约束和验证入口。

工程根、架构层、模块、`inc`、`src` 和 Vendor 目录使用不同的解释重点；不能用同一段空泛文本
覆盖所有目录。自动内容优先读取源码头部的 `@brief`/`@file`、直接 include 和可识别符号；缺少源码注释时，
只能给出带“文件名/目录结构推断”标记的低置信度说明，不猜测业务职责、硬件资源、负责人、版本或许可证。
当前 README 管理范围外的子目录必须标记为“未纳入当前 README 管理范围”，不能暗示会自动生成 README。
Mermaid 只辅助理解，不能替代源码和配置证据。

### 存量工程接入链

1. 执行 `scan`，报告 `confirmed` 目录、README 管理范围、配置和源码引用证据，以及 `unverified` 路径。
2. 对首次接入执行 `init` 预览；检查根文件保留内容、规则目录和配置覆盖是否正确。
3. 在用户确认差异后运行 `init --write` 或 `sync --write`。
4. 运行 `validate`；它必须同时报告 README 缺失/受管区块漂移、规则漂移、架构静态错误、未确认项，以及旧 layout 键的迁移提示（如有）。
5. 仅在配置确认后使用 `validate --strict` 作为 CI 门禁。CI 不调用 `--write`。

## 分层硬约束

- 依赖铁律：App → Service → Platform ← Impl → Vendor。
- App 只调用 Service；不得直接 include HAL、Platform 实现、Impl、Vendor 或原生 RTOS。
- Service 依赖 Platform 接口与其他 Service；不得 include Vendor 头文件、寄存器/HAL。
- Platform 定义能力契约，允许无芯片/RTOS/厂商依赖的公共实现；禁止 HAL/RTOS/芯片符号，绑硬件/OS 的实现必须在 Impl。
- Impl 落地 Platform→Vendor 适配（board/mcu/os/bsp + Handler 机制）；不得反向定义接口、不得被 App 直调、不得含业务策略。
- Vendor 是第三方底座（HAL/CMSIS/FreeRTOS/LVGL/FatFS/算法库/SDK），源码不复制、只登记映射（vendor_mapping.md + patch/）；不反向调用任何上层。

发现层归属冲突或需要变更依赖图时，交接 `workflow-review-gate`；
需要实施代码改动时交接 `workflow-final-review`；质量检查交接 `tools-quality`。

## 输出格式

每次输出包含：

```text
Action: design | bootstrap | scan | init | sync | validate
Firmware root: <absolute path>
Rule decision: <profile, confirmation status, dependency direction, creation order>
Confirmed evidence: <config and relative/path:line items>
README scope: <project root, configured roots, maxDepth, exclusions, missing README paths>
Unverified: <paths or none>
Planned changes: <create/modify list; bootstrap/init/sync only>
Writes: <absolute paths; only with --write>
Validation: <static findings, warnings, exit code>
Evidence boundary: static scan only; build/board proof is separate
Next handoff: <if needed>
```

## 验证边界

`validate` 仅验证配置、受管 Claude 文件、目录/源码静态证据和现有架构规则。
它不证明编译、烧录、RTT、串口或实机功能；这些必须通过对应工具链和板级证据单独确认。
