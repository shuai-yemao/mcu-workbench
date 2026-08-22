# 需求约束包（RCP）：嵌入式工作流用户审查闸门与自动续跑

## 1. 元数据

| 字段 | 内容 |
|---|---|
| request_id | `REQ-WORKFLOW-HUMAN-GATES-20260819` |
| 生成时间 | `2026-08-19T18:00:00+08:00` |
| RCP 版本 | `v0.1` |
| RCP 状态 | `challenged` |
| 工作流状态 | `可交接` |
| 项目路径 | `C:\\Users\\zhang\\Documents\\mcu-workbench` |
| 分支/提交 | `host_ai @ 15d592a175421b4a5cb2b88f5c9c22abf229fe17` |
| 目标交付物 | `RCP/Spec/Plan 三个用户闸门、Task 自动生成执行、AI 审查测试、最终检查和通知` |

## 1.1 Spec 力度与风险

| 字段 | 内容 |
|---|---|
| `spec_rigor` | `full` |
| `spec_overlays` | `[human_review, versioned]` |
| 风险原因 | `改变所有嵌入式请求的输入、暂停、交接和交付行为；涉及公共工作流规则、状态契约、多个 Skill、Gate 和测试；不能把宿主行为或用户批准状态写成推测` |
| 最低交付物 | `spec.md + plan.md + task.md + Gate/主机测试/插件校验证据` |
| 升级触发条件 | `需要 Codex 宿主 Hook/MCP、修改 Manifest Schema、接入外部审批系统、改变其他宿主或固件工程` |
| 审批要求 | `human-review` |

## 2. Agent 分析

| Agent | 分析范围 | 结论 | 证据 | 阻塞项 |
|---|---|---|---|---|
| `embedded-lead` | 目标、交接和审查边界 | 用户审查集中到 RCP、Spec、Plan；Plan 通过后 Task 生成、执行、AI 检查和最终通知自动完成 | 用户当前回复；`README.md:62-68` | 用户尚未审查具体文件范围和状态字段 |
| `system-architect` | 工作流状态和依赖边界 | 现有 Router→RCP→Review Gate→Spec→Plan→Task 链可保留；需要增加显式用户审查状态和自动续跑模式 | `codex/AGENTS.md:16-31`；`skills/workflow/*` | Codex 宿主是否支持真正的自动连续调用仍未验证 |
| `firmware-engineer` | 插件脚本、Skill 和测试范围 | 目标是插件 Markdown/JavaScript/测试/入口材料，不涉及固件、HAL、RTOS 或 `embedded_framework` | `package.json:12-39`；`scripts/validate-workflow-gate.js:135-254` | none |
| `verification-engineer` | Gate、状态矩阵和回归 | 需要覆盖 awaiting-user-review、approved、blocked、需求变化和自动续跑边界 | `tests/workflow-gate.test.js`；`scripts/validate-workflow-gate.js` | 真实 Codex 宿主连续执行保持 `unverified` |
| `knowledge-engineer` | RCP/Spec/Plan/Task 与说明 | 固定文件使用独立 request_id，旧 Router-Gate 文档保留为历史记录 | 当前 `00_Docs/04_需求文档/*` | none |

所有 Agent 当前 `Changed files: none`；本 RCP 和后续审查包属于本次需求记录，不代表代码已放行。

## 3. 可信等级约定

| 等级 | 含义 |
|---|---|
| `confirmed` | 已由仓库文件或可复现命令确认 |
| `user-confirmed` | 用户明确确认 |
| `inferred` | 基于证据推断，尚未直接确认 |
| `unverified` | 尚未验证，不能作为实现前提 |

## 4. 项目背景与目标

- 当前问题：现有流程已经有 RCP、Review Gate 和任务阻塞规则，但用户审查状态没有独立字段，且任务执行规则每项完成后固定停止，无法表达“普通任务自动续跑、关键节点暂停”。
- 目标：建立 3 个计划级用户审查闸门：RCP、Spec、Plan；Plan 之后自动完成 Task、执行、AI 审查、测试和最终检查。
- 成功标准：没有对应用户批准记录时，流程不能进入下游施工或不可逆交付；普通任务在无闸门/无阻塞时可连续执行；所有暂停均输出结构化原因和下一动作。
- 直接范围：Router/Challenge/Review Gate/Integration Plan/Task Execution 的流程契约、Gate 状态校验、相关测试和说明。
- 明确不包含：Codex 宿主 Hook/MCP、OpenCode 运行时重构、Manifest Schema、固件工程、HAL/RTOS/BSP 代码、自动提交/推送/烧录权限。

## 5. 用户已确认的核心约束

| ID | 约束 | 可信等级 | 影响 |
|---|---|---|---|
| U-01 | 用户只在 RCP、Spec、Plan 阶段审查；Plan 通过后不再逐项等待用户 | `user-confirmed` | 任务生成和执行采用 `auto_until_final_check` |
| U-02 | Task 生成、逐项执行、AI 审查、测试和最终检查由 AI 自动完成，检查完成后通知用户 | `user-confirmed` | 不设置例行的 Task/交付人工审批 |
| U-04 | 用户选择方案 A：流程契约 + 确定性 Gate | `user-confirmed` | 不增加本地流程控制器 |
| U-03 | 需求变化必须回到 RCP/Review Gate，不能在执行中静默扩大范围 | `user-confirmed` | 未重新放行前停止 Plan/Task/代码施工 |

## 6. 拟定审查闸门

| ID | 闸门 | 进入条件 | 用户审查内容 | 未批准时 |
|---|---|---|---|---|
| H-01 | `rcp-review` | RCP 问答完成、关键事实已回填 | 目标、范围、非目标、业务规则、验收 | `approved` |
| H-02 | `spec-review` | Challenge 和 Review-Package 完成 | 四张清单、Spec、风险、施工边界 | `approved` |
| H-03 | `plan-review` | 方案和计划生成 | 方案选择、文件范围、顺序、回滚和验证 | `approved`，选择方案 A |
| H-04 | `hard-blocker` | AI 无法依据既有 Spec/Plan 解决的硬阻塞 | 仅在需要新增用户决策时提问 | 保持 `blocked`，不得猜测继续 |
| H-05 | `ai-final-check` | Task 全部完成、AI 审查和测试完成 | 无需用户审查；AI 完成最终检查后通知用户 | 检查失败则 AI 自动修复或报告阻塞 |

## 7. AI 自动化边界

- 自动读取证据、生成问题、回填 RCP 草稿、执行 Challenge 和静态 Gate。
- Plan 通过后自动生成 Task、复核依赖、执行测试先行、调用单一主实现 Skill、运行验证并记录证据。
- 普通任务通过后自动选择下一个依赖已满足的任务；每个任务仍保留独立日志和状态，但不等待用户审查。
- 工具失败允许按任务约定有限重试；涉及范围、接口、所有权、并发、硬件事实、验证标准或不可逆动作时必须转为 `blocker-review`。

## 8. 未决风险

| ID | 风险 | 可信等级 | 处理 |
|---|---|---|---|
| R-01 | Codex 宿主是否支持真正的连续工具调用，仓库没有宿主 API 证据 | `unverified` | 只实现可审计的 Skill/状态/Gate 契约，不承诺宿主级自动循环 |
| R-02 | 当前 Gate 只检查状态字符串，没有独立用户决策记录校验 | `confirmed` | 增加用户审查字段和状态矩阵测试 |
| R-03 | 自动续跑若没有边界可能跨越需求变化或不可逆动作 | `inferred` | 增加 `auto_until_final_check`、暂停原因、范围快照和硬阻塞回传 |

## 9. 验收标准

| ID | 证据等级 | 验收项 | 预期结果 | 状态 |
|---|---|---|---|---|
| V-01 | 静态 | Skill、AGENTS、README 的 5 个用户闸门表述一致 | 无旧的“每项必停”冲突 | not-run |
| V-02 | 主机 | Gate 缺少用户批准记录 | 返回 `blocked` 和明确闸门 | not-run |
| V-03 | 主机 | Gate 具备完整批准链 | 返回 `pass` | not-run |
| V-04 | 主机 | 阻塞、拒绝、需求变化、范围越界 | 不进入后续任务 | not-run |
| V-05 | 主机 | 自动续跑协议 | 无闸门/阻塞时可选择下一个任务；遇闸门立即暂停 | not-run |
| V-06 | 静态/主机 | 插件原有校验、链接和兼容性不回归 | 既有测试和插件校验通过 | not-run |
| V-07 | 真实宿主 | Codex 连续自动执行和暂停行为 | 当前保持 `unverified`，不得由主机测试替代 | blocked |

## 10. 质疑结论与交接

```text
purpose_conclusion: user-confirmed
feasibility_conclusion: 有条件可行
scope_conclusion: 第一版限于插件流程契约、Gate、测试和文档；不承诺宿主 Hook
acceptance_gaps: 真实 Codex 宿主自动连续执行仍未验证
unresolved_risks: R-01、V-07
required_review_gate_checks: 用户批准字段、闸门状态、auto_until_final_check 边界、硬阻塞回传和最终检查产物
handoff_status: 可交接
```

## 11. 下一步

- 当前唯一动作：按方案 A 更新 Workflow Skill、Gate、测试和入口说明。
- 用户审查记录：H-01/H-02/H-03 均已批准；Plan 选择方案 A。
- 用户拒绝或修改：回填本 RCP，重新运行 Challenge/Review Gate；不改代码。
