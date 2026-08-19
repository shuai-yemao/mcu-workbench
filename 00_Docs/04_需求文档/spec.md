# Spec：嵌入式工作流用户审查闸门与自动续跑

## 1. 元数据与 RCP 状态

| 字段 | 内容 |
|---|---|
| request_id | `REQ-WORKFLOW-HUMAN-GATES-20260819` |
| Spec 版本 | `v0.1` |
| Spec 状态 | `approved-for-task-execution` |
| Spec 力度 | `full` |
| 风险叠加门禁 | `human_review, versioned` |
| 项目路径 | `C:\\Users\\zhang\\Documents\\mcu-workbench` |
| 分支/提交 | `host_ai @ 15d592a175421b4a5cb2b88f5c9c22abf229fe17` |
| 输入 RCP | `REQ-WORKFLOW-HUMAN-GATES-20260819-RCP.md` |
| Review-Package | `REQ-WORKFLOW-HUMAN-GATES-20260819-Review-Package.md` |
| 用户审查状态 | `approved` |
| 决策负责人 | `user` |
| 用户批准记录 | `H-01/H-02/H-03 approved; plan=A` |

## 2. 需求目标、范围与非目标

### 2.1 目标

将嵌入式插件调整为：用户只审查 RCP、Spec 和 Plan；Plan 通过后，Task 生成、逐项执行、AI 审查、测试和最终检查由 AI 自动完成，最终检查完成后再通知用户。

### 2.2 用户审查闸门

| ID | 闸门 | 必须审查 | 未批准时 |
|---|---|---|---|
| H-01 | RCP | 目标、范围、非目标、关键业务规则、验收标准 | 等待用户，不进入 Review Gate |
| H-02 | Spec | 四张审查清单、风险、接口、资源和施工边界 | blocked，不进入 Plan |
| H-03 | Plan/方案 | 方案选择、文件范围、执行顺序、回滚和验证 | blocked，不进入 Task/执行 |
| H-04 | 硬阻塞例外 | AI 无法依据既有 Spec/Plan 解决、必须新增用户决策的冲突 | 保持 blocked，向用户提出唯一关键问题 |
| H-05 | AI 最终检查 | Task 全部完成、AI 审查、测试、Diff 和验证状态 | AI 自动完成；完成后通知用户 |

### 2.3 自动化规则

- H-03 Plan 通过后，采用 `auto_until_final_check` 自动生成 Task、选择依赖满足的任务并连续执行。
- 每个任务仍保留独立状态、分配记录、测试先行记录、运行检查和变更范围审阅。
- 任务通过后可以继续下一个任务，不再因为 Task 生成或单项任务完成而等待用户。
- 普通测试失败先由 AI 自动诊断、修复和复测；只有需要新增用户决策的硬阻塞才进入 H-04。
- 需求、接口、资源、权限、并发、ISR/DMA 或验收标准发生变化时立即暂停并回到 RCP/Review Gate。

### 2.4 直接范围

- `skills/workflow/workflow-requirements-router/SKILL.md`
- `skills/workflow/workflow-requirements-challenge/SKILL.md`
- `skills/workflow/workflow-review-gate/SKILL.md`
- `skills/workflow/workflow-integration-plan/SKILL.md`
- `skills/workflow/workflow-task-execution/SKILL.md`
- `scripts/validate-workflow-gate.js`
- `tests/workflow-gate.test.js`
- `README.md`、`codex/AGENTS.md`及其生成的`AGENTS.override.md`

### 2.5 非目标

- 不修改 `.codex-plugin/plugin.json`、`opencode.mjs` 或其他宿主运行时。
- 不新增未经证实的 Codex Hook、MCP、外部审批系统或宿主级写入拦截。
- 不修改 `embedded_framework`、固件 C/C++、HAL、RTOS、BSP 或 Vendor 源码。

## 3. 工程事实与约束

| ID | 事实/约束 | 证据 | 可信等级 |
|---|---|---|---|
| F-01 | Router-first、RCP、Review Gate、Spec、Plan、Task 链已存在 | `codex/AGENTS.md:16-31` | confirmed |
| F-02 | 当前 Gate 主要检查文档状态字符串 | `scripts/validate-workflow-gate.js:200-223` | confirmed |
| F-03 | 当前 Task Execution 每个任务完成后停止 | `skills/workflow/workflow-task-execution/SKILL.md:90-102` | confirmed |
| F-04 | Codex 适配只声明 `skills/`，无已确认宿主 Hook | `.codex-plugin/plugin.json:19`、`codex/embedded-workflow-entry.md:7` | confirmed |
| F-05 | 用户确认五类审查边界 | 当前会话用户回复“同意” | user-confirmed |

## 4. 状态与决策记录契约

H-01～H-03 必须记录用户决定；H-04 记录阻塞问题；H-05 记录 AI 最终检查结果：

```text
gate_id: H-01 | H-02 | H-03 | H-04 | H-05
review_status: awaiting_user_review | approved | rejected | blocked | ai_pass | ai_fail
decision_owner: user | ai
decision: <用户决定或 AI 检查结论>
decision_basis: <用户确认内容、证据位置或检查产物>
decision_at: <timestamp>
scope_effect: none | narrowed | expanded | returned-to-rcp
```

AI 不得用模型自述、插件安装、缓存一致性、静态测试或 CI 结果代替 `decision_owner=user` 的批准记录。

## 5. 依赖与分层边界

```text
用户输入 → Router → RCP/Challenge → Review Gate → Spec → 用户 H-01/H-02
                                                            ↓
                                             Plan → 用户 H-03
                                                            ↓
                              自动生成 Task → 自动执行 → AI 审查/测试
                                                            ↓
                                             AI H-05 最终检查 → 通知用户
```

插件工作流只负责需求、审查、任务和交接契约，不改变嵌入式软件依赖方向：

```text
App → Service → Platform ← Impl → Vendor
```

## 6. 验收清单

| ID | 证据等级 | 验收项 | 预期结果 | 状态 |
|---|---|---|---|---|
| V-01 | 静态 | Skill、AGENTS、README 一致描述五个闸门 | 旧的“每个任务必停”表述被替换 | pass |
| V-02 | 主机 | 缺少 H-01/H-02/H-03 批准记录 | Gate 返回 `blocked` 并指出闸门 | pass |
| V-03 | 主机 | 完整批准链 | Gate 返回 `pass` | pass |
| V-04 | 主机 | H-04 硬阻塞或需求变化 | 不进入后续任务并输出唯一问题 | pass |
| V-05 | 主机 | `auto_until_final_check` 状态规则 | Plan 后自动完成 Task 和最终检查 | pass |
| V-06 | 主机/静态 | 既有插件、链接和兼容性检查 | 无新增回归 | pass |
| V-07 | 真实宿主 | Codex 自动连续执行行为 | 保持 `unverified`，不由主机测试替代 | blocked |

## 7. 风险与回滚

- 最大风险：模型仍可能在真实宿主中跳过流程；本 Spec 只承诺可审计的 Skill 指令和确定性 Gate，不承诺宿主级硬拦截。
- 交付边界：AI 最终检查完成后的通知不等于授权提交、推送、烧录或发布；这些动作仍需单独明确授权。
- 回滚：按文件回退本次 Workflow Skill、Gate、测试、说明和生成兼容桥变更；不触碰固件工程和其他宿主。
- 需求变化：任何改变范围、接口、资源边界、验收标准或闸门定义的请求，回到 RCP/Review Gate。

## 8. 当前审查状态

```text
spec_status: approved-for-task-execution
decision_owner: user
decision: approved; selected_plan=A
next_action: 自动生成 Task 并执行至 AI 最终检查
```
