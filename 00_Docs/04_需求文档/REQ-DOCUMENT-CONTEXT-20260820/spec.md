# Spec：插件文档与多对话上下文管理

## 1. 元数据

| 字段 | 内容 |
|---|---|
| request_id | `REQ-DOCUMENT-CONTEXT-20260820` |
| Spec 版本 | `v0.1` |
| Spec 状态 | `approved-for-integration-plan` |
| Spec 力度 | `full` |
| 项目路径 | `C:\\Users\\zhang\\Documents\\mcu-workbench` |
| 分支/提交 | `host_ai @ 9d5a3094456dc7238e321403070ab1c360b6e70d` |
| 正式文档目录 | `00_Docs/04_需求文档/REQ-DOCUMENT-CONTEXT-20260820/` |
| 内部状态目录 | `.mcu-workbench/workflows/REQ-DOCUMENT-CONTEXT-20260820/` |
| 用户审查状态 | `approved` |
| 决策负责人 | `user` |

## 2. 目的

为插件产出的文档、项目受管 README、多个需求和多个对话建立可追溯的文件归属与上下文管理规则，避免：

- 不同对话重复生成同一份正式文档；
- 同一个需求的历史对话污染当前上下文；
- 一个对话同时处理多个需求时发生文档串写；
- 插件报告、草稿、正式文档和归档文档混在一起；
- README 复制正文后长期漂移。

## 3. 范围

### 3.1 必须包含

1. 插件产生的正式需求文档、内部工作流记录、验证/检查报告和对话交接。
2. 项目根目录受管 `README.md` 的索引区块。
3. `REQ-*` 需求、`CONV-*` 对话和 `DEC-*` 跨需求共享决策的关系。
4. 草稿提升、版本冲突、归档、旧文档登记和上下文选择。
5. 按项目、需求、对话分级加载最小上下文，并设置上下文预算边界。

### 3.2 非目标

- 不接管普通手写文档、第三方文档或外部资料。
- 不接管插件仓库中的 Skill 模板、references 和开发日志。
- 不替代需求 Router、Challenge、Review Gate、Spec/Plan/Task、代码实现或最终代码审查。
- 不自动移动、重命名、复制或删除已有文档。
- 不把对话全文作为默认上下文。
- 不把 README 当作需求正文或验收依据。

## 4. 文档所有权模型

文档的第一归属是需求，不能以对话作为正式文档的所有者。

| 实体 | 标识 | 责任 |
|---|---|---|
| 项目 | project root | 受管 README、项目索引、项目级报告 |
| 需求 | `REQ-*` | Spec、Plan、Task、需求报告和工作流记录 |
| 对话 | `CONV-*` | 草稿、交接、来源和参与关系 |
| 共享决策 | `DEC-*` | 被多个需求引用的跨需求结论 |
| 文档 | `document_id` | 路径、类型、版本、状态和关系登记 |

正式文档不能放在对话目录中；对话目录只保存草稿和交接记录。

## 5. 推荐物理布局

正式文档保留在当前项目文档目录，内部索引和状态放在 `.mcu-workbench/`：

```text
00_Docs/04_需求文档/REQ-XXX/
  spec.md
  plan.md
  task.md
  generated/

.mcu-workbench/workflows/REQ-XXX/
  state.json
  events.jsonl
  conversations/CONV-YYY/
    handoff.json
    drafts/

.mcu-workbench/document-context/
  project-index.json
  documents.json
  conversations.json
  decisions/DEC-XXX.json
  reports/
  README.state.json
```

现有文件首次纳入管理时只登记原路径，不自动迁移。需求报告归需求，项目级扫描报告归项目，未确认报告归对话草稿。

## 6. 多对话和多需求规则

### 6.1 一个需求多个对话

- 多个 `CONV-*` 关联同一个 `REQ-*`。
- 每个对话保存自己的 `handoff.json`，不复制 Spec/Plan/Task。
- 新对话优先读取当前有效需求文档、最新交接、阻塞项和关联验证记录。
- 对话草稿必须保存 `request_id`、`conversation_id`、`base_revision` 和来源。

### 6.2 一个对话多个需求

- 一个对话可以关联多个 `request_id`。
- 每次文档操作必须指定唯一的 `active_request_id`。
- 正式文档不得跨需求混写。
- 未绑定需求的内容只能作为临时对话内容，不能提升为正式文档。

### 6.3 跨需求结论

同时影响多个需求的结论必须建立独立 `DEC-*` 共享决策，由各需求引用，不在多个需求文档中复制正文。

## 7. 草稿、提升和并发

对话产出必须遵循：

```text
conversation/drafts
  → pending_review
  → 用户确认或对应 Gate 通过
  → active 正式文档
```

提升权限如下：

- `spec.md`：用户明确确认后才能提升；
- `plan.md`：Spec 通过且用户确认后才能提升；
- `task.md`：Plan 通过后由工作流生成并登记；
- RCP、Review、Verify 等内部记录：由对应 Workflow Gate 登记；
- README：只读取已登记的有效文档。

并发规则：

- 同一需求允许多个对话并行创建草稿；
- 正式提升时必须校验 `base_revision`；
- 版本过期的草稿标记为 `stale`，不能直接覆盖；
- 必须重新读取当前版本后合并；
- 同一时刻只允许一个对话提升正式文档。

同一需求只允许一套当前有效的正式文档。Spec 发生实质变化时，旧 Plan/Task 失效。

## 8. 文档登记契约

插件产出文件必须登记以下元数据：

```text
document_id
request_id
conversation_id
document_kind
path
authority
status
revision
source
generated_by
supersedes
related_documents
```

`scan` 只发现和校正索引，不自动提升文档权威性。未登记文件标记为 `unregistered` 或 `legacy`；`validate` 必须报告路径冲突、重复文档、失效引用、版本过期和未登记文件。

原文是内容来源，索引只保存关系、状态、版本和来源，不复制正文。

## 9. 生命周期

```text
draft → pending_review → active → superseded → archived
```

补充状态：`rejected`、`blocked`、`stale`、`unregistered`、`legacy`。

- 只有 `active` 进入默认上下文和 README；
- `superseded`、`archived`、`rejected`、`stale` 默认不加载；
- 需求完成后文件保留，需求及其文档进入 `archived`；
- 归档内容只能在明确追溯时加载；
- 任何状态变化必须写入索引和事件记录。

## 10. 上下文选择

### 项目级

加载受管 README、活跃需求索引和活跃共享决策，不加载全部正文。

### 需求级

加载当前有效 `spec.md`、`plan.md`、`task.md`、最新交接、阻塞项、相关验证记录和引用的共享决策。

### 对话级

优先加载当前对话交接，再加载需求当前文档；不默认加载全部历史对话。

### 预算边界

- 上下文按优先级和预算限制加载；
- 超出预算时先摘要化，再考虑增加历史材料；
- 归档文档、旧版本和无关需求必须显式请求才加载；
- 摘要必须保留来源路径、状态、版本、阻塞项和未验证项。

## 11. README 规则

README 是项目级派生索引，不是需求正文：

- 只更新 `workflow-document-context` 的受管区块；
- 保留所有非受管手写内容；
- 只展示已登记且有效的需求、共享决策和项目报告；
- 不展示草稿、历史对话和归档需求；
- 每个条目链接回原始文件；
- README 内容变化由索引变化或显式同步触发。

## 12. 证据和边界

| 类型 | 规则 |
|---|---|
| `confirmed` | 当前仓库中存在的 Skill、README、目录和测试事实 |
| `user-confirmed` | 本会话确认的归属、生命周期、并发和上下文规则 |
| `inferred` | 由目录或文件名推断的文档关系，必须标明推断 |
| `unverified` | 真实宿主是否自动调用、浏览器行为、外部项目接入情况 |

静态扫描、索引生成和主机测试不能证明真实宿主行为、目标板运行或硬件验证。

## 13. 验收标准

| ID | 验收项 | 预期结果 |
|---|---|---|
| V-01 | 需求归属 | 正式文档以 `REQ-*` 为唯一主归属 |
| V-02 | 多对话 | 同一需求的多个对话不复制正式文档 |
| V-03 | 多需求对话 | 每次文档操作绑定一个 `active_request_id` |
| V-04 | 草稿提升 | 未确认草稿不能覆盖正式文档 |
| V-05 | 提升权限 | Spec/Plan/Task 按本 Spec 的确认规则提升 |
| V-06 | 并发 | 过期草稿标记 `stale`，不能静默覆盖 |
| V-07 | 共享决策 | 跨需求结论使用 `DEC-*` 引用 |
| V-08 | 登记 | 插件产出必须有文档索引记录 |
| V-09 | 扫描 | `scan` 不自动提升文档权威性 |
| V-10 | 生命周期 | active、superseded、archived 等状态可区分 |
| V-11 | 上下文 | 项目、需求、对话按最小集合加载 |
| V-12 | 预算 | 超出预算时摘要化，不加载全部历史正文 |
| V-13 | README | 只更新受管区块，不复制正文和历史 |
| V-14 | 迁移 | 旧文档首次扫描不自动移动、重命名或删除 |
| V-15 | 追溯 | 文档可回溯到需求、对话、版本和来源 |

## 14. 需求变化规则

如果后续变化影响文档归属、提升权限、生命周期、并发、上下文预算、README 范围或验收标准，必须回到本 Spec 重新确认；未经重新确认不得生成 Plan 或修改实现契约。

## 15. 当前状态

```text
spec_status: approved-for-integration-plan
plan_status: not_started
task_status: not_started
implementation_allowed: false
blockers: none
```
