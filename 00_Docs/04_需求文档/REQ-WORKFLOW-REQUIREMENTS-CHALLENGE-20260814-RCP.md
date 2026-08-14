# RCP：独立需求质疑与双方案选择 Skill

## 1. 元数据

| 字段 | 内容 |
|---|---|
| request_id | `REQ-WORKFLOW-REQUIREMENTS-CHALLENGE-20260814` |
| 生成日期 | `2026-08-14` |
| 目标项目 | `C:\Users\zhang\Documents\mcu-workbench` |
| 分支/提交 | `host_ai @ f1f3ce25605d8f602ba7534a192063564edbe9e1` |
| 当前阶段 | `需求约束与审查` |
| 代码修改授权 | `用户已明确要求创建独立 Skill；仅限本需求范围` |
| 目标 Skill | `workflow-requirements-challenge` |
| 状态 | `可交接` |
| 必经下游 | `workflow-review-gate` |

## 2. 请求目标

在 `workflow-requirements-router` 与 `workflow-review-gate` 之间增加独立的需求质疑阶段：

```text
初步 RCP
→ 质疑需求目的与工程可行性
→ 方案 A / 方案 B
→ 用户选择
→ 更新 RCP
→ workflow-review-gate
```

本阶段不生成固件代码，不构建、烧录或分发实现层 Skill。

## 3. 工程事实与证据状态

| 事实 | 状态 | 证据 |
|---|---|---|
| Router 当前负责初步 RCP，并固定交给后续工作流 | `confirmed` | `skills/workflow/workflow-requirements-router/SKILL.md` |
| Review Gate 当前负责代码前反猜测审查和放行/阻塞 | `confirmed` | `skills/workflow/workflow-review-gate/SKILL.md` |
| Integration Plan 只消费放行后的审查包并分发一个实现层 Skill | `confirmed` | `skills/workflow/workflow-integration-plan/SKILL.md` |
| catalog 由 `catalog-metadata.js` 定义、`catalog.js` 派生目录 | `confirmed` | `skills/catalog-metadata.js`、`skills/catalog.js` |
| 新机制应是独立 workflow Skill | `user-confirmed` | 用户本轮明确选择“创建一个独立skills” |
| 质疑阶段位于初步 RCP 与 Review Gate 之间 | `user-confirmed` | 前序对话确认的流程决策 |
| 目标项目文档目录是当前插件仓库的 `00_Docs/04_需求文档/` | `confirmed` | 当前项目已有同类 RCP、Review-Package、BRD/PRD/SRSys 产物 |

## 4. 功能约束

1. 必须读取初步 RCP 和其证据；缺少关键事实时先补证，不得凭空生成方案。
2. 必须质疑需求目的：问题、价值、受益者、必要性和可观察的成功标准。
3. 必须质疑工程可行性：架构边界、硬件/软件资源、依赖、并发、生命周期和验证条件。
4. 每次必须输出且只输出两个真实可行的候选方案：方案 A、方案 B。
5. 每个方案必须说明范围、依赖、文件/Skill 影响、优缺点、风险、成本、验收和回滚。
6. 必须等待用户选择；用户未选择前不得交给 Review Gate 或实现层 Skill。
7. 用户选择后必须回填 `selected_option`、`decision_owner`、`decision_rationale`、放弃方案和未决风险。
8. 所有结论必须标注 `confirmed`、`user-confirmed`、`inferred` 或 `unverified`。

## 5. 非功能与边界约束

- 独立 Skill 不修改业务代码，不执行构建、烧录或目标板验证。
- 不替代 Router 的约束收集、Review Gate 的门禁审查或 Integration Plan 的文件级规划。
- 不能把“不做”和“做”伪装成两个方案，也不能用明显不可行的方案凑数。
- 不能用推荐方案替代用户选择。
- 不能把静态、主机或文档证据表述为目标板/实物验证。
- 方案选择记录应可被 Review Gate 和 Integration Plan 直接消费。

## 6. 目标文件范围

### 必须修改

- `skills/workflow/workflow-requirements-challenge/SKILL.md`
- `skills/workflow/workflow-requirements-router/SKILL.md`
- `skills/workflow/workflow-review-gate/SKILL.md`
- `skills/catalog-metadata.js`
- `skills/catalog.js`
- `opencode.mjs`
- `tests/skills.test.js`
- `tests/embedded-architecture-skills.test.js`

### 文档同步

- `README.md`
- `CLAUDE.md`
- `docs/workflows.md`
- `docs/plugin-execution-flow.md`
- `docs/plugin-architecture-io.md`
- `docs/plugin-capability-map.md`
- `docs/plugin-boundaries.md`
- `docs/codex-adaptation.md`
- `docs/skills-migration.md`
- `docs/design-split-project-integration.md`

### 明确不包含

- `common/`、`claude/`、`opencode/` 宿主适配内容；
- 任何固件工程、Vendor 源码、构建产物、烧录配置；
- `workflow-integration-plan` 的职责改变；
- 旧 alias 删除或迁移映射重写；
- 清理、恢复、覆盖或暂存用户已有工作区变更。

## 7. 验收标准

| 证据等级 | 验收项 | 通过条件 |
|---|---|---|
| 静态 | Skill 边界 | 明确只做目的/可行性质疑、双方案和用户选择，不生成代码 |
| 静态 | 路由顺序 | Router → Challenge → 用户选择 → Review Gate → Integration Plan |
| 静态 | 方案约束 | 方案 A/B 均包含优缺点、风险、成本、验收和回滚 |
| 静态 | 选择门禁 | 未设置 `selected_option` 时不得进入 Review Gate 或实现层 |
| 主机 | catalog/loader | 新 Skill 可被目录、loader、registry 发现并按 canonical ID 加载 |
| 主机 | 自动化断言 | 测试覆盖 Skill 数量、frontmatter、路由链、双方案字段和禁止越级 |
| 静态 | 文档一致性 | 当前目录规模和工作流主链路描述一致 |
| 静态 | Git | `git diff --check` 无错误，且无越权文件变更 |

## 8. 风险与阻塞

- 当前工作区存在大量既有修改、删除和未跟踪文件；必须按本 RCP 精确审阅变更。
- `AGENTS.override.md` 为生成文件，本需求不手工修改；若后续需要同步，由既有生成脚本处理并单独验证。
- 当前只验证 Skill 文本、目录、宿主提示词和自动化测试，不证明真实模型在所有需求类型下的方案质量。

## 9. 下游提示词

请将本 RCP 交给 `workflow-review-gate`：审查新增独立 Skill 的职责边界、双方案选择门禁、证据等级、文件范围和测试验收。审查放行后由 `workflow-integration-plan` 只做本需求的文件级集成计划；实现阶段只修改 RCP 明确的 Skill、目录、宿主提示词、文档和测试文件。

## 10. 路由单

```text
状态：可交接
必经下游：workflow-review-gate
实现 Skill：待 workflow-integration-plan 分发；本 RCP 不直接分发
参与 Agent：embedded-lead + system-architect + verification-engineer + knowledge-engineer
需求约束包：C:\Users\zhang\Documents\mcu-workbench\00_Docs\04_需求文档\REQ-WORKFLOW-REQUIREMENTS-CHALLENGE-20260814-RCP.md
责任边界：Challenge 只质疑与等待选择；Review Gate 只审查与门禁；Integration Plan 只规划与分发
验证边界：当前仅声明静态、主机和插件校验；无目标板证据需求
下一步：执行 Review Gate 四张审查清单并确认是否放行
```
