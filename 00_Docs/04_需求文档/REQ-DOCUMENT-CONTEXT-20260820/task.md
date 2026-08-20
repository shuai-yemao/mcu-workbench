# 实施任务清单：插件文档与多对话上下文管理

## 1. 元数据

| 字段 | 内容 |
|---|---|
| request_id | `REQ-DOCUMENT-CONTEXT-20260820` |
| 任务清单版本 | `v0.1` |
| 状态 | `可交付` |
| 项目路径与提交 | `C:\\Users\\zhang\\Documents\\mcu-workbench @ host_ai/9d5a3094456dc7238e321403070ab1c360b6e70d` |
| 输入 spec.md | `C:\\Users\\zhang\\Documents\\mcu-workbench\\00_Docs\\04_需求文档\\REQ-DOCUMENT-CONTEXT-20260820\\spec.md` |
| 输入 plan.md | `C:\\Users\\zhang\\Documents\\mcu-workbench\\00_Docs\\04_需求文档\\REQ-DOCUMENT-CONTEXT-20260820\\plan.md` |
| Spec 力度 | `full` |
| 风险叠加门禁 | `human_review, versioned, context_budget` |
| 生成时间 | `2026-08-20T00:00:00+08:00` |
| 阶段级 Agent/Skill 基线 | `plan.md §8A` |
| 下游执行 Skill | `workflow-task-execution` |

可信等级：`confirmed`、`user-confirmed`、`inferred`、`unverified`。影响范围、顺序或验收的 `inferred/unverified` 项必须在执行中补证，不能静默扩大范围。

## 2. 总体任务图

```text
T-001 → T-002 → T-003 → T-004
  │                  │       │
  └→ T-005 ──────────┘       └→ T-006
                             ↓
                         T-007 → T-008 → T-009
```

- 总体目标：建立独立的 Context 存储、README 管理、需求/对话登记和最小上下文选择能力，并从 Claude 层移除 README 责任。
- 非目标：不修改固件、HAL、RTOS、BSP、Vendor、宿主 Hook、Manifest、普通手写文档或无关用户变更。
- 关键串行链：`T-001 → T-002 → T-003 → T-004 → T-006 → T-007 → T-008 → T-009`。
- 可并行组：`T-005` 可在 T-001 完成后准备，但在 T-002/T-003 完成前不得合并；测试任务必须等待对应实现任务。
- 不可并行原因：README 提取与 Claude core 共享当前实现；索引、提升和 Context selector 共享状态契约。

## 3. 任务索引

| 顺序 | task_id | 任务名称 | 前置任务 | 并行组 | 主 Agent | 主实现 Skill | 辅助 Skill | 验证等级 | 状态 |
|---:|---|---|---|---|---|---|---|---|---|
| 1 | T-001 | 固化 README 行为基线并拆分扫描/渲染模块 | none | none | `system-architect` | `workflow-document-context` | `tools-verification` | host | pass |
| 2 | T-002 | 建立文档索引、状态和事件存储 | T-001 | none | `firmware-engineer` | `workflow-document-context` | `tools-verification` | host | pass |
| 3 | T-003 | 建立需求、对话、共享决策和生命周期 API | T-002 | none | `firmware-engineer` | `workflow-document-context` | `tools-verification` | host | pass |
| 4 | T-004 | 建立分级上下文选择和预算摘要 | T-003 | none | `system-architect` | `workflow-document-context` | `tools-verification` | host | pass |
| 5 | T-005 | 移除 Claude core 的 README 实现责任 | T-001 | G-README | `system-architect` | `workflow-claude-layering` | `workflow-document-context` | host | pass |
| 6 | T-006 | 完成 Context facade、CLI 和旧入口兼容转发 | T-003、T-005 | none | `firmware-engineer` | `workflow-document-context` | `workflow-claude-layering` | host | pass |
| 7 | T-007 | 迁移并补齐 Context/Claude 回归测试 | T-004、T-006 | none | `verification-engineer` | `tools-verification` | `tools-quality` | host | pass |
| 8 | T-008 | 更新 Skill、README、npm 入口和迁移说明 | T-006、T-007 | none | `knowledge-engineer` | `workflow-document-context` | `tools-quality` | static | pass |
| 9 | T-009 | 执行集成回归并形成最终交接 | T-008 | none | `embedded-lead` | `workflow-final-review` | `tools-verification`, `tools-quality` | static/host | pass |

## 4. 任务详情

### T-001：固化 README 行为基线并拆分扫描/渲染模块

| 字段 | 内容 |
|---|---|
| order | `1` |
| parallel_group | `none` |
| source_plan_ids | `P-01`, `P-02` |
| source_spec_ids | `V-08`, `V-13`, `V-14` |
| owner_agent | `system-architect` |
| support_agents | `verification-engineer` |
| owner_skill | `workflow-document-context` |
| supporting_skills | `tools-verification` |
| allocation_evidence | 当前 README 扫描/渲染集中在 `lib/claude-layer.js:22-929`，Context Skill 已拥有公开入口；需要先建立行为基线再物理拆分。 |
| confidence | `confirmed` |
| status | `pass` |

#### 目标

在不改变 README 受管区块、排除目录、漂移检测和手写内容保留行为的前提下，形成独立的 `lib/document-context-readme.js`。

#### 范围

- 包含：扫描配置、README 受管标记、README 文本渲染、静态摘要、状态摘要和漂移比较的抽取。
- 不包含：需求登记、草稿提升、Context 预算、Claude.md、`.claude/rules/`。
- 文件范围：`lib/document-context-readme.js`、`tests/document-context.test.js`、必要的测试夹具。
- 所属层：Tools/Workflow 文档管理。

#### 前置条件与依赖

- 前置任务：无。
- 外部前提：当前 Node/Jest 入口可用。
- 依赖证据：`lib/claude-layer.js`、`tests/claude-layering.test.js`、`tests/document-context.test.js`。

#### 执行步骤

1. 为现有 README 行为补充或迁移特征测试，覆盖根 README、架构目录 README、手写区块、排除目录和漂移。
2. 抽出 README 相关常量、扫描函数、渲染函数和状态摘要函数。
3. 让 Context 入口使用新模块，保持现有输出和错误码。
4. 对比抽取前后的 README 受管区块和测试结果。

#### 输出物

- `lib/document-context-readme.js`
- 更新后的 `tests/document-context.test.js`
- README 行为特征测试输出

#### 约束边界

- 只允许修改 README 受管区块，不覆盖手写内容。
- 不读取或写入 Claude 规则文件。
- 不引入运行时依赖，不改变现有配置路径语义。

#### 验证

| 字段 | 内容 |
|---|---|
| 证据等级 | `host` |
| 命令或条件 | `cwd=C:\\Users\\zhang\\Documents\\mcu-workbench`; `npm test -- --runInBand tests/document-context.test.js` |
| 预期结果 | README 生成、手写内容保留、漂移检测和排除目录测试通过 |
| 产物位置 | Jest 输出；临时夹具位于系统临时目录 |
| 当前状态 | `not-run` |

#### 执行记录

- allocation_id: `T-001-20260820-readme-boundary`
- primary_agent: `system-architect`
- support_agents: `verification-engineer`
- primary_implementation_skill: `workflow-document-context`
- supporting_skills: `tools-verification`
- allocation_basis: `task.md T-001`、`plan.md P-01/P-02`、`lib/claude-layer.js:22-929`
- scope_boundary: 仅抽取 README 管理入口和行为测试，不修改 Claude 规则产物。
- tests_first: 待补充 `tests/document-context-readme.test.js`，先证明独立模块尚不存在。

#### 失败处理与回滚

- 失败现象：README 内容、受管标记或漂移结果变化。
- 定位顺序：扫描快照 → 受管区块边界 → 渲染输入 → 测试夹具。
- 重试/降级：保留旧 `lib/claude-layer.js` 实现，修正抽取后再切换。
- 回滚：撤销 T-001 新文件和测试迁移，不删除项目 README。
- 回传条件：发现现有行为与 Spec 冲突时回传 `workflow-integration-plan`。

### T-002：建立文档索引、状态和事件存储

| 字段 | 内容 |
|---|---|
| order | `2` |
| parallel_group | `none` |
| source_plan_ids | `P-01` |
| source_spec_ids | `V-01`, `V-08`, `V-10`, `V-15` |
| owner_agent | `firmware-engineer` |
| support_agents | `verification-engineer` |
| owner_skill | `workflow-document-context` |
| supporting_skills | `tools-verification` |
| allocation_evidence | Spec §8 定义 document 元数据和状态，Plan §7 定义 `.mcu-workbench/document-context/` 布局及原子写入要求。 |
| confidence | `user-confirmed` |
| status | `in_progress` |

#### 执行记录

- allocation_id: `T-002-20260820-context-store`
- primary_agent: `firmware-engineer`
- support_agents: `verification-engineer`
- primary_implementation_skill: `workflow-document-context`
- supporting_skills: `tools-verification`
- allocation_basis: `task.md T-002`、`plan.md P-01`、`spec.md §8`
- scope_boundary: 仅处理 Context 索引、状态、revision、原子写入和事件，不处理 README 或 CLI。
- tests_first: 待补充 store 的合法写入、损坏 JSON 和 revision 冲突测试。

#### 目标

提供独立的 store API，可靠读写项目、文档、对话、共享决策索引及 JSONL 事件。

#### 范围

- 包含：`lib/document-context-store.js`、索引文件、原子替换、JSON/JSONL 校验、revision 和状态映射。
- 不包含：README 渲染、CLI 参数解析、正式文档正文编辑。
- 文件范围：`lib/document-context-store.js`、`tests/document-context-store.test.js`。
- 所属层：Tools/Workflow 状态存储。

#### 前置条件与依赖

- 前置任务：T-001。
- 外部前提：项目根目录可写 `.mcu-workbench/document-context/`。
- 依赖证据：Spec §5、§8、§9；现有 `lib/claude-layer.js` 的原子写入模式可作为静态参考。

#### 执行步骤

1. 定义文档、需求、对话、决策和项目索引的最小 JSON 结构。
2. 实现读取、Schema/字段校验、`request_id`/revision 校验和状态转换检查。
3. 实现临时文件加原子替换，以及 JSONL 事件追加。
4. 为损坏 JSON、request 不一致、过期 revision、写入失败补充失败测试。

#### 输出物

- `lib/document-context-store.js`
- `tests/document-context-store.test.js`
- 临时目录中的索引和事件夹具

#### 约束边界

- 原索引写入失败时必须保留旧文件。
- 不允许通过删除旧状态绕过冲突检查。
- 不存储完整对话正文，不复制需求文档正文。

#### 验证

| 字段 | 内容 |
|---|---|
| 证据等级 | `host` |
| 命令或条件 | `cwd=C:\\Users\\zhang\\Documents\\mcu-workbench`; `npm test -- --runInBand tests/document-context-store.test.js` |
| 预期结果 | 合法写入、非法输入阻塞、revision 冲突和旧状态保留测试通过 |
| 产物位置 | Jest 输出；临时索引位于系统临时目录 |
| 当前状态 | `not-run` |

#### 失败处理与回滚

- 失败现象：索引损坏、事件无法追加或状态被错误覆盖。
- 定位顺序：Schema → 路径 → 临时文件 → rename/替换 → 事件追加。
- 重试/降级：只重试可恢复的临时文件写入；状态冲突直接返回 `stale/blocked`。
- 回滚：删除新增 store 文件和测试夹具，保留项目已有 `.mcu-workbench` 状态。
- 回传条件：需要改变状态契约或正式文档格式时回传上游。

### T-003：建立需求、对话、共享决策和生命周期 API

| 字段 | 内容 |
|---|---|
| order | `3` |
| parallel_group | `none` |
| source_plan_ids | `P-03`, `P-04` |
| source_spec_ids | `V-01`–`V-10`, `V-15` |
| owner_agent | `firmware-engineer` |
| support_agents | `system-architect`, `verification-engineer` |
| owner_skill | `workflow-document-context` |
| supporting_skills | `tools-verification` |
| allocation_evidence | Spec §6–§9 明确 `REQ/CONV/DEC` 关系、草稿提升、并发和生命周期；T-002 提供持久化边界。 |
| confidence | `user-confirmed` |
| status | `in_progress` |

#### 执行记录

- allocation_id: `T-003-20260820-request-conversation-lifecycle`
- primary_agent: `firmware-engineer`
- support_agents: `system-architect`, `verification-engineer`
- primary_implementation_skill: `workflow-document-context`
- supporting_skills: `tools-verification`
- allocation_basis: `task.md T-003`、`plan.md P-03/P-04`、`spec.md §6-§9`
- scope_boundary: 仅实现实体登记、交接、草稿提升、归档和状态事件，不实现上下文排序或 CLI。
- tests_first: 待补充多对话、多需求、DEC、stale 和 archive 测试。

#### 目标

实现需求登记、对话交接、共享决策、草稿提升、版本冲突和归档操作。

#### 范围

- 包含：`registerDocument`、`registerConversation`、`registerDecision`、`writeHandoff`、`promoteDraft`、`archiveRequest` 等 facade/store 操作。
- 不包含：上下文排序算法、README 生成、正式文档内容生成。
- 文件范围：`lib/document-context.js`、必要的 store 辅助函数、`tests/document-context.test.js`。
- 所属层：Tools/Workflow 文档上下文管理。

#### 前置条件与依赖

- 前置任务：T-002。
- 外部前提：请求 ID、对话 ID 和文档路径由调用方提供并经过校验。
- 依赖证据：Spec §6–§9；T-002 store API。

#### 执行步骤

1. 实现 `REQ-*`、`CONV-*`、`DEC-*` 和 `document_id` 的关系登记。
2. 实现草稿状态检查、用户/Gate 状态检查和 `base_revision` 校验。
3. 实现 active、superseded、stale、rejected、blocked、archived 状态流转。
4. 实现 handoff 最小字段和来源追溯。
5. 为同一需求多对话、一个对话多需求和共享决策补充测试。

#### 输出物

- 更新后的 `lib/document-context.js`
- 更新后的 `tests/document-context.test.js`
- Context 索引、handoff 和 DEC 测试夹具

#### 约束边界

- 每次正式文档操作必须绑定唯一 `active_request_id`。
- 正式文档不得由对话目录拥有。
- 过期草稿不得静默覆盖 active 文档。

#### 验证

| 字段 | 内容 |
|---|---|
| 证据等级 | `host` |
| 命令或条件 | `cwd=C:\\Users\\zhang\\Documents\\mcu-workbench`; `npm test -- --runInBand tests/document-context.test.js` |
| 预期结果 | 关系、状态、提升、冲突和归档测试通过 |
| 产物位置 | Jest 输出；临时 Context 目录 |
| 当前状态 | `not-run` |

#### 失败处理与回滚

- 失败现象：错误归属、跨需求串写、旧版本被覆盖或状态跳转非法。
- 定位顺序：active_request_id → relation record → revision → state transition → event。
- 重试/降级：冲突返回 `stale`，要求重新读取，不自动合并正文。
- 回滚：回滚 facade 和测试，不删除已有原始文档。
- 回传条件：需要改变用户确认权限或正式文档状态时回传 Spec。

### T-004：建立分级上下文选择和预算摘要

| 字段 | 内容 |
|---|---|
| order | `4` |
| parallel_group | `none` |
| source_plan_ids | `P-03`, `P-04` |
| source_spec_ids | `V-04`, `V-07`, `V-11`, `V-12` |
| owner_agent | `system-architect` |
| support_agents | `verification-engineer` |
| owner_skill | `workflow-document-context` |
| supporting_skills | `tools-verification` |
| allocation_evidence | Spec §10 明确项目/需求/对话三级读取和超预算摘要规则；必须在 API 层独立验证。 |
| confidence | `user-confirmed` |
| status | `in_progress` |

#### 执行记录

- allocation_id: `T-004-20260820-context-selector`
- primary_agent: `system-architect`
- support_agents: `verification-engineer`
- primary_implementation_skill: `workflow-document-context`
- supporting_skills: `tools-verification`
- allocation_basis: `task.md T-004`、`plan.md P-03/P-04`、`spec.md §10`
- scope_boundary: 仅实现项目/需求/对话 profile 的筛选和预算摘要，不接入真实宿主 token API。
- tests_first: 待补充 active/archive/无关需求过滤和 budget 摘要测试。

#### 目标

根据项目、需求或对话 profile，按状态、优先级和预算生成最小上下文输入清单。

#### 范围

- 包含：Context profile、active 文档筛选、最新 handoff、共享决策引用、阻塞/未验证保留和预算摘要。
- 不包含：真实宿主 token 计量、对话全文解析、外部模型调用。
- 文件范围：`lib/document-context-context-selector.js`、`tests/document-context-context.test.js`。
- 所属层：Tools/Workflow Context selector。

#### 前置条件与依赖

- 前置任务：T-003。
- 外部前提：索引中存在状态、路径和来源字段。
- 依赖证据：Spec §10；T-003 的登记和交接 API。

#### 执行步骤

1. 实现 project/request/conversation 三种 profile。
2. 过滤非 active、非相关或未登记文档。
3. 按优先级加入当前正式文档、最新交接、阻塞项、验证和 DEC 引用。
4. 超出模拟预算时生成带来源的摘要，不加载历史全文。
5. 测试归档、旧版本、其他需求和预算超限场景。

#### 输出物

- `lib/document-context-context-selector.js`
- `tests/document-context-context.test.js`

#### 约束边界

- 不能把静态 README 说明提升为硬件或架构验证结论。
- 不能默认读取全部历史对话或归档文档。
- 摘要必须保留源路径、状态、版本、阻塞和未验证项。

#### 验证

| 字段 | 内容 |
|---|---|
| 证据等级 | `host` |
| 命令或条件 | `cwd=C:\\Users\\zhang\\Documents\\mcu-workbench`; `npm test -- --runInBand tests/document-context-context.test.js` |
| 预期结果 | 三种 profile、状态过滤和预算摘要测试通过 |
| 产物位置 | Jest 输出；Context snapshot 夹具 |
| 当前状态 | `not-run` |

#### 失败处理与回滚

- 失败现象：加载无关文档、遗漏阻塞项或预算超限仍返回全文。
- 定位顺序：profile → relation filter → status filter → priority → budget。
- 重试/降级：无法计算预算时返回明确 `unverified`，不伪造 token 数量。
- 回滚：删除 selector 和专项测试，不修改原文档。
- 回传条件：需要宿主级 token API 时回传 Spec，不在本任务猜测。

### T-005：移除 Claude core 的 README 实现责任

| 字段 | 内容 |
|---|---|
| order | `5` |
| parallel_group | `G-README` |
| source_plan_ids | `P-05` |
| source_spec_ids | `V-09`, `V-10`, `V-13` |
| owner_agent | `system-architect` |
| support_agents | `firmware-engineer` |
| owner_skill | `workflow-claude-layering` |
| supporting_skills | `workflow-document-context` |
| allocation_evidence | 用户选择方案 B；Plan P-05 明确删除 `readmeOnly` 和 README 逻辑，Claude Skill 只保留 Claude 产物。 |
| confidence | `user-confirmed` |
| status | `in_progress` |

#### 执行记录

- allocation_id: `T-005-20260820-claude-readme-removal`
- primary_agent: `system-architect`
- support_agents: `firmware-engineer`
- primary_implementation_skill: `workflow-claude-layering`
- supporting_skills: `workflow-document-context`
- allocation_basis: `task.md T-005`、`plan.md P-05`、`spec.md V-09/V-10`
- scope_boundary: Claude core 只保留 Claude.md、rules 和架构报告；README 由 Context API 管理。
- tests_first: 增加 Claude init 不再产生 README 的边界测试。

#### 目标

使 `lib/claude-layer.js` 不再扫描、生成、校验或保存 README 和 Context 状态。

#### 范围

- 包含：`lib/claude-layer.js`、`tests/claude-layering.test.js` 中与 Claude core 边界直接相关的断言。
- 不包含：Context README 实现本身、Claude.md、`.claude/rules/`、架构报告逻辑。
- 文件范围：计划列出的 Claude core 和测试文件。
- 所属层：Workflow Claude layering。

#### 前置条件与依赖

- 前置任务：T-001；T-002/T-003 完成后才能合并最终删除。
- 外部前提：Context README adapter 已能生成和校验 README。
- 依赖证据：`lib/claude-layer.js:899-1165`、`tests/claude-layering.test.js`。

#### 执行步骤

1. 删除 `readmeOnly` 分支、README 常量、扫描/渲染和 Context 状态写入。
2. 保留 Claude.md、`.claude/rules/`、Claude 架构报告及其状态。
3. 将 README 断言迁移或改写为 Context API 测试。
4. 运行 Claude layering 定向测试，确认 Claude 产物职责未退化。

#### 输出物

- 更新后的 `lib/claude-layer.js`
- 更新后的 `tests/claude-layering.test.js`
- Claude 与 Context 产物边界测试结果

#### 约束边界

- 不允许将 README 逻辑复制回 Claude core。
- 不改变 Claude.md、rules、架构报告的既有语义。
- 不删除用户已有 README 或 `.mcu-workbench` 状态。

#### 验证

| 字段 | 内容 |
|---|---|
| 证据等级 | `host` |
| 命令或条件 | `cwd=C:\\Users\\zhang\\Documents\\mcu-workbench`; `npm test -- --runInBand tests/claude-layering.test.js` |
| 预期结果 | Claude 测试通过且不再由 Claude core 生成 README |
| 产物位置 | Jest 输出 |
| 当前状态 | `not-run` |

#### 失败处理与回滚

- 失败现象：Claude 规则产物缺失或旧入口行为中断。
- 定位顺序：core artifact plan → state path → CLI adapter → test fixture。
- 重试/降级：暂不删除旧函数，修正新 adapter 后重新执行；不得恢复双重所有权。
- 回滚：回滚本任务代码差异，不删除 README/Claude 文件。
- 回传条件：需要保留双重 README 所有权时回传 Plan，不静默改变边界。

### T-006：完成 Context facade、CLI 和旧入口兼容转发

| 字段 | 内容 |
|---|---|
| order | `6` |
| parallel_group | `none` |
| source_plan_ids | `P-03`, `P-04`, `P-06` |
| source_spec_ids | `V-01`–`V-15` |
| owner_agent | `firmware-engineer` |
| support_agents | `toolchain-engineer` |
| owner_skill | `workflow-document-context` |
| supporting_skills | `workflow-claude-layering` |
| allocation_evidence | 当前 `scripts/document-context-api.js` 已是统一入口；Plan 要求增加操作并保留 `claude-layer` 旧入口的薄兼容转发。 |
| confidence | `confirmed` |
| status | `in_progress` |

#### 执行记录

- allocation_id: `T-006-20260820-context-cli`
- primary_agent: `firmware-engineer`
- support_agents: `toolchain-engineer`
- primary_implementation_skill: `workflow-document-context`
- supporting_skills: `workflow-claude-layering`
- allocation_basis: `task.md T-006`、`plan.md P-03/P-04/P-06`、现有 `scripts/document-context-api.js`
- scope_boundary: 仅扩展 facade/CLI 和兼容转发，不修改宿主 Hook 或正式文档正文。
- tests_first: 待补充 CLI action、参数错误和旧入口行为测试。

#### 目标

让 Context API 能通过稳定 CLI 执行登记、交接、提升、上下文、归档、扫描和校验，并使旧 README 命令有明确迁移路径。

#### 范围

- 包含：`lib/document-context.js`、`scripts/document-context-api.js`、`scripts/claude-layer-api.js`、`package.json`。
- 不包含：业务代码、宿主 Hook、外部数据库和网络服务。
- 文件范围：上述 CLI/facade 文件及其参数测试。
- 所属层：Tools/Workflow CLI。

#### 前置条件与依赖

- 前置任务：T-003、T-005。
- 外部前提：T-002 store、T-004 selector 和 T-005 Claude core 边界可用。
- 依赖证据：当前 `scripts/document-context-api.js`、`package.json:40-44`。

#### 执行步骤

1. 设计并实现 CLI 参数：绝对项目根、request、conversation、document、revision、write/strict 和 budget。
2. 将命令映射到 Context facade，输出结构化 JSON 和明确退出码。
3. 让旧 `claude-layer` README 相关动作输出迁移提示并转发，不重复实现 README。
4. 增加 npm script 和 CLI 使用测试。

#### 输出物

- 更新后的 facade、CLI 和 package scripts
- CLI 参数/退出码测试
- 迁移提示和命令说明

#### 约束边界

- 未带 `--write` 的操作只读。
- 所有写操作必须校验 request/conversation/revision。
- CLI 不直接拼接或修改正式文档正文。

#### 验证

| 字段 | 内容 |
|---|---|
| 证据等级 | `host` |
| 命令或条件 | `cwd=C:\\Users\\zhang\\Documents\\mcu-workbench`; `npm test -- --runInBand tests/document-context-cli.test.js` |
| 预期结果 | 合法命令退出 0，参数错误退出 2，状态阻塞退出非 0，旧入口有迁移行为 |
| 产物位置 | Jest 输出和临时 JSON 状态 |
| 当前状态 | `not-run` |

#### 失败处理与回滚

- 失败现象：旧命令静默无效、写入越权或退出码错误。
- 定位顺序：参数解析 → facade mapping → store 状态 → compat routing。
- 重试/降级：保留旧 CLI 参数解析，仅替换动作分发。
- 回滚：回滚 CLI/package 变更，不删除索引和原始文档。
- 回传条件：需要宿主 Hook 或远程服务时回传 Spec。

### T-007：迁移并补齐 Context/Claude 回归测试

| 字段 | 内容 |
|---|---|
| order | `7` |
| parallel_group | `none` |
| source_plan_ids | `P-07`, `P-08` |
| source_spec_ids | `V-01`–`V-13` |
| owner_agent | `verification-engineer` |
| support_agents | `toolchain-engineer` |
| owner_skill | `tools-verification` |
| supporting_skills | `tools-quality` |
| allocation_evidence | Plan P-07/P-08 明确 README 测试迁移、Context 专项测试和 Claude 回归；当前测试文件位置已由仓库确认。 |
| confidence | `confirmed` |
| status | `in_progress` |

#### 执行记录

- allocation_id: `T-007-20260820-context-regression`
- primary_agent: `verification-engineer`
- support_agents: `toolchain-engineer`
- primary_implementation_skill: `tools-verification`
- supporting_skills: `tools-quality`
- allocation_basis: `task.md T-007`、`plan.md P-07/P-08`、现有 Context/Claude Jest 测试入口。
- scope_boundary: 只补回归测试、迁移 README 断言和记录基线，不修改生产实现。
- tests_first: 先运行 Context/Claude 定向回归，确认当前实现的覆盖缺口。

#### 目标

形成覆盖 Context 关系、状态、并发、预算、README 边界和 Claude 产物的主机回归集。

#### 范围

- 包含：`tests/document-context.test.js`、新增 Context 测试、`tests/claude-layering.test.js`、必要的测试辅助文件。
- 不包含：目标板、交叉编译、宿主自动触发或浏览器行为。
- 文件范围：测试目录中与本需求直接相关的文件。
- 所属层：Verification。

#### 前置条件与依赖

- 前置任务：T-004、T-006。
- 外部前提：Node/Jest 可执行。
- 依赖证据：当前 Context/Claude 测试、Spec 验收 V-01–V-10。

#### 执行步骤

1. 将 README 特征测试归入 Context 测试。
2. 增加多需求、多对话、DEC、stale、archive 和 budget 测试。
3. 增加 Claude 不生成 README、Context 生成 README 的边界测试。
4. 先运行定向测试，再记录既有全量测试基线差异。

#### 输出物

- 测试文件和测试夹具
- 定向 Jest 输出
- 基线差异记录

#### 约束边界

- 主机测试不能写成宿主行为或硬件验证。
- 不为通过测试修改无关 `.opencode/commands` 或用户 agent 文件。

#### 验证

| 字段 | 内容 |
|---|---|
| 证据等级 | `host` |
| 命令或条件 | `cwd=C:\\Users\\zhang\\Documents\\mcu-workbench`; `npm test -- --runInBand tests/document-context.test.js tests/claude-layering.test.js tests/document-context-store.test.js tests/document-context-context.test.js tests/document-context-cli.test.js` |
| 预期结果 | 本需求定向测试全部通过；任何既有失败单独列出 |
| 产物位置 | Jest 输出 |
| 当前状态 | `not-run` |

#### 失败处理与回滚

- 失败现象：行为回归、测试夹具混淆或新增失败。
- 定位顺序：模块定向测试 → Context/Claude 边界 → package/fixture → 全量基线。
- 重试/降级：保留最小失败夹具，不通过放宽断言隐藏问题。
- 回滚：回滚本任务测试迁移，不删除生产文档。
- 回传条件：测试证明 Spec/Plan 不可满足时回传上游。

### T-008：更新 Skill、README、npm 入口和迁移说明

| 字段 | 内容 |
|---|---|
| order | `8` |
| parallel_group | `none` |
| source_plan_ids | `P-09` |
| source_spec_ids | `V-13`, `V-14`, `V-15` |
| owner_agent | `knowledge-engineer` |
| support_agents | `verification-engineer` |
| owner_skill | `workflow-document-context` |
| supporting_skills | `tools-quality` |
| allocation_evidence | Plan P-09 要求同步 Context/Claude Skill、README、package 入口；当前仓库已有这些文件和 catalog 入口。 |
| confidence | `confirmed` |
| status | `in_progress` |

#### 执行记录

- allocation_id: `T-008-20260820-context-documentation`
- primary_agent: `knowledge-engineer`
- support_agents: `verification-engineer`
- primary_implementation_skill: `workflow-document-context`
- supporting_skills: `tools-quality`
- allocation_basis: `task.md T-008`、`plan.md P-09`、当前两个 Skill 文件、README 和 package scripts。
- scope_boundary: 只更新文档、命令说明和受管入口，不改变 Spec/Plan/Task 规则或无关宿主适配。
- tests_first: 先运行链接/插件静态检查，确认新增实现文件和文档入口的当前校验状态。

#### 目标

使项目文档明确表达新的职责边界、文件布局、CLI、兼容迁移和验证等级。

#### 范围

- 包含：`skills/workflow/workflow-document-context/SKILL.md`、`skills/workflow/workflow-claude-layering/SKILL.md`、`README.md`、`package.json` 中的说明性入口。
- 不包含：新增需求、改变 Spec/Plan/Task 规则或修改无关 README 手写内容。
- 文件范围：Plan P-09 列出的文档和 npm 配置。
- 所属层：Documentation/Workflow。

#### 前置条件与依赖

- 前置任务：T-006、T-007。
- 外部前提：CLI 和测试行为已稳定。
- 依赖证据：当前两个 Skill 文件、README 的 Context 章节和 package scripts。

#### 执行步骤

1. 更新 Context Skill 的职责、命令、状态、交接和上下文预算说明。
2. 更新 Claude Skill 的非职责和兼容迁移说明。
3. 更新根 README 的目录、命令和验证边界。
4. 检查 Markdown 链接、Skill catalog 和 npm script 一致性。

#### 输出物

- 更新后的 Skill/README/package 文档
- 链接和插件结构检查输出

#### 约束边界

- 不把静态扫描写成编译、烧录或目标板验证。
- 不删除手写 README 区块。
- 不修改公共 `common/` 或其他宿主适配层。

#### 验证

| 字段 | 内容 |
|---|---|
| 证据等级 | `static` |
| 命令或条件 | `cwd=C:\\Users\\zhang\\Documents\\mcu-workbench`; `npm run validate:plugin`; `npm run validate:links`; `git diff --check` |
| 预期结果 | 插件结构、Markdown 链接和差异检查通过 |
| 产物位置 | 命令输出 |
| 当前状态 | `not-run` |

#### 失败处理与回滚

- 失败现象：Skill 未登记、链接失效或职责描述与代码不一致。
- 定位顺序：catalog → Skill frontmatter → README 链接 → npm scripts。
- 重试/降级：只修复本任务范围内的文档和入口。
- 回滚：回滚文档和 package 说明，不回滚实现模块。
- 回传条件：发现需要新增 Skill 或宿主能力时回传 Plan。

### T-009：执行集成回归并形成最终交接

| 字段 | 内容 |
|---|---|
| order | `9` |
| parallel_group | `none` |
| source_plan_ids | `P-10` |
| source_spec_ids | `V-11`–`V-14` |
| owner_agent | `embedded-lead` |
| support_agents | `verification-engineer`, `toolchain-engineer` |
| owner_skill | `workflow-final-review` |
| supporting_skills | `tools-verification`, `tools-quality` |
| allocation_evidence | Plan P-10 要求最终对照 Spec 检查；项目 AGENTS.md 要求区分定向测试、插件校验、链接、差异和既有基线失败。 |
| confidence | `confirmed` |
| status | `pass` |

#### 执行记录

- allocation_id: `T-009-20260820-final-integration`
- primary_agent: `embedded-lead`
- support_agents: `verification-engineer`, `toolchain-engineer`
- primary_implementation_skill: `workflow-final-review`
- supporting_skills: `tools-verification`, `tools-quality`
- allocation_basis: `task.md T-009`、`plan.md P-10`、项目 AGENTS.md 验证分层规则。
- scope_boundary: 只执行回归和证据交接；发现 Spec 偏差时回传，不在最终检查中扩大修复。
- tests_first: 已有 T-001 至 T-008 定向测试证据；本任务执行全量回归。
- execution_result: T-001 至 T-009 已完成；最终复核补充了 Spec/Plan 用户确认门禁和 README 损坏状态结构化阻塞测试。

#### 目标

完成实现后按 Spec 进行统一 Verify 前的集成回归，并形成交接给 `workflow-final-review` 的证据包。

#### 范围

- 包含：受影响定向测试、插件校验、链接检查、`git diff --check`、基线比较和内部交接记录。
- 不包含：在 Verify 阶段直接修复功能、重新设计 Spec/Plan 或修改无关失败。
- 文件范围：测试输出、`.mcu-workbench/workflows/REQ-DOCUMENT-CONTEXT-20260820/` 运行事件。
- 所属层：Workflow/Verification。

#### 前置条件与依赖

- 前置任务：T-008；所有前置任务必须通过各自验证。
- 外部前提：工作区路径和分支未发生越界变化。
- 依赖证据：Spec §13、Plan §11、既有 `git status --short` 基线。

#### 执行步骤

1. 运行本需求定向 Jest 和现有 Context/Claude 回归。
2. 运行 `npm run validate:plugin`、`npm run validate:links` 和 `git diff --check`。
3. 运行全量 Jest，区分本需求新增失败与已知用户基线失败。
4. 对照 Spec V-01–V-15 记录静态/主机/宿主未验证边界。
5. 只有所有 Task 通过后，交接给 `workflow-final-review` 执行最终 Verify。

#### 输出物

- 测试和校验命令输出
- `.mcu-workbench/workflows/REQ-DOCUMENT-CONTEXT-20260820/events.jsonl` 事件
- Final Review 交接摘要

#### 约束边界

- 不把主机测试描述为真实宿主自动触发或硬件验证。
- 发现 Spec 偏差时回传 Spec，不在本任务直接修补后放行。
- 不修改无关 agents、OpenCode 生成文件或用户已有变更。

#### 验证

| 字段 | 内容 |
|---|---|
| 证据等级 | `static/host` |
| 命令或条件 | `cwd=C:\\Users\\zhang\\Documents\\mcu-workbench`; `npm test -- --runInBand`; `npm run validate:plugin`; `npm run validate:links`; `git diff --check` |
| 预期结果 | 本需求无新增失败，插件/链接/差异检查通过；已知基线失败单独报告 |
| 产物位置 | Jest/校验输出和内部工作流事件 |
| 当前状态 | `pass` |

#### 失败处理与回滚

- 失败现象：回归失败、范围越界或证据等级混淆。
- 定位顺序：定向测试 → 插件结构 → 链接/差异 → 全量基线 → Spec 追踪。
- 重试/降级：普通测试失败可诊断修复并复测；新增需求决策才暂停。
- 回滚：不在最终 Verify 阶段回滚或修改功能；将偏差交回对应上游。
- 回传条件：Spec/Plan 范围、用户选择、接口或验收标准变化。

#### 最终交接证据

- `npm test -- --runInBand`：49 suites、300 tests 全部通过，证据等级 `host`。
- `npm run validate:plugin`：51 skills、7 agents、8 架构层通过，证据等级 `static`。
- `npm run validate:links`：322 Markdown 文件链接通过，证据等级 `static`。
- `node --check`：本需求 JavaScript 文件通过，证据等级 `static`。
- `git diff --check`：通过，证据等级 `static`。
- `npm run build`：项目占位构建入口返回 0；未形成固件交叉编译证据。
- `workflow-final-review` 边界：未执行目标板、宿主自动触发、烧录、串口/RTT 或硬件实测；这些仍为 `unverified`。

## 5. 任务级验收汇总

| task_id | 验收项 | 证据等级 | 命令/条件 | 预期结果 | 产物 | 状态 |
|---|---|---|---|---|---|---|
| T-001 | README 行为基线与独立模块 | host | `npm test -- --runInBand tests/document-context.test.js` | 既有 README 行为保持 | Jest 输出 | pass |
| T-002 | Store 原子写入和冲突 | host | `npm test -- --runInBand tests/document-context-store.test.js` | 非法输入阻塞，旧状态保留 | Jest 输出 | pass |
| T-003 | 关系、提升和生命周期 | host | `npm test -- --runInBand tests/document-context.test.js` | 多需求/多对话/DEC 正确 | Jest 输出 | pass |
| T-004 | Context profile 和预算 | host | `npm test -- --runInBand tests/document-context-context.test.js` | 只返回最小有效集合 | Jest 输出 | pass |
| T-005 | Claude/Context 职责边界 | host | `npm test -- --runInBand tests/claude-layering.test.js` | Claude 不再生成 README | Jest 输出 | pass |
| T-006 | CLI 和旧入口 | host | `npm test -- --runInBand tests/document-context-cli.test.js` | 退出码和兼容转发正确 | Jest 输出 | pass |
| T-007 | 定向回归 | host | Context/Claude 专项 Jest | 本需求专项测试通过 | Jest 输出 | pass |
| T-008 | 文档和插件结构 | static | `npm run validate:plugin`; `npm run validate:links`; `git diff --check` | 全部通过 | 命令输出 | pass |
| T-009 | 集成交接 | static/host | 全量 Jest、插件、链接、差异检查 | 无新增失败，交接完整 | 运行记录 | pass |

Task 级测试不等同最终 Verify；所有 Task 通过后才进入统一 Verify。

## 6. 阻塞与未验证项

| ID | 类型 | 内容 | 影响任务 | 补证动作 | 状态 |
|---|---|---|---|---|---|
| B-01 | 未验证 | 真实 Codex/Claude 是否自动调用新 Context Skill | T-006、T-009 | 真实宿主会话单独验证 | open |
| B-02 | 未验证 | 真实宿主的 token 预算计量接口 | T-004 | 先使用可测试的字符/条目预算；发现宿主依赖则回传 Spec | open |
| B-03 | 基线 | `.opencode/commands` 与用户修改的 `agents/*.md` 当前存在既有全量测试差异 | T-007、T-009 | 记录基线，不擅自生成无关文件 | open |

## 7. 下游交接

- 需求/约束输入：`C:\\Users\\zhang\\Documents\\mcu-workbench\\00_Docs\\04_需求文档\\REQ-DOCUMENT-CONTEXT-20260820\\spec.md`
- 实施路线输入：`C:\\Users\\zhang\\Documents\\mcu-workbench\\00_Docs\\04_需求文档\\REQ-DOCUMENT-CONTEXT-20260820\\plan.md`
- 任务清单：本文件
- 阶段级 Agent/Skill 基线：`plan.md §8A`
- 执行规则：按 `T-001 → T-002 → T-003 → T-004 → T-006 → T-007 → T-008 → T-009` 执行；T-005 可在 T-001 后准备，但必须在 T-002/T-003 完成后合并；不得跳过前置任务。
- 代码完成后：交接 `spec.md`、`plan.md`、`task.md`、运行记录和最终变更集给 `workflow-final-review`。
- 新事实回传：改变范围、接口、职责、用户选择或验收标准时回传 `workflow-integration-plan`/`workflow-review-gate`。
