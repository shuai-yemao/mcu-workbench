# 实施任务清单：Agent 提示词同步 Router-first / Spec / Plan / Task 门禁

> 本任务清单由已批准的 `spec.md` 和 `plan.md` 拆解生成。v0.2 增加 OpenCode 派生产物同步任务；它只描述任务、依赖、验证和回滚。

## 1. 元数据

| 字段 | 内容 |
|---|---|
| request_id | `REQ-AGENT-PROMPT-GATES-20260819` |
| 任务清单版本 | `v0.3` |
| 状态 | `Final Review 通过，保留已批准例外` |
| 项目路径与提交 | `C:\\Users\\zhang\\Documents\\mcu-workbench @ host_ai / b03b0be2cc50909cff00983e61b986f671d709b6` |
| 输入 spec.md | `C:\\Users\\zhang\\Documents\\mcu-workbench\\00_Docs\\04_需求文档\\REQ-AGENT-PROMPT-GATES-20260819\\spec.md` |
| 输入 plan.md | `C:\\Users\\zhang\\Documents\\mcu-workbench\\00_Docs\\04_需求文档\\REQ-AGENT-PROMPT-GATES-20260819\\plan.md` |
| Spec 力度 | `full` |
| 风险叠加门禁 | `human_review, versioned` |
| 生成时间 | `2026-08-19T00:00:00+08:00` |
| 阶段级 Agent/Skill 基线 | `plan.md 第 8A 节` |
| 下游执行 Skill | `workflow-task-execution` |

可信等级：`confirmed`、`user-confirmed`、`inferred`、`unverified`。

## 2. 总体任务图

```text
T-001 → T-002 → T-003 → T-004 → T-006 → T-005
```

- 总体目标：让七个 Agent 的直接提示词都明确 Router-first、Spec、Plan、Task、Verify 和证据边界。
- 非目标：不修改 Agent 名册、domain 派生、Workflow Skill、Manifest、生成器、宿主运行时、固件或目标工程。
- 关键串行链：`T-001 → T-002 → T-003 → T-004 → T-006 → T-005`。
- 可并行任务组：无。
- 不可并行原因：T-001～T-003 共同维护同一套提示词措辞；T-004 依赖全部 Agent 文本；T-006 依赖 Agent 正文稳定；T-005 依赖所有文件、派生产物和测试稳定。

## 3. 任务索引

| 顺序 | task_id | 任务名称 | 前置任务 | 并行组 | 主 Agent | 主实现 Skill | 辅助 Skill | 验证等级 | 状态 |
|---:|---|---|---|---|---|---|---|---|---|
| 1 | T-001 | 同步 Lead/架构 Agent 门禁 | none | none | `embedded-lead` | `workflow-task-execution` | `tools-quality` | static | ready |
| 2 | T-002 | 同步实现/硬件/工具链 Agent 门禁 | T-001 | none | `firmware-engineer` | `workflow-task-execution` | `tools-quality` | static | ready |
| 3 | T-003 | 同步验证/知识 Agent 门禁 | T-002 | none | `verification-engineer` | `workflow-task-execution` | `tools-quality` | static | ready |
| 4 | T-004 | 增加 Agent 门禁静态契约测试 | T-003 | none | `verification-engineer` | `tools-quality` | `tools-verification` | host | ready |
| 5 | T-006 | 同步 OpenCode 派生产物 | T-004 | none | `toolchain-engineer` | `workflow-task-execution` | `tools-quality` | static | ready |
| 6 | T-005 | 完成插件结构和回归验证 | T-006 | none | `verification-engineer` | `tools-verification` | `tools-quality` | host/static | pass_with_known_exception |

## 4. 任务详情

### T-001：同步 Lead/架构 Agent 门禁

| 字段 | 内容 |
|---|---|
| task_id | `T-001` |
| order | `1` |
| parallel_group | `none` |
| source_plan_ids | `P-01` |
| source_spec_ids | `F-01,F-03,F-04,G-02,G-04` |
| owner_agent | `embedded-lead` |
| support_agents | `system-architect` |
| owner_skill | `workflow-task-execution` |
| supporting_skills | `tools-quality` |
| allocation_evidence | Plan P-01/8A：Lead 负责协调，架构 Agent 审查边界；共同规则必须先稳定 |
| allocation_id | `T-001-20260819T234011+0800-embedded-lead` |
| allocation_commit | `b03b0be2cc50909cff00983e61b986f671d709b6` |
| confidence | `confirmed` |
| status | `pass` |
| solid_status | `not_applicable_prompt_contract`：本任务仅更新 Agent 提示词契约，不改变运行时代码、接口实现或继承关系；已检查职责边界未被覆盖 |

#### 目标

更新 `embedded-lead.md` 和 `system-architect.md`，使两者明确 Spec 前只读分析、Plan/Task 前置、需求变化回传和标准交接。

#### 范围

- 包含：共同门禁章节、Lead 的状态/冲突职责、架构 Agent 的 Pre-Spec/Plan 职责。
- 不包含：固件代码、Workflow Skill、Agent roster/domain、其他 Agent。
- 文件范围：`agents/embedded-lead.md`、`agents/system-architect.md`。
- 所属层：插件 Agent 协调/架构控制面。

#### 前置条件与依赖

- 前置任务：无。
- 外部前提：Plan 已批准，当前 Agent frontmatter 和统一协议章节保持不变。
- 依赖证据：`plan.md:P-01`、`spec.md:6.1-6.2`、`tests/agents.test.js`。

#### 执行步骤

1. 读取两个 Agent 的当前正文和统一协议章节。
2. 增加 Router/Spec/Plan/Task/Verify 阶段门禁和标准交接要求。
3. 保留各自原有职责、scope、frontmatter 和安全规则。
4. 检查差异只涉及提示词正文和必要注释。

#### 输出物

- 文件：两个 Agent Markdown 文件。
- 中间产物：限定范围的 `git diff`。

#### 约束边界

- 不修改 frontmatter 的 Agent 名称、domain、scope 和模型配置。
- 不新增 Skill 清单，不改变 domain 派生。
- 不修改业务代码、运行时和 Workflow Skill。
- 不涉及 MCU、RTOS、ISR、DMA 或内存生命周期。

#### 验证

| 字段 | 内容 |
|---|---|
| 证据等级 | `static` |
| 命令或条件 | cwd=`C:\\Users\\zhang\\Documents\\mcu-workbench`；检查两个文件包含 Router、Spec、Plan、Task、Verify、Blockers、Next handoff 关键词 |
| 预期结果 | 两个 Agent 的门禁和交接契约完整，frontmatter 未变更 |
| 产物位置 | `C:\\Users\\zhang\\Documents\\mcu-workbench` 的限定 diff |
| 当前状态 | `pass` |

#### 测试先行记录

- 检查：对 `agents/embedded-lead.md` 和 `agents/system-architect.md` 扫描 `Router-first`、`Spec not approved`、`Plan not approved`、`owner_agent`、`Next handoff`。
- 预期：当前提示词缺少至少一项新门禁契约，检查应失败。
- 实际结果：检查退出码 `1`，确认两份提示词均缺少 Router-first、Spec/Plan 未批准门禁和 owner_agent；`system-architect.md` 另缺少 Next handoff。
- 证据等级：`static`；cwd=`C:\Users\zhang\Documents\mcu-workbench`。

#### 执行后检查

- 修改文件：`agents/embedded-lead.md`、`agents/system-architect.md`。
- 静态门禁扫描：退出码 `0`；两份提示词均包含 Router-first、Spec 未批准门禁、Plan 未批准门禁、`owner_agent`、Next handoff 和 Verify 证据边界。
- 限定差异审阅：仅新增 Workflow gates 和标准 Handoff 表述；`embedded-lead` 与 `system-architect` 的 frontmatter、原有职责、安全规则和 scope 未改动。
- `git diff --check`：退出码 `0`。
- 验证边界：仅完成静态文件检查；真实 Claude/OpenCode/Codex 宿主是否强制执行这些提示词仍为 `unverified`。

#### 验收结果

- `T-001`：`pass`。
- 交接：T-002 可在下一轮执行；本轮不提前修改其他 Agent。
- 回归补强：T-004 契约测试发现 `system-architect.md` 缺少显式 `evidence level` 字段，已在本次回归中补齐；仍归属 T-001 的 Agent 文件范围。

#### 失败处理与回滚

- 失败现象：门禁表述缺失、旧职责被覆盖或 frontmatter 变化。
- 定位顺序：对照 Spec 6.1/6.2 → 检查 diff → 恢复职责段落 → 重新扫描。
- 重试/降级：只在当前两个文件范围内修订。
- 回滚：分别恢复两个 Agent 文件的本任务差异。
- 回传条件：需要修改 Workflow 或扩大 Agent 范围时回传 Review Gate。

### T-002：同步实现/硬件/工具链 Agent 门禁

| 字段 | 内容 |
|---|---|
| task_id | `T-002` |
| order | `2` |
| parallel_group | `none` |
| source_plan_ids | `P-02` |
| source_spec_ids | `F-01,F-03,F-04,G-02,G-03,G-05` |
| owner_agent | `firmware-engineer` |
| support_agents | `hardware-integration`, `toolchain-engineer` |
| owner_skill | `workflow-task-execution` |
| supporting_skills | `tools-quality` |
| allocation_evidence | Plan P-02/8A：实现 Agent 负责 Task 所有权，硬件/工具链 Agent 分别审查操作与证据边界 |
| allocation_id | `T-002-20260819T234508+0800-firmware-engineer` |
| allocation_commit | `b03b0be2cc50909cff00983e61b986f671d709b6` |
| confidence | `confirmed` |
| status | `pass` |
| solid_status | `not_applicable_prompt_contract`：本任务仅更新 Agent 提示词契约，不改变固件、硬件或工具实现；已检查角色边界和安全规则未被覆盖 |

#### 目标

更新 `firmware-engineer.md`、`hardware-integration.md` 和 `toolchain-engineer.md`，使它们明确批准链、单 Task 所有权、操作授权和证据等级。

#### 范围

- 包含：三个 Agent 的共同门禁和角色专属限制。
- 不包含：任何固件、硬件配置、烧录命令实现或工具脚本。
- 文件范围：`agents/firmware-engineer.md`、`agents/hardware-integration.md`、`agents/toolchain-engineer.md`。
- 所属层：插件 Agent 实现/硬件/工具链控制面。

#### 前置条件与依赖

- 前置任务：T-001。
- 外部前提：T-001 的共同措辞已经稳定；Plan P-02 已批准。
- 依赖证据：`plan.md:P-02`、`spec.md:6.1-6.2`、各 Agent 当前正文。

#### 执行步骤

1. 读取三个 Agent 的当前职责和安全规则。
2. 为 firmware Agent 增加 owner Agent/primary Skill/Task 范围限制。
3. 为 hardware/toolchain Agent 增加 dry-run、目标操作授权和证据分级要求。
4. 保留原有禁止越界、禁止伪造验证和破坏性操作确认规则。
5. 检查三个文件的 diff 和共同门禁词汇。

#### 输出物

- 文件：三个 Agent Markdown 文件。
- 中间产物：限定范围的静态扫描结果和 diff。

#### 约束边界

- 不修改硬件配置、构建脚本、烧录脚本或固件。
- 不把静态/主机测试写成目标板或实物证据。
- 不允许多个 Agent 并行修改同一 Task 文件。
- 不新增 RTOS、ISR、DMA、内存或目标板前提。

#### 验证

| 字段 | 内容 |
|---|---|
| 证据等级 | `static` |
| 命令或条件 | cwd=`C:\\Users\\zhang\\Documents\\mcu-workbench`；扫描三个文件的 owner、Task、dry-run、授权、证据和 Blockers 表述 |
| 预期结果 | 三个 Agent 的操作和证据边界清晰，未扩大文件范围 |
| 产物位置 | `C:\\Users\\zhang\\Documents\\mcu-workbench` 的限定 diff |
| 当前状态 | `pass` |

#### 测试先行记录

- 检查：对三个 Agent 文件扫描 Router-first、Spec/Plan 未批准、`owner_agent`、primary implementation skill、Task、dry-run、explicit approval、evidence level、Blockers 和 Next handoff。
- 预期：当前提示词缺少实现所有权、目标操作授权或证据门禁，检查应失败。
- 实际结果：检查退出码 `1`；三个文件均缺少 Router-first、Spec/Plan 前置和 owner_agent，且分别缺少部分 Task、dry-run、授权、证据等级或标准交接表述。
- 证据等级：`static`；cwd=`C:\Users\zhang\Documents\mcu-workbench`。

#### 执行后检查

- 修改文件：`agents/firmware-engineer.md`、`agents/hardware-integration.md`、`agents/toolchain-engineer.md`。
- 静态门禁扫描：退出码 `0`；三个提示词均包含 Router-first、Spec/Plan 未批准门禁、`owner_agent`、primary implementation skill、Task 范围、dry-run、操作授权、evidence level、Blockers 和 Next handoff。
- 限定差异审阅：仅新增 Workflow gates；原有职责、frontmatter、scope、禁止越界、硬件安全和 `--execute` 规则保持不变。
- `git diff --check`：退出码 `0`。
- 验证边界：仅完成静态文件检查；真实 Claude/OpenCode/Codex 宿主执行、目标板操作和实物证据仍为 `unverified`。

#### 验收结果

- `T-002`：`pass`。
- 交接：T-003 可在下一轮执行；本轮不提前修改验证/知识 Agent。
- 回归补强：T-004 契约测试发现 `hardware-integration.md` 缺少显式 Verify 交接边界，已在本次回归中补齐；仍归属 T-002 的 Agent 文件范围。

#### 失败处理与回滚

- 失败现象：出现目标操作无授权、证据等级混淆或 Task 范围模糊。
- 定位顺序：对照 Spec G-02/G-03/G-05 → 检查角色职责 → 修订提示词。
- 重试/降级：不执行任何硬件操作，只做静态修订。
- 回滚：分别恢复三个 Agent 文件的本任务差异。
- 回传条件：需要修改工具链或硬件 Skill 时回传 Review Gate。

### T-003：同步验证/知识 Agent 门禁

| 字段 | 内容 |
|---|---|
| task_id | `T-003` |
| order | `3` |
| parallel_group | `none` |
| source_plan_ids | `P-03` |
| source_spec_ids | `F-04,F-05,F-06,G-02,G-04,G-05` |
| owner_agent | `verification-engineer` |
| support_agents | `knowledge-engineer` |
| owner_skill | `workflow-task-execution` |
| supporting_skills | `tools-quality` |
| allocation_evidence | Plan P-03/8A：验证 Agent 负责最终验收边界，知识 Agent 负责状态和交接记录 |
| allocation_id | `T-003-20260819T234859+0800-verification-engineer` |
| allocation_commit | `b03b0be2cc50909cff00983e61b986f671d709b6` |
| confidence | `confirmed` |
| status | `pass` |
| solid_status | `not_applicable_prompt_contract`：本任务仅更新 Agent 提示词契约，不改变测试实现、文档写入实现或宿主行为；已检查现有只读与确认规则未被覆盖 |

#### 目标

更新 `verification-engineer.md` 和 `knowledge-engineer.md`，使最终 Verify、状态记录、未验证项和用户批准记录边界清晰。

#### 范围

- 包含：Task 验证与最终 Spec Verify 的区分、证据记录和交接状态。
- 不包含：测试实现、Obsidian 写入、真实宿主会话或目标板验证。
- 文件范围：`agents/verification-engineer.md`、`agents/knowledge-engineer.md`。
- 所属层：插件 Agent 验证/知识控制面。

#### 前置条件与依赖

- 前置任务：T-002。
- 外部前提：前两组共同门禁措辞已稳定。
- 依赖证据：`plan.md:P-03`、`spec.md:6.1-6.2`、`spec.md:V-07`。

#### 执行步骤

1. 保留两个 Agent 现有的只读、报告和 Obsidian 确认规则。
2. 增加 Task 级测试不等于最终 Verify 的说明。
3. 增加必须记录 evidence level、批准状态、阻塞项和 Next handoff 的要求。
4. 检查不能把主机测试或文档状态写成真实宿主通过。

#### 输出物

- 文件：两个 Agent Markdown 文件。
- 中间产物：验证/知识 Agent 的限定 diff。

#### 约束边界

- 不生成用户未批准的文档，不写入 Obsidian。
- 不声称真实宿主、目标板或实物验证通过。
- 不修改测试代码或 Workflow 状态实现。

#### 验证

| 字段 | 内容 |
|---|---|
| 证据等级 | `static` |
| 命令或条件 | cwd=`C:\\Users\\zhang\\Documents\\mcu-workbench`；扫描两个文件的 Verify、evidence level、批准状态、Blockers 和 Next handoff 表述 |
| 预期结果 | 两个 Agent 能区分 Task 验证、最终 Verify 和真实宿主未验证边界 |
| 产物位置 | `C:\\Users\\zhang\\Documents\\mcu-workbench` 的限定 diff |
| 当前状态 | `pass` |

#### 测试先行记录

- 检查：对 `agents/verification-engineer.md` 和 `agents/knowledge-engineer.md` 扫描 Router-first、Spec/Plan 未批准、Verify、Task、evidence level、approved、unverified、Blockers 和 Next handoff。
- 预期：当前提示词缺少 Task 验证与最终 Verify 的分界、批准状态或真实宿主未验证边界，检查应失败。
- 实际结果：检查退出码 `1`；验证 Agent 缺少 Router-first、Spec/Plan 前置、证据等级、批准/未验证状态和标准交接，知识 Agent 缺少 Router-first、Spec/Plan 前置、Verify、证据等级、Blockers 和标准交接。
- 证据等级：`static`；cwd=`C:\Users\zhang\Documents\mcu-workbench`。

#### 执行后检查

- 修改文件：`agents/verification-engineer.md`、`agents/knowledge-engineer.md`。
- 静态门禁扫描：退出码 `0`；两个提示词均包含 Router-first、Spec/Plan 未批准门禁、Verify/Task 边界、evidence level、approved、unverified、Blockers 和 Next handoff。
- 限定差异审阅：仅新增 Workflow gates；验证 Agent 的只读验证与模拟结果限制、知识 Agent 的提问/Obsidian 确认/保留既有内容规则保持不变。
- `git diff --check`：退出码 `0`。
- 验证边界：仅完成静态文件检查；真实 Claude/OpenCode/Codex 宿主执行、目标板行为、实物测量和 Obsidian 写入仍为 `unverified` 或需用户确认。

#### 验收结果

- `T-003`：`pass`。
- 交接：T-004 可在下一轮执行；本轮不提前修改测试文件。

#### 失败处理与回滚

- 失败现象：把 Task 状态当成最终完成，或把静态结果写成宿主/目标通过。
- 定位顺序：对照 Spec V-07/G-05 → 检查报告和交接段落 → 修订提示词。
- 重试/降级：保持真实宿主状态为 `unverified`。
- 回滚：分别恢复两个 Agent 文件的本任务差异。
- 回传条件：验收范围或证据等级发生变化时回传 Review Gate。

### T-004：增加 Agent 门禁静态契约测试

| 字段 | 内容 |
|---|---|
| task_id | `T-004` |
| order | `4` |
| parallel_group | `none` |
| source_plan_ids | `P-04` |
| source_spec_ids | `F-02,F-05,G-01,G-02,G-03,G-04,G-05,G-06,V-01,V-02,V-03` |
| owner_agent | `verification-engineer` |
| support_agents | `embedded-lead` |
| owner_skill | `tools-quality` |
| supporting_skills | `tools-verification` |
| allocation_evidence | Plan P-04/8A：扩展现有 Agent 测试，不改变 catalog/domain 派生 |
| allocation_id | `T-004-20260819T235620+0800-verification-engineer` |
| allocation_commit | `b03b0be2cc50909cff00983e61b986f671d709b6` |
| confidence | `confirmed` |
| status | `pass` |
| solid_status | `not_applicable_prompt_contract_test`：本任务仅增加静态契约测试；未修改 roster、domain 派生、catalog 或运行时 |

#### 目标

在 `tests/agents.test.js` 中增加对七个 Agent 共同门禁文本和禁止手写 Skill 清单的静态契约检查。

#### 范围

- 包含：Agent 文件读取、共同关键词/章节检查、frontmatter 不变检查。
- 不包含：新增运行时路由、修改 `lib/agent-domains.js`、真实宿主测试。
- 文件范围：`tests/agents.test.js`。
- 所属层：主机验证。

#### 前置条件与依赖

- 前置任务：T-003。
- 外部前提：七个 Agent 正文已完成同步。
- 依赖证据：`tests/agents.test.js` 当前协议测试、Spec V-01～V-03。

#### 执行步骤

1. 保留现有 roster、domain、scope 和统一协议测试。
2. 增加共同门禁字段/关键词的断言。
3. 增加旧式越过门禁或将低等级证据写成高等级结论的关键冲突检查。
4. 运行定向 Agent/domain 测试，确认失败信息能定位具体 Agent 文件。

#### 输出物

- 文件：`tests/agents.test.js`。
- 中间产物：Jest 定向测试输出。

#### 约束边界

- 测试不得修改 Agent 文件、catalog 或运行时。
- 测试只验证静态提示词契约，不声称宿主行为。
- 不删除现有 roster/domain/统一协议覆盖。

#### 验证

| 字段 | 内容 |
|---|---|
| 证据等级 | `host` |
| 命令或条件 | cwd=`C:\\Users\\zhang\\Documents\\mcu-workbench`；`npm test -- --runInBand tests/agents.test.js tests/agent-domains.test.js` |
| 预期结果 | Agent/domain 相关测试全部通过，七个 Agent 仍与 roster 一致 |
| 产物位置 | Jest 控制台输出 |
| 当前状态 | `pass` |

#### 测试先行记录

- 基线：`npm test -- --runInBand tests/agents.test.js tests/agent-domains.test.js`，退出码 `0`，原有 9 个测试通过。
- 新契约首次运行：退出码 `1`；测试定位到 `hardware-integration.md` 缺少 Verify 边界，随后补充到 T-002 文件；再次运行定位到 `system-architect.md` 缺少显式 evidence level，随后补充到 T-001 文件。
- 证据等级：`host`（Jest 主机测试）；修复范围仍限定于本 Spec 的 Agent Markdown 和静态测试文件。

#### 执行后检查

- 主任务修改文件：`tests/agents.test.js`；新增七个 Agent 的共同门禁契约断言和低等级证据越级声明冲突检查。
- 前置任务回归补强：`agents/system-architect.md`、`agents/hardware-integration.md`；已分别回填至 T-001/T-002 的执行记录，未扩大 Spec 文件范围。
- 定向 Jest：退出码 `0`；2 个套件通过，11 个测试通过，0 个失败。
- 保留检查：roster、domain、scope、frontmatter 无手写 skills 清单的既有断言继续通过。
- 验证边界：仅为主机静态契约测试；真实 Claude/OpenCode/Codex 宿主执行、目标板和实物证据仍为 `unverified`。

#### 验收结果

- `T-004`：`pass`。
- 交接：T-005 可在下一轮执行；本轮不运行全量回归或最终 Review。

#### 失败处理与回滚

- 失败现象：测试发现缺少门禁字段、frontmatter 变化或 roster/domain 漂移。
- 定位顺序：读取失败 Agent → 对照 Spec/Plan → 修订 Agent 或测试边界。
- 重试/降级：不得删除既有测试以消除失败。
- 回滚：只回滚 `tests/agents.test.js` 的本任务差异。
- 回传条件：需要改 catalog/domain 或扩大 Agent 范围时回传上游。

### T-006：同步 OpenCode 派生产物

| 字段 | 内容 |
|---|---|
| task_id | `T-006` |
| order | `5` |
| parallel_group | `none` |
| source_plan_ids | `P-05` |
| source_spec_ids | `F-08,G-06,V-03,V-05` |
| owner_agent | `toolchain-engineer` |
| support_agents | `verification-engineer` |
| owner_skill | `workflow-task-execution` |
| supporting_skills | `tools-quality` |
| allocation_evidence | Plan P-05/8A：使用既有 OpenCode 命令生成器同步派生产物，不修改生成器或宿主运行时 |
| confidence | `confirmed` |
| allocation_id | `T-006-20260820T000900+0800-toolchain-engineer` |
| allocation_commit | `b03b0be2cc50909cff00983e61b986f671d709b6` |
| status | `pass` |

#### 目标

使用既有 `scripts/build-opencode-commands.js`，将七个 Agent 正文同步到对应的 `.opencode/commands/mcu-*.md` 派生产物。

#### 范围

- 包含：七个 `mcu-*.md` Agent 命令文件。
- 不包含：生成器、OpenCode 宿主运行时、Manifest、Hook、MCP、其他宿主适配和无关 Skill 目录。
- 文件范围：`.opencode/commands/mcu-embedded-lead.md`、`.opencode/commands/mcu-system-architect.md`、`.opencode/commands/mcu-firmware-engineer.md`、`.opencode/commands/mcu-hardware-integration.md`、`.opencode/commands/mcu-toolchain-engineer.md`、`.opencode/commands/mcu-verification-engineer.md`、`.opencode/commands/mcu-knowledge-engineer.md`。

#### 前置条件与依赖

- 前置任务：T-004。
- 外部前提：用户已批准 Spec/Plan v0.2；T-005 已确认七个命令文件 stale。
- 依赖证据：`scripts/build-opencode-commands.js`、`tests/opencode-commands.test.js`、T-005 B-03。

#### 执行步骤

1. 运行既有生成器，禁止手工编辑派生产物。
2. 检查限定 diff 只包含七个 `.opencode/commands/mcu-*.md` 文件。
3. 运行 `tests/opencode-commands.test.js`，确认生成内容一致。

#### 验证

| 字段 | 内容 |
|---|---|
| 证据等级 | `host/static` |
| 命令或条件 | cwd=`C:\\Users\\zhang\\Documents\\mcu-workbench`；运行既有 OpenCode 命令生成器和 `npm test -- --runInBand tests/opencode-commands.test.js` |
| 预期结果 | 七个命令文件与生成器输出一致，生成器和宿主运行时未变化 |
| 当前状态 | `pass` |

#### 测试先行记录

- 前置 stale 检查：生成器比较确认七个 `mcu-*.md` 命令文件与当前 Agent 正文不一致，证明同步行为缺失。
- 证据等级：`static`；未修改生成器或宿主运行时。

#### 执行后检查

- 运行 `node scripts/build-opencode-commands.js`：退出码 `0`；生成器报告 8 个命令文件，其中 `mcu-team.md` 无差异，七个 Agent 命令文件产生限定修改。
- 运行 `npm test -- --runInBand tests/opencode-commands.test.js`：退出码 `0`；1 个套件、2 个测试通过。
- 限定差异审阅：只修改七个 `.opencode/commands/mcu-*.md`；生成器、`mcu-team.md`、宿主运行时和无关 Skill 未修改。
- `git diff --check`：待 T-005 最终回归复检。
- 验证边界：主机生成与一致性测试通过，不代表真实 OpenCode 宿主行为已验证。

#### 验收结果

- `T-006`：`pass`。
- 交接：T-005 可在下一轮执行。

#### 失败处理与回滚

- 失败时只检查 Agent 正文、生成器输入和七个命令文件，不修改生成器或宿主运行时。
- 若发现需要修改其他宿主适配、Manifest、Hook 或 catalog，立即回传 Review Gate。
- 不删除无关的 `skills/workflow/workflow-document-context`，不使用 `git reset --hard` 或 `git add -A`。

### T-005：完成插件结构和回归验证

| 字段 | 内容 |
|---|---|
| task_id | `T-005` |
| order | `6` |
| parallel_group | `none` |
| source_plan_ids | `P-06` |
| source_spec_ids | `V-03,V-04,V-05,V-06,V-07` |
| owner_agent | `verification-engineer` |
| support_agents | `embedded-lead` |
| owner_skill | `tools-verification` |
| supporting_skills | `tools-quality` |
| allocation_evidence | Plan P-06/8A：验证 Agent 负责回归和证据分级，Lead 汇总交接 |
| allocation_id | `T-005-20260820T000120+0800-verification-engineer` |
| allocation_commit | `b03b0be2cc50909cff00983e61b986f671d709b6` |
| confidence | `confirmed` |
| allocation_id | `T-005-20260820T001500+0800-verification-engineer` |
| allocation_commit | `b03b0be2cc50909cff00983e61b986f671d709b6` |
| status | `pass_with_known_exception` |

#### 目标

确认 Agent 提示词同步没有破坏插件结构、Skill catalog、链接和全量测试，并形成真实宿主仍未验证的交付边界。

#### 范围

- 包含：定向测试、插件校验、链接检查、全量 Jest、差异检查和最终证据记录。
- 不包含：烧录、目标板、宿主强制拦截验证、自动提交或推送。
- 文件范围：当前 request 允许的 Agent/测试文件和内部运行记录。
- 所属层：插件验证/质量出口。

#### 前置条件与依赖

- 前置任务：T-006。
- 外部前提：所有 Agent 和测试差异已审阅，工作区无越界修改。
- 依赖证据：Spec V-03～V-07、Plan P-06、已有插件验证入口。

#### 执行步骤

1. 运行 Agent/domain 定向测试。
2. 运行 `npm run validate:plugin`。
3. 运行 `npm run validate:links`。
4. 运行 `npm test -- --runInBand --testPathIgnorePatterns=tests/workflow-dashboard.test.js`；Dashboard HTML 测试按用户批准的开发中例外暂不纳入。
5. 运行 `git diff --check` 并检查变更路径只在 Spec 范围内。
6. 记录静态/主机证据，并将真实宿主行为标记为 `unverified`。

#### 输出物

- 验证输出：Jest、插件校验、链接检查和 diff 检查结果。
- 状态记录：内部 `state.json/events.jsonl` 更新。
- 交接材料：最终变更集和验证边界，交给 `workflow-final-review`。

#### 约束边界

- 不执行烧录、调试连接、目标板操作或破坏性命令。
- 不把主机测试通过写成 Claude/OpenCode/Codex 宿主行为通过。
- 发现越界文件、需求变化或关键事实变化时停止并回传上游。

#### 验证

| 字段 | 内容 |
|---|---|
| 证据等级 | `host/static` |
| 命令或条件 | cwd=`C:\\Users\\zhang\\Documents\\mcu-workbench`：`npm test -- --runInBand --testPathIgnorePatterns=tests/workflow-dashboard.test.js`；`npm run validate:plugin`；`npm run validate:links`；`git diff --check` |
| 预期结果 | 除用户确认暂缓的 Dashboard HTML 测试外，所有适用命令退出码为 0，变更路径只包含 Spec 允许范围；V-07 保持 `unverified` |
| 产物位置 | 控制台输出和 `.mcu-workbench/workflows/REQ-AGENT-PROMPT-GATES-20260819/` 运行记录 |
| 当前状态 | `pass_with_known_exception` |

#### 执行记录

- 定向 Jest：退出码 `1`；失败来自 `validatePlugin()` 报告无关新增目录 `skills/workflow/workflow-document-context` 未登记。
- 插件校验：退出码 `1`；同一无关目录未登记。
- 链接校验：退出码 `0`，检查 322 个 Markdown 文件。
- 全量 Jest：退出码 `1`；44 个套件中 43 个通过、282 个测试中 281 个通过。失败 1 个：`tests/opencode-commands.test.js`，七个 `.opencode/commands/mcu-*.md` 派生产物未同步本次 Agent 正文。
- `git diff --check`：退出码 `0`。
- 额外只读确认：生成器比较定位 `mcu-embedded-lead.md`、`mcu-firmware-engineer.md`、`mcu-hardware-integration.md`、`mcu-knowledge-engineer.md`、`mcu-system-architect.md`、`mcu-toolchain-engineer.md`、`mcu-verification-engineer.md` 均为 stale。
- 证据边界：以上为主机/静态证据；真实 Claude/OpenCode/Codex 门禁执行、目标板和实物验证仍为 `unverified`。
- 范围修订后复测：定向 Agent/domain 测试退出码 `0`（2 套件、11 测试）；`validate:plugin` 退出码 `0`（51 skills、7 agents、8 layers）；`validate:links` 退出码 `0`（322 Markdown 文件）。
- OpenCode 派生产物一致性：退出码 `0`，七个命令文件与生成器输出一致。
- 全量 Jest（排除用户批准的 Dashboard HTML 例外）：退出码 `0`；43 个套件、274 个测试全部通过。
- `validate:plugin` 复测：退出码 `0`（51 skills、7 agents、8 layers）。
- `validate:links` 复测：退出码 `0`（322 个 Markdown 文件）。
- OpenCode 派生产物定向复测：退出码 `0`（1 套件、2 测试）。
- 最终 `git diff --check`：退出码 `0`。
- Dashboard HTML 测试未写成通过，保留为 `known-development-exception`；真实 Claude/OpenCode/Codex 宿主行为、目标板和实物验证仍为 `unverified`。

#### 阻塞结论

- `B-02`：此前无关工作区新增 Skill 未登记问题已在当前工作区状态中消除；插件校验复测通过。
- `B-03`：已由 Spec/Plan v0.2 解除范围冲突；仍需先执行 T-006 生成七个派生产物。
- `B-04`：用户已确认 Dashboard HTML 功能正在开发，本次回归暂时跳过 `tests/workflow-dashboard.test.js`；该测试保留为 `known-development-exception`。
- `T-005`：已完成；跳过项不写成通过，交接最终 Review。

#### 失败处理与回滚

- 失败现象：测试、插件校验、链接或 diff 检查失败。
- 定位顺序：先判断基线失败还是本次新增失败，再回到对应 Agent/测试任务；不得修改无关文件。
- 重试/降级：普通静态/主机失败可在任务范围内修复和复测；宿主行为缺证保持 `unverified`。
- 回滚：按失败任务逐项回滚；不得使用 `git reset --hard` 或 `git add -A`。
- 回传条件：失败原因要求扩大 Spec/Plan、修改 catalog/Workflow/宿主时，停止并回传 Review Gate。

## 5. 任务级验收汇总

| task_id | 验收项 | 证据等级 | 命令/条件 | 预期结果 | 产物 | 状态 |
|---|---|---|---|---|---|---|
| T-001 | Lead/架构门禁清晰 | static | 两个 Agent 文本扫描 | 共同阶段和交接契约完整 | 限定 diff | pass |
| T-002 | 实现/硬件/工具链边界清晰 | static | 三个 Agent 文本扫描 | 所有权、授权、证据等级完整 | 限定 diff | pass |
| T-003 | 验证/知识边界清晰 | static | 两个 Agent 文本扫描 | Verify、状态、未验证项完整 | 限定 diff | pass |
| T-004 | Agent 静态契约回归 | host | 定向 Jest | Agent/domain 测试通过 | Jest 输出 | pass |
| T-006 | OpenCode 派生产物同步 | host/static | 既有生成器、定向命令测试 | 七个命令文件与生成器一致 | 生成 diff/Jest | pass |
| T-005 | 插件整体回归 | host/static | 排除已批准例外的全量 Jest、插件、链接、OpenCode、diff 检查 | 所有适用命令通过；Dashboard 例外单独记录 | 验证输出 | pass_with_known_exception |

较低等级的静态/主机证据不能替代真实宿主或目标运行证据。

## 6. 阻塞与未验证项

| ID | 类型 | 内容 | 影响任务 | 证据/补证动作 | 状态 |
|---|---|---|---|---|---|
| B-01 | 未验证 | Claude/OpenCode/Codex 是否真正按照 Agent 提示词执行门禁 | T-005 | 需要可审计的真实宿主会话；不得由 Jest/插件校验替代 | open |
| B-02 | 工作区基线 | 无关新增 `skills/workflow/workflow-document-context` 曾未登记 | T-005 | 已由当前工作区状态消除；插件校验复测通过 | resolved |
| B-03 | 范围冲突 | Agent 正文更新后七个 `.opencode/commands/mcu-*.md` 派生产物 stale | T-006/T-005 | 用户已批准 Spec/Plan v0.2；执行 T-006 后复测 | resolved |
| B-04 | 已批准例外 | `tests/workflow-dashboard.test.js` 因 Dashboard 功能开发暂不纳入本次回归 | T-005 | 用户已确认；后续 Dashboard 完成后恢复单独验证 | known-development-exception |

B-01 不阻塞本次静态/主机任务执行，但必须在最终交付中保留为 `unverified`。

## 7. 下游交接

- 需求/约束输入：`C:\\Users\\zhang\\Documents\\mcu-workbench\\00_Docs\\04_需求文档\\REQ-AGENT-PROMPT-GATES-20260819\\spec.md`
- 实施路线输入：`C:\\Users\\zhang\\Documents\\mcu-workbench\\00_Docs\\04_需求文档\\REQ-AGENT-PROMPT-GATES-20260819\\plan.md`
- 任务清单：本文件
- 阶段级 Agent/Skill 基线：`plan.md` 第 8A 节
- 任务级分配：T-001～T-005 的 owner/support Agent 与主/辅助 Skill
- 执行规则：严格按 `T-001 → T-002 → T-003 → T-004 → T-006 → T-005`，不得跳过前置任务
- 代码完成后：交接 `spec.md`、`plan.md`、`task.md`、运行记录和最终变更集给 `workflow-final-review`
- 新事实回传：不改变范围时回填当前任务；改变范围、用户选择或验收时回传 `workflow-integration-plan`/`workflow-review-gate`
- 当前下一步：向用户交付最终 Review 结论，保留 `known-development-exception` 和真实宿主 `unverified` 边界

## 8. Final Review 记录

- 审查范围：七个 Agent 正文、七个 OpenCode 派生产物、`tests/agents.test.js`、本 request 的 Spec/Plan/Task/state/events；工作区其他用户变更和 Dashboard HTML 文件排除。
- Spec 追踪：V-01～V-06 均有对应 Agent/domain 测试、插件校验、链接校验、OpenCode 派生一致性、构建和回归证据；V-07 按 Spec 保持 `unverified`。
- 验证命令：`npm test -- --runInBand --testPathIgnorePatterns=tests/workflow-dashboard.test.js`（43 suites、274 tests）；`npm run build`；`npm run validate:plugin`；`npm run validate:links`；`npm run check:versions`；仓库根级 `npm run validate:workflow-gate -- --root . --strict`；`git diff --check`；Node syntax 和限定范围行尾空白检查，均通过。当前 request 的嵌套 Spec/Plan/Task 则通过版本化文档、`state.json`/`events.jsonl` 和本 Review 追踪；根级 Gate 输出的 request_id 不替代本 request 记录。
- `tools-quality(mode: final-gate)`：通过。无 C/C++、HAL、RTOS、固件接口变更，clang-format/Cppcheck/MISRA 不适用；JavaScript 语法、提示词契约、派生产物一致性和空白检查通过。
- SOLID：本次为提示词契约与静态测试同步；SRP/OCP/DIP 不发现违反，LSP/ISP 对无继承和无公共固件接口变更场景不适用。
- 已整改：清理 `task.md` 两处行尾空白；整改后同范围复检通过，未改变行为、接口、范围或测试逻辑。
- Final Review 结论：`通过（保留 Dashboard known-development-exception 与真实宿主 unverified）`。
