# Review-Package：最终质量整改闭环

| 字段 | 内容 |
|---|---|
| request_id | `REQ-FINAL-QUALITY-REMEDIATION-20260814` |
| 输入 RCP | `REQ-FINAL-QUALITY-REMEDIATION-20260814-RCP.md` |
| 项目路径与提交 | `C:\Users\zhang\Documents\mcu-workbench @ host_ai/341faf5` |
| 审查状态 | `放行` |
| 既有实现方案 | 用户确认的“初检 → 受限整改 → 复检 → 放行”要求 |

## 1. 工程现状表

| ID | 事实 | 证据 | 等级 | 影响 |
|---|---|---|---|---|
| F-01 | canonical 最终门禁包含受限整改与同条件复检。 | `skills/workflow/workflow-final-review/SKILL.md:32-38` | `confirmed` | 防止格式/注释问题仅报告不闭环。 |
| F-02 | 最终门禁契约要求上游 RCP、门禁放行和施工/验收表。 | `skills/workflow/workflow-final-review/references/prompt-contract.md:14` | `confirmed` | 使需求实施链路可追溯。 |
| F-03 | 集成规划已携带整改范围和检查命令交接。 | `skills/workflow/workflow-integration-plan/SKILL.md:19,29` | `confirmed` | 不允许最终门禁猜测格式规则或修改范围。 |
| F-04 | 活动 Codex Skill 镜像已同步 43 个 Skill 并包含关键规则。 | 同步命令退出码 0；活动镜像内容检查退出码 0 | `confirmed` | 当前本机后续任务可读取更新后的 Skill 文件。 |

## 2. 文件施工清单

| ID | 文件 | 施工内容 | 边界 |
|---|---|---|---|
| C-01 | `skills/workflow/workflow-final-review/**` | 初检、受限整改、复检、报告字段和交接契约。 | 不自动修复功能、安全或架构问题。 |
| C-02 | `skills/workflow/workflow-integration-plan/SKILL.md` | RCP 到最终门禁的交接字段。 | 不改变实现层唯一分发规则。 |
| C-03 | `docs/workflows.md` | 标准执行流包含最终整改闭环。 | 仅流程文档。 |
| C-04 | `tests/ai-collab-skills.test.js`、`tests/skills.test.js`、`tests/codex-compat.test.js` | 覆盖文本契约和 Codex 兼容入口。 | 不能替代真实固件或宿主运行证据。 |

## 3. 代码生成约束清单

| ID | 约束 | 判定 |
|---|---|---|
| G-01 | 只允许格式化、补充/更正必要注释。 | 可采用 |
| G-02 | 不得改签名、控制流、常量/宏、数据结构、资源/错误路径、依赖或分层。 | 可采用 |
| G-03 | 整改前后审阅 `git diff`；使用同条件工具复检并执行 `git diff --check`。 | 可采用 |
| G-04 | 工具不可用、检查不可复现或复检失败时结论为阻塞。 | 可采用 |

## 4. 验收测试清单

| ID | 验收项 | 证据等级 | 结果 |
|---|---|---|---|
| V-01 | 相关 Jest：`ai-collab-skills`、`skills`、`codex-compat`。 | 主机测试 | 19/19 通过。 |
| V-02 | `scripts/validate-plugin.js`。 | 静态 | 45 Skills、7 Agents、8 层，通过。 |
| V-03 | `scripts/validate-skill-links.js`。 | 静态 | 源仓库 308 Markdown 文件，通过。 |
| V-04 | `git diff --check`。 | 静态 | 通过。 |
| V-05 | 本机活动镜像关键规则检查。 | 文件部署 | 通过；不等同于新会话行为验证。 |

## 判定与交接

- 可采用：C-01 至 C-04、G-01 至 G-04、V-01 至 V-05。
- 需修订：无。
- 阻塞风险：无实施范围内未关闭项。
- 未验证项：宿主新会话元数据刷新；不阻塞源仓库与活动镜像文件的交付，但不得声称已完成真实对话行为试运行。
- 代码阶段判定：`可交给 workflow-integration-plan`。
