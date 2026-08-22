# 实施任务清单：嵌入式插件需求工作流文档与内部状态优化

## 1. 元数据

| 字段 | 内容 |
|---|---|
| request_id | `REQ-SPEC-WORKFLOW-DOC-20260819` |
| 任务清单版本 | `v1.0` |
| 状态 | `已完成` |
| 项目路径与提交 | `C:\\Users\\zhang\\Documents\\mcu-workbench @ host_ai / 93c2bd3754e468f42f94009cf216e6d76d30e309` |
| 输入 spec.md | `C:\\Users\\zhang\\Documents\\mcu-workbench\\00_Docs\\04_需求文档\\spec.md` |
| 输入 plan.md | `C:\\Users\\zhang\\Documents\\mcu-workbench\\00_Docs\\04_需求文档\\plan.md` |
| Spec 力度 | `full` |
| 风险叠加门禁 | `human_review, versioned` |
| 阶段级 Agent/Skill 基线 | `plan.md 第 8A 节` |
| 下游执行 Skill | `workflow-task-execution` |

可信等级：`confirmed`、`user-confirmed`、`inferred`、`unverified`。

## 2. 总体目标与边界

目标：将 RCP、Review-Package、Final Review 改为内部 JSON/JSONL 状态，用户正式文档只保留详细 Spec、Plan、Task；Task 逐项实现并测试，所有 Task 完成后统一 Verify，Verify 偏差回到 Spec。

非目标：不修改固件、HAL、RTOS、BSP、Vendor、OpenCode/Codex 宿主运行时或插件 Manifest Hook。

## 3. 任务图

```text
T-001 → T-002 → T-003 → T-004 → T-005 → T-006 → T-007
                                      ├→ T-008
                                      └→ T-009
T-007 + T-008 + T-009 → T-010 Verify
```

关键串行链：`T-001 → T-002 → T-003 → T-004 → T-005 → T-006 → T-007 → T-010`

可并行组：`T-008` 与 `T-009` 可在 `T-006` 完成后分别执行，但执行器一次只处理一个任务。

## 4. 任务索引

| 顺序 | task_id | 任务名称 | 前置任务 | 主 Agent | 主实现 Skill | 验证等级 | 状态 |
|---:|---|---|---|---|---|---|---|
| 1 | T-001 | 同步正式 Spec 和 Plan 基线 | none | `embedded-lead` | `workflow-review-gate` | 静态 | pass |
| 2 | T-002 | 建立内部 Workflow State JSON/JSONL 契约 | T-001 | `embedded-lead` | `workflow-requirements-router` | 主机 | pass |
| 3 | T-003 | 迁移 Router、Challenge、Review Gate 输出边界 | T-002 | `embedded-lead` | `workflow-review-gate` | 静态/主机 | pass |
| 4 | T-004 | 迁移 Workflow Gate 校验逻辑 | T-003 | `embedded-lead` | `workflow-review-gate` | 主机 | pass |
| 5 | T-005 | 更新 Plan、Task、Execution、Verify 契约 | T-004 | `embedded-lead` | `workflow-task-execution` | 静态 | pass |
| 6 | T-006 | 更新 Final Review 与需求偏差回溯 | T-005 | `embedded-lead` | `workflow-final-review` | 静态 | pass |
| 7 | T-007 | 更新入口文档和兼容说明 | T-006 | `embedded-lead` | `workflow-integration-plan` | 静态 | pass |
| 8 | T-008 | 迁移 Workflow Gate 测试夹具和状态矩阵 | T-006 | `embedded-lead` | `tools-verification` | 主机 | pass |
| 9 | T-009 | 插件结构、链接和回归测试 | T-006 | `embedded-lead` | `tools-verification` | 主机/静态 | pass |
| 10 | T-010 | 最终 Verify：对照 Spec 验收标准 | T-007,T-008,T-009 | `embedded-lead` | `workflow-final-review` | 主机/静态 | pass |

## 5. 任务详情

### T-001：同步正式 Spec 和 Plan 基线

- 目标：将本次批准的 Spec/Plan 写入固定项目文档路径，形成执行输入。
- 文件：`00_Docs/04_需求文档/spec.md`、`00_Docs/04_需求文档/plan.md`。
- 不包含：代码和 Skill 实现。
- 测试：检查 request_id、版本、批准状态、方案 A、Task/Verify 回溯规则。
- 预期：Spec 与 Plan 的来源、范围和版本一致。
- 回滚：仅回退本任务文档变更。
- 状态：`pass`。

### T-002：建立内部 Workflow State JSON/JSONL 契约

- 目标：提供结构化内部状态的读写、版本和事件记录能力。
- 文件：`lib/workflow-state.js`、对应测试文件。
- 输出：`state.json` 和 `events.jsonl` 的解析、校验、原子写入和追加接口。
- 约束：解析失败、版本冲突、request_id 不一致必须返回阻塞结果。
- 测试先行：先增加非法 JSON、版本冲突、request_id 不一致和原子写入测试。
- 验证：`npm test -- --runInBand tests/workflow-state.test.js`。
- 回滚：删除新增模块和测试，不修改现有业务模块。

### T-003：迁移 Router、Challenge、Review Gate 输出边界

- 目标：将 RCP 和 Review-Package 定义为内部状态，Spec 作为唯一正式需求文档。
- 文件：
  - `skills/workflow/workflow-requirements-router/SKILL.md`
  - `skills/workflow/workflow-requirements-challenge/SKILL.md`
  - `skills/workflow/workflow-review-gate/SKILL.md`
- 测试：增加文本契约检查，确认不要求 RCP/Review-Package Markdown，保留证据等级和阻塞规则。
- 预期：用户输出边界为 Spec；内部审查内容仍完整保留。
- 回滚：仅回退三个 Skill 文档变更。

### T-004：迁移 Workflow Gate 校验逻辑

- 目标：Gate 校验内部状态、Spec、Plan、Task 的状态和版本，不再强制读取 RCP/Review-Package Markdown。
- 文件：`scripts/validate-workflow-gate.js`、`tests/workflow-gate.test.js`。
- 测试先行：先增加缺失状态、损坏状态、版本不一致、Verify 回溯和旧 Markdown 不存在时的阻塞/通过测试。
- 验证：`npm test -- --runInBand tests/workflow-gate.test.js`。
- 预期：状态完整且文档一致时通过；缺失或冲突时阻塞。
- 回滚：恢复 Gate 的旧输入适配和对应测试。

### T-005：更新 Plan、Task、Execution、Verify 契约

- 目标：固定 Plan→Task→逐项实现/测试→最终 Verify 的执行边界。
- 文件：
  - `skills/workflow/workflow-integration-plan/SKILL.md`
  - `skills/workflow/workflow-task-breakdown/SKILL.md`
  - `skills/workflow/workflow-task-execution/SKILL.md`
- 测试：增加 Skill 文本契约检查。
- 预期：Task 级测试与最终 Verify 分离；Verify 发现偏差回到 Spec。
- 回滚：回退三个 Skill 文档变更。

### T-006：更新 Final Review 与需求偏差回溯

- 目标：Final Review 使用内部状态，不生成 Markdown；最终 Verify 失败时使 Plan/Task 失效并回到 Spec。
- 文件：`skills/workflow/workflow-final-review/SKILL.md`、相关协议引用。
- 测试：检查 Final Review、Verify、Spec 回溯和版本失效契约。
- 预期：Final Review 不替代 Verify，也不把 Task 完成标记当成需求验收证据。
- 回滚：回退 Final Review 文档变更。

### T-007：更新入口文档和兼容说明

- 目标：同步 README、Codex 入口和生成兼容入口的用户可见工作流说明。
- 文件：`README.md`、`codex/AGENTS.md`、必要时由脚本生成的 `AGENTS.override.md`。
- 预期：用户审查节点、正式文档、Task 执行和 Verify 回溯规则一致。
- 验证：链接检查和文本契约检查。
- 回滚：回退入口文档变更，不修改公共 `common/` 内容。

### T-008：迁移 Workflow Gate 测试夹具和状态矩阵

- 目标：将 Gate 测试从 RCP/Review-Package Markdown 夹具迁移为内部 JSON/JSONL 状态夹具。
- 文件：`tests/workflow-gate.test.js`、`tests/workflow-state.test.js`。
- 覆盖：完整通过、缺失状态、损坏状态、request_id 不一致、Spec 未批准、Plan 未批准、Task 依赖失败、Verify 偏差回溯。
- 验证：`npm test -- --runInBand tests/workflow-gate.test.js tests/workflow-state.test.js`。
- 回滚：恢复旧夹具和测试逻辑。

### T-009：插件结构、链接和回归测试

- 目标：验证全插件无新增结构、链接和测试回归。
- 文件：仅测试输出和必要的测试夹具。
- 验证命令：
  - `npm test -- --runInBand`
  - `npm run validate:plugin`
  - `npm run validate:links`
  - `git diff --check`
- 预期：测试、插件校验、链接检查和差异检查通过。

### T-010：最终 Verify：对照 Spec 验收标准

- 目标：所有前置 Task 完成后，对照最终 Spec 验收标准执行整体审查。
- 主实现 Skill：`workflow-final-review`。
- 检查：用户文档边界、内部状态、Gate、Task 逐项执行规则、最终 Verify、Spec 回溯、回归验证。
- 通过：进入内部 Final Review 并通知用户。
- 偏差：停止交付，回到 Spec，旧 Plan/Task 标记失效。
- 不包含：在 Verify 阶段直接修改代码或 Spec。

## 6. 统一验证边界

- 静态：Skill、README、Codex 入口、Schema 和链接契约。
- 主机：Node/Jest 状态机、Gate、状态损坏和版本矩阵。
- 构建：本插件既有 Node 测试和校验入口。
- 目标运行：不适用，当前插件优化不涉及固件目标板。
- 真实宿主：保持 `unverified`，不由主机测试替代。

## 7. 下游交接

- 正式需求：`00_Docs/04_需求文档/spec.md`
- 正式计划：`00_Docs/04_需求文档/plan.md`
- 当前任务：`00_Docs/04_需求文档/task.md`
- 下游执行：`workflow-task-execution`
- 最终交接：`workflow-final-review`
- 需求变化：回传 `workflow-requirements-challenge` 和 `workflow-review-gate`
- 普通实现失败：在当前 Task 范围内修复、测试和复测
- Verify 偏差：回到 Spec，不在 Verify 阶段直接修复放行

## 8. 当前状态

```text
task_status: 已完成
current_task: none
completed_tasks: T-001,T-002,T-003,T-004,T-005,T-006,T-007,T-008,T-009,T-010
next_action: 进入内部 Final Review 并汇报结果
blockers: none
```
