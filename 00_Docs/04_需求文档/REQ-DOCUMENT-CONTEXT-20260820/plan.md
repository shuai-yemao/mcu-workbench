# 集成实施计划：插件文档与多对话上下文管理

## 1. 元数据与状态

| 字段 | 内容 |
|---|---|
| request_id | `REQ-DOCUMENT-CONTEXT-20260820` |
| 生成时间 | `2026-08-20T00:00:00+08:00` |
| 计划版本 | `v0.1` |
| 计划状态 | `approved` |
| 项目路径 | `C:\\Users\\zhang\\Documents\\mcu-workbench` |
| 分支/提交 | `host_ai @ 9d5a3094456dc7238e321403070ab1c360b6e70d` |
| 输入 spec.md | `C:\\Users\\zhang\\Documents\\mcu-workbench\\00_Docs\\04_需求文档\\REQ-DOCUMENT-CONTEXT-20260820\\spec.md` |
| Spec 力度 | `full` |
| 风险叠加门禁 | `human_review, versioned, context_budget` |
| 选定方案 | `方案 B：边界优先的彻底拆分` |
| 方案选择人 | `user` |
| 用户审查状态 | `approved` |
| 方案审查结论 | `通过` |

## 2. 一句话说明

- 要解决的问题：插件产出的 README、需求文档、对话草稿和上下文状态缺少统一归属与生命周期。
- 计划做什么：建立独立的文档上下文存储与 README 管理实现，并从 Claude 分层实现中移除 README 逻辑。
- 明确不做什么：不修改固件、宿主运行时、普通手写文档或第三方资料，不生成 task.md。
- 预期结果：同一需求的多个对话可安全协作，一个对话可明确绑定多个需求，Context Skill 能按预算选择最小上下文。

## 3. 输入依据与工程事实

| ID | 事实或约束 | 证据 | 可信等级 | 对计划的影响 |
|---|---|---|---|---|
| E-01 | `workflow-document-context` 已有独立 Skill 和公开 API | `skills/workflow/workflow-document-context/SKILL.md`、`lib/document-context.js` | confirmed | 保留公开入口，扩展内部实现 |
| E-02 | 当前 README 实现仍位于 `lib/claude-layer.js`，通过 `readmeOnly` 分支复用 | `lib/claude-layer.js:899-1165` | confirmed | 方案 B 必须抽出扫描、渲染、配置和状态逻辑 |
| E-03 | 当前 Context CLI 只有 `design/init/scan/sync/validate` | `scripts/document-context-api.js:10-70` | confirmed | 增加登记、交接、提升、上下文和归档入口 |
| E-04 | 当前 README 生成和漂移测试位于 Claude layering 测试 | `tests/claude-layering.test.js:142-239` | confirmed | 测试需要迁移到 Context 测试，同时保留 Claude 规则测试 |
| E-05 | 现有工作区存在用户未提交修改 | `git status --short` | confirmed | 只修改本需求列出的文件，不覆盖其他变更 |
| E-06 | 正式文档仅为 Spec、Plan、Task，内部状态使用 JSON/JSONL | 本 Spec §3、项目 AGENTS.md | user-confirmed | 不新增用户接收的 RCP/Review Markdown |
| E-07 | 多对话、草稿提升、版本校验、归档和上下文预算已确认 | 本会话确认记录 | user-confirmed | 作为 API、状态机和验收边界 |

## 4. 方案选择与审查

### 方案 A：兼容优先的增量扩展

在现有 `lib/document-context.js` 外增加注册、交接和 Context API，继续通过 `lib/claude-layer.js` 的兼容实现生成 README。它改动较小、回滚容易，但 README 与 Claude 层实现仍有耦合。

### 方案 B：边界优先的彻底拆分（用户选择）

建立独立的 `document-context-store` 和 `document-context-readme` 模块，从 `lib/claude-layer.js` 删除 README 扫描、渲染、配置、状态和 `readmeOnly` 分支。旧 `claude-layer` CLI 保留薄兼容转发，避免已有命令无提示失效。

### 用户选择

```text
selected_option: B
decision_owner: user
decision_rationale: 明确抽离 README 和 Context Skill 的职责，形成长期可扩展的独立边界
rejected_option: A
new_constraints: 保留旧 CLI 的兼容转发，不让旧入口静默丢失能力
```

### 选定方案审查

| 审查项 | 结论 | 依据 | 后续动作 |
|---|---|---|---|
| 分层和接口 | 可采用 | Context Skill 负责文档/状态，Claude Skill 负责 Claude 规则 | store、README adapter、CLI 分离 |
| 文件和数据流 | 可采用 | 原文留在原路径，索引保存关系和状态 | 原子写入索引，保留旧路径 |
| 验收和回归 | 可采用 | 现有 README 测试可迁移，新增状态/并发/上下文测试 | 先特征测试，再删除旧实现 |
| 硬件边界 | 不适用 | 无 MCU、HAL、RTOS 或目标板资源 | 不分配硬件任务 |
| 工具链和产物 | 可采用 | 当前 Node/Jest CLI 足够 | 不新增运行时依赖 |

审查结论：无未关闭阻塞；用户批准本 Plan 后才进入 Task Breakdown。

## 5. 分层、调用链与接口边界

```text
document-context CLI
  → document-context facade
    → document-context-store
    → document-context-readme
    → document-context-context-selector
    → project/request/conversation files

claude-layer CLI
  → claude-layer core
    → Claude.md / .claude/rules / architecture report
```

- `workflow-document-context` 拥有文档索引、README、草稿、交接、生命周期和上下文选择。
- `workflow-claude-layering` 只拥有 `Claude.md`、`.claude/rules/` 和 Claude 分层报告。
- `document-context-store` 负责元数据、状态、revision、原子写入和事件，不负责 README 文本渲染。
- `document-context-readme` 负责静态扫描、README 受管区块渲染和 README 漂移校验，不负责需求提升。
- `document-context-context-selector` 只读取登记状态，按项目/需求/对话和预算生成最小输入清单。
- 旧 `claude-layer` CLI 的兼容转发只能调用 Context 公开 API，不得重新实现 README 逻辑。
- 原始文档由其当前路径和对应 Workflow Skill 拥有；Context Skill 只借用读取，提升时才写入明确目标。

## 6. 文件施工顺序

| ID | 阶段 | 动作 | 文件或目录 | 施工内容与理由 | 责任 Skill | 前置条件 | 状态 |
|---|---|---|---|---|---|---|---|
| P-01 | 1 | 新增 | `lib/document-context-store.js` | 文档索引、需求/对话/决策关系、生命周期、revision、原子写入和事件记录 | `workflow-document-context` | Plan 批准 | ready |
| P-02 | 2 | 新增 | `lib/document-context-readme.js` | 从 Claude 层抽出 README 扫描、受管区块渲染、配置和漂移校验 | `workflow-document-context` | P-01 | ready |
| P-03 | 3 | 修改 | `lib/document-context.js` | 作为稳定 facade，组合 store、README 和 Context selector | `workflow-document-context` | P-01、P-02 | ready |
| P-04 | 4 | 修改 | `scripts/document-context-api.js` | 增加 register、handoff、promote、context、archive、reconcile 等命令和 `request_id` 参数 | `workflow-document-context` | P-03 | ready |
| P-05 | 5 | 修改 | `lib/claude-layer.js` | 删除 README 扫描/渲染/状态和 `readmeOnly` 分支，只保留 Claude 产物 | `workflow-claude-layering` | P-02、P-03 | ready |
| P-06 | 6 | 修改 | `scripts/claude-layer-api.js` | 保留旧入口；README 相关动作转发到 Context API，并输出迁移提示 | `workflow-document-context` | P-04、P-05 | ready |
| P-07 | 7 | 修改 | `tests/document-context.test.js`、新增 Context 专项测试 | 覆盖登记、草稿提升、并发、生命周期、上下文预算和 README 行为 | `tools-verification` | P-01–P-04 | ready |
| P-08 | 8 | 修改 | `tests/claude-layering.test.js` | 删除 README 作为 Claude 产物的断言，保留 Claude.md/rules/报告测试 | `workflow-claude-layering` | P-05 | ready |
| P-09 | 9 | 修改 | `README.md`、两个相关 Skill 文档、`package.json` | 更新职责、迁移入口、命令和验证边界 | `knowledge-engineer` | P-04–P-06 | ready |
| P-10 | 10 | 验证 | 受影响文件、插件和全量回归 | 执行 Spec 追踪、定向测试、插件校验、链接和差异检查 | `workflow-final-review` | P-01–P-09 | ready |

不修改：固件工程、HAL、RTOS、BSP、Vendor、宿主 Hook、插件 Manifest、外部服务，以及本工作区无关的用户变更。

## 7. 数据、状态和并发设计

建议使用以下内部文件：

```text
.mcu-workbench/document-context/
  project-index.json
  documents.json
  conversations.json
  decisions/DEC-XXX.json
  reports/
  README.state.json
```

每个文档登记 `document_id`、`request_id`、`conversation_id`、类型、路径、authority、status、revision、来源、生成 Skill、supersedes 和关联文档。所有写操作采用临时文件加原子替换；事件采用 JSONL 追加。

正式提升必须满足：目标需求存在、草稿状态为 `pending_review`、来源 `base_revision` 等于当前 revision、所需用户/Gate 状态已通过。任何冲突、损坏 JSON、request_id 不一致或状态写入失败都返回 `blocked`，保留旧状态。

## 8. 阶段计划与交接

| 阶段 | 目标 | 输入 | 输出 | 完成条件 | 交接对象 |
|---|---|---|---|---|---|
| 1 | 提取 README 模块并保持行为 | 现有 `lib/claude-layer.js`、README 测试 | 独立 README 模块 | 特征测试通过 | P-03 |
| 2 | 建立 Context store | Spec、目录和工作流状态 | 索引、状态、事件 API | 合法/非法/冲突测试通过 | P-04 |
| 3 | 建立对话和需求操作 | store API | register/handoff/promote/archive/context | 多需求、多对话和预算测试通过 | P-05/P-06 |
| 4 | 完成职责迁移 | Claude/Context 两个 Skill | 新入口、兼容转发和文档 | 旧入口不静默失效，Claude 不再生成 README | P-07/P-08 |
| 5 | 回归和最终检查 | Spec、Plan、最终 diff | 测试和内部 Verify/Final Review 状态 | 无新增失败，差异边界通过 | 用户交付 |

## 8A. 下游执行 Agent 与 Skill 基线

| 阶段 | 主 Agent | 协作 Agent | 主实现 Skill | 辅助 Skill | 分配理由 |
|---|---|---|---|---|---|
| P-01/P-02 | `embedded-lead` | `system-architect` | `workflow-document-context` | `tools-verification` | 需要拆分存储和 README 责任 |
| P-03/P-04 | `embedded-lead` | `firmware-engineer` | `workflow-document-context` | `tools-verification` | 需要稳定 API、状态机和 CLI |
| P-05/P-06 | `embedded-lead` | `system-architect` | `workflow-claude-layering` | `workflow-document-context` | 需要移除 README 责任并维护兼容入口 |
| P-07/P-08 | `verification-engineer` | `toolchain-engineer` | `tools-verification` | `tools-quality` | 需要覆盖主机测试、旧回归和进程/文件边界 |
| P-09 | `knowledge-engineer` | `verification-engineer` | `workflow-document-context` | `tools-quality` | 更新 Skill、README 和命令说明 |
| P-10 | `embedded-lead` | `verification-engineer` | `workflow-final-review` | `tools-quality`, `tools-verification` | 对照 Spec 检查最终 diff 和验证证据 |

每个阶段只有一个主实现 Skill；辅助 Skill 不并行修改同一文件。

## 9. 资源、并发与生命周期约束

- 仅使用 Node 文件系统和事件循环，不创建 RTOS 任务、ISR、DMA、队列或硬件资源。
- 索引写入串行化；同一文档提升必须使用 revision 检查。
- 对话草稿可以并行创建，但正式文档提升遇到 stale 必须停止并要求重新合并。
- 不使用无界历史对话加载；Context selector 必须执行预算和优先级排序。
- 初始化、更新、归档和失败路径都保留旧文件；不通过删除旧状态绕过校验。

## 10. SOLID 与代码约束

| 原则 | 计划映射 | 可验证证据 |
|---|---|---|
| SRP | store、README、selector、CLI、Claude core 分离 | 模块级测试和依赖图 |
| OCP | 文档类型、状态和上下文 profile 通过注册/映射扩展 | 新增类型测试不改核心写入流程 |
| LSP | 旧 CLI 兼容转发遵循新的 Context API 返回契约 | 旧命令回归测试 |
| ISP | 登记、读取、提升、README 同步和 Context 选择使用窄 API | 单元测试按能力边界调用 |
| DIP | CLI 依赖 Context facade，README 和 store 通过显式数据接口组合 | CLI 不直接操作索引细节 |

禁止把 README 逻辑复制回 Claude core，禁止通过全局状态绕过 revision，禁止将整个对话历史写入默认上下文，禁止修改正式文档而不登记来源和事件。

## 11. 验收与验证计划

| ID | 证据等级 | 验收项 | 命令/条件 | 预期结果 |
|---|---|---|---|---|
| V-01 | 主机 | 文档登记和关系 | Context 专项 Jest | `REQ/CONV/DEC/document` 关系正确 |
| V-02 | 主机 | 草稿提升 | 合法、未确认、缺 request_id、过期 revision | 只有合法输入可提升，其他返回明确状态 |
| V-03 | 主机 | 并发冲突 | 两个草稿基于同一 revision 提升 | 先成功，后者为 `stale`，不能覆盖 |
| V-04 | 主机 | 生命周期和归档 | active/superseded/archived/rejected/blocked | 默认上下文只选择 active |
| V-05 | 主机 | 多需求对话 | 一个 CONV 关联两个 REQ | 每次操作必须绑定 active_request_id |
| V-06 | 主机 | 共享决策 | 一个 DEC 被多个 REQ 引用 | 不复制正文，关系可追溯 |
| V-07 | 主机 | Context budget | 超出模拟预算 | 生成摘要和来源，不加载全部历史 |
| V-08 | 主机 | README 行为 | README 手写区块、漂移和扫描 | 只更新受管区块，原路径不移动 |
| V-09 | 主机 | Claude 边界 | 调用 Claude layer 与 Context API | Claude 不生成 README，Context 生成 README |
| V-10 | 主机 | 旧 CLI 兼容 | 运行原有 Claude README 相关入口 | 有迁移提示或正确转发，不静默丢失能力 |
| V-11 | 静态 | 插件和链接 | `npm run validate:plugin`、`npm run validate:links` | 通过 |
| V-12 | 回归 | 定向和全量测试 | 受影响 Jest；`npm test -- --runInBand` | 无本需求新增失败；既有基线失败单独报告 |
| V-13 | 静态 | 差异和文档 | `git diff --check`、Spec 追踪 | 通过且不改无关用户文件 |
| V-14 | 宿主 | 真实 Skill 自动触发 | 真实 Codex/Claude 会话 | 保持 `unverified`，不由主机测试替代 |

当前已知基线：全量测试中存在由用户修改 `agents/*.md` 与生成的 `.opencode/commands` 不一致引起的既有失败；执行时必须报告基线与新增结果，不能擅自生成无关文件修复。

## 12. 回滚与失败处理

- 逐阶段回滚新增 Context store/README 模块和对应入口，不删除原有需求文档、状态和用户目录。
- P-05 若拆分导致 Claude 回归失败，保留失败证据，先修复抽取边界，不恢复 `readmeOnly` 作为长期方案。
- 索引写入失败保留旧索引；状态冲突只返回阻塞，不强制覆盖。
- 若需求扩大到宿主 Hook、远程数据库、在线协作或普通手写文档，回到 Router/Review Gate 更新 Spec。

## 13. 下游交接

- 正式需求输入：[spec.md](C:\\Users\\zhang\\Documents\\mcu-workbench\\00_Docs\\04_需求文档\\REQ-DOCUMENT-CONTEXT-20260820\\spec.md)
- 正式实施计划：本文件
- 下一步：用户批准 Plan 后交给 `workflow-task-breakdown` 生成 `task.md`
- 目标文件范围：P-01 至 P-10 列出的文件
- 禁止扩大：不修改固件、Vendor、宿主 Hook、Manifest 或无关用户变更
- 实现完成后交接：`workflow-final-review`
- 未验证项：真实宿主自动触发、外部项目文档迁移、上下文预算在真实宿主中的实际 token 计量

## 14. 当前状态

```text
spec_status: approved-for-integration-plan
plan_status: approved
task_status: not_started
implementation_allowed: false
blockers: none
```
