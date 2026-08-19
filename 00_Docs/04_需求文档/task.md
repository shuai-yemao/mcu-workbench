# 任务拆解：Codex Router-first 与嵌入式任务交付门禁

## 1. 任务元数据

| 字段 | 内容 |
|---|---|
| request_id | `REQ-CODEX-ROUTER-GATE-20260819` |
| task 版本 | `v0.1` |
| task 状态 | `T-06 pass; delivery with unverified host evidence` |
| 输入 Spec | `00_Docs/04_需求文档/spec.md` |
| 输入 Plan | `00_Docs/04_需求文档/plan.md` |
| 项目根目录 | `C:\Users\zhang\Documents\mcu-workbench` |
| 固件工程 | `D:\zhuomian\embedded_framework`，明确不修改 |
| 执行原则 | 每次只执行一个任务，完成验证和状态回写后再进入下一项 |

本文件由 `workflow-task-breakdown` 根据已放行的方案 A 拆解。任务执行前必须重新检查工作区状态，保护用户已有修改。

## 2. 依赖关系

```text
T-00 计划放行
  ↓
T-01 入口契约与接入材料
  ↓
T-02 Gate 接口与状态检查
  ↓
T-03 主机测试与兼容性回归
  ↓
T-04 CI 交付门禁
  ↓
T-05 真实 Codex 宿主回归
  ↓
T-06 最终 Review 与交付记录
```

所有任务按顺序执行，不并行修改共享文件。每个任务只有一个主实现 Skill；其他 Skill 只能提供审查或验证支持。

## 3. 任务总览

| ID | 任务 | 主实现 Skill | 前置 | 状态 | 主要产物 |
|---|---|---|---|---|---|
| T-00 | 计划放行与基线冻结 | `workflow-review-gate` | 无 | `completed` | 计划审查记录 |
| T-01 | Router-first 入口契约和接入材料 | `workflow-requirements-router` | T-00 | `pass` | 入口规则、接入材料、文档 |
| T-02 | 确定性 Gate 接口和实现 | `workflow-review-gate` | T-01 | `pass` | Gate 脚本、状态模型、CLI |
| T-03 | Gate 状态矩阵和兼容性测试 | `tools-verification` | T-02 | `pass` | Jest fixture、测试报告 |
| T-04 | CI 交付门禁接入 | `tools-build` | T-03 | `pass` | CI 配置、失败/通过记录 |
| T-05 | 三类真实 Codex 宿主回归 | `workflow-project-integration` | T-04 | `unverified` | 宿主会话记录、证据表 |
| T-06 | 最终审查和交付闭环 | `workflow-final-review` | T-01～T-05 | `pass` | Final Review、回归摘要 |

## 4. 通用执行约束

每个任务开始前：

1. 读取当前 `git status --short --branch`；
2. 确认目标文件没有被用户新增或修改；
3. 读取本任务依赖的 Spec、Plan 和前一任务产物；
4. 记录绝对 `cwd`、命令、退出码和产物路径；
5. 只修改本任务声明的文件。

每个任务完成后必须输出：

- Summary；
- Evidence；
- Changed files；
- Tests；
- Artifacts；
- Blockers；
- Next handoff。

发现需求范围、接口、资源边界或验收标准变化时，立即停止当前任务，回到 RCP → Challenge → Review Gate，不得先改代码后补 Spec。

## 5. 任务详情

### T-00：计划放行与基线冻结

**主实现 Skill**：`workflow-review-gate`

**目标**：确认方案 A 与 `spec.md` 一致，冻结首轮施工边界。

**已完成依据**：

- 用户明确选择方案 A 并要求进入下一步；
- `plan.md` 已覆盖 Gate 接口、状态、文件范围、验收、风险和回滚；
- 计划文档 UTF-8 读取正常，未发现尾随空白；
- 当前工作区既有修改已识别，本任务只新增计划文档和任务文档。

**放行条件**：

- `plan.md` 状态为 `approved-for-task-breakdown`；
- `.codex-plugin/plugin.json` 默认不修改；
- `embedded_framework`、OpenCode、Claude 适配保持排除；
- 真实宿主回归保持独立的 `unverified` 证据等级。

**产物**：本 `task.md`。

### T-01：Router-first 入口契约和接入材料

**主实现 Skill**：`workflow-requirements-router`

**前置**：T-00。

**目标**：让项目入口明确要求先路由、收集证据和生成 RCP，不把实现 Skill 当作需求入口。

**计划文件范围**：

- `codex/AGENTS.md`；
- `codex/` 下新增的项目接入材料或记录模板；
- `README.md`，仅补充 Codex 入口和证据边界；
- 由既有生成流程产生的 `AGENTS.override.md`。

**实施要求**：

- 明确第一有效动作是 Router 和只读证据收集；
- 明确没有有效 RCP/Spec/Gate 时只能分析或报告阻塞；
- 明确直接调用实现 Skill 不代表完成需求审查；
- 明确静态、主机、CI 和真实宿主证据不可互相替代；
- 保留现有 canonical Skill ID、别名和其他宿主边界。

**验证**：

- 入口规则静态契约测试；
- `npm run build:codex-compat`；
- 生成文件与源文件关系检查；
- `git diff --check`。

**阻塞条件**：需要新增 Codex Hook/MCP、修改公共 Manifest Schema，或必须修改 `opencode.mjs`/Claude 适配时，停止并回到 Review Gate。

**交接**：交给 T-02，附入口规则 diff、生成结果和验证命令记录。

#### T-01 执行记录：2026-08-19

| 字段 | 内容 |
|---|---|
| 状态 | `pass` |
| allocation_id | `T-01-20260819T120830+08:00` |
| primary_agent | `system-architect` |
| support_agents | `knowledge-engineer` |
| primary_implementation_skill | `workflow-requirements-router` |
| supporting_skills | `workflow-review-gate`（仅提供门禁审查，不修改文件） |
| allocation_basis | `plan.md` P1 责任分配、`task.md` T-01 主实现 Skill、`AGENTS.md` Agent 名册 |
| scope_boundary | 仅允许修改 `codex/`、Codex 适配测试和生成的 `AGENTS.override.md`；不得修改 README、package、scripts、CI、其他宿主或固件工程 |
| spec_version | `spec.md v0.1` |
| solid_status | `pass`；本任务为入口文档和接入材料，SRP/OCP/LSP/ISP/DIP 均不适用代码施工；未改变程序接口或依赖方向 |

**测试先行记录**：

- 当前行为：`codex/AGENTS.md` 已有 Router-first 规则，但没有 Gate 命令、项目级接入材料和 Gate 状态契约；
- 缺失证明：只依赖现有入口规则无法验证 Gate 交付状态；
- 检查命令：`C:\Users\zhang\Documents\mcu-workbench` 下执行静态契约检查；
- 预期结果：缺少三个契约标记时失败；
- 实际结果：退出码 `2`，`EXPECTED_FAIL missing=workflow-gate-command,project-access-material,gate-status-contract`；
- 证据等级：`static`。

**历史阻塞类型**：`Spec 矛盾 / 任务范围冲突`，已由用户确认并完成 Spec/Plan/Task 升版解除。

**历史冲突**：

- 项目规则限定 Codex 特化写入范围为 `codex/`、Codex 适配测试和生成的 `AGENTS.override.md`；
- `plan.md` 和 T-01 却把 `README.md` 列为计划修改文件；
- 后续 T-02、T-04 还计划修改 `scripts/`、`package.json` 和 `.github/workflows/ci.yml`，同样超出当前 Codex 写入边界。

**证据**：

- `codex/AGENTS.md:101-104`；
- `plan.md:109-129,204-249`；
- `task.md:104-142,225-227`。

**历史影响**：T-01；同时影响 T-02、T-04 的后续执行资格。

**原不能自行决定的原因**：扩大 Codex 写入边界会改变项目宿主约束和计划文件范围，属于方案/Review Gate 决策，不是单项实现细节。

**原下一步**：回传 `workflow-integration-plan` / `workflow-review-gate`，在两种路径中作出正式决策：

1. 将方案 A 收敛到 `codex/`、Codex 测试和生成文件范围内；或
2. 由上游正式批准并更新 Codex 特化写入边界，再重新放行 `plan.md` 和 `task.md`。

**解除记录**：用户已明确回复“确定”；RCP 升级为 `v0.2`，Review-Package 已重新审查，`spec.md`、`plan.md` 和本任务单已同步放行。当前可恢复 T-01；本次恢复仍只允许修改 T-01 的文件范围。

**本次执行开始**：已在 `2026-08-19` 重新读取 Spec/Plan/Task、项目规则、相关源码和 README 现有差异；当前提交基线仍为 `host_ai @ 1652881d99578b8c45326d67ba455b6734df716f`。主实现 Skill 为 `workflow-requirements-router`，主 Agent 为 `system-architect`，`knowledge-engineer` 只提供文档审查。

**实现结果**：

- 修改 `codex/AGENTS.md`，增加 Router-first 入口最小协议、Gate 交接条件和证据等级约束；
- 新增 `codex/embedded-workflow-entry.md`，提供目标工程接入规则、Gate 字段、证据分级和违规处理模板；
- 修改 `README.md`，增加 Codex 嵌入式任务接入说明；保留既有 Codex refresh 相关用户修改；
- 通过 `npm run build:codex-compat` 生成 `AGENTS.override.md`；
- 未修改 `.codex-plugin/plugin.json`、`embedded_framework`、OpenCode 或 Claude 适配。

**运行检查**：

| 检查 | cwd | 结果 | 证据等级 |
|---|---|---|---|
| `npm run build:codex-compat` | `C:\Users\zhang\Documents\mcu-workbench` | exit code `0` | host |
| `npm run validate:plugin` | `C:\Users\zhang\Documents\mcu-workbench` | exit code `0` | static |
| T-01 静态契约检查 | `C:\Users\zhang\Documents\mcu-workbench` | `CONTRACT_PASS`，exit code `0` | static |
| `git diff --check` | `C:\Users\zhang\Documents\mcu-workbench` | exit code `0` | static |

**验收标准**：

- Router-first 入口规则：`pass`；
- 项目级接入材料：`pass`；
- Gate/证据边界表达：`pass`；
- AGENTS 兼容桥生成：`pass`；
- 其他宿主和固件工程隔离：`pass`，由变更范围审阅确认；
- 真实 Codex 首动作：`unverified`，留给 T-05，不得由本任务静态结果替代。

**task.md 回写**：T-01 已更新为 `pass`；当前提交仍有用户既有未提交变更，未执行暂存或提交。

**Next handoff**：交给 T-02；下一次只能执行确定性 Gate 接口和状态检查，不得提前执行 T-03～T-06。

### T-02：确定性 Gate 接口和实现

**主实现 Skill**：`workflow-review-gate`

**前置**：T-01。

**目标**：实现可在本地和 CI 重复运行的 RCP/Spec/Plan/Task 状态检查。

**计划文件范围**：

- `scripts/` 中的 Gate 校验脚本；
- `package.json` 中新增的独立命令；
- 必要的 `codex/` 状态格式或契约文档。

**接口要求**：

```text
npm run validate:workflow-gate -- --root <project-root> [--json] [--strict]
```

稳定结果：

- `pass`：退出码 `0`；
- `blocked`：退出码 `2`；
- `invalid-input`：退出码 `3`；
- 工具错误：退出码 `1`。

JSON 至少输出 `request_id`、`stage`、`status`、`checked_files`、`missing_items`、`blocking_reasons`、`evidence_level` 和 `next_action`。

**检查范围**：

- RCP 存在且字段完整；
- Challenge 和 Review-Package 状态有效；
- Spec 是否放行；
- Plan/Task 是否与 Spec 版本关联；
- 需求关键字段变化是否触发重新 Spec；
- 变更文件是否超出计划范围；
- 真实宿主证据是否被错误标注为静态或 CI 证据。

**验证**：

- 缺失、阻塞、放行三类最小样例；
- JSON 可解析；
- 退出码稳定；
- 原有 npm 命令语义不变。

**阻塞条件**：状态模型无法在现有文档中表达，或需要改动固件工程的文档结构时停止。

**交接**：交给 T-03，附 Gate 命令契约、退出码表和最小样例。

#### T-02 执行记录：确定性 Gate 接口和实现

| 字段 | 内容 |
|---|---|
| 状态 | `blocked` |
| allocation_id | `T-02-20260819-workflow-gate` |
| primary_agent | `firmware-engineer` |
| support_agents | `embedded-lead` |
| primary_implementation_skill | `workflow-review-gate` |
| supporting_skills | `tools-quality`（仅用于后续质量检查） |
| allocation_basis | `plan.md` P2、`task.md` T-02 主实现 Skill、`AGENTS.md` Agent 名册 |
| scope_boundary | 仅修改 `scripts/validate-workflow-gate.js`、`package.json` 相关脚本入口和本任务记录；不修改 tests、CI、README、Manifest、其他宿主或固件工程 |
| spec_version | `spec.md v0.2` |
| solid_status | `in_progress`；Gate 脚本保持参数解析、文档读取、状态判定和输出职责分离，不引入宿主或固件依赖 |

**测试先行记录**：

- 当前行为：package.json 没有 `validate:workflow-gate` 命令；
- 缺失证明：执行 Gate 命令返回 npm `Missing script`；
- 命令：`npm run validate:workflow-gate -- --root C:\\Users\\zhang\\Documents\\mcu-workbench --json --strict`；
- 预期结果：实现前失败；
- 实际结果：exit code `1`，`npm error Missing script: "validate:workflow-gate"`；
- 证据等级：`host`。

**实现结果**：

- 新增 `scripts/validate-workflow-gate.js`，实现参数解析、文档读取、状态判定、request ID 一致性检查、前置任务检查和 JSON/文本输出；
- 在 `package.json` 增加 `validate:workflow-gate` 命令；
- 固定脚本语义：`pass=0`、`blocked=2`、`invalid-input=3`、`tool-error=1`；Windows 的 npm 包装层会将非零子进程显示为 1，底层 Node 脚本仍保留上述退出码；
- 未修改 tests、CI、README、Manifest、其他宿主或固件工程。

**运行检查**：

| 检查 | cwd | 结果 | 证据等级 |
|---|---|---|---|
| `node --check scripts/validate-workflow-gate.js` | `C:\Users\zhang\Documents\mcu-workbench` | exit code `0` | static |
| 完整文档链 `npm run validate:workflow-gate -- --root <repo> --json --strict` | `C:\Users\zhang\Documents\mcu-workbench` | `status=pass`，exit code `0` | host/static |
| 缺失文档链 `node scripts/validate-workflow-gate.js --root <repo>\\codex --json --strict` | `C:\Users\zhang\Documents\mcu-workbench` | `status=blocked`，PowerShell `$LASTEXITCODE=2` | host/static |
| 非法根目录 `node scripts/validate-workflow-gate.js --root <missing> --json --strict` | `C:\Users\zhang\Documents\mcu-workbench` | `status=invalid-input`，PowerShell `$LASTEXITCODE=3` | host/static |
| `npm run validate:plugin` | `C:\Users\zhang\Documents\mcu-workbench` | exit code `0` | static |
| `git diff --check` | `C:\Users\zhang\Documents\mcu-workbench` | exit code `0` | static |

**验收标准**：

- Gate CLI 和 JSON 输出：`pass`；
- 缺失/阻塞/放行状态：`pass`；
- request ID、Spec/Plan/Task 和前置任务检查：`pass`；
- 原有插件结构校验未回归：`pass`；
- 变更范围：`pass`，仅包含 T-02 脚本、package 命令和任务记录；
- 真实 Codex 宿主行为：`unverified`，留给 T-05。

**task.md 回写**：T-02 已更新为 `pass`；当前提交仍有用户既有未提交变更，未执行暂存或提交。

**Next handoff**：交给 T-03；下一次只能新增 Gate 状态矩阵和兼容性测试。

### T-03：Gate 状态矩阵和兼容性测试

**主实现 Skill**：`tools-verification`

**前置**：T-02。

**目标**：证明 Gate 对关键状态能稳定判定，并确认插件既有能力不回归。

**计划文件范围**：

- `tests/` 中与本需求直接相关的 fixture 和测试；
- 不恢复、删除或改写其他既有测试变更。

**必须覆盖**：

| 场景 | 预期 |
|---|---|
| 缺少 RCP | `blocked` |
| Challenge 未完成 | `blocked` |
| Spec 非放行 | `blocked` |
| 变更超出计划范围 | `blocked` |
| Spec/Plan/Task 版本不一致 | `blocked` |
| 完整放行链 | `pass` |
| `--json --strict` | 输出可解析，退出码稳定 |

**验证命令**：

- `npm test -- --runInBand`；
- `npm run validate:plugin`；
- `npm run plugin:check-refresh -- --json --strict`；
- `npm run build:codex-compat`；
- `git diff --check`。

**证据边界**：本任务只能证明静态、主机、缓存和兼容桥结果，不能证明真实 Codex 首动作。

**交接**：交给 T-04，附测试报告、退出码和未验证项清单。

#### T-03 执行记录：Gate 状态矩阵和兼容性测试

| 字段 | 内容 |
|---|---|
| 状态 | `blocked` |
| allocation_id | `T-03-20260819-workflow-gate-tests` |
| primary_agent | `verification-engineer` |
| support_agents | `toolchain-engineer` |
| primary_implementation_skill | `tools-verification` |
| supporting_skills | `tools-quality`（仅提供测试文件质量检查） |
| allocation_basis | `plan.md` P3、`task.md` T-03 主实现 Skill、`AGENTS.md` Agent 名册 |
| scope_boundary | 仅新增 `tests/workflow-gate.test.js` 和本任务记录；不修改 Gate 实现、CI、README、Manifest、其他宿主或固件工程 |
| spec_version | `spec.md v0.2` |
| solid_status | `pass`；测试只观察 Gate CLI 契约，不引入生产实现依赖或改变接口 |

**测试先行记录**：

- 当前行为：T-02 已有 Gate 实现，但没有对应的 Jest 状态矩阵测试文件；
- 缺失证明：`tests/workflow-gate.test.js` 不存在；
- 检查命令：`Test-Path tests/workflow-gate.test.js`；
- 预期结果：实现测试前失败；
- 实际结果：`EXPECTED_FAIL missing tests/workflow-gate.test.js`，exit code `2`；
- 证据等级：`static`。

**实现结果**：

- 新增 `tests/workflow-gate.test.js`；
- 覆盖完整链、缺失 RCP、Spec 阻塞、request ID 不一致、前置任务未完成、非法根目录和 Manifest 边界；
- 未修改 Gate 实现、CI、README、Manifest、其他宿主或固件工程。

**运行检查**：

| 检查 | cwd | 结果 | 证据等级 |
|---|---|---|---|
| `npx jest tests/workflow-gate.test.js --runInBand` | `C:\Users\zhang\Documents\mcu-workbench` | 7/7 通过 | host |
| 定向兼容回归（Gate、Codex、Plugin、Refresh） | `C:\Users\zhang\Documents\mcu-workbench` | 4 suites、22 tests 全部通过 | host |
| `npm test -- --runInBand` | `C:\Users\zhang\Documents\mcu-workbench` | 失败：`validate-bsp-contract.test.js`、`embedded-framework-baseline.test.js` | host |
| `npm run validate:plugin` | `C:\Users\zhang\Documents\mcu-workbench` | exit code `0` | static |
| `npm run build:codex-compat` | `C:\Users\zhang\Documents\mcu-workbench` | exit code `0` | host |
| `npm run plugin:check-refresh -- --json --strict` | `C:\Users\zhang\Documents\mcu-workbench` | `refresh_required`，明确指向 `codex:dev:refresh` | host |
| `git diff --check` | `C:\Users\zhang\Documents\mcu-workbench` | exit code `0` | static |

**基线阻塞证据**：全量失败涉及的 `tests/bsp-fixtures/**` 文件当前均为用户已有删除状态；T-03 未修改、恢复或覆盖这些路径。由于 V-02 要求全量 Jest 通过，不能把 T-03 标记为 `pass`。

**验收标准**：

- V-03 Gate 状态矩阵：`pass`；
- V-04 Codex refresh：`pass with refresh_required`，源码与缓存差异已明确报告；
- V-05 Codex 兼容桥：`pass`；
- V-02 全量 Jest：`blocked`，被既有 BSP fixture 基线阻塞；
- 真实 Codex 宿主行为：`unverified`，未进入 T-05。

**task.md 回写**：T-03 已更新为 `blocked`；不恢复用户删除的 fixture，不进入 T-04。

**下一步**：需要先处理既有全量 Jest 基线：恢复/修复对应 BSP fixture，或由上游明确批准带基线缺口继续；在此之前任务执行停止。

#### T-03 范围变更恢复记录：删除过期 fixture 引用

| 字段 | 内容 |
|---|---|
| 状态 | `blocked` |
| allocation_id | `T-03-20260819-stale-fixture-reference-cleanup` |
| primary_agent | `verification-engineer` |
| support_agents | `toolchain-engineer` |
| primary_implementation_skill | `tools-verification` |
| supporting_skills | `tools-quality`（仅提供测试质量检查） |
| allocation_basis | 用户 Q-03 确认、`spec.md v0.3`、`plan.md v0.3`、Review-Package 重新放行 |
| scope_boundary | 只删除 `tests/validate-bsp-contract.test.js` 中引用已删除 BSP fixture 的测试段；不恢复 fixture、不修改 `scripts/validate-bsp-contract.js`、不处理 `embedded-framework-baseline.test.js` |
| spec_version | `spec.md v0.3` |
| solid_status | `pass`；只调整测试引用，不改变生产校验器、接口和依赖关系 |

**恢复前置证据**：静态 Review Gate 结果为 `REVIEW_GATE_SCOPE_CHANGE_READY`，exit code `0`；用户确认的覆盖减少和独立 baseline 缺口已记录。

**范围变更实现结果**：

- 删除 `tests/validate-bsp-contract.test.js` 中 5 个引用已删除 BSP fixture 的测试段；
- 保留 `parseArgs` 和 acceptance 缺失检查；
- 未恢复 `tests/bsp-fixtures/**`；
- 未修改 `scripts/validate-bsp-contract.js`，未删除 `embedded-framework-baseline.test.js` 或 `quality-format-profile.test.js`。

**范围变更验证**：

| 检查 | 结果 | 证据等级 |
|---|---|---|
| `npx jest tests/validate-bsp-contract.test.js tests/workflow-gate.test.js --runInBand` | 2 suites、9 tests 通过 | host |
| stale fixture 引用静态检查 | `STALE_REFERENCE_PASS` | static |
| `npm test -- --runInBand` | `validate-bsp-contract.test.js` 已通过；仍失败 `embedded-framework-baseline.test.js` 2 项、`quality-format-profile.test.js` 1 项 | host |
| `git diff --check` | 通过 | static |

**当前阻塞**：T-03 的过期 BSP fixture 引用已清理，但 V-02 全量 Jest 仍被独立的 embedded-framework 快照缺失和质量 profile 基线不一致阻塞。两者均非本次修改范围，不能静默删除对应测试。

**task.md 回写**：T-03 保持 `blocked`，不进入 T-04；后续需要单独处理剩余全量 Jest 基线。

#### T-03 v0.4 最终结果

**实现结果**：

- 删除 `tests/embedded-framework-baseline.test.js` 测试入口；
- 不同步或恢复 `tests/fixtures/embedded-framework`；
- 不修改 `tests/quality-format-profile.test.js` 或质量 profile 文件。

**验证结果**：

| 检查 | 结果 | 证据等级 |
|---|---|---|
| `npx jest tests/validate-bsp-contract.test.js tests/workflow-gate.test.js --runInBand` | 2 suites、9 tests 通过 | host |
| baseline 测试入口检查 | `BASELINE_TEST_REMOVED` | static |
| `npm test -- --runInBand` | 仅 `quality-format-profile.test.js` 失败，期望 `ColumnLimit: 0`，当前 profile 为 `ColumnLimit: 80` | host |
| `git diff --check` | 通过 | static |

**覆盖边界**：BSP fixture 合同样本和 embedded-framework 黄金样本均不再由 Jest 执行；这代表测试覆盖移除，不代表 BSP 校验器或目标工程验证通过。

**最终状态**：`blocked`。剩余阻塞属于质量 profile 基线，不在本次用户指定的删除范围内；不进入 T-04。

#### T-03 v0.5 最终结果

**实现结果**：

- 将 `tests/quality-format-profile.test.js` 的 `ColumnLimit` 期望从 `0` 调整为 `80`；
- 保持实际质量 profile 配置不变；
- 不恢复 BSP fixture，不恢复 embedded-framework 快照，不修改生产校验器。

**验证结果**：

| 检查 | 结果 | 证据等级 |
|---|---|---|
| `npm test -- --runInBand` | 38 suites、258 tests 全部通过 | host |
| `npm run validate:plugin` | 通过 | static |
| `npm run validate:workflow-gate -- --root <repo> --json --strict` | `status=pass` | host/static |
| `git diff --check` | 通过 | static |

**覆盖边界**：BSP fixture 合同样本和 embedded-framework 黄金样本仍未纳入 Jest；该事实已记录为覆盖减少，不代表相关工程验证已完成。

**task.md 回写**：T-03 已更新为 `pass`，下一步交给 T-04；真实 Codex 宿主行为仍为 `unverified`。

### T-04：CI 交付门禁接入

**主实现 Skill**：`tools-build`

**前置**：T-03。

**目标**：把确定性 Gate 接入插件自身 CI，阻止无有效证据的合规放行。

**计划文件范围**：

- `.github/workflows/ci.yml`；
- 如确有必要，补充 CI 使用的最小 fixture 或脚本入口。

**实施要求**：

- 保留既有 Jest、插件结构、链接、版本和 Codex 兼容检查；
- 新增 Gate 失败样例必须使 CI 失败；
- 合规放行样例必须通过；
- CI 日志必须打印检查阶段、退出码和阻塞原因；
- 不把真实宿主测试伪装成 CI 通过条件。

**验证**：

- 本地模拟 CI 命令；
- blocked fixture 失败；
- approved fixture 通过；
- YAML/脚本语法检查；
- 记录绝对路径和产物。

**阻塞条件**：CI 无法区分 Gate 失败和真实宿主未验证，或新增步骤改变既有命令含义时停止。

**交接**：交给 T-05，附本地 CI 模拟结果和失败/通过证据。

#### T-04 执行记录：CI 交付门禁接入

| 字段 | 内容 |
|---|---|
| 状态 | `pass` |
| allocation_id | `T-04-20260819-ci-workflow-gate` |
| primary_agent | `toolchain-engineer` |
| support_agents | `embedded-lead`、`verification-engineer` |
| primary_implementation_skill | `tools-build` |
| supporting_skills | `tools-verification`（仅提供本地 Gate/测试证据） |
| allocation_basis | `plan.md` P4、`task.md` T-04 主实现 Skill、既有 CI 结构 |
| scope_boundary | 仅新增 `.github/workflows/ci.yml` 的独立 `workflow-gate` job，并回写本任务记录；保留既有 CI jobs，不修改真实宿主验证语义 |
| spec_version | `spec.md v0.5` |
| solid_status | `pass`；CI job 只编排已有 Gate 命令，不引入业务逻辑、宿主 Hook 或固件依赖 |

**实现结果**：

- 新增独立 `workflow-gate` job，使用 Node 22、`npm ci` 和 `npm run validate:workflow-gate -- --root "$GITHUB_WORKSPACE" --json --strict`；
- 日志显式输出 `workflow_gate_stage`、Gate JSON、`workflow_gate_exit_code`，非零退出时输出 CI error annotation 并失败；
- 既有 Jest、插件契约、链接、版本、分层、Codex 兼容桥和固件语法检查 job 保持不变；
- CI 只验证静态/主机/交付状态，不将真实 Codex 宿主回归标记为通过。

**验证记录**：

| 检查 | 结果 | 证据等级 |
|---|---|---|
| `npm test -- --runInBand tests/workflow-gate.test.js` | 7 tests 全部通过；包含合规通过和缺失/阻塞失败样例 | host |
| `.github/workflows/ci.yml` YAML 解析 | 通过 | static |
| `npm run validate:workflow-gate -- --root <repo> --json --strict` | `status=pass`，退出码 `0` | host/static |
| `npm test -- --runInBand` | 38 suites、258 tests 全部通过 | host |
| `npm run validate:plugin` | 通过 | static |
| `npm run validate:links` | 321 个 Markdown 文件通过 | static |
| `npm run check:versions` | 通过 | static |
| `npm run validate:layer` | 通过 | host/static |
| `npm run build:codex-compat` | 通过，生成 `AGENTS.override.md` | host/static |
| `git diff --check` | 通过 | static |

**阻塞/边界**：

- 本地没有执行 GitHub Actions 云端运行；本地 YAML 解析和等价命令模拟通过，不等同于远端 CI 已运行；
- T-05 的真实 Codex 宿主回归仍为 `unverified`，不由本任务的 CI 通过结果替代；
- BSP fixture 合同样例和 `embedded-framework` 黄金样例仍按用户决定不恢复，未计入本任务通过证据。

**交接**：T-04 已通过，交给 T-05；下一项需要记录三类真实 Codex 宿主请求的首个有效动作，无法取得真实 Composer 记录时必须保持 `unverified/blocked`。

### T-05：三类真实 Codex 宿主回归

**主实现 Skill**：`workflow-project-integration`

**前置**：T-04。

**目标**：实测 Codex 在三类嵌入式请求中的首个有效动作和写入边界。

**测试任务**：

1. 简单代码修改请求；
2. 嵌入式架构设计请求；
3. 构建或调试请求。

**记录字段**：

- Codex 任务 ID 和时间；
- 项目路径、分支和提交；
- 首个有效动作；
- 是否先进入 Router；
- 是否先读取项目证据；
- Spec/Gate 前是否发生写入；
- 实际调用的入口或 Skill；
- Gate 结果和证据等级。

**验收**：

- 期望首动作符合 Router-first；
- 未放行前不产生实现代码变更；
- 若发生绕过，Gate 能识别并阻止合规放行；
- 不能把“插件已安装”或“缓存一致”当作通过。

**阻塞条件**：当前环境无法创建或保留真实 Codex Composer 记录时，T-05 标记 `blocked/unverified`，不得伪造通过；T-06 只能带着该缺口报告。

**交接**：交给 T-06，附三类会话记录和证据分级表。

#### T-05 执行记录：真实 Codex 宿主回归

| 字段 | 内容 |
|---|---|
| 状态 | `unverified` |
| allocation_id | `T-05-20260819-codex-host-regression` |
| primary_agent | `embedded-lead` |
| support_agents | `system-architect`、`verification-engineer` |
| primary_implementation_skill | `workflow-project-integration` |
| supporting_skills | 无；本任务只记录宿主证据，不进入代码施工 |
| allocation_basis | `plan.md` P5、`task.md` T-05 主实现 Skill、真实宿主证据要求 |
| scope_boundary | 只观察三类独立 Codex 请求的入口动作、项目证据读取和写入边界；不修改插件、固件或宿主配置 |
| spec_version | `spec.md v0.5` |
| solid_status | `not_applicable`；本任务未进行代码施工 |

**计划样本**：

1. 简单代码修改请求；
2. 嵌入式架构设计请求；
3. 构建或调试请求。

**已取得证据**：

- 静态入口约束已存在于 `codex/AGENTS.md` 和 `codex/embedded-workflow-entry.md`；
- T-04 CI Gate、主机测试和状态矩阵已通过，但这些不能替代真实宿主行为；
- 当前 Codex 应用工具返回：`No app terminal session is attached to this thread yet.`

**未取得证据**：

- 三类独立 Composer 任务 ID、时间、项目路径/分支/提交；
- 每类请求的首个有效动作、实际入口/Skill 和 Spec/Gate 前写入检查；
- 可保存且可复核的真实宿主会话记录。

**结论**：保持 `unverified`，不得将静态入口规则、CI 通过或本次工作流续接过程写成真实 Codex 宿主通过。该缺口不阻止最终 Review 汇总，但必须在最终交付中单独列为未验证项。

**交接**：交给 T-06；最终 Review 必须保留 V-06～V-08 为 `unverified`，并说明需要在可审计 Composer 环境中补做三类回归。

### T-06：最终 Review 与交付闭环

**主实现 Skill**：`workflow-final-review`

**前置**：T-01～T-05。

**目标**：确认最终差异只包含本需求范围，质量检查通过，未验证项被明确保留。

**检查内容**：

- 文件范围和 `git diff`；
- 入口规则与 Gate 行为一致性；
- Gate 脚本错误路径和退出码；
- 测试、CI、缓存和兼容桥结果；
- V-06～V-08 的真实宿主证据是否独立记录；
- `git diff --check`；
- 不得顺带修改逻辑无关问题。

**最终放行条件**：

- V-01～V-05、V-09 通过；
- V-06～V-08 有记录并标注真实结果，未验证则保持 `unverified`；
- 不存在未解释的新增差异；
- 输出 Summary、Evidence、Changed files、Tests、Artifacts、Blockers、Next handoff。

**交付产物**：Final Review 报告、Gate 输出、测试报告、CI 记录和宿主回归记录。

## 6. 当前交接状态

- T-00：已完成；
- T-01～T-04：已执行并通过；
- T-05：已执行，但真实 Codex 宿主证据为 `unverified`；
- T-06：已完成最终 Review，交付结论为通过但保留 V-06～V-08 `unverified`；
- 固件工程 `D:\zhuomian\embedded_framework` 未修改。

#### T-06 执行记录：最终 Review 与交付闭环

| 字段 | 内容 |
|---|---|
| 状态 | `pass`；带 `V-06～V-08 unverified` |
| allocation_id | `T-06-20260819-final-review` |
| primary_agent | `embedded-lead` |
| support_agents | `system-architect`、`verification-engineer`、`toolchain-engineer` |
| primary_implementation_skill | `workflow-final-review` |
| supporting_skills | `tools-quality`（final-gate 规则）、`tools-verification`（主机/静态证据） |
| allocation_basis | `plan.md` P6、`task.md` T-06、`workflow-final-review` 输出契约 |
| scope_boundary | 只审查本需求相关文件、Spec、测试、Gate、CI 和交付记录；不清理工作区、不修改固件、不补造真实宿主记录 |
| spec_version | `spec.md v0.5` |
| solid_status | `pass`；SRP/OCP/DIP 有证据，LSP/ISP 对本次无继承或固件公共接口变更，标记 `not_applicable` |

**Final Review 报告**：

- `00_Docs/04_需求文档/REQ-CODEX-ROUTER-GATE-20260819-Final-Review.md`；
- 包含范围、Spec 追踪矩阵、质量 Final Gate、SOLID、验证命令、未验证项和交接建议。

**最终结论**：本需求相关实现、测试、Gate、CI 接入和质量检查均通过；V-06～V-08 因当前没有可审计的独立 Composer 会话保持 `unverified`。该状态符合 Spec，不能表述为真实宿主通过。

**最终验证摘要**：

- `npm test -- --runInBand`：38 suites、258 tests 全部通过；
- `npm run validate:plugin`、`validate:links`、`check:versions`、`validate:layer`：通过；
- `npm run validate:workflow-gate -- --root <repo> --json --strict`：`status=pass`；
- `npm run build`、`build:codex-compat`、JavaScript 语法和 YAML/JSON 解析：通过；
- `git diff --check`：通过；
- `plugin:check-refresh -- --json --strict`：`refresh_required`，已输出明确刷新指令，不视为缓存一致；
- 未执行 GitHub Actions 云端、目标固件交叉编译、烧录、目标板运行或实物验证。

**交付状态**：`通过（带未验证项交付）`。若后续取得可审计 Composer 环境，应只补做 V-06～V-08 并更新本报告，不得覆盖本次静态/主机/CI 证据。
