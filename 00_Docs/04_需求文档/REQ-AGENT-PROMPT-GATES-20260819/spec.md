# Spec：Agent 提示词同步 Router-first / Spec / Plan / Task 门禁

## 1. 元数据与状态

| 字段 | 内容 |
|---|---|
| request_id | `REQ-AGENT-PROMPT-GATES-20260819` |
| Spec 版本 | `v0.3` |
| Spec 状态 | `approved-for-integration-plan`（回归例外已获用户批准） |
| Spec 力度 | `full` |
| Spec 叠加门禁 | `human_review, versioned` |
| 项目路径 | `C:\\Users\\zhang\\Documents\\mcu-workbench` |
| 分支/提交 | `host_ai @ b03b0be2cc50909cff00983e61b986f671d709b6` |
| 内部 RCP 状态 | `.mcu-workbench/workflows/REQ-AGENT-PROMPT-GATES-20260819/state.json` |
| 正式文档 | 本目录下的 `spec.md`、批准后的 `plan.md`、后续 `task.md` |
| 用户审查状态 | `approved` |
| 决策负责人 | `user` |

## 2. 需求结论

当前七个 Agent 的名册和领域派生关系已经正常，但 Agent 正文对最新工作流门禁的表达不完全一致。需要同步 Agent 提示词，使每个 Agent 都能明确区分：

1. Router/Challenge/Review Gate 阶段的只读证据分析；
2. Spec 批准前不得进入 Plan 或代码施工；
3. Plan 批准后才能生成 Task 并分发实现；
4. Task 执行时的唯一主 Agent、唯一主实现 Skill 和单任务边界；
5. Verify/Final Review 的最终验收边界；
6. 需求变化、范围越界和关键事实缺失时回传 Router/Review Gate。

本需求只调整 Agent 提示词契约、OpenCode 命令派生产物和必要的静态测试，不改变实际运行时路由算法、Skill catalog、Agent 名册、宿主 Manifest、宿主 Hook 或固件工程。OpenCode 命令文件只作为由 Agent 正文生成的派生产物同步，不修改 OpenCode 宿主运行时或生成器逻辑。

## 3. 目的与可行性质疑

### 3.1 目的结论

`user-confirmed`：用户希望 Agent 提示与当前 Router-first、Spec、Plan、Task 和 Final Review 工作流保持一致，减少 Agent 根据旧提示词越过门禁、扩大范围或错误报告完成状态的风险。

### 3.2 可行性结论

`有条件可行`：七个 Agent 均为 Markdown 提示词，当前测试已经验证名册、领域、统一协议章节和技能派生关系。同步可以在 Agent 文件和静态测试范围内完成，不依赖 MCU、RTOS、编译器或目标板。

### 3.3 未验证边界

- 静态同步不能证明 Claude、OpenCode 或 Codex 宿主一定按照提示词执行；
- 不验证宿主是否真的强制拦截越过门禁的行为；
- 不验证目标固件、硬件、烧录或实机运行。

## 4. 工程现状表

| ID | 工程事实 | 证据 | 可信等级 | 对本 Spec 的影响 |
|---|---|---|---|---|
| F-01 | 当前存在七个 Agent：Lead、架构、固件、硬件、工具链、验证、知识 | `agents/*.md` | `confirmed` | 必须逐个同步，不能新增名册 |
| F-02 | Agent frontmatter 不手写 Skill 清单，技能由 domain 派生 | `lib/agent-domains.js` | `confirmed` | 不修改 Agent 的 `skills` 字段结构 |
| F-03 | Router 是嵌入式请求的第一入口 | `codex/AGENTS.md:26-33`、Router Skill | `confirmed` | 所有 Agent 需要说明 Router 前置关系 |
| F-04 | Spec 是 Plan 的正式输入，Plan 是 Task 的正式输入 | `spec.md`、Workflow Skills | `confirmed` | Agent 提示必须表达上游批准状态 |
| F-05 | 当前已有统一 Agent 协议章节 | `tests/agents.test.js` | `confirmed` | 保留 Inputs/Evidence/Scope/Outputs/Handoff 结构 |
| F-06 | 当前 Agent 正文对新门禁的表达不完全统一 | 七个 Agent 正文静态审查 | `confirmed` | 本次需要同步正文，不改变领域映射 |
| F-07 | 真实宿主执行门禁仍未由仓库证明 | 当前无真实宿主会话证据 | `unverified` | 验收只能声明静态/主机证据 |
| F-08 | `.opencode/commands/mcu-*.md` 由 `scripts/build-opencode-commands.js` 从 Agent 正文派生，测试要求内容一致 | `scripts/build-opencode-commands.js`、`tests/opencode-commands.test.js`、T-005 全量 Jest 输出 | `confirmed` | Agent 正文更新后必须同步派生产物；不改变生成器或宿主运行时 |

## 5. 第一版范围与非目标

### 5.1 直接范围

- `agents/embedded-lead.md`
- `agents/system-architect.md`
- `agents/firmware-engineer.md`
- `agents/hardware-integration.md`
- `agents/toolchain-engineer.md`
- `agents/verification-engineer.md`
- `agents/knowledge-engineer.md`
- `tests/agents.test.js` 或等价的 Agent 门禁静态测试范围
- `.opencode/commands/mcu-embedded-lead.md`
- `.opencode/commands/mcu-system-architect.md`
- `.opencode/commands/mcu-firmware-engineer.md`
- `.opencode/commands/mcu-hardware-integration.md`
- `.opencode/commands/mcu-toolchain-engineer.md`
- `.opencode/commands/mcu-verification-engineer.md`
- `.opencode/commands/mcu-knowledge-engineer.md`
- 本 request 的内部 `state.json/events.jsonl`

### 5.2 非目标

- 不新增或删除 Agent；
- 不修改 `AGENT_ROSTER`、`DOMAINS`、`skills/catalog.js`、`skills/loader.js`；
- 不修改 Router、Challenge、Review Gate、Integration Plan 等 Workflow Skill 的职责；
- 不修改 Claude/OpenCode/Codex 宿主运行时、命令生成器、Manifest、Hook、MCP 或刷新机制；
- 不修改固件、HAL、RTOS、BSP、Vendor、构建配置或目标工程；
- 不宣称真实宿主已经具备强制门禁能力。

## 6. Agent 提示词同步契约

### 6.1 所有 Agent 的共同门禁契约

每个 Agent 正文必须明确：

- Spec 前：只读取项目证据并输出 Summary、Evidence、Changed files、Tests、Artifacts、Blockers、Next handoff；不得修改业务代码；
- Spec 未批准：不得进入 Plan 设计、Task 生成或实现分发；
- Plan 未批准：不得进入 Task 执行；
- Task 执行：只处理已分配的一个 Task，遵守 `owner_agent`、`support_agents`、`owner_skill` 和文件范围；
- 需求变化或范围越界：停止当前工作并回传 Router/Challenge/Review Gate；
- Task 状态、主机测试或插件校验不能单独证明最终需求完成；
- 最终 Verify 必须对照 Spec 验收标准，并区分静态、主机、构建、真实宿主和目标运行证据。

### 6.2 各 Agent 的职责同步

| Agent | 必须强化的职责 |
|---|---|
| `embedded-lead` | 维护阶段、门禁、冲突、交接和最终汇总，不以协调身份绕过 Spec/Plan/Task |
| `system-architect` | Pre-Spec 只做证据化架构分析；Plan 阶段审查分层、调用链、接口和迁移，不直接修改业务代码 |
| `firmware-engineer` | 只有在批准 Spec/Plan/Task 和明确主实现 Skill 后施工，只改当前 Task 范围 |
| `hardware-integration` | 只报告板级和测量证据，硬件操作前确认授权，不把软件推测写成实物结论 |
| `toolchain-engineer` | 区分 dry-run、构建、烧录、调试和目标观测证据；破坏性操作必须获得授权 |
| `verification-engineer` | 独立验证当前 Task 和最终 Spec，不能用 Task 勾选或静态检查代替目标验证 |
| `knowledge-engineer` | 记录已确认事实、版本、状态、交接和未验证项，不补写推测或伪造批准记录 |

## 7. 文件施工清单

| ID | 动作 | 文件/目录 | 所属层 | 责任 Agent | 前置条件 | 状态 |
|---|---|---|---|---|---|---|
| W-01 | 修改 | `agents/embedded-lead.md` | Agent 协调 | `embedded-lead` | Spec/Plan 批准后进入 Plan | blocked-until-plan |
| W-02 | 修改 | `agents/system-architect.md` | Agent 架构 | `system-architect` | 同 W-01 | blocked-until-plan |
| W-03 | 修改 | `agents/firmware-engineer.md` | Agent 实现 | `firmware-engineer` | 同 W-01 | blocked-until-plan |
| W-04 | 修改 | `agents/hardware-integration.md` | Agent 硬件 | `hardware-integration` | 同 W-01 | blocked-until-plan |
| W-05 | 修改 | `agents/toolchain-engineer.md` | Agent 工具链 | `toolchain-engineer` | 同 W-01 | blocked-until-plan |
| W-06 | 修改 | `agents/verification-engineer.md` | Agent 验证 | `verification-engineer` | 同 W-01 | blocked-until-plan |
| W-07 | 修改 | `agents/knowledge-engineer.md` | Agent 知识 | `knowledge-engineer` | 同 W-01 | blocked-until-plan |
| W-08 | 修改或新增 | Agent 静态契约测试范围 | 主机验证 | `verification-engineer` | W-01～W-07 | blocked-until-plan |
| W-11 | 生成 | `.opencode/commands/mcu-*.md` | OpenCode 派生产物 | `toolchain-engineer` | W-01～W-08、范围修订批准 | blocked-until-plan |
| W-09 | 不修改 | `lib/agent-domains.js`、`skills/catalog.js` | Agent 派生 | `system-architect` | 现有映射已确认 | excluded |
| W-10 | 不修改 | Workflow Skill、宿主运行时、Manifest、固件工程 | 外部边界 | `embedded-lead` | 本 Spec 非目标 | excluded |

## 8. 代码/提示词生成约束清单

| ID | 约束 | 禁止事项 | 可信等级 | 状态 |
|---|---|---|---|---|
| G-01 | Agent frontmatter 继续只声明身份和 domain | 新增手写 Skill 清单或改变派生机制 | `confirmed` | ready |
| G-02 | 提示词必须区分 Pre-Spec、Spec/Plan、Task、Verify 阶段 | 用一句“已批准设计”替代 Spec/Plan/Task 证据 | `user-confirmed` | ready |
| G-03 | 每个 Task 只能有一个主实现 Agent/Skill | 多 Agent 并行修改同一 Task 文件 | `confirmed` | ready |
| G-04 | 需求变化必须回传 RCP/Review Gate | 先改 Agent 或业务代码再补 Spec | `user-confirmed` | ready |
| G-05 | 证据等级必须分离 | 把静态/主机结果写成真实宿主或目标板证明 | `confirmed` | ready |
| G-06 | 只修改本 Spec 明确的 Agent、静态测试和 OpenCode 派生产物文件 | 越界修改 Workflow、生成器、Manifest、catalog、宿主运行时或固件 | `user-confirmed` | ready |

## 9. 验收测试清单

| ID | 证据等级 | 验收项 | 命令/条件 | 预期结果 | 状态 |
|---|---|---|---|---|---|
| V-01 | 静态 | 七个 Agent 名称和 domain 不变 | `npm test -- --runInBand tests/agents.test.js tests/agent-domains.test.js` | 原有 Agent/domain 测试通过 | not-run |
| V-02 | 静态 | 统一 Agent 协议章节保留 | 同 V-01 | Inputs、Evidence、Scope、Outputs、Handoff 全部存在 | not-run |
| V-03 | 静态 | 门禁关键词、阶段关系和 OpenCode 派生内容一致 | 对 `agents/*.md` 执行文本检查，并运行 `tests/opencode-commands.test.js` | 所有 Agent 表达 Router/Spec/Plan/Task/Verify 边界，命令文件与生成器输出一致 | not-run |
| V-04 | 静态 | catalog 和派生关系不变 | `npm run validate:plugin` | 插件结构校验通过 | not-run |
| V-05 | 静态 | Markdown 链接和格式无新增问题 | `npm run validate:links`、`git diff --check` | exit code 0 | not-run |
| V-06 | 主机 | Agent 提示契约及 OpenCode 派生产物回归 | `npm test -- --runInBand --testPathIgnorePatterns=tests/workflow-dashboard.test.js` | 除用户确认暂缓的 Dashboard HTML 测试外，全量插件测试通过 | not-run |
| V-07 | 真实宿主 | Agent 是否真正遵守门禁 | Claude/OpenCode/Codex 实际会话 | 当前保持 `unverified`，不得由静态测试替代 | blocked/unverified |

## 10. 风险、回滚和验证边界

- 主要风险是提示词与 Workflow Skill 未来再次漂移；通过静态契约测试和版本化 request 状态降低风险。
- 如果修改 Agent 正文导致现有协议测试失败，只回滚当前 Agent 文件或测试文件，不回滚既有 Workflow 迁移提交。
- 本需求不涉及目标板、烧录、串口、RTT、Map、RAM/ROM、ISR、DMA 或硬件实物验证。
- `V-07` 必须保持 `unverified`，除非存在可审计的真实宿主会话记录。

## 11. 范围修订 v0.2

- 用户决策：`user-confirmed`；用户允许将 `.opencode/commands/mcu-*.md` 派生产物纳入同步范围。
- 修订原因：T-005 全量 Jest 证明 Agent 正文更新后七个 OpenCode 命令派生产物 stale；继续保持排除会使已批准 Agent 变更无法通过既有生成一致性测试。
- 新增范围：仅重新运行既有 `scripts/build-opencode-commands.js` 生成七个 `.opencode/commands/mcu-*.md` 文件；不修改生成器、OpenCode 宿主运行时或其他宿主适配。
- 新增计划/任务：由 `P-05/T-006` 负责派生产物同步，原最终回归调整为 `P-06/T-005`，依赖 T-006 完成后再执行。
- 保留阻塞：无关新增 `skills/workflow/workflow-document-context` 未登记问题不在本 Spec 范围内，继续单独记录为 `B-02`。

## 12. 回归例外修订 v0.3

- 用户决策：`user-confirmed`；Dashboard HTML 功能正在开发，本次暂不纳入全量 Jest 验收。
- 例外范围：仅在 T-005/V-06 中使用 `--testPathIgnorePatterns=tests/workflow-dashboard.test.js`；不删除、修改或掩盖该测试。
- 保留记录：Dashboard 测试失败仍记录为 `known-development-exception`，待该功能完成后单独恢复验证。
- 本次相关 Agent、插件结构、链接、OpenCode 派生产物和差异检查仍必须全部通过。

## 13. 当前状态与下游交接

```text
spec_status: approved-for-integration-plan-v0.3
plan_status: approved-v0.3
task_status: T-005-completed-with-known-development-exception
implementation_allowed: false
next_action: 交接 workflow-final-review，保留 Dashboard HTML known-development-exception
blockers: none for this request; gate: regression-exception-approved
```

正式 Plan 已基于本 Spec 和用户选择的方案 A 生成；Plan 批准前不得进入 Task 生成或实现分发。
