# 任务拆解：嵌入式工作流用户审查闸门与自动续跑

## 1. 任务元数据

| 字段 | 内容 |
|---|---|
| request_id | `REQ-WORKFLOW-HUMAN-GATES-20260819` |
| task 版本 | `v0.1` |
| task 状态 | `ready-for-auto-execution` |
| 输入 Spec | `00_Docs/04_需求文档/spec.md` |
| 输入 Plan | `00_Docs/04_需求文档/plan.md` |
| 项目路径 | `C:\\Users\\zhang\\Documents\\mcu-workbench` |
| 执行模式 | `auto_until_final_check` |
| 下游执行 Skill | `workflow-task-execution` |

## 2. 前置门禁

- H-01 RCP 审查：`approved`。
- H-02 Spec 审查：`approved`。
- H-03 Plan/方案审查：`approved`，选择方案 A。
- Task 由 AI 自动生成并进入连续执行；不等待用户逐项审查。

## 3. 待用户批准后的任务草案

| ID | 任务 | 前置 | 主实现 Skill | 验证 | 状态 |
|---|---|---|---|---|---|
| T-001 | 更新 Router/Challenge/Review Gate 的人工闸门和决策记录契约 | H-02/H-03 | `workflow-requirements-router` / `workflow-review-gate` | 静态 Skill 契约检查 | pass |
| T-002 | 更新 Task Execution 的 `auto_until_final_check` 和暂停规则 | T-001 | `workflow-task-execution` | 静态规则检查 | pass |
| T-003 | 增强 Gate 的用户批准/阻塞状态校验 | T-001 | `workflow-review-gate` | Jest 状态矩阵 | pass |
| T-004 | 更新 README、Codex 入口材料和兼容桥 | T-001/T-002 | `knowledge-engineer` | 链接/兼容校验 | pass |
| T-005 | 全量插件、Gate、链接和主机回归 | T-002/T-003/T-004 | `tools-verification` | 主机/静态 | pass |
| T-006 | AI 最终检查与通知 | T-005 | `workflow-final-review` | 最终质量门禁、Diff、未验证项 | pass |

## 4. 自动续跑规则

```text
当前任务 pass
  → AI 审查和测试
  → 检查是否命中 H-04 硬阻塞、需求变化、范围越界或关键决定缺失
  → 否：选择下一个依赖已满足任务并继续
  → 是：暂停，输出 blocker_review
全部任务完成
  → AI 最终检查
  → 检查完成后通知用户
```

每个任务仍必须保留：唯一主实现 Skill、分配依据、测试先行、实际变更、命令/退出码、验收结果、未验证项和回滚信息。

## 5. 当前状态

```text
task_status: completed-ai-final-check
next_action: 已完成 AI 最终检查；向用户通知结果
blockers: none
```

## 6. 自动执行记录

| 任务 | allocation_id | 执行结果 | 证据 |
|---|---|---|---|
| T-001 | `alloc-20260819-001` | `pass` | Router/Challenge/Review Gate Skill 已写入 H-01～H-03 与硬阻塞边界；静态检查通过 |
| T-002 | `alloc-20260819-002` | `pass` | Task Execution 已写入 `auto_until_final_check`、自动修复复测和硬阻塞暂停规则；静态检查通过 |
| T-003 | `alloc-20260819-003` | `pass` | `tests/workflow-gate.test.js` 状态矩阵 10/10 通过；Gate 当前批准链 `pass` |
| T-004 | `alloc-20260819-004` | `pass` | README、Codex 入口材料和 `AGENTS.override.md` 已同步生成；兼容桥命令退出码 0 |
| T-005 | `alloc-20260819-005` | `pass` | 38 个测试套件/261 个测试通过；插件结构、Skill 链接、Gate 和 `git diff --check` 通过；架构 CLI 因需要 firmware root 未纳入本插件范围 |
| T-006 | `alloc-20260819-006` | `pass` | Spec 追踪、最终质量门禁、版本检查、构建、插件刷新指纹复核通过；目标宿主/目标板证据仍为 `unverified` |

## 7. AI 最终检查记录

```text
gate_id: H-05
review_status: ai_pass
decision_owner: ai
decision: 通过最终检查并通知用户
decision_basis: 全量主机测试 38/38、261/261；插件结构 50 skills/7 agents/8 架构层；Skill 链接 321 个 Markdown 文件；workflow Gate pass；git diff --check pass；Codex 缓存指纹 up_to_date
decision_at: 2026-08-19
scope_effect: none
unverified: 真实 Codex 宿主连续行为、目标固件构建、目标板运行和实物时序
delivery_authorization: notification_only; no commit/push/flash/publish
```
