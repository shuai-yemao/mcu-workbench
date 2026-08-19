# 集成实施计划：Agent 提示词同步 Router-first / Spec / Plan / Task 门禁

## 1. 元数据与状态

| 字段 | 内容 |
|---|---|
| request_id | `REQ-AGENT-PROMPT-GATES-20260819` |
| 生成时间 | `2026-08-19T00:00:00+08:00` |
| 计划版本 | `v0.3` |
| 计划状态 | `approved`（回归例外已获用户批准） |
| 项目路径 | `C:\\Users\\zhang\\Documents\\mcu-workbench` |
| 分支/提交 | `host_ai @ b03b0be2cc50909cff00983e61b986f671d709b6` |
| 输入 spec.md | `C:\\Users\\zhang\\Documents\\mcu-workbench\\00_Docs\\04_需求文档\\REQ-AGENT-PROMPT-GATES-20260819\\spec.md` |
| 输入 RCP/状态 | `C:\\Users\\zhang\\Documents\\mcu-workbench\\.mcu-workbench\\workflows\\REQ-AGENT-PROMPT-GATES-20260819\\state.json` |
| Spec 力度 | `full` |
| 风险叠加门禁 | `human_review, versioned` |
| 选定方案 | `方案 A：内嵌式门禁同步` |
| 方案选择人 | `user` |
| 方案审查结论 | `通过；v0.2 增加 OpenCode 派生产物同步，不改变运行时` |
| Plan 用户审查状态 | `awaiting_user_review` |

## 2. 一句话说明

- 要解决的问题：七个 Agent 的正文没有完全同步最新 Router-first、Spec、Plan、Task 和 Verify 门禁。
- 计划做什么：在每个 Agent 提示词中内嵌共同门禁契约，并补充角色专属边界与静态回归检查。
- 明确不做什么：不改变 Agent 名册、domain 派生、Workflow Skill、宿主运行时、Manifest、生成器、固件和其他宿主适配；仅更新由 Agent 正文派生的七个 OpenCode 命令文件。
- 预期结果：每个 Agent 单独被加载时，都能识别当前阶段、允许动作、交接条件和证据边界。

## 3. 输入依据与工程事实

| ID | 事实或约束 | 证据 | 可信等级 | 对计划的影响 |
|---|---|---|---|---|
| E-01 | 当前有七个 Agent，名册由 `AGENT_ROSTER` 固定 | `agents/*.md`、`lib/agent-domains.js:16-24` | `confirmed` | 逐个修改现有文件，不新增 Agent |
| E-02 | Agent 技能由 domain 派生，frontmatter 不应手写 Skill 清单 | `lib/agent-domains.js:4-9`、`tests/agents.test.js:18-25` | `confirmed` | 保留 frontmatter 结构 |
| E-03 | Router-first 是当前嵌入式任务入口 | `codex/AGENTS.md:26-33`、Router Skill | `confirmed` | 所有 Agent 正文加入阶段前置条件 |
| E-04 | Spec、Plan、Task 具有单向依赖 | 本 request 的 `spec.md:2、6、11`、Integration Plan Skill | `confirmed` | 不允许 Agent 跨越上游批准状态 |
| E-05 | 现有 Agent 测试已验证名册、domain 和统一协议章节 | `tests/agents.test.js:8-41` | `confirmed` | 在现有测试中增加门禁契约断言 |
| E-06 | 真实宿主是否强制执行提示词仍未验证 | 本 request 的 Spec V-07 | `unverified` | 只报告静态/主机结果，不报告宿主通过 |
| E-07 | OpenCode 命令文件是 Agent 正文的派生产物，既有测试要求同步 | `scripts/build-opencode-commands.js`、`tests/opencode-commands.test.js`、T-005 输出 | `confirmed` | 增加一个生成任务，不修改生成器或宿主运行时 |

## 4. 两个候选方案与用户选择记录

### 方案 A：内嵌式门禁同步

- 适用场景：Agent 数量有限，要求每个 Agent 单独加载即可理解完整规则。
- 做什么：在七个 Agent 正文中直接加入共同门禁章节，再补充角色专属职责。
- 主要改动：七个 `agents/*.md`、现有 `tests/agents.test.js` 和七个 `.opencode/commands/mcu-*.md` 派生产物。
- 优点：自包含、宿主依赖少、修改范围小、回滚简单。
- 缺点：共同规则有重复文本，未来同步需要修改多个文件。
- 成本：低；只涉及 Markdown 和主机静态测试。
- 风险：未来 Workflow 规则变化时可能出现提示词漂移。
- 验收方式：Agent/domain 测试、插件校验、链接检查、全量 Jest 和 diff 检查。
- 回滚方式：按 Agent 文件和测试文件分别回滚，不触碰 Workflow 或既有提交。

### 方案 B：共享契约加 Agent 摘要

- 适用场景：Agent 数量持续增长，需要集中维护共同规则。
- 做什么：新增 `agents/references/agent-workflow-gate-contract.md`，每个 Agent 只保留摘要和引用，并增加引用完整性测试。
- 主要改动：共享引用文件、七个 Agent、现有测试和新增契约测试。
- 优点：共同规则集中，后续扩展和审计更容易。
- 缺点：文件范围更大；宿主是否自动读取引用文件没有直接证据；引用失效会导致提示词不完整。
- 成本：中；需要维护引用关系和额外测试。
- 风险：存在宿主加载引用文件不稳定的风险。
- 验收方式：除方案 A 检查外，还需验证每个引用路径存在且契约覆盖完整。
- 回滚方式：同时回滚引用文件、引用关系和新增测试。

### 方案对比

| 维度 | 方案 A | 方案 B | 结论依据 |
|---|---|---|---|
| 易理解程度 | 高 | 中 | A 每个 Agent 自包含 |
| 改动范围 | 小 | 中 | B 增加共享引用和测试 |
| 实现复杂度 | 低 | 中 | B 增加引用一致性维护 |
| 运行时资源 | 无变化 | 无变化 | 均不改宿主运行时 |
| 架构风险 | 低 | 中 | B 依赖引用加载行为 |
| 可验证性 | 高 | 中高 | A 直接扫描 Agent 正文 |
| 回滚难度 | 低 | 中 | B 有额外依赖文件 |
| 后续扩展性 | 中 | 高 | B 适合 Agent 数量持续增长 |

### 用户选择

```text
selected_option: A
decision_owner: user
decision_rationale: 每个 Agent 自包含，降低宿主引用加载不确定性，改动范围和回滚成本更小
rejected_option: B
new_constraints: none
```

## 5. 选定方案概览

- 选定方案：`A：内嵌式门禁同步`
- 选定原因：当前只有七个 Agent，且真实宿主是否自动读取 `agents/references/` 没有证据；自包含提示词更稳妥。
- 与 `spec.md` 的一致性：v0.2 增加 Spec 明确允许的七个 OpenCode 派生产物，不改变 catalog、domain、Workflow、生成器和宿主运行时。
- 施工边界：共同门禁章节、角色专属阶段边界、统一交接字段、Agent 静态断言、既有生成器产物同步。
- 非目标：新增 Agent、修改运行时路由、修改宿主 Hook、修改固件或目标工程。
- 主要风险：共同规则重复导致未来漂移；通过测试中的关键词/阶段契约断言降低风险。

## 6. 分层、调用链与接口边界

本计划修改的是插件 Agent 协作控制面，不改变目标固件的 App/Service/Platform/Impl/Vendor 分层。

```text
用户需求
  → embedded-lead
  → workflow-requirements-router
  → workflow-requirements-challenge
  → workflow-review-gate
  → spec.md
  → workflow-integration-plan
  → plan.md
  → workflow-task-breakdown
  → task.md
  → workflow-task-execution
  → 单一主实现 Agent/Skill
  → workflow-final-review
```

- Agent 的输入：用户目标、批准的上游文档、项目证据和当前 Task 分配。
- Agent 的输出：Summary、Evidence、Changed files、Tests、Artifacts、Blockers、Next handoff。
- 共享状态所有权：RCP/Review-Package/Final Review 由内部 Workflow State 保存；正式用户文档只有 Spec、Plan、Task。
- 修改所有权：每个 Task 只有一个 `owner_agent` 和一个主实现 Skill；协作 Agent 只提供审查或验证。
- 禁止依赖：Agent 不得绕过 Router、Spec、Plan、Task 门禁，不得把宿主提示词当成强制拦截能力。
- 目标固件层：本次不触碰 App → Service → Platform ← Impl → Vendor 调用链。

## 7. 文件施工顺序

| ID | 阶段 | 动作 | 文件或目录 | 所属层 | 施工内容与理由 | 责任 Skill | 前置条件 | 生成/覆盖边界 | 状态 |
|---|---|---|---|---|---|---|---|---|---|
| P-01 | 1 | 修改 | `agents/embedded-lead.md`、`agents/system-architect.md` | Agent 协调/架构 | 加入共同阶段门禁和架构职责边界 | `workflow-task-execution` | Plan 批准 | 只改 Markdown 正文和必要注释 | ready-after-plan |
| P-02 | 2 | 修改 | `agents/firmware-engineer.md`、`agents/hardware-integration.md`、`agents/toolchain-engineer.md` | Agent 实现/硬件/工具链 | 加入 Task 所有权、破坏性操作和证据边界 | `workflow-task-execution` | P-01 | 不改实现代码、工具脚本或宿主 | ready-after-plan |
| P-03 | 3 | 修改 | `agents/verification-engineer.md`、`agents/knowledge-engineer.md` | Agent 验证/知识 | 加入最终 Verify、状态记录和未验证项边界 | `workflow-task-execution` | P-02 | 只改 Agent 正文 | ready-after-plan |
| P-04 | 4 | 修改 | `tests/agents.test.js` | 主机验证 | 增加 Router/Spec/Plan/Task/Verify 共同契约断言 | `tools-quality` | P-01～P-03 | 不改 Agent roster/domain 派生实现 | ready-after-plan |
| P-05 | 5 | 生成 | `.opencode/commands/mcu-*.md` | OpenCode 派生产物 | 用既有生成器同步七个命令文件，不改生成器 | `workflow-task-execution` | P-04、Spec/Plan v0.2 | 只写七个派生产物 | ready-after-plan |
| P-06 | 6 | 验证 | Agent 文件、命令文件、插件目录和链接 | 质量出口 | 执行 Agent 定向测试、插件校验、链接、全量 Jest 和 diff 检查 | `tools-verification` | P-05 | 不产生目标板结论 | ready-after-plan |

## 8. 阶段计划与交接

| 阶段 | 目标 | 输入 | 输出 | 完成条件 | 交接对象 |
|---|---|---|---|---|---|
| 1 | 同步 Lead/架构门禁 | Spec、Plan、现有 Agent | 两个更新后的 Agent | 共同门禁和架构职责不越界 | `firmware-engineer` |
| 2 | 同步实现/硬件/工具链门禁 | 阶段 1 文件、Spec | 三个更新后的 Agent | Task 所有权和操作授权清晰 | `verification-engineer` |
| 3 | 同步验证/知识门禁 | 阶段 2 文件、Spec | 两个更新后的 Agent | Verify、证据和状态边界清晰 | `tools-quality` |
| 4 | 增加静态契约检查 | 七个 Agent、现有测试 | 更新后的 `tests/agents.test.js` | 旧协议、名册和新门禁同时通过 | `tools-verification` |
| 5 | 同步 OpenCode 派生产物 | 七个 Agent、既有生成器 | 七个 `.opencode/commands/mcu-*.md` | 命令文件与生成器输出一致 | `workflow-task-execution` |
| 6 | 完成回归验证 | 全部变更、项目脚本 | 测试与校验输出 | 所有适用命令通过，真实宿主保持 unverified | `workflow-final-review` |

## 8A. 下游执行 Agent 与 Skill 基线

本需求没有专门的 Agent-prompt 实现 Skill；因此由 `workflow-task-execution` 作为施工控制 Skill，按 Task 将具体 Markdown 文件交给对应 owner Agent，`tools-quality`/`tools-verification` 只负责辅助审查和验证。

| 阶段/ID | 主 Agent | 协作 Agent | 主实现 Skill | 辅助 Skill | 分配理由与证据 | 状态 |
|---|---|---|---|---|---|---|
| P-01 | `embedded-lead` | `system-architect` | `workflow-task-execution` | `tools-quality` | 共同门禁和架构边界，依据 Spec 6.1/6.2 | ready-after-plan |
| P-02 | `firmware-engineer` | `hardware-integration`, `toolchain-engineer` | `workflow-task-execution` | `tools-quality` | 实现、硬件操作和工具证据边界，依据 Spec 6.2 | ready-after-plan |
| P-03 | `verification-engineer` | `knowledge-engineer` | `workflow-task-execution` | `tools-quality` | Verify、状态、交接和未验证项，依据 Spec 6.2 | ready-after-plan |
| P-04 | `verification-engineer` | `embedded-lead` | `tools-quality` | `tools-verification` | 静态契约测试和质量检查，依据 Spec V-01～V-06 | ready-after-plan |
| P-05 | `toolchain-engineer` | `verification-engineer` | `workflow-task-execution` | `tools-quality` | 使用既有生成器同步 OpenCode 派生产物，依据 Spec F-08/W-11 | ready-after-plan |
| P-06 | `verification-engineer` | `embedded-lead` | `tools-verification` | `tools-quality` | 范围修订后的全量回归和最终边界报告，依据 Spec V-03～V-07 | ready-after-plan |

每个下游 Task 仍必须由 `workflow-task-breakdown` 回填唯一 `owner_agent`、`support_agents`、`owner_skill` 和 `supporting_skills`；未生成 `task.md` 前不得开始实现。

## 9. 资源、并发与生命周期约束

- MCU、RTOS、任务、队列、ISR、DMA、Cache 和硬件资源：不适用，本次只修改 Agent Markdown、主机测试和 OpenCode 派生产物。
- 内存：不新增运行时内存分配；测试使用既有 Node/Jest 机制。
- 并发：P-01～P-03 必须按顺序执行；不得并行修改同一 Agent 文件。
- 生命周期：先读取 Spec/Plan/Task，再修改当前 Task 范围内文件；失败时保留状态和旧文件。
- 需求变化：一旦影响 Agent 范围、阶段边界或验收标准，停止执行并回传 Router/Review Gate。

## 10. 代码/提示词生成约束

| ID | 约束类别 | 必须遵守 | 禁止事项 | 证据 | 状态 |
|---|---|---|---|---|---|
| G-01 | Agent frontmatter | 保持 name、description、domain、scope；不新增 skills 清单 | 改变 catalog 派生机制 | `tests/agents.test.js`、Spec G-01 | ready |
| G-02 | 阶段门禁 | 明确 Pre-Spec、Spec/Plan、Task、Verify 四类阶段 | 用“已批准设计”替代正式文档状态 | Spec G-02 | ready |
| G-03 | Task 所有权 | 一个 Task 一个主 Agent/Skill，协作 Agent 不并行改同一文件 | 多 Agent 共同施工同一 Task | Spec G-03 | ready |
| G-04 | 需求变化 | 回传 Router/Challenge/Review Gate | 先改 Agent/代码再补 Spec | Spec G-04 | ready |
| G-05 | 证据等级 | 分离静态、主机、构建、真实宿主和目标运行 | 把主机结果写成宿主/目标通过 | Spec G-05 | ready |
| G-06 | 文件范围 | 仅修改七个 Agent、Agent 静态测试和七个 OpenCode 派生产物 | 修改 Workflow、Manifest、catalog、生成器、宿主运行时或固件 | Spec G-06 v0.2 | ready |

## 11. 验收与验证计划

| ID | 证据等级 | 验收项 | 命令/条件（绝对 cwd） | 预期结果 | 责任 Skill | 产物 | 状态 |
|---|---|---|---|---|---|---|---|
| V-01 | 主机 | Agent/domain 基线 | `C:\\Users\\zhang\\Documents\\mcu-workbench`：`npm test -- --runInBand tests/agents.test.js tests/agent-domains.test.js` | 相关测试通过 | `tools-verification` | Jest 输出 | not-run |
| V-02 | 静态 | 统一协议和门禁文本 | 扫描 `agents/*.md` | 七个 Agent 均包含阶段、证据、交接和阻塞规则 | `tools-quality` | 扫描结果 | not-run |
| V-03 | 静态 | 插件结构、catalog 和派生产物入口 | `C:\\Users\\zhang\\Documents\\mcu-workbench`：`npm run validate:plugin` | 插件校验通过，Agent 数量和 domain 不变 | `tools-quality` | 校验输出 | not-run |
| V-04 | 静态 | Markdown 链接 | 同一 cwd：`npm run validate:links` | 链接校验通过 | `tools-quality` | 链接输出 | not-run |
| V-05 | 主机 | 全量回归和 OpenCode 命令一致性 | 同一 cwd：`npm test -- --runInBand --testPathIgnorePatterns=tests/workflow-dashboard.test.js` | 除用户确认暂缓的 Dashboard HTML 测试外，全量插件测试及派生产物一致性通过 | `tools-verification` | Jest 输出 | not-run |
| V-06 | 静态 | 差异边界 | 同一 cwd：`git diff --check` | 无空白错误；只包含 Spec 允许文件 | `tools-quality` | Git 输出 | not-run |
| V-07 | 真实宿主 | Agent 实际遵守门禁 | Claude/OpenCode/Codex 新会话 | 当前保持 `unverified`，不由主机测试替代 | `tools-verification` | 会话记录（如有） | unverified |

静态和主机结果只能证明提示词内容、插件结构和测试行为，不能证明真实宿主强制执行，也不能证明目标板运行。

## 12. 方案审查记录

| 审查项 | 责任 Agent | 结论 | 证据 | 修订或后续动作 |
|---|---|---|---|---|
| 分层和接口 | `system-architect` | 可采用 | 只修改 Agent 协作控制面，不改变固件五层调用链 | 保持 Workflow/宿主/固件排除边界 |
| 文件和数据流 | `firmware-engineer` | 可采用 | 七个 Markdown 文件与现有 Agent 测试可定位 | 由 Task Breakdown 细化文件级任务 |
| 验收和回归 | `verification-engineer` | 可采用 | Spec V-01～V-07 已区分静态、主机和真实宿主 | 保持 V-07 unverified |
| 硬件边界 | `hardware-integration` | 不适用 | 本需求不触碰硬件、烧录或目标工程 | 不增加硬件任务 |
| 工具链和产物 | `toolchain-engineer` | 可采用 | 只使用既有 Node/Jest/插件校验入口 | 不增加构建或烧录动作 |

### 审查结论

- 可采用项：方案 A、七个 Agent 内嵌门禁、现有 Agent 测试扩展、静态/主机验证。
- 已完成修订：已记录用户选择 A；未改变 Spec 范围。
- 未关闭阻塞：无；真实宿主行为仍为 `unverified`，不是本地施工阻塞。
- 是否改变 `spec.md`：否。
- 最终结论：方案 A 可进入 Plan 用户审查；Plan 批准前不生成 Task。

## 13. 回滚与失败处理

- 每个 Agent 文件单独回滚；不回滚既有 Workflow 迁移提交。
- 测试失败时先定位是协议断言、frontmatter、domain 派生还是 Markdown 链接问题，再在本 Plan 文件范围内修复。
- 如果发现需要修改 Workflow Skill、catalog、Manifest 或宿主运行时，立即阻塞并回传 Review Gate。
- 如果真实宿主行为与提示词不一致，只记录 `unverified`/阻塞证据，不通过修改提示词伪造宿主强制能力。

## 14. 下游交接

- 正式需求/约束输入：[本 request 的 `spec.md`](./spec.md)
- 正式实施计划：[本文件 `plan.md`](./plan.md)
- 阶段级 Agent/Skill 基线：本文件第 8A 节
- 任务级分配：交给 `workflow-task-breakdown` 回填到后续 `task.md`
- 执行分配规则：`workflow-task-execution` 每次只选择一个 Task，并复核唯一主 Agent/Skill
- 目标文件范围：七个 `agents/*.md`、`tests/agents.test.js`、七个 `.opencode/commands/mcu-*.md`、本 request 状态文件
- 执行前必须确认：Plan 用户批准、工作区无越界修改、Agent 文件与 catalog 基线未发生未记录变化
- 禁止扩大：不得修改 Workflow、Manifest、catalog、生成器、宿主运行时、固件或目标工程
- 实现完成后交接：`workflow-final-review`
- 未验证项：真实 Claude/OpenCode/Codex 宿主是否强制执行门禁
- 回传规则：新需求、新事实或范围变化回到 `workflow-requirements-challenge`/`workflow-review-gate`

## 15. 范围修订记录 v0.2

- 用户决策：`user-confirmed`；允许将 `.opencode/commands/mcu-*.md` 派生产物纳入本次同步。
- 触发证据：T-005 全量 Jest 的 `tests/opencode-commands.test.js` 发现七个派生产物 stale。
- 计划修订：新增 P-05/T-006 生成任务；原最终验证调整为 P-06/T-005，必须在 P-05 完成后执行。
- 保持边界：只调用既有 `scripts/build-opencode-commands.js`，不修改生成器或宿主运行时。

## 16. 回归例外修订记录 v0.3

- 用户决策：`user-confirmed`；Dashboard HTML 功能正在开发，本次回归暂时跳过 `tests/workflow-dashboard.test.js`。
- 只调整验证命令和验收解释，不修改 Dashboard 代码或测试，不把跳过写成通过。
- T-005 重新执行时必须保留该例外记录，并单独标记该测试为 `known-development-exception`。

## 17. 当前状态与下一步

- 当前状态：`approved-v0.3`；T-005 已完成
- 当前唯一动作：交接 `workflow-final-review`，保留已批准的 Dashboard HTML 例外
- 阻塞项：无；Dashboard HTML 测试保留为 `known-development-exception`
- 批准后动作：执行最终 Review；Dashboard 功能完成后单独恢复该测试
- 不允许动作：Task 批准前修改 Agent 文件或进入实现
