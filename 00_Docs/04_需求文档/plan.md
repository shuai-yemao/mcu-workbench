# 实施计划：嵌入式工作流用户审查闸门与自动续跑

## 1. 元数据与状态

| 字段 | 内容 |
|---|---|
| request_id | `REQ-WORKFLOW-HUMAN-GATES-20260819` |
| 计划版本 | `v0.1` |
| 计划状态 | `approved-for-task-execution` |
| 项目路径 | `C:\\Users\\zhang\\Documents\\mcu-workbench` |
| 当前分支基线 | `host_ai @ 15d592a175421b4a5cb2b88f5c9c22abf229fe17` |
| 输入 Spec | `00_Docs/04_需求文档/spec.md` |
| 输入 Review-Package | `REQ-WORKFLOW-HUMAN-GATES-20260819-Review-Package.md` |
| 用户审查状态 | `approved` |
| 决策负责人 | `user` |
| 选定方案 | `方案 A：流程契约 + 确定性 Gate` |
| 方案选择人 | `user` |
| 方案选择记录 | `用户选择 A` |

H-01/H-02/H-03 已完成用户审查并放行；现在自动生成 Task 并连续执行至 AI 最终检查。

## 2. 两个候选方案

### 方案 A：流程契约 + 确定性 Gate（推荐）

- 修改 Workflow Skill、Gate、状态矩阵测试、README 和 Codex 入口材料。
- 增加用户审查记录和 `auto_until_final_check` 规则。
- 不修改 OpenCode/Codex 宿主运行时、Manifest 或外部 API。
- 优点：改动集中、可回滚、能立即验证；不依赖未确认的宿主 Hook。
- 缺点：自动连续执行仍属于宿主/模型行为，无法强制拦截每一次内部动作。

### 方案 B：增加本地流程控制器

- 在方案 A 基础上增加一个读取 `spec/plan/task` 状态并输出下一动作的本地控制器。
- 控制器负责计算 `auto_until_final_check`、阻塞原因和下一任务，但仍不假设 Codex 宿主存在 Hook。
- 优点：状态推进更确定，便于 CI 和人工复核。
- 缺点：增加 CLI/状态协议和维护成本；不能替代真实宿主行为验证。

## 3. 方案比较

| 维度 | 方案 A | 方案 B |
|---|---|---|
| 改动范围 | 小 | 中 |
| 实施风险 | 低 | 中 |
| 用户审查可追溯性 | 足够 | 更强 |
| 自动续跑确定性 | 依赖 Skill/宿主 | 本地状态计算更强 |
| 维护成本 | 低 | 中高 |
| 推荐 | 是 | 仅在后续需要 CLI 编排时采用 |

## 4. 用户决定记录

```text
gate_id: H-03
review_status: approved
decision_owner: user
decision: 选择方案 A
decision_basis: 改动集中、可回滚、不依赖未经确认的宿主 Hook
decision_at: 2026-08-19
scope_effect: none
```

## 5. 共同施工范围（仅在方案批准后启用）

| ID | 阶段 | 文件/目录 | 目标 |
|---|---|---|---|
| P-01 | Workflow 契约 | `skills/workflow/workflow-requirements-*.md`、`workflow-review-gate/SKILL.md` | 定义 H-01/H-02/H-04 和决策记录 |
| P-02 | 自动执行 | `skills/workflow/workflow-task-execution/SKILL.md` | 定义 `auto_until_final_check`、AI 审查、测试和暂停边界 |
| P-03 | Gate | `scripts/validate-workflow-gate.js` | 校验批准链、阻塞和范围变化 |
| P-04 | 测试 | `tests/workflow-gate.test.js` | 覆盖 awaiting/approved/rejected/blocked |
| P-05 | 入口说明 | `README.md`、`codex/AGENTS.md`、生成的 `AGENTS.override.md` | 对外说明输入输出和审查边界 |
| P-06 | 可选控制器 | 由方案 B 决定 | 计算下一动作，不接管宿主权限 |

## 6. 执行规则

- Plan 通过后自动生成 Task，并在每项任务完成 AI 审查和测试后进入下一个依赖满足的任务。
- 命中 H-04 硬阻塞、需求变化、范围越界、关键决定缺失或不可逆动作前，立即暂停。
- 所有任务完成后自动执行 H-05 最终检查，检查完成后再通知用户。
- 所有自动执行必须保留逐任务日志、命令、退出码、证据等级、变更文件和回滚信息。
- 真实 Codex 宿主连续执行保持 `unverified`。

## 7. 当前状态与下一步

```text
plan_status: approved-for-task-execution
next_action: T-001～T-006 已完成；已执行 AI 最终检查并通知用户
blockers: none
```
