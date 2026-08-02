# MCU-Workbench

面向 STM32、GR5526、ESP32 和 Cortex-M 的嵌入式开发插件。

## 插件结构

```text
skills/
├─ workflow/       # 路由、项目集成、APP 架构
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

当前目录为 **107 catalog / 25 canonical**；下列为当前入口（旧名只经兼容映射解析）：

```text
workflow-router workflow-project-integration app-architecture
os-adapter os-runtime
bsp-wrapper bsp-port bsp-hal-driver bsp-handler
core-mcu mcu-platform
middleware-lvgl middleware-communication middleware-storage middleware-algorithms
software-system
tools-build tools-flash tools-linker tools-debug
tools-observability tools-quality tools-release tools-learning-tutor
```

Adapter 只存在于 OS 和 BSP；Core、Middleware、Driver 不设置 Adapter。

## 工具方向

`skills/tools/` 按用途保留 8 个主入口。原 29 个工具目录及全部 references、scripts、assets 已归档到 `archive/tools-legacy/`；项目学习与笔记生成由 `tools-learning-tutor` 负责，旧调用名仍可解析到新的 `tools-*` 入口。

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

插件根目录 `agents/` 提供 7 个可显式调用的嵌入式开发角色：Lead、架构、固件、硬件集成、工具链、验证和知识工程。使用 `@mcu-workbench:<agent-name>` 调用，稳定运行记录由 `scripts/agent-artifacts.js` 写入 `.mcu-workbench/`。详细职责、写入边界和交接协议见 [docs/agents.md](docs/agents.md)。

工作流只保留 `workflow-router` 和 `workflow-project-integration` 两个 active 入口；旧的 `embedded-ai-collab` 已归档。持续扩展规则见 [docs/workflows.md](docs/workflows.md)。

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

仓库同时提供正式的 `mcu-workbench` CLI，用于项目骨架、BSP 模板、平台查询和构建/烧录命令计划：

```powershell
npm run cli -- --help
npm run cli -- platforms
npm run cli -- build --target stm32f4
```

构建和烧录默认只生成命令；确认路径和工具链后显式追加 `--execute` 才会运行外部命令。完整用法见 [docs/node-cli.md](docs/node-cli.md)。

## OpenCode 适配

本分支新增 OpenCode 插件入口 `opencode.mjs`，通过 `@opencode-ai/plugin` 暴露 25 个 canonical skill 工具和一个路由工具。

### 本地安装

```powershell
opencode plugin C:\Users\zhang\.claude\plugins\marketplaces\mcu-workbench
```

安装后 `C:\Users\zhang\.opencode\opencode.json` 会新增 plugin 路径。重启 OpenCode 后，可用以下工具：

- `mcu_workbench_route`：根据请求推荐最合适的 skill
- `mcu_workbench_<skill_id>`：读取对应 SKILL.md 的内容摘要

### 示例

```text
调用 mcu_workbench_route，请求 "STM32 HAL GPIO 初始化"
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
claude plugin validate .
git diff --check
```

插件根目录的 `agents/` 由 Claude Code 自动发现；不在 `plugin.json` 中添加 `agents` 字段，也不默认启用 hooks、MCP 或主 Agent。插件边界见 [docs/plugin-boundaries.md](docs/plugin-boundaries.md)，整体执行流见 [docs/plugin-execution-flow.md](docs/plugin-execution-flow.md)。
