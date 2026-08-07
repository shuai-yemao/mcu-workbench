# MCU-Workbench

[![CI](https://github.com/shuai-yemao/mcu-workbench/actions/workflows/ci.yml/badge.svg)](https://github.com/shuai-yemao/mcu-workbench/actions/workflows/ci.yml)

面向 STM32、GR5526、ESP32 和 Cortex-M 的嵌入式开发插件。

## 插件结构

```text
skills/
├─ workflow/       # 路由、项目集成和协作流程
├─ app/            # 嵌入式 APP 软件架构
├─ os/             # OS Wrapper、Port 与 Runtime
├─ bsp/            # BSP Wrapper、Port、HAL Driver、Handler
├─ core/ mcu/      # Core 公共 MCU 能力与厂商平台实现
├─ middleware/     # LVGL、通信、存储、算法
├─ system/         # 跨层系统能力
├─ hardware/       # PCB、仪器和硬件分析
└─ tools/          # 构建、烧录、链接、调试、观测、质量、发布

archive/
├─ software-legacy/ # 旧软件架构入口
├─ tools-legacy/    # 旧工具入口
└─ workflows-legacy/ # 旧工作流实现
```

## Canonical skills

当前目录为 **109 catalog / 31 canonical**；下列为当前入口（旧名只经兼容映射解析）：

```text
workflow-requirements-router workflow-review-gate workflow-integration-plan workflow-final-review workflow-claude-layering
app-architecture
os-adapter os-runtime
bsp-wrapper bsp-port bsp-hal-driver bsp-handler
core-mcu vendor_stm32
middleware-lvgl middleware-communication middleware-storage middleware-fal
middleware-flashdb middleware-letter-shell middleware-algorithms
software-system
tools-build tools-flash tools-linker tools-debug
tools-observability tools-quality tools-git tools-release tools-learning-tutor
```

Adapter 只存在于 OS 和 BSP；Core、Middleware、Driver 不设置 Adapter。

## 工具方向

`skills/tools/` 按用途保留 9 个主入口。原 29 个工具目录及全部 references、scripts、assets 已归档到 `archive/tools-legacy/`；项目学习与笔记生成由 `tools-learning-tutor` 负责，旧调用名仍可解析到新的 `tools-*` 入口。

归档能力并未只保留名称兼容：80 份旧 Skill 的详细流程、脚本和资源已转移到对应 canonical Skill 的 active `references/capabilities/`，每个目标入口通过 `references/capability-index.md` 按需读取。可用 `npm run migrate:capabilities` 校验完整性。

硬件方向本轮不重构，仍保留在 `skills/hardware/`。

完整迁移关系见 [docs/skills-migration.md](docs/skills-migration.md)。

## 验证

```powershell
npm test -- --runInBand
npm run validate:plugin
claude plugin validate .
```

## Agent 团队

插件根目录 `agents/` 提供 7 个可显式调用的嵌入式开发角色：Lead、架构、固件、硬件集成、工具链、验证和知识工程。使用 `@mcu-workbench:<agent-name>` 调用。每个 agent 声明稳定的 `domain` 与 `scope`，不手写技能清单——技能集由 `lib/agent-domains.js` 领域注册表从 `skills/catalog.js` 自动派生，插件技能目录更新后 agent 自动获得新能力，不因版本更新退化。稳定运行记录由 `scripts/agent-artifacts.js` 写入 `.mcu-workbench/`。详细职责、写入边界和交接协议见 [docs/agents.md](docs/agents.md)。

Workflow 层有五个 active 入口：`workflow-requirements-router` 负责需求约束和路由，`workflow-review-gate` 负责代码前审查与放行/阻塞门禁（必选产出四张审查清单并重组为 BRD/PRD/SRSys），`workflow-integration-plan` 负责跨层规划与实现层分发，`workflow-claude-layering` 负责目标工程 Claude 分层规则的扫描、同步与校验，`workflow-final-review` 负责最终代码、补丁或 diff 的独立 Review 编排（输出前最后一层门禁）。旧的 `workflow-router` 仅作为兼容别名解析，`embedded-ai-collab` 已归档到 `archive/workflows-legacy/`；持续扩展规则见 [docs/workflows.md](docs/workflows.md)。

### 需求约束入口

`workflow-requirements-router` 是插件处理输入需求的第一个 Skill。它先按需求分配 `embedded-lead` 与一个或多个领域 Agent，再读取项目文件、构建配置和日志；无法由证据确认的内容才向用户补问。最终输出可审计的需求约束包（RCP），覆盖项目背景、硬件资源、软件环境、FreeRTOS 任务与队列、分层边界、功能/非功能需求、优先级、依赖关系、验收标准和人工确认项，并将唯一正式输入（RCP）固定交接给 `workflow-review-gate`（必经审查门禁），由其完成反猜测审查与放行/阻塞判定；放行后由 `workflow-integration-plan` 完成分层/审计/迁移设计并分发实现层。

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

docs/
├─ architecture/   # 架构和调用链
├─ verification/   # 构建、测试、硬件和质量证据
├─ devlog/         # 开发日志
└─ notes/          # 学习与知识笔记
```

Agent 遵循分域写入和显式交接协议；Lead 维护最终汇总，写入 Obsidian 必须经过用户确认。

## Node CLI

仓库同时提供正式的 `mcu-workbench` CLI，用于项目骨架、Core/BSP 分层模板、平台查询和构建/烧录命令计划：

```powershell
npm run cli -- --help
npm run cli -- platforms
npm run cli -- core --peripheral i2c --platform stm32f4
npm run cli -- driver --device-type display --device SSD1306 --core i2c --platform stm32f4
npm run cli -- build --platform stm32f4
npm run cli -- flash --platform stm32f4 --device stlink
```

构建和烧录默认只生成命令；确认路径和工具链后显式追加 `--execute` 才会运行外部命令。`driver` 默认 dry-run，追加 `--write --output <dir>` 才会写入生成文件。完整用法见 [docs/node-cli.md](docs/node-cli.md)。

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

本仓库同时提供 `.codex-plugin/plugin.json`，与 Claude Code 共用 `skills/` 和 catalog。Codex 适配说明、canonical Skill 同步和校验命令见 [docs/codex-adaptation.md](docs/codex-adaptation.md)。

安装启用后可在 Codex Composer 中使用 `@mcu-workbench` 快捷触发插件。

## 开发与发布检查

```powershell
npm test -- --runInBand
npm run validate:plugin
npm run validate:links
npm run validate:flash-algorithm
claude plugin validate .
git diff --check
```

插件根目录的 `agents/` 由 Claude Code 自动发现；不在 `plugin.json` 中添加 `agents` 字段，也不默认启用 hooks、MCP 或主 Agent。插件边界见 [docs/plugin-boundaries.md](docs/plugin-boundaries.md)，整体执行流见 [docs/plugin-execution-flow.md](docs/plugin-execution-flow.md)。
