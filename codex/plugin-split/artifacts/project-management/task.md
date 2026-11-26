# MCU Workbench Project Management 插件拆分任务清单

## 元数据

| 字段 | 内容 |
|---|---|
| request_id | `REQ-PLUGIN-SPLIT-20261123` |
| 任务清单版本 | `v0.1-project-management-execution` |
| 状态 | `完成（真实宿主验收 unverified）` |
| 项目路径与提交 | `C:\\Users\\shuaitan2\\Desktop\\mcu-workbench-host_ai @ host_ai/aa632a91229b15446279494066cf666704593d2c` |
| 输入 spec.md | `C:\\Users\\shuaitan2\\Desktop\\mcu-workbench-host_ai\\codex\\plugin-split\\spec.md` |
| 输入 plan.md | `C:\\Users\\shuaitan2\\Desktop\\mcu-workbench-host_ai\\codex\\plugin-split\\artifacts\\project-management\\plan.md` |
| Spec 力度 | `full` |
| 风险叠加门禁 | `versioned` |
| 生成时间 | `2026-11-26T17:00:00+08:00` |
| 下游执行 Skill | `workflow-task-execution` |

可信等级：`confirmed`、`user-confirmed`、`inferred`、`unverified`。

## 目标与任务图

目标：建立独立的 `mcu-workbench-project-management` 插件，迁入 `embedded-team-sync` 与 `workflow-document-context`，并保留根 CLI 与旧 Skill ID 兼容。

非目标：不迁入其他 Workflow Skill，不修改固件或用户项目数据，不恢复专利 Skill，不进行目标板验证。

关键串行链：`T-001 → T-002 → T-003 → T-004 → T-005 → T-006`。

## 任务索引

| task_id | 结果 | 依赖 | 验证 | 状态 |
|---|---|---|---|---|
| T-001 | 冻结 PM-F01–PM-F10 路径、哈希和 Git 状态 | 无 | 静态 | pass |
| T-002 | 建立插件骨架与双宿主描述文件 | T-001 | 静态 | pass |
| T-003 | 迁移两项 Skill 唯一源与 Doc Context runtime | T-002 | 静态/主机 | pass |
| T-004 | 更新 Workflow、catalog、projection、CLI 与 marketplace 注册 | T-003 | 静态 | pass |
| T-005 | 执行 Doc Context、插件和投影回归 | T-004 | 主机 | pass |
| T-006 | 完成 Codex/Cursor 验收和最终差异审查 | T-005 | 宿主/静态 | pass (静态；真实宿主 unverified) |

## 任务详情

### T-001

task_id: T-001
order: 1
title: 冻结项目管理拆分基线
objective: 记录 PM-F01–PM-F10 的存在性、SHA-256、Git 状态及现有 projection marker。
source_plan_ids: P-00
source_spec_ids: PM-F01–PM-F10, PM-G09
owner_agent: embedded-lead
support_agents: system-architect
owner_skill: tools-git
supporting_skills: workflow-task-breakdown
scope: 只读检查目标路径和当前工作区。
non_scope: 不覆盖、不清理、不修改业务文件。
dependencies: none
preconditions: `origin/host_ai` 已连接；用户允许将 patent Skill 排除；guardrails 已从 ZIP 恢复。
steps: 记录路径清单、哈希和状态，保存到执行记录。
outputs: `artifacts/project-management/baseline.json`。
verification_level: static
verification_command_or_condition: `C:\\Users\\shuaitan2\\Desktop\\mcu-workbench-host_ai` 下执行 PowerShell 路径与 SHA-256 检查。
expected_result: 目标路径均有明确状态，无未记录冲突。
failure_handling: 发现范围外冲突时停止并回传 Plan。
rollback: 删除本次生成的 baseline 记录。
confidence: confirmed
status: pass
blockers: none

### T-002–T-006

T-002 骨架校验：`node plugins/mcu-workbench-project-management/scripts/validate.js`，退出码 0。

T-003 迁移副本：新插件包含两项 Skill 和 4 个 Doc Context runtime 文件；新 `skill-map.json` 唯一登记两项 Skill。

T-004 已完成：旧 Workflow Skill 源目录已移出；Workflow map 更新为 16 项；catalog、双宿主 marketplace 和 projection marker 已同步。Workflow validator 通过：16 Skills、153 shared files、146 projections、5 external references。

T-005 已完成：定点 Jest 回归退出码 0，10 suites/30 tests 通过；项目管理插件 validator 退出码 0；`git diff --check` 退出码 0。

T-006 静态审查已完成；Codex/Cursor 的真实交互式宿主调用仍为 `unverified`，但仓库级 manifest、marketplace、Cursor sync 和插件 validator 均通过。

当前证据：项目管理插件 validator 退出码 0；Workflow validator 退出码 0；双宿主 marketplace JSON 可解析；定点 Jest 回归退出码 0（10 suites/30 tests）；`git diff --check` 退出码 0。未验证项：真实 Codex/Cursor UI 中的交互式发现与调用。

## 执行边界与交接

- 只允许修改 Spec 已列 PM-F01–PM-F10、Task/执行记录和明确生成的插件投影。
- Team Sync 的 `.ai/` 文件与 Doc Context 的 README/索引数据只在隔离 fixture 中验证。
- 静态/主机结果不得表述为 Codex、Cursor 或硬件真实运行证据。
- 全部任务完成后交 `workflow-final-review`，再执行统一 Verify。
