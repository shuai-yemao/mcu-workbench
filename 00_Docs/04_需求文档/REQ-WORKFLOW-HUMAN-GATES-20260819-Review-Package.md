# 实现方案审查包：嵌入式工作流用户审查闸门与自动续跑

## 元数据与输入

| 字段 | 内容 |
|---|---|
| request_id | `REQ-WORKFLOW-HUMAN-GATES-20260819` |
| 项目路径与提交 | `C:\\Users\\zhang\\Documents\\mcu-workbench @ host_ai / 15d592a175421b4a5cb2b88f5c9c22abf229fe17` |
| 审查状态 | `可交接` |
| 输入 RCP | `REQ-WORKFLOW-HUMAN-GATES-20260819-RCP.md` |
| 既有需求实现方案 | `当前 Router/Gate 工作流；本轮不继承其每任务必停行为` |
| 已读工程证据 | `codex/AGENTS.md、codex/embedded-workflow-entry.md、README.md、skills/workflow/*、scripts/validate-workflow-gate.js、tests/workflow-gate.test.js、package.json` |
| 参与 Agent | `embedded-lead、system-architect、firmware-engineer、verification-engineer、knowledge-engineer` |

## 0. 澄清回填记录

| 补证项 | 决策 | 可信等级 | 影响 |
|---|---|---|---|
| Q-01：用户审查边界 | 用户审查 RCP、Spec、Plan；Plan 通过后 Task 生成、逐项执行、AI 审查、测试和最终检查均自动完成，完成后通知用户 | `user-confirmed` | 形成 H-01～H-03 三个计划级用户闸门；H-04 只处理必须新增用户决策的硬阻塞 |
| Q-02：方案选择 | 选择方案 A：流程契约 + 确定性 Gate | `user-confirmed` | 不增加本地流程控制器 |

## 1. 工程现状表

| ID | 已知事实 | 证据 | 可信等级 | 影响范围 | 待确认项 |
|---|---|---|---|---|---|
| F-01 | Router-first、RCP/Review Gate/Spec/Plan/Task 链已存在 | `codex/AGENTS.md:16-31`、`README.md:62-68` | confirmed | 全部嵌入式请求 | none |
| F-02 | Challenge 要求用户补证，但没有统一的用户批准记录格式 | `skills/workflow/workflow-requirements-challenge/SKILL.md:61-106` | confirmed | RCP | 增加 decision record |
| F-03 | Review Gate 依据 Spec/Plan/Task 状态字符串放行 | `scripts/validate-workflow-gate.js:200-223` | confirmed | 确定性 Gate | 增加人工闸门校验 |
| F-04 | Task Execution 当前每项完成后停止 | `skills/workflow/workflow-task-execution/SKILL.md:90-102` | confirmed | 自动化效率 | 改为 auto_until_final_check 契约 |
| F-05 | Codex Manifest 只声明 skills，未确认宿主 Hook | `.codex-plugin/plugin.json:19`、`codex/embedded-workflow-entry.md:7` | confirmed | 宿主边界 | 不修改 Manifest/Hook |
| F-06 | 用户确认五类人工审查边界 | 当前会话用户回复“同意” | user-confirmed | 流程决策 | 具体实施仍待本轮审查 |

## 2. 文件施工清单

| ID | 动作 | 文件或目录 | 所属层 | 施工内容 | 前置事实 | 状态 |
|---|---|---|---|---|---|---|
| W-01 | 修改 | `skills/workflow/workflow-requirements-router/SKILL.md` | Workflow | 增加 H-01 用户审查输出和交接字段 | F-01/F-06 | ready-after-spec |
| W-02 | 修改 | `skills/workflow/workflow-requirements-challenge/SKILL.md` | Workflow | 规定 RCP 完成后暂停等用户批准 | F-02/F-06 | ready-after-spec |
| W-03 | 修改 | `skills/workflow/workflow-review-gate/SKILL.md` | Workflow | 增加 H-02、批准记录和阻塞回传 | F-03/F-06 | ready-after-spec |
| W-04 | 修改 | `skills/workflow/workflow-integration-plan/SKILL.md` | Workflow | 增加 H-03，区分 full 方案选择和统一计划放行 | F-06 | ready-after-spec |
| W-05 | 修改 | `skills/workflow/workflow-task-execution/SKILL.md` | Workflow | 增加 `auto_until_final_check`、硬阻塞回传和逐任务日志 | F-04/F-06 | ready-after-spec |
| W-06 | 修改 | `scripts/validate-workflow-gate.js` | Tools | 校验人工闸门、批准记录和阻塞状态 | F-03/F-06 | ready-after-spec |
| W-07 | 修改 | `tests/workflow-gate.test.js` | Tools | 增加状态矩阵和用户批准场景 | F-06 | ready-after-spec |
| W-08 | 修改 | `README.md`、`codex/AGENTS.md` | Codex 适配 | 更新输入输出流程和自动化边界 | F-01/F-05/F-06 | ready-after-spec |
| W-09 | 生成 | `AGENTS.override.md` | Codex 兼容桥 | 由既有生成流程同步 `codex/AGENTS.md` | W-08 | ready-after-spec |
| W-10 | 不修改 | `.codex-plugin/plugin.json`、`opencode.mjs`、固件工程 | 宿主/其他工程 | 保持宿主与固件边界 | F-05 | ready |

## 3. 代码生成约束清单

| ID | 约束类别 | 已确认约束 | 禁止事项 | 状态 |
|---|---|---|---|---|
| G-01 | 用户决策 | `decision_owner=user`；AI 不代签 H-01～H-03 | 不用模型自述、缓存一致或 CI 结果代替批准 | ready |
| G-02 | 自动续跑 | Plan 批准后自动生成 Task、执行全部任务并完成 AI 最终检查 | 不跨越需求变化或需要用户决定的硬阻塞 | ready |
| G-03 | 状态 | `awaiting_user_review`、`approved`、`rejected`、`blocked` 可区分 | 只依赖模糊文本“通过”放行 | ready |
| G-04 | 兼容性 | 保留既有 Skill ID、别名、Manifest 和其他宿主边界 | 不新增未经确认的 Codex Hook/MCP | ready |
| G-05 | 证据 | 静态、主机、构建、真实宿主证据分开 | 不把主机自动化测试写成真实 Codex 通过 | ready |

## 4. 验收测试清单

| ID | 证据等级 | 验收项 | 预期结果 | 状态 |
|---|---|---|---|---|
| V-01 | 主机 | Spec/Plan 缺少用户批准 | Gate 返回 blocked，指出闸门 | not-run |
| V-02 | 主机 | 完整 H-01～H-03 批准链 | Gate 返回 pass | not-run |
| V-03 | 主机 | H-04 硬阻塞未处理 | 不允许继续任务并输出唯一问题 | not-run |
| V-04 | 主机 | 需求变化或范围越界 | 回到 RCP/Review Gate | not-run |
| V-05 | 静态 | 自动续跑规则和旧规则无冲突 | Skill、AGENTS、README 一致 | not-run |
| V-06 | 主机 | 既有插件和链接校验 | 不引入新增失败 | not-run |
| V-07 | 真实宿主 | Codex 连续自动执行 | 保持 unverified，不作为本次代码通过条件 | blocked |

## 审查结论与下一轮交接

| 分类 | 项目 | 结论 | 所需动作 |
|---|---|---|---|
| 可采用 | 三个计划级用户闸门 | 用户已确认 | H-01/H-02/H-03 已批准 |
| 可采用 | `auto_until_final_check` | 与用户已确认边界一致 | 保留逐任务日志、AI 审查和最终检查 |
| 需修订 | 当前 Gate 只检查状态字符串 | 需要增加独立批准记录校验 | 纳入 W-06/W-07 |
| 阻塞风险 | Codex 宿主级自动连续调用 | 仓库没有 API 证据 | 不修改 Hook；标记 unverified |

**代码阶段判定：** `可交给 workflow-task-execution；采用方案 A`。
