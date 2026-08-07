# 设计：拆分 workflow-project-integration

> 状态：**已实施**（2026-08-07，提交见 git log）。原设计决策（D1-D6）均按推荐项执行。
> 目标读者：插件维护者。本文给出拆分方案、全量影响清单、迁移映射、实施顺序与决策点。
> 对应现状文件：`skills/workflow/workflow-project-integration/SKILL.md`（约 100 行，六项职责混杂）。

## 1. 背景与目标

`workflow-project-integration` 目前承担六项职责：工程审计/调用链、反猜测审查、四张清单 + BRD/PRD/SRSys、代码前门禁判定、分层/迁移/改造顺序、分发实现层 Skill。其中"审查 + 门禁 + 文档"与"规划 + 分发"是两簇独立职责，中间隔着"门禁判定"这一天然边界。

**拆分目标**（预期收益）：

- 职责可独立演进：门禁规则变化不牵动规划逻辑，反之亦然；
- 门禁可独立测试：`workflow-review-gate` 的"放行/阻塞"判定可单独断言；
- 单一职责：每个 skill 只回答一个问题（"方案站得住吗？" / "怎么集成、交给谁？"）。

**非目标**（明确不做）：

- 不追求总内容变少——`references/`（知识图谱、分层契约）是共享事实源，不会拆分；
- 不改变门禁语义：阻塞不得进入代码阶段的不变量保持不变；
- 不迁移历史产物（`outputs/gpio-core-demo/**` 保持原样）。

## 2. 拆分方案总览

| | workflow-review-gate（审查门禁） | workflow-integration-plan（集成规划与分发） |
|---|---|---|
| 定位 | RCP 唯一接收方，代码前门禁 | 放行后的集成规划与分发 |
| 核心问题 | 方案站得住吗？ | 怎么集成、交给谁？ |
| 输入 | RCP + 既有实现方案 + 项目证据 | 放行后的审查包 |
| 职责 | 工程事实整理（四态可信等级）、反猜测审查、四张清单、BRD/PRD/SRSys、门禁判定 | 分层审计/调用链、迁移路线、文件级改造顺序、分发唯一实现层 Skill、交接 final-review |
| 输出 | 审查包（放行/阻塞）+ 三份产品文档 | 施工计划（现状/边界/文件修改/验收四张表）+ 分发结论 |
| 硬边界 | 不实现代码；不分层迁移设计；不分发 | 不审查既有方案可行性（门禁已过）；不生成实现代码；非放行不得分发 |
| 交接 | 放行 → workflow-integration-plan；阻塞 → 回传 Router 补证 | 实现层 Skill（唯一）→ 完成后交 workflow-final-review |

**门禁不变量如何保证**：调用链单向强制——Router → `workflow-review-gate`（判定）→ 仅放行交 `workflow-integration-plan` → 分发。`workflow-integration-plan` 的硬边界明文"审查包门禁状态非放行不得分发"，阻塞不会越过边界。

## 3. 新旧职责对照

| 现状职责（SKILL.md 章节） | 归属 |
|---|---|
| 适用范围/工作流 1-2 步：读工程、画调用链 | workflow-integration-plan（分层审计） |
| 实现方案审查与代码前门禁（反猜测审查、四类假证据） | workflow-review-gate |
| 固定审查包与门禁判定（四张清单必选 + inferred/unverified 阻塞规则） | workflow-review-gate |
| 必选产品文档输出（BRD/PRD/SRSys，docs/requirements/） | workflow-review-gate |
| 交付计划最低产物（现状/边界/文件修改/验收四张表、模式 C） | workflow-integration-plan |
| 分层证据图（knowledge-graph 读取） | workflow-review-gate（审查证据源） |
| 分发目标（唯一实现层 Skill） | workflow-integration-plan |
| 硬边界（Adapter 规则等） | 两边各保留相关部分 |

> 注：现状中"交付计划四张表"与"审查包四张清单"是两组不同的四张表，拆分后分别归属 plan（施工表）与 gate（审查清单），避免混淆。

## 4. 目录与文件规划

```
skills/workflow/
├─ workflow-requirements-router/          # 仅文案更新（交接目标改 workflow-review-gate）
├─ workflow-review-gate/                  # 新目录（由原目录更名/拆分）
│  ├─ SKILL.md                            # 审查 + 门禁 + 文档产出
│  └─ references/
│     ├─ implementation-plan-review-package.md   # 审查包模板（随 gate）
│     ├─ software-layer-contract.md              # 分层契约（审查依据）
│     ├─ software-architecture-knowledge-graph.md/.json  # 分层证据图（审查证据）
│     └─ ec-s100-architecture-audit.md           # 审计案例
├─ workflow-integration-plan/             # 新目录
│  ├─ SKILL.md                            # 规划 + 分发
│  └─ references/
│     ├─ capability-index.md              # 集成/移植能力索引
│     └─ capabilities/                    # workflow-code-porting 等移植能力
└─ workflow-final-review/                 # 仅文案更新
```

- 目录更名方式：`git mv skills/workflow/workflow-project-integration skills/workflow/workflow-review-gate`，再拆分出 integration-plan，保留完整提交历史。
- `software-architecture-knowledge-graph.json` 由 `scripts/validators/knowledge-graphs.js` 校验，其 `ARCH_GRAPH_ROOT` 常量同步改指 review-gate。

## 5. 全量影响清单

### 5.1 元数据与入口（代码）

| 文件 | 变更 |
|---|---|
| `skills/catalog-metadata.js` L107-110 | CANONICAL_DEFINITIONS：删 `workflow-project-integration`，增两条 `workflow-review-gate`、`workflow-integration-plan`（layer 均 `workflow`） |
| `skills/catalog.js` L61-72 | CANONICAL_ORDER：`workflow-project-integration` → `workflow-review-gate` + `workflow-integration-plan` |
| `skills/catalog.js` MIGRATION_MAP | 见 §6 迁移映射表 |
| `opencode.mjs` L143 | requirementsConstraintPackagePrompt 文案：交接目标改为 review-gate → plan 分发 |
| `lib/agent-domains.js` | **零改动**（coordination/architecture 领域 `layers: ['workflow']` 自动包含新 skill，验证点） |
| `scripts/validators/knowledge-graphs.js` L7 | ARCH_GRAPH_ROOT 指向 workflow-review-gate；错误文案同步 |

### 5.2 SKILL 交叉引用（13 处，链接与文案改向）

`app-architecture`、`core-mcu`、`mcu-platform`、`os-adapter`、`bsp-port`（含 `references/bsp-layer-evidence.md`）、`workflow-final-review`、`workflow-claude-layering`、`tools-learning-tutor`、`software-system`、`workflow-requirements-router`。

### 5.3 文档

| 文件 | 变更 |
|---|---|
| `docs/plugin-execution-flow.md` L20/49-74/117 | 流程图中 S 节点、路由规则、示例、交付清单改双 skill |
| `docs/workflows.md` | 工作流描述更新 |
| `docs/skills-migration.md` L106 | "108 catalog / 30 canonical" → 109/31 |
| `docs/plugin-boundaries.md` | 边界描述 |
| `docs/plugin-capability-map.md` L20 | 数量与 workflow 层清单 |
| `docs/codex-adaptation.md` L37 | 数量 109/31 |
| `CLAUDE.md` L18/82/93 | 数量与流程链 |
| `README.md` L27/30/66/70/72 | 数量与流程链 |
| `codex/AGENTS.md`（源头）L16/34/39 | 交接链 + 表格行 |
| `AGENTS.override.md` | `npm run build:codex-compat` 重新生成（勿手工编辑） |
| `agents/embedded-lead.md`、`agents/knowledge-engineer.md` | "project-integration skills" 措辞微调 |

### 5.4 测试（6 处）

| 文件 | 变更 |
|---|---|
| `tests/skills.test.js` L10-11/15/91-92 | catalog 108→109、canonical 30→31、数组加两个新 id |
| `tests/skills.test.js` L103-150 | Router 断言：必经下游改 review-gate、分发表述改 plan；integration 断言迁移到 `getSkillContent('workflow-review-gate')`，reviewPackage 路径改 gate/references |
| `tests/embedded-architecture-skills.test.js` L30/55/102/84 | 路径改 gate；L101-108 四张表断言改指 integration-plan；文档断言 108/30 → 109/31 |
| `tests/software-architecture-graph.test.js` L7 | GRAPH_PATH 改 gate |
| `tests/skill-capability-migration.test.js` L19-20 | 迁移分组目标改新 id |
| `scripts/validate-plugin.js` | 预期动态计算（已验证无硬编码 108/30），无需改，但输出会变 109 skills / 7 agents / 13 层 |

### 5.5 历史产物

`outputs/gpio-core-demo/**`（RCP/审查包/BRD/PRD/SRSys）为已交付演示产物，**不迁移、不改写**，仅在设计评审中说明其流程语义不变。

## 6. 迁移映射（MIGRATION_MAP 建议）

| 旧 id | 新目标 | 理由 |
|---|---|---|
| `project-integration` | `workflow-review-gate` | 原 skill 主名，继承"必经门禁"角色 |
| `embedded-project-integration` | `workflow-review-gate` | 同上 |
| `workflow-architecture` / `embedded-architect` | `workflow-integration-plan` | 分层架构设计属规划 |
| `workflow-code-porting` / `code-porting` | `workflow-integration-plan` | 代码移植属迁移规划 |
| 其余原指向 workflow-project-integration 的旧引用 | `workflow-review-gate` | 保守默认 |

> 决策点 D2：若选择"硬断"（不保留映射），则全部引用必须同步改新 id，`resolveSkillId('workflow-project-integration')` 返回 null——不推荐，破坏兼容。

## 7. 分步实施顺序

1. **元数据**：catalog-metadata.js + catalog.js（新 id、CANONICAL_ORDER、MIGRATION_MAP）→ 跑 `node -e "require('./skills/catalog')"` 冒烟；
2. **目录拆分**：`git mv` 原目录为 review-gate；从原 SKILL.md 拆分出两个新 SKILL.md；references 按 §4 归属搬迁；
3. **Router 交接链**：workflow-requirements-router/SKILL.md（description、分流、必经交接、路由单、硬约束、链接）；
4. **Codex 源头同步**：codex/AGENTS.md 改文案与表格 → `npm run build:codex-compat` 重生成 AGENTS.override.md；
5. **其余文档**：CLAUDE.md、README.md、docs×5、agents×2、13 处 SKILL 交叉引用、opencode.mjs 文案；
6. **测试更新**：§5.4 全部断言迁移；
7. **全量回归**：见 §8。

## 8. 验证与回归清单

```bash
npx jest                          # 36+ suites 全量（数量断言改为 109/31）
npm run validate:plugin           # 108→109 skills / 7 agents / 13 层
npm run validate:links            # 288+ Markdown 链接
npm run validate:architecture
npm run build:codex-compat        # 重生成 AGENTS.override.md 后 git diff 检查
npm run migrate:capabilities -- --check   # skill-capability-migration
git diff --check                  # 无空白错误
```

验收标准：全绿 + `grep -rn "workflow-project-integration" --include="*.md" --include="*.js" --include="*.mjs"` 仅命中历史产物（outputs/）与迁移映射（MIGRATION_MAP 定义处）。

## 9. 决策点（待用户拍板）

- **D1 命名**：`workflow-review-gate` / `workflow-integration-plan`（备选：`workflow-code-gate`、`workflow-review-and-gate`）；
- **D2 迁移策略**：保留映射（推荐）vs 硬断；
- **D3 references 归属**：knowledge-graph / layer-contract 随 review-gate（推荐，plan 相对引用），还是复制一份（不推荐，破坏单一事实源）；
- **D4 数量文案**：全仓库 "108 catalog / 30 canonical" → "109 catalog / 31 canonical"（8 处文档 + 2 处测试）；
- **D5 交付计划四张表归属**：现状/边界/文件修改/验收表 → plan（推荐），确认不与 gate 四张清单混同；
- **D6 历史产物**：outputs/gpio-core-demo 不迁移（推荐）。

## 10. 风险与缓解

| 风险 | 缓解 |
|---|---|
| 交接链变长，阻塞语义被稀释 | plan 硬边界明文"非放行不得分发"；门禁判定收敛在 gate 单一出口 |
| 数量断言全仓库扩散 | §5.4 列出全部 8+2 处，一次性批量替换 |
| references 被复制导致事实源分裂 | D3 明确单一归属 + 相对引用 |
| 旧 id 解析断裂 | D2 默认保留 MIGRATION_MAP |
| 交叉引用遗漏 | §8 终态 grep 验收（仅历史产物 + 映射定义处命中） |
