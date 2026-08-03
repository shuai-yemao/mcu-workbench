# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目定位

本仓库是 **mcu-workbench** — 面向 STM32、GR5526、ESP32 和 Cortex-M 的嵌入式开发 Skills 包与插件，作为 Claude Code / OpenCode / Codex 三宿主适配源，并附带宿主边界兼容桥。

- **GitHub**: `https://github.com/shuai-yemao/mcu-workbench`
- **当前分支**: `host_ai`（三宿主适配 + Codex 宿主边界兼容桥）

> ECC 插件（81 agents, 379 skills, 18 workflows）来自 `~/.claude/plugins/`，**不属于本仓库**。本仓库管理的技能位于 `skills/` 目录。

## 项目组成

| 部分 | 路径 | 说明 |
|------|------|------|
| **Canonical Skills** | `skills/` | 107 catalog / 25 canonical；当前入口含 os-adapter、os-runtime、bsp-wrapper、bsp-port、core-mcu、mcu-platform |
| **Agent 团队** | `agents/` | 7 个嵌入式开发角色，附带 `AGENTS.override.md` 作为 Codex 兼容桥 |
| **文档站点** | `docs/` | VitePress — 架构、验证、迁移、安全层文档 |
| **Node CLI** | `bin/` + `lib/` | 项目骨架生成、构建/烧录命令计划 |
| **验证脚本** | `scripts/` | 架构校验、分层契约、技能链接、BSP 契约、能力迁移 |
| **测试套件** | `tests/` | 29 个 Jest 测试文件，覆盖所有 canonical skills、架构验证、CLI |
| **Claude 插件** | `.claude-plugin/plugin.json` | Claude Code 插件清单 |
| **OpenCode 适配** | `opencode.mjs` | OpenCode 插件入口，暴露 25 个 `mcu_workbench_<skill_id>` 工具 |
| **Codex 适配** | `.codex-plugin/plugin.json` + `codex/AGENTS.md` | Codex CLI 插件 + 宿主运行约束 |
| **Codex 兼容桥** | `AGENTS.override.md` | 从 `codex/AGENTS.md` 自动生成的兼容入口 |
| **归档** | `archive/software-legacy/ tools-legacy/ workflows-legacy/` | 旧版技能与工作流，能力已转移至 canonical skills |
| **Safety Layer** | `docs/safety-layer-architecture.md` | 四层 Agent 系统的安全层设计 |

## 常用命令

```bash
# 文档站点
npm run docs:dev          # VitePress 开发服务器
npm run docs:build        # 构建静态站点
npm run docs:preview      # 预览构建结果

# 验证
npm run validate:plugin         # 插件清单完整性校验
npm run validate:architecture   # 架构契约校验（BSP 分层合规）
npm run validate:layer          # 分层契约专项验证
npm run validate:links          # SKILL.md 跨文件链接检查
npm run migrate:capabilities    # 检查 80 份归档能力转移完整性
node scripts/materialize-skill-capabilities.js --write   # 首次转移或补齐
npm run build:codex-compat      # 生成 Codex 兼容桥（AGENTS.override.md）

# 测试
npm test -- --runInBand         # 运行全部 29 个测试文件

# CI / Codex
npm run sync:codex              # 同步技能到 Codex 目录
npm run codex:register          # 注册 Codex 市场
node scripts/report-skills.js   # 技能清单报告

# Agent 产物管理
npm run agent:artifacts -- init --project . --project-id <id> --mcu <mcu>
npm run agent:artifacts -- record --project . --agent <agent> --task "<task>" --status completed

# Node CLI
npm run cli -- --help
npm run cli -- platforms
npm run cli -- build --target stm32f4
# 默认只生成命令计划；追加 --execute 才会运行外部命令
```

## 架构概览

### 执行流程

```
用户请求 → workflow-router（分诊）
         → workflow-project-integration（项目审计、分层、迁移路线）
         → embedded-lead Agent（团队编排）
         → 专业 Agent 执行
         → verification-engineer（验证）
```

详情见 `docs/plugin-execution-flow.md` 和 `docs/workflows.md`。

### 分层架构

```
├─ workflow/    → workflow-router, workflow-project-integration, workflow-ai-collab
├─ app/         → app-architecture
├─ os/          → os-adapter, os-runtime
├─ bsp/         → bsp-wrapper, bsp-port, bsp-hal-driver, bsp-handler
├─ core/ mcu/   → core-mcu, mcu-platform
├─ middleware/  → middleware-lvgl, middleware-communication, middleware-storage, middleware-algorithms
├─ system/      → software-system
├─ hardware/    → hardware-pcb-analysis, hardware-visa-debug
└─ tools/       → tools-build, tools-flash, tools-linker, tools-debug,
                  tools-observability, tools-quality, tools-release,
                  tools-learning-tutor
```

**Adapter 只存在于 OS 和 BSP**；Core、Middleware、Driver 不设置 Adapter。
分层边界见 `docs/plugin-boundaries.md`，完整迁移关系见 `docs/skills-migration.md`。

### Architecture Contract

`lib/architecture-contract.js` 是 BSP 分层合规的权威规则引擎，定义九大分层模式（`app/middleware/bsp/bspDriver/bspPort/wrapper/corePublic/osWrapper/osPort`），通过正则匹配文件和目录路径来判定层级归属。调用链：`validate:architecture` → `validate-bsp-contract.js` / `validate-layer-contract.js` → `architecture-contract.js`。

### Safety Layer

`docs/safety-layer-architecture.md` 定义四层 Agent 系统：需求对齐层 → 安全层 → 编排层 → 记忆层。安全层通过 AGENTS.md 规则实现可编程护栏，自动注入编排层的 Phase 0.5 和 Phase 2.5。用法见 `docs/safety-layer-usage.md`。

## 宿主适配与边界

| 宿主 | 入口 | 工具命名 | 注册方式 |
|------|------|----------|----------|
| Claude Code | `.claude-plugin/plugin.json` | `/mcu-workbench:<skill-name>` | 自动发现 |
| OpenCode | `opencode.mjs` | `mcu_workbench_<skill_id>` + `mcu_workbench_route` | `opencode plugin <path>` |
| Codex CLI | `.codex-plugin/plugin.json` + `codex/AGENTS.md` | `@mcu-workbench` | 自动注册 |

**Codex 宿主边界兼容桥**：`codex/AGENTS.md` 是 Codex 宿主约束源，定义三域边界：
- `common/` — 公共内容层，任何宿主不得修改
- `claude/` / `opencode/` — 其他宿主适配层，Codex 不得修改
- `codex/` — Codex 特化层，只在此增加或调整行为

`AGENTS.override.md` 由 `scripts/build-codex-compat.js` 从 `codex/AGENTS.md` 自动生成，通过 Jest 测试保证同步。

OpenCode 适配通过 `@opencode-ai/plugin` 暴露工具。Codex 适配说明见 `docs/codex-adaptation.md`。

## Agent 团队

`agents/` 提供 7 个嵌入式角色，调用方式 `@mcu-workbench:<agent-name>`。职责与写入边界见 `docs/agents.md`：

| Agent | 领域 | 写入范围 |
|-------|------|----------|
| `embedded-lead` | 分诊、编排、最终汇总 | `.mcu-workbench/`、`docs/devlog/` |
| `system-architect` | 软件分层与迁移 | `docs/architecture/` |
| `firmware-engineer` | APP/OS/BSP/Core 集成 | 项目固件目录与配置 |
| `hardware-integration` | 板级连接与测量 | `hardware/`、`docs/verification/` |
| `toolchain-engineer` | 构建、烧录、链接、调试 | 工具链配置 |
| `verification-engineer` | 测试、静态分析、证据 | `docs/verification/` |
| `knowledge-engineer` | 开发日志与笔记 | `docs/notes/` |

Agent 遵循分域写入和显式交接协议。运行记录写入 `.mcu-workbench/runs/`。

## 双配置文件

| 文件 | 作用域 | 内容 |
|------|--------|------|
| `CLAUDE.md`（本文件） | 项目级 | 仓库结构、技能分类、命令、架构 |
| `.claude/CLAUDE.md` | 全局用户级 | 用户环境、插件列表、Hook 配置、行为准则 |

开发工作流由 `.claude/rules/ecc/common/` 规则系统定义：agents → code-review → coding-style → development-workflow → git-workflow → hooks → patterns → performance → security → testing。
