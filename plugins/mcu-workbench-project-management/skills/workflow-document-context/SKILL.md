---
name: workflow-document-context
description: 管理嵌入式项目中由多个需求和多个对话产生的 README、文档索引、上下文快照、版本关系和交接状态。当用户提到项目文档过多、README 分层说明、多个对话上下文污染、文档登记、文档漂移、会话交接、文档归档或需要为下一个 Workflow 阶段生成最小上下文时使用。该 Skill 只管理文档与上下文，不替代需求审查、Spec/Plan/Task、代码实现或开发日志。
---

# 项目文档与上下文管理

## 职责

本 Skill 管理项目文档的登记、关系、生命周期和上下文选择，尤其负责项目根目录、架构层目录、模块目录、`inc`、`src` 和 Vendor 目录的 `README.md` 受管区块。

它负责：

- 扫描真实目录、源码头部注释、直接 `include` 和可识别符号；
- 生成或更新 README 的解释型受管区块；
- 保留 README 中的手写内容，只更新标记区块；
- 记录 README 管理范围、排除目录、缺失路径和静态证据；
- 维护 `REQ-*`、`CONV-*`、`DEC-*` 和 `document_id` 的索引、状态、版本关系与事件；
- 管理草稿提升、`base_revision` 冲突、归档和对话 handoff；
- 按 project/request/conversation profile 和预算生成最小上下文；
- 为下一个对话或 Workflow 阶段提供最小输入清单。

它不负责：

- 需求约束、目的/可行性质疑和 Review Gate；
- 生成或审批 `spec.md`、`plan.md`、`task.md`；
- 代码、构建、测试、烧录或目标板验证；
- Claude.md、`.claude/rules/` 和 Claude 分层规则；
- 普通开发日志；开发日志仍由其他专用能力负责。

## 受管边界

| 产物 | 所有权 | 规则 |
|---|---|---|
| 项目根和配置范围内的 `README.md` | 本 Skill | 只更新 `mcu-workbench:readme-managed` 标记区块，保留其他内容 |
| `.mcu-workbench/document-context.json` | 本 Skill | 保存 README 范围、排除项和布局映射 |
| `.mcu-workbench/document-context/readme.state.json` | 本 Skill | 保存扫描摘要、受管 README 哈希、未确认路径和漂移基线 |
| `.mcu-workbench/document-context/project-index.json`、`documents.json`、`conversations.json`、`decisions.json`、`events.jsonl` | 本 Skill | 保存项目、文档、对话、共享决策索引和状态事件；正文仍留在原路径 |
| `.mcu-workbench/document-context/requests/<request_id>/conversations/<conversation_id>/handoff.json` | 本 Skill | 保存单个对话的基线版本、证据、阻塞项和下一步交接 |
| `Claude.md`、`.claude/rules/` | `workflow-claude-layering`/用户 | 本 Skill 不修改 |
| `spec.md`、`plan.md`、`task.md` | 对应 Workflow Skill | 本 Skill 只登记引用，不改写内容 |

## 文档分层与生命周期

登记文档时区分以下类型：

| 类型 | 内容 | 默认上下文策略 |
|---|---|---|
| `baseline` | 项目规则、架构约束、芯片/工具链事实 | 当前项目会话默认加载 |
| `request` | Spec、Plan、Task 和批准的决策 | 当前 request 默认加载 |
| `evidence` | 源码证据、日志、构建、测试、Map 和硬件观测 | 按 Task 或验收项加载 |
| `conversation` | 单个对话草稿、分析、交接摘要 | 只加载当前对话和上一个交接 |
| `archive` | 已完成、过期或被替代的文档 | 仅按明确引用加载 |

文档状态使用 `draft`、`pending_review`、`active`、`superseded`、`stale`、`blocked`、`rejected`、`unregistered`、`legacy` 和 `archived`。同一需求下的新对话不能直接覆盖旧对话文档；必须记录 `request_id`、`conversation_id`、`version`、`supersedes`、`source_revision` 和 `next_handoff`。只有 `active` 进入默认上下文。

## 对话交接

每个对话结束时，生成或更新内部交接记录，至少包含：

```text
request_id
conversation_id
base_revision
current_phase
input_documents
confirmed
inferred
unverified
changed_files
blockers
next_handoff
```

下一个对话读取交接记录和当前活动上下文，不读取全部历史聊天记录。发现 `base_revision` 已过期、正式文档已更新或存在冲突时，先重新扫描和重建上下文，不能直接覆盖。

## 调用入口

在插件根目录执行：

```powershell
node scripts/document-context-api.js design --root <absolute-project-root>
node scripts/document-context-api.js scan --root <absolute-project-root>
node scripts/document-context-api.js init --root <absolute-project-root> --write
node scripts/document-context-api.js sync --root <absolute-project-root> --write
node scripts/document-context-api.js validate --root <absolute-project-root>
node scripts/document-context-api.js validate --root <absolute-project-root> --strict
node scripts/document-context-api.js register-document --root <absolute-project-root> --data '<json>'
node scripts/document-context-api.js register-conversation --root <absolute-project-root> --data '<json>'
node scripts/document-context-api.js register-decision --root <absolute-project-root> --data '<json>'
node scripts/document-context-api.js handoff --root <absolute-project-root> --data '<json>'
node scripts/document-context-api.js promote --root <absolute-project-root> --request-id REQ-001 --document-id DOC-001 --base-revision 1 --approved-by user
node scripts/document-context-api.js context --root <absolute-project-root> --profile request --request-id REQ-001 --budget 12000
node scripts/document-context-api.js archive --root <absolute-project-root> --request-id REQ-001
```

`design`、`scan` 和不带 `--write` 的动作只读；`init`/`sync` 只有用户明确要求写入时才使用 `--write`。

正式文档以需求为主归属，不以对话为所有者。一个对话可以关联多个需求，但每次文档操作必须绑定一个 `request_id`；跨需求结论使用 `DEC-*`。草稿必须先进入 `pending_review`，经用户或对应 Gate 确认后才能提升为正式文档。过期 `base_revision` 只能返回 `stale`，不能静默覆盖。

`context --profile project` 只返回项目索引、活跃需求和共享决策；`request` 增加当前 Spec/Plan/Task、交接和验证关系；`conversation` 优先当前 handoff。历史对话、旧版本和归档文档默认不加载，预算超限时返回带来源的摘要。

## README 内容要求

每个受管 README 应解释：

- 这是什么；
- 在 App → Service → Platform ← Impl → Vendor 中的位置；
- 主要职责和依赖边界；
- 直接子目录和文件内容；
- 关键接口、宏、类型、直接 `include` 和证据来源；
- 推荐阅读顺序；
- 修改前的所有权、生命周期、阻塞、ISR/DMA、并发和验证约束。

源码注释不足时，只能标记为“文件名/目录结构推断”，不能猜测业务职责、硬件资源、负责人、版本或许可证。Mermaid 只用于帮助阅读，不能替代源码和配置证据。

## 工作流

```text
对话/需求开始
  → scan 当前项目和已有文档
  → 建立或读取 document-context 配置
  → 生成当前阶段最小上下文
  → init/sync 更新 README 受管区块
  → validate 检查缺失、漂移和未确认项
  → 输出文档交接摘要
```

需求或代码结论仍必须交给对应的 Router、Review Gate、Plan/Task 或实现 Skill；本 Skill 不把 README 静态说明提升为架构或硬件验证结论。

## 固定输出

每次输出包含：

```text
Action: design | init | scan | sync | validate | register-* | handoff | promote | context | archive
Project root: <absolute path>
README scope: <roots, maxDepth, exclusions, missing paths>
Document context state: <absolute path and status>
Confirmed evidence: <relative/path:line or scan fact>
Unverified: <paths or none>
Planned changes: <README/config/state files>
Writes: <absolute paths or none>
Validation: <findings and exit code>
Next handoff: <next Workflow Skill or none>
```

## 验证边界

`validate` 只证明配置、README 受管区块、目录/源码静态证据和文档上下文状态一致；不证明编译、烧录、RTT、串口、逻辑时序或目标板运行。
