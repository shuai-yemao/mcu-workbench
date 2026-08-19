# 集成实施计划：嵌入式插件需求工作流文档与内部状态优化

## 1. 元数据与状态

| 字段 | 内容 |
|---|---|
| request_id | `REQ-SPEC-WORKFLOW-DOC-20260819` |
| 计划版本 | `v1.0` |
| 计划状态 | `approved-for-delivery` |
| 项目路径 | `C:\\Users\\zhang\\Documents\\mcu-workbench` |
| 分支/提交 | `host_ai @ 93c2bd3754e468f42f94009cf216e6d76d30e309` |
| 输入 spec.md | `C:\\Users\\zhang\\Documents\\mcu-workbench\\00_Docs\\04_需求文档\\spec.md` |
| Spec 力度 | `full` |
| 风险叠加门禁 | `human_review, versioned` |
| 选定方案 | `方案 A：最小范围迁移，保留现有工作流结构` |
| 方案选择人 | `user` |
| 用户审查状态 | `approved` |
| 方案审查结论 | `通过` |

## 2. 一句话说明

保留现有 Workflow Skill 链和 Gate 结构，将 RCP、Review-Package、Final Review 迁移为内部 JSON/JSONL 状态，保留详细 Spec、Plan、Task 三类用户文档，并补齐逐 Task 实现/测试、最终 Verify 和偏差回到 Spec 的闭环。

## 3. 方案选择

### 方案 A：最小范围迁移

- 保留现有 Router、Challenge、Review Gate、Plan、Task 和 Final Review Skill。
- 复用 `<project_root>/.mcu-workbench/` 作为内部状态根目录。
- 新增 `state.json`、`events.jsonl` 和状态校验模块。
- Gate 改为检查内部状态、Spec、Plan、Task。
- 不引入独立 Workflow State Engine。

### 用户选择

```text
selected_option: A
decision_owner: user
decision_rationale: 保持现有结构，改动集中、易回滚，满足当前文档边界和执行闭环需求
rejected_option: B
new_constraints: none
```

## 4. 分层、调用链与接口边界

```text
用户输入 → Router → internal RCP state → Challenge → internal Review-Package state
→ Review Gate → spec.md → Integration Plan → plan.md → Task Breakdown → task.md
→ Task Execution → final Verify → internal Final Review state
```

- Router/Challenge 负责内部需求约束状态，不生成用户 RCP Markdown。
- Review Gate 负责内部审查状态和详细 Spec，不要求 Review-Package Markdown。
- Integration Plan 只读取已批准 Spec 和项目证据。
- Task Breakdown 只读取已批准 Spec 和 Plan。
- Task Execution 一次只处理一个 Task，逐项实现并测试。
- Verify 在所有 Task 完成后执行，只对照 Spec 验收标准。
- Verify 发现偏差时回到 Spec，旧 Plan/Task 失效。
- Final Review 只保存内部结果，不生成 Final Review Markdown。

## 5. 文件施工顺序

| ID | 阶段 | 文件/目录 | 责任 Skill | 前置条件 |
|---|---|---|---|---|
| P-01 | 文档基线 | `00_Docs/04_需求文档/spec.md`、`plan.md`、`task.md` | `workflow-review-gate` | Spec/Plan 已批准 |
| P-02 | 内部状态 | `lib/workflow-state.js`、`.mcu-workbench/workflows/` | `workflow-requirements-router` | P-01 |
| P-03 | 需求链 | Router、Challenge、Review Gate Skill | `workflow-review-gate` | P-02 |
| P-04 | Gate | `scripts/validate-workflow-gate.js` | `workflow-review-gate` | P-03 |
| P-05 | 执行契约 | Integration Plan、Task Breakdown、Task Execution Skill | `workflow-task-execution` | P-04 |
| P-06 | Verify | Final Review Skill 和协议 | `workflow-final-review` | P-05 |
| P-07 | 入口同步 | `README.md`、`codex/AGENTS.md`、兼容入口 | `knowledge-engineer` | P-06 |
| P-08 | 测试 | `tests/workflow-state.test.js`、`tests/workflow-gate.test.js`、`tests/workflows.test.js` | `tools-verification` | P-04～P-07 |
| P-09 | 全量验证 | 插件测试、结构、链接、差异检查 | `tools-verification` | P-08 |

## 6. 内部状态设计

```text
<project_root>/.mcu-workbench/workflows/<request_id>/
├─ state.json
└─ events.jsonl
```

状态至少保存 request_id、状态版本、Spec/Plan/Task 版本、阶段、门禁、需求、约束、证据、阻塞、Task 摘要、Verify 摘要和 Final Review 摘要。

状态写入必须具备 JSON 解析校验、request_id 校验、版本冲突检测、临时文件加原子替换、JSONL 追加事件、损坏状态阻塞和旧状态保留。

## 7. 执行阶段

### 阶段一：正式文档基线

将本次批准的 Spec、Plan 和 Task 写入固定文档目录，并确保三者 request_id、版本和范围一致。

### 阶段二：内部状态模块

新增状态读写、Schema 校验、事件追加、版本检查和阻塞结果。先补非法 JSON、版本冲突和 request_id 不一致测试，再实现。

### 阶段三：需求链迁移

更新 Router、Challenge、Review Gate，使内部 RCP/Review-Package 不再依赖 Markdown，同时保留证据等级、补证和阻塞语义。

### 阶段四：Gate 迁移

Gate 校验内部状态、Spec、Plan、Task；旧 RCP/Review-Package Markdown 不再是必需输入。缺失状态、损坏状态和版本不一致必须阻塞。

### 阶段五：Task 执行契约

固定顺序：`Task 实现 → Task 测试 → 下一个 Task → 全部 Task 完成 → Verify 对照 Spec`。Task 级测试不等同最终 Verify。

### 阶段六：Verify 与 Final Review

Verify 对照 Spec 验收标准执行；发现偏差时回到 Spec，重新生成 Plan 和 Task。Verify 通过后才进入内部 Final Review。

### 阶段七：入口和回归

同步 README、Codex 入口和兼容说明，运行插件测试、结构校验、链接检查和差异检查。

## 8. 阶段级 Agent/Skill 基线

| 阶段 | 主 Agent | 协作 Agent | 主实现 Skill | 辅助 Skill |
|---|---|---|---|---|
| P-01 | `embedded-lead` | `knowledge-engineer` | `workflow-review-gate` | `workflow-requirements-router` |
| P-02 | `embedded-lead` | `verification-engineer` | `workflow-requirements-router` | `tools-verification` |
| P-03 | `embedded-lead` | `system-architect` | `workflow-review-gate` | `workflow-requirements-challenge` |
| P-04 | `embedded-lead` | `verification-engineer` | `workflow-review-gate` | `tools-quality` |
| P-05 | `embedded-lead` | `verification-engineer` | `workflow-task-execution` | `tools-verification` |
| P-06 | `embedded-lead` | `verification-engineer` | `workflow-final-review` | `tools-quality` |
| P-07 | `embedded-lead` | `knowledge-engineer` | `workflow-integration-plan` | `tools-quality` |
| P-08 | `embedded-lead` | `verification-engineer` | `tools-verification` | `tools-quality` |
| P-09 | `embedded-lead` | `verification-engineer` | `tools-verification` | `tools-quality` |

每个任务只有一个主实现 Skill；辅助 Skill 不得并行修改同一文件。

## 9. 验收计划

| ID | 证据等级 | 验收项 | 预期结果 |
|---|---|---|---|
| V-01 | 静态 | 用户文档边界 | 只有 Spec、Plan、Task |
| V-02 | 主机 | 状态 Schema | 合法状态可读取，非法状态阻塞 |
| V-03 | 主机 | Gate 状态矩阵 | 状态完整且一致时通过，否则阻塞 |
| V-04 | 静态 | Skill 输出契约 | 不要求 RCP/Review-Package Markdown |
| V-05 | 主机 | Task 依赖 | 前置 Task 未通过不得执行后置 Task |
| V-06 | 主机 | Task 测试 | 每个 Task 有独立测试记录 |
| V-07 | 主机 | Verify 时机 | 全部 Task 完成后才能 Verify |
| V-08 | 主机 | Verify 偏差 | 回到 Spec 并使旧 Plan/Task 失效 |
| V-09 | 回归 | `npm test -- --runInBand` | 通过 |
| V-10 | 静态 | `npm run validate:plugin` | 通过 |
| V-11 | 静态 | `npm run validate:links` | 通过 |
| V-12 | 静态 | `git diff --check` | 通过 |
| V-13 | 宿主 | 真实 Codex 连续执行 | 保持 `unverified` |

## 10. 回滚与下游交接

- 每个 Task 只回滚自身范围；
- 保留用户无关修改；
- 不使用 `git reset --hard` 或 `git add -A`；
- 状态写入失败时保留旧状态；
- Verify 偏差保留失败证据，不覆盖旧版本 Spec/Plan/Task；
- Plan 执行完成后交给 `workflow-task-breakdown` 和 `workflow-task-execution`；
- 全部 Task 完成后交给 `workflow-final-review`。

## 11. 当前状态

```text
plan_status: approved-for-task-execution
selected_option: A
next_action: 执行 task.md 中的 T-002
blockers: none
```
