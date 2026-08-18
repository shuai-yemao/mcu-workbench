# MCU-Workbench

[![CI](https://github.com/shuai-yemao/mcu-workbench/actions/workflows/ci.yml/badge.svg)](https://github.com/shuai-yemao/mcu-workbench/actions/workflows/ci.yml)

面向 STM32、GR5526、ESP32 和 Cortex-M 的嵌入式开发插件。

## 插件结构

```text
skills/
├─ workflow/       # 路由、项目集成和协作流程
├─ app/            # 嵌入式 APP 软件架构
├─ platform/       # Platform 公共能力契约
├─ impl/           # OS、Board、BSP 与 Middleware 适配实现
├─ service/        # 业务服务
├─ vendor/         # Vendor 底座知识、路由和内容契约
├─ hardware/       # PCB、仪器和硬件分析
└─ tools/          # 构建、烧录、链接、调试、观测、代码质量、项目验证、发布
```

## Canonical skills

当前目录为 **50 catalog / 48 canonical**；下列为当前入口（旧名只经兼容映射解析）：

```text
workflow-requirements-router workflow-requirements-challenge workflow-review-gate workflow-integration-plan workflow-task-breakdown workflow-task-execution workflow-final-review workflow-claude-layering
app-architecture
platform_mcu platform_os platform_bsp platform_common platform_middleware
impl_os impl_board impl_bsp impl_middleware
vendor_mcu vendor_rtos vendor_lvgl vendor_stack vendor_fatfs vendor_fal
vendor_flashdb vendor_letter_shell vendor_algorithm
service_system service_battery service_backlight service_calendar service_diagnosis
service_log service_ota service_power service_sensor service_storage service_watchdog
tools-build tools-flash tools-linker tools-debug tools-observability
tools-quality tools-verification tools-git tools-release tools-learning-tutor
```

`vendor_stm32` 和 `vendor_dsp` 保留为兼容别名，分别解析到 `vendor_mcu` 和 `vendor_algorithm`。目标工程的 Vendor 物理目录统一为 `05_Vendor/`：MCU/RTOS 完整保留，中间件/算法按需保留，并由目标工程 Git 管理整个目录。Service、App 和 Platform 公共头只能经 Platform/Impl 访问 Vendor。

## 工具方向

`skills/tools/` 按用途保留 10 个主入口。`tools-quality` 是唯一代码质量检查入口；`tools-verification` 负责 Map/内存/栈、Unity/Fake 和项目级验证。旧工具入口已移除，其旧调用名仍可解析到新的 `tools-*` 入口；项目学习与笔记生成由 `tools-learning-tutor` 负责。

旧 Skill 的能力流程、脚本和资源已内化到对应 canonical Skill 的 active `references/capabilities/`，每个目标入口通过 `references/capability-index.md` 按需读取。

硬件方向本轮不重构，仍保留在 `skills/hardware/`。

完整迁移关系以 `skills/catalog.js` 中的 `MIGRATION_MAP` 为准。

## 验证

```powershell
npm test -- --runInBand
npm run validate:plugin
claude plugin validate .
```

## Agent 团队

插件根目录 `agents/` 提供 7 个可显式调用的嵌入式开发角色：Lead、架构、固件、硬件集成、工具链、验证和知识工程。使用 `@mcu-workbench:<agent-name>` 调用。每个 agent 声明稳定的 `domain` 与 `scope`，不手写技能清单——技能集由 `lib/agent-domains.js` 领域注册表从 `skills/catalog.js` 自动派生，插件技能目录更新后 agent 自动获得新能力，不因版本更新退化。稳定运行记录由 `scripts/agent-artifacts.js` 写入 `.mcu-workbench/`。

Workflow 层有八个 active 入口：`workflow-requirements-router` 负责需求约束和路由，`workflow-requirements-challenge` 负责 RCP 澄清、需求目的与可行性质疑，不负责方案选择，`workflow-review-gate` 负责代码前审查与放行/阻塞门禁（在 Review-Package 内保留四个审查清单章节，不单独输出到实际工程，并在放行后整合生成下游正式输入 `spec.md`），`workflow-integration-plan` 负责读取 `spec.md` 和项目文件生成两个实施方案，用户选择后审查并输出带阶段级 Agent/Skill 基线的 `plan.md`，`workflow-task-breakdown` 负责把 `plan.md` 拆解为有顺序、可独立验证且带任务级分配的 `task.md`，`workflow-task-execution` 负责按依赖每次只执行一项任务，复核并记录 Agent/Skill 分配，先补测试再实现、检查并回写状态，之后才进入实现层，`workflow-claude-layering` 负责目标工程 Claude 分层规则的扫描、同步与校验，`workflow-final-review` 负责最终代码、补丁或 diff 的独立 Review 编排（输出前最后一层门禁）。旧的 `workflow-router` 仅作为兼容别名解析。

### 需求约束入口

`workflow-requirements-router` 是插件处理输入需求的第一个 Skill。它先按需求分配 `embedded-lead` 与一个或多个领域 Agent，再读取项目文件、构建配置和日志；无法由证据确认的内容才向用户补问。Router 输出可审计的初步需求约束包（RCP）后，固定交接给 `workflow-requirements-challenge`，由其先补齐 RCP 并质疑需求目的与工程可行性；完成质疑结论的更新 RCP 再交给 `workflow-review-gate`（必经审查门禁）完成反猜测审查和放行/阻塞判定；放行后由 `workflow-integration-plan` 生成并审查 `plan.md`，再由 `workflow-task-breakdown` 生成 `task.md`，交给 `workflow-task-execution` 按依赖逐项执行，最后分发实现层。

RCP 会区分 `confirmed`、`user-confirmed`、`inferred` 和 `unverified`，同时携带证据位置、责任边界与验证边界；`workflow-review-gate` 发现新约束时必须回传 Router 更新 RCP，不能静默扩大范围。

### 稳定产物

项目任务可以初始化统一的项目状态和运行记录：

```powershell
npm run agent:artifacts -- init --project . --project-id gr5526-lvgl --mcu GR5526 --toolchain Keil
npm run agent:artifacts -- record --project . --agent embedded-lead --task "project handoff" --status completed
```

产物目录约定如下：

```text
.mcu-workbench/
├─ project.json
└─ runs/<timestamp>-<agent>-<task>.json

目标工程 docs/
├─ architecture/   # 架构和调用链
├─ verification/   # 构建、测试、硬件和质量证据
├─ devlog/         # 开发日志
└─ notes/          # 学习与知识笔记
```

Agent 遵循分域写入和显式交接协议；Lead 维护最终汇总，写入 Obsidian 必须经过用户确认。

## 脚本与 Programmatic API

仓库不提供 Node CLI 命令(已移除——交互统一走 Skill + lib API),保留两类确定性脚本入口:

```powershell
# 分层扫描/同步/校验(供 workflow-claude-layering skill 与人工使用)
npm run claude:init -- --root <dir> --write
npm run claude:scan -- --root <dir>
npm run claude:sync -- --root <dir> --write
npm run claude:validate -- --root <dir> --strict

```

分层生成和闪存算法配置还可以单独校验：

```powershell
npm run validate:layer
npm run validate:flash-algorithm
```

## OpenCode 适配

仓库提供 OpenCode 插件入口 `opencode.mjs`，通过 `@opencode-ai/plugin` 暴露 30 个 canonical Skill 工具和首阶段需求约束路由工具。

### 本地安装

```powershell
opencode plugin C:\Users\zhang\.claude\plugins\marketplaces\mcu-workbench
```

安装后 `C:\Users\zhang\.opencode\opencode.json` 会新增 plugin 路径。重启 OpenCode 后，可用以下工具：

- `mcu_workbench_requirements_router`：分配 Agent、补齐需求约束并生成下游 Skill 的 RCP（`mcu_workbench_route` 保留兼容）
- `mcu_workbench_<skill_id>`：读取对应 SKILL.md 的内容摘要

### 示例

```text
调用 mcu_workbench_requirements_router，请求 "STM32 HAL GPIO 初始化"
```

```text
调用 mcu_workbench_core_mcu，question "Cortex-M4 中断优先级分组"
```

## Codex 适配

本仓库同时提供 `.codex-plugin/plugin.json`，与 Claude Code 共用 `skills/` 和 catalog。Codex 适配入口为 `.codex-plugin/plugin.json`，同步和校验使用 `scripts/sync-codex-skills.js` 与 `scripts/validate-plugin.js`。

安装启用后可在 Codex Composer 中使用 `@mcu-workbench` 快捷触发插件。

### Codex 本地开发模式

本地开发模式以当前仓库为插件源，通过本地 Marketplace 和官方插件安装命令更新 Codex；不会直接覆盖 `.codex/plugins/cache`：

```powershell
npm run codex:dev
npm run codex:dev:install
npm run codex:dev:check -- --json
npm run codex:dev:watch
```

`codex:dev` 只校验并注册本地 Marketplace；`codex:dev:install` 为 Codex manifest 添加一次本地开发缓存后缀，然后执行 `codex plugin add mcu-workbench@mcu-workbench-local`；`codex:dev:watch` 监听 `agents/`、`codex/`、`skills/` 和根级插件文件，变更后自动重复该流程。若系统中的 `codex` CLI 不在默认 PATH，可通过 `CODEX_BIN` 或 `--codex-bin` 指定路径。安装完成后请新建 Codex 对话。

检查本地 Marketplace 源与 Codex 受管缓存是否一致：

```powershell
npm run plugin:check-refresh
npm run plugin:check-refresh -- --json --strict
```

检查器只读比较插件版本和关键内容；发现差异时输出 `Marketplace → Refresh`，必要时重启 Codex，不直接删除或覆盖 `.codex/plugins/cache`。可以将该命令接入 Windows 任务计划程序，作为后台检测入口。

## 开发与发布检查

```powershell
npm test -- --runInBand
npm run validate:plugin
npm run validate:links
npm run validate:flash-algorithm
claude plugin validate .
git diff --check
```

插件根目录的 `agents/` 由 Claude Code 自动发现；不在 `plugin.json` 中添加 `agents` 字段，也不默认启用 hooks、MCP 或主 Agent。插件边界和执行流以对应的 canonical Skill、`codex/AGENTS.md` 及宿主 manifest 为准。
