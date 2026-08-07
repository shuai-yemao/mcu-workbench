# CONTEXT.md — MCU-Workbench 领域上下文

> 本文件是 Matt Pocock 工程技能体系（triage/to-spec/to-tickets/implement 等）读取本仓库时的领域入口。
> 与 `docs/adr/`（架构决策记录）、`docs/agents/`（工程技能配置）配合使用。

## 仓库是什么

**mcu-workbench** — 面向 STM32、GR5526、ESP32 和 Cortex-M 的嵌入式开发 Skills 包与插件，作为 Claude Code / OpenCode / Codex 三宿主适配源。

- GitHub：`https://github.com/shuai-yemao/mcu-workbench`
- 当前分支：`host_ai`
- 仓库管理的技能位于 `skills/`（catalog 109 条 = 33 active + 76 archived + 4 未登记残留）

## 正在发生的事（2026-08 上下文）

**软件架构进化**：把当前"13 层物理分层"进化为五层契约分层（App / Service / Platform / Impl / Vendor），与用户目标工程目录范本（01_App…99_Utils）对齐。方案定稿于 `docs/architecture-overall-plan.md`（v3.0），12 项决策（D1-D12）全部确认，每条对应一条 ADR（`docs/adr/`）。

关键决策速览：

| 决策 | 结论 |
|---|---|
| D1 | skills 目录物理重排为五层 + MIGRATION_MAP 迁移映射 |
| D2 | workflow/tools/hardware 是**插件分层**，不入软件架构五层 |
| D3 | mcu-platform 改名 `vendor_stm32` |
| D4 | 统一错误码并入 platform_mcu 头文件规范 |
| D5 | bsp-handler 是 Impl 的一层（机制层） |
| D6 | 分阶段实施（0 定稿 → 1 Vendor → 2 Platform → 3 Impl → 4 Service → 5 App） |
| D7 | Vendor 只登记映射不复制源码（vendor_mapping.md + patch/） |
| D8 | App 依赖门禁阶段 5 收紧 |
| D9 | 中间件整体归 Vendor（不强制三段切） |
| D10 | Service = App 常见业务抽象（带 _model/_state/_fault_code） |
| D11 | 新技能下划线命名（service_battery） |
| D12 | 技能跟随归属，不为凑层强造技能 |

目标态 42 技能 = 5 软件架构层（app×1 / service×11 / platform×3 / impl×3 / vendor×8）+ 3 插件层（workflow×5 / tools×9 / hardware×2）。

## 分层契约（软件架构）

```text
App → Service → Platform ← Impl → Vendor
Vendor 不得 include 上层任何符号；App 不得 include Vendor/Impl/HAL；
Platform 只有头文件（零 .c）；机制在 Impl/Handler，策略在 Service。
```

详细见 `docs/architecture-overall-plan.md` 与 `skills/workflow/workflow-review-gate/references/software-layer-contract.md`（旧版，待迁移改写）。

## 插件机制速记

- 技能目录唯一事实源：`skills/catalog-metadata.js` + `skills/catalog.js`（id = 调用名 = 目录名）
- 查询视图：`skills/registry.js`（纯兼容 facade）；磁盘加载：`skills/loader.js`
- 旧调用名经 `MIGRATION_MAP` / `resolveSkillId()` 自动解析
- Agent 路由：`lib/agent-domains.js`（AGENT_ROSTER + DOMAINS）；暴露：`opencode.mjs`
- Node CLI 与 Skills 运行链分离：`commands/`、`lib/`、`bin/`

## 阅读规则

- 改动任何技能元数据：只允许落在 `catalog-metadata.js` / `catalog.js`
- 架构决策：先查 `docs/adr/`，避免重复决策
- 分层疑问：以 `docs/architecture-overall-plan.md`（v3.0 定稿）为准
