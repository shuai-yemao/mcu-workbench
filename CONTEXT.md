# CONTEXT.md — MCU-Workbench 领域上下文

> 本文件是 Matt Pocock 工程技能体系（triage/to-spec/to-tickets/implement 等）读取本仓库时的领域入口。
> 架构与工程规则以本文件、根目录 `AGENTS.md`、`codex/AGENTS.md` 和 `skills/` 下的 canonical Skill 为准。

## 仓库是什么

**mcu-workbench** — 面向 STM32、GR5526、ESP32 和 Cortex-M 的嵌入式开发 Skills 包与插件，作为 Claude Code / OpenCode / Codex 三宿主适配源。

- GitHub：`https://github.com/shuai-yemao/mcu-workbench`
- 当前分支：`host_ai`
- 仓库管理的技能位于 `skills/`（catalog 48 条 = 46 canonical + 2 hardware active；归档已删除，旧调用名经 `MIGRATION_MAP` 兼容解析）

## 正在发生的事（2026-08 上下文）

**软件架构进化**：把当前"13 层物理分层"进化为五层契约分层（App / Service / Platform / Impl / Vendor），与用户目标工程目录范本（01_App…99_Utils）对齐。当前约束以 `skills/workflow/workflow-review-gate/references/software-layer-contract.md` 和各层 canonical Skill 为准。

关键决策速览：

| 决策 | 结论 |
|---|---|
| D1 | mcu 目录物理重排为五层 + MIGRATION_MAP 迁移映射 |
| D3 | mcu-platform 改名 `vendor_mcu`，`vendor_stm32` 保留兼容别名 |
| D5 | bsp-handler 是 Impl 的一层（机制层） |
| D6 | 分阶段实施（0 定稿 → 1 Vendor → 2 Platform → 3 Impl → 4 Service → 5 App） |
| D7 | 插件只登记映射和接入规则；目标工程 `05_Vendor/` 由 Git 统一管理，MCU/RTOS 完整保留，中间件/算法按需保留 |
| D8 | App 依赖门禁阶段 5 收紧 |
| D10 | Service = App 常见业务抽象（带 _model/_state/_fault_code） |
| D11 | 新技能下划线命名（service_battery） |

Platform 层技能定为 5 个：`platform_common` / `platform_mcu` / `platform_os` / `platform_bsp` / `platform_middleware`（公共定义与中间件能力接口独立成技能，废弃"不为凑层造技能"）。

当前工作区 46 canonical 技能 = 5 软件架构层（app×1 / service×11 / platform×5 / impl×4 / vendor×9）+ workflow×7 / tools×9 / hardware×2；catalog 另含 2 个 hardware 兼容项。Vendor Skill 仍可按知识域独立存在，但目标工程中间件物理目录统一为 `05_Vendor/vendor_middleware/`。其中 workflow 数量包含工作区已有的 `workflow-task-breakdown`。

## 分层契约（软件架构）

```text
App → Service → Platform ← Impl → Vendor
Vendor 不得 include 上层任何符号；App 不得 include Vendor/Impl/HAL；
Platform 只有头文件（零 .c）；机制在 Impl/Handler，策略在 Service。
```

详细见 `skills/workflow/workflow-review-gate/references/software-layer-contract.md` 与各层 canonical Skill。

## 插件机制速记

- 技能目录唯一事实源：`skills/catalog-metadata.js` + `skills/catalog.js`（id = 调用名 = 目录名）
- 查询视图：`skills/registry.js`（纯兼容 facade）；磁盘加载：`skills/loader.js`
- 旧调用名经 `MIGRATION_MAP` / `resolveSkillId()` 自动解析
- Agent 路由：`lib/agent-domains.js`（AGENT_ROSTER + DOMAINS）；暴露：`opencode.mjs`
- Node CLI 已移除(2026-08-08)，交互统一走 Skill + lib Programmatic API；确定性入口：`scripts/claude-layer-api.js`、`lib/`
- `claude-layer` 扫描/规则已对齐五层契约（`lib/claude-layer.js` LAYERS 与 `workflow-claude-layering` SKILL.md）；旧 6 层 layout 键读取时自动归一化

## 阅读规则

- 改动任何技能元数据：只允许落在 `catalog-metadata.js` / `catalog.js`
- 架构决策：先查相关 canonical Skill 和 `skills/workflow/workflow-review-gate/references/`，避免重复决策
- 分层疑问：以 `skills/workflow/workflow-review-gate/references/software-layer-contract.md` 与各层 canonical Skill 为准
