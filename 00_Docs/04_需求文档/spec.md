# Spec：嵌入式插件需求工作流文档与内部状态优化

## 1. 元数据

| 字段 | 内容 |
|---|---|
| request_id | `REQ-SPEC-WORKFLOW-DOC-20260819` |
| Spec 版本 | `v1.0` |
| Spec 状态 | `approved-for-integration-plan` |
| Spec 力度 | `full` |
| Spec 叠加门禁 | `human_review, versioned` |
| 项目路径 | `C:\\Users\\zhang\\Documents\\mcu-workbench` |
| 分支/提交 | `host_ai @ 93c2bd3754e468f42f94009cf216e6d76d30e309` |
| 正式用户文档 | `spec.md`、`plan.md`、`task.md` |
| 内部状态格式 | JSON/JSONL |
| 用户审查状态 | `approved` |
| 决策负责人 | `user` |

## 2. 最终需求结论

1. 用户正式接收的文档只有 `spec.md`、`plan.md`、`task.md`。
2. RCP、Review-Package 和 Final Review 不生成 Markdown 文件，改为内部 JSON/JSONL 状态。
3. Spec 必须详细、精准，同时供用户阅读和 AI 执行。
4. Plan 只能从批准后的 Spec 推导，Task 只能从批准后的 Plan 推导。
5. Task 拆分后必须逐项实现并测试，前一 Task 未通过不得进入后置 Task。
6. 所有 Task 完成并通过各自测试后，才能进入最终 Verify。
7. Verify 是对照 Spec 验收标准的最终审查，不是单个 Task 的测试。
8. Verify 发现偏差时必须回到 Spec，重新生成 Plan 和 Task，不得在 Verify 阶段直接修补后放行。
9. Final Review 只保存内部结构化结果，最终通知向用户汇总，不生成 Final Review Markdown。
10. 不修改固件、HAL、RTOS、BSP、Vendor 或宿主运行时。

## 3. 工程事实与证据

| ID | 事实 | 证据 | 可信等级 |
|---|---|---|---|
| F-01 | 当前 Workflow 包含 Router、Challenge、Review Gate、Integration Plan、Task Breakdown、Task Execution 和 Final Review | `README.md:62` | confirmed |
| F-02 | 当前 README 将 RCP、Review-Package、Spec、Plan、Task 描述为连续产物 | `README.md:171` | confirmed |
| F-03 | 当前 README 将 RCP、Spec、Plan 作为用户审查节点 | `README.md:173` | confirmed |
| F-04 | 当前 Review Gate 将 Review-Package 作为审计记录 | `skills/workflow/workflow-review-gate/SKILL.md:101` | confirmed |
| F-05 | 当前 Gate 脚本读取 RCP 和 Review-Package Markdown | `scripts/validate-workflow-gate.js:202-218` | confirmed |
| F-06 | 当前 Gate 测试使用 RCP/Review-Package Markdown 夹具 | `tests/workflow-gate.test.js:30-44` | confirmed |
| F-07 | 用户确认正式输出仅限 Spec、Plan、Task | 当前会话 | user-confirmed |
| F-08 | 用户确认内部状态使用 JSON/JSONL | 当前会话 | user-confirmed |
| F-09 | 用户确认 Task 逐项实现并测试 | 当前会话 | user-confirmed |
| F-10 | 用户确认 Verify 是最终验收标准对照审查 | 当前会话 | user-confirmed |
| F-11 | 用户确认 Verify 偏差必须回到 Spec | 当前会话 | user-confirmed |

## 4. 目标工作流

```text
用户需求
  → Router
  → 内部 RCP 状态
  → Challenge
  → 内部 Review-Package 状态
  → Review Gate
  → 详细 Spec
  → 用户批准 Spec
  → Plan
  → 用户批准 Plan
  → Task
  → 逐项实现并测试
  → 所有 Task 完成
  → 最终 Verify
  → 内部 Final Review
  → 通知用户
```

Verify 失败路径：

```text
Verify 发现偏差
  → 回到内部 RCP 状态
  → 更新需求/约束/证据
  → 修订并重新批准 Spec
  → 重新生成 Plan
  → 重新生成 Task
```

## 5. 正式文档职责

### `spec.md`

必须包含目标、范围、非目标、工程事实、证据等级、功能需求、业务规则、状态机、接口、数据结构、所有权、生命周期、资源、并发、ISR、DMA、内存、实时性、分层边界、文件范围、禁止事项、错误恢复、验收标准、验证等级、风险、回滚和需求变化规则。

### `plan.md`

只描述已批准 Spec 下的实施方案、文件范围、实施顺序、Agent/Skill 基线、依赖、测试、回滚和交接，不增加 Spec 外需求。

### `task.md`

只描述可执行任务、前置依赖、唯一主实现 Skill、修改范围、逐项测试、完成条件、失败处理和回滚，不改变 Spec 或 Plan 范围。

## 6. 内部状态契约

内部状态目录优先采用：

```text
<project_root>/.mcu-workbench/workflows/<request_id>/
├─ state.json
└─ events.jsonl
```

`state.json` 至少保存：

```text
request_id
state_version
spec_version
plan_version
task_version
current_stage
current_status
spec_rigor
spec_overlays
requirements
constraints
evidence
decisions
open_questions
user_gates
task_summary
verify_summary
final_review_summary
blockers
updated_at
```

`events.jsonl` 追加保存状态创建、用户批准、版本变化、Task 状态、测试结果、Verify 结果、回到 Spec 和 Final Review 事件。

解析失败、版本冲突、request_id 不一致、状态写入失败必须阻塞；状态写入使用临时文件和原子替换，不得删除旧状态绕过 Gate。

## 7. 用户审查闸门

### G-01：Spec 审查

Spec 未批准不得生成 Plan。

### G-02：Plan 审查

Plan 未批准不得生成 Task。

### G-03：硬阻塞决策

无法依据已批准 Spec/Plan 继续且需要新增用户决策时暂停，只提出一个关键问题。

Final Review 不设置例行用户审查，结果通过最终通知汇总。

## 8. Task 执行与最终 Verify

Task 执行顺序固定为：

```text
实现当前 Task
  → 测试当前 Task
  → 记录结果
  → 通过后进入下一个 Task
```

Task 级测试不等同最终验收。所有 Task 完成并测试通过后，Verify 对照本 Spec 验收标准检查功能、边界、接口、分层、错误处理、资源、并发、ISR、DMA、内存、实时性和各级验证证据。

Verify 发现偏差时，旧 Plan/Task 失效，必须回到 Spec；不得在 Verify 阶段直接修改实现后放行。

## 9. 实施范围

必须调整：

- `skills/workflow/workflow-requirements-router/SKILL.md`
- `skills/workflow/workflow-requirements-challenge/SKILL.md`
- `skills/workflow/workflow-review-gate/SKILL.md`
- `skills/workflow/workflow-integration-plan/SKILL.md`
- `skills/workflow/workflow-task-breakdown/SKILL.md`
- `skills/workflow/workflow-task-execution/SKILL.md`
- `skills/workflow/workflow-final-review/SKILL.md`
- `scripts/validate-workflow-gate.js`
- `tests/workflow-gate.test.js`
- `tests/workflows.test.js`
- `README.md`
- `codex/AGENTS.md`
- 内部状态模块和测试

不得调整：

- 固件工程、HAL、RTOS、BSP、Vendor；
- OpenCode/Codex 宿主运行时；
- 插件 Manifest Hook、MCP 或外部审批系统；
- 其他宿主适配层。

## 10. 验收标准

| ID | 验收项 | 预期结果 |
|---|---|---|
| V-01 | 用户正式输出 | 只有 Spec、Plan、Task |
| V-02 | 内部状态 | RCP、Review-Package、Final Review 使用 JSON/JSONL |
| V-03 | Gate 输入 | 不强制要求 RCP/Review-Package Markdown |
| V-04 | Spec 详细度 | 保留完整需求、约束、证据和验收标准 |
| V-05 | Plan/Task 依赖 | 只能从已批准上游文档生成 |
| V-06 | Task 执行 | 必须逐项实现并测试 |
| V-07 | Verify 时机 | 所有 Task 完成后才能执行 |
| V-08 | Verify 依据 | 必须对照 Spec 验收标准 |
| V-09 | Verify 偏差 | 必须回到 Spec 并使旧 Plan/Task 失效 |
| V-10 | 状态一致性 | request_id 和版本一致，否则阻塞 |
| V-11 | 回归 | 插件测试、结构校验、链接检查、Gate 检查通过 |
| V-12 | 宿主行为 | 真实 Codex 连续执行保持 `unverified` |

## 11. 当前状态

```text
spec_status: approved-for-delivery
plan_status: approved-for-delivery
task_status: completed
verify_status: passed
implementation_allowed: true
```
