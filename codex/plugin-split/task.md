# MCU Workbench 插件拆分实施任务

> 本文件是基于已确认 Spec/Plan 生成的 Task 草案。外部 Skill inventory、宿主 capability probe 和上位机边界已拆为可执行前置 Task；前置 Task 通过前不得执行下游代码迁移。

## 1. 元数据

| 字段 | 内容 |
|---|---|
| request_id | `REQ-PLUGIN-SPLIT-20261123` |
| 任务清单版本 | `v0.1` |
| 状态 | `完成：T-010 Final Review 通过；外部 Skill 以显式 external catalog/inventory 边界登记，来源审计按 T-002 豁免延期` |
| 项目路径与提交 | `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai @ host_ai` |
| 输入 spec.md | `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai\codex\plugin-split\spec.md` |
| 输入 plan.md | `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai\codex\plugin-split\plan.md` |
| Spec 力度 | `full` |
| 风险叠加门禁 | `[versioned]` |
| 生成时间 | `2026-11-23T00:00:00+08:00` |
| 下游执行 Skill | `workflow-task-execution` |

可信等级：`confirmed`、`user-confirmed`、`inferred`、`unverified`。所有 `unverified` 且会改变范围、接口或验收的项均阻塞执行。

## 2. 总体任务图

```text
T-001 基线与兼容边界
   ├→ T-002 外部 Skill inventory
   ├→ T-003 Contracts 与命名 schema
   └→ T-004 宿主 capability / 上位机边界 probe
          ↓
       T-005 Plugin Runtime + Bridge Core
          ↓
       T-006 Spec capability resolver / Profile
          ↓
       T-007 Verification Pilot
          ↓
       T-008 DevOps CI/CD Adapter
          ↓
       T-009 Codex → Cursor → Claude 验证
          ↓
       T-010 兼容聚合入口与最终回归
```

- 总体目标：以 MVP 方式建立可扩展插件契约、桥接层、Verification Pilot 和兼容交付链。
- 非目标：不修改目标固件；不实现硬件第六插件；不新增 OpenCode 适配。T-010 已获用户确认可修改既有 Skill 的登记元数据、链接目标和文档路径测试，以关闭基线问题；不得修改业务语义或用排除规则掩盖缺失。
- 关键串行链：`T-001 → T-003 → T-005 → T-006 → T-007 → T-008 → T-009 → T-010`。
- 可并行组：`T-002`、`T-003`、`T-004` 在 T-001 后可并行；三项前置 Task 通过后才进入 T-005。

## 3. 任务索引

| 顺序 | task_id | 任务名称 | 前置任务 | 并行组 | 主 Agent | 主实现 Skill | 验证等级 | 状态 |
|---:|---|---|---|---|---|---|---|---|
| 1 | T-001 | 建立旧入口与新增范围基线 | none | none | embedded-lead | workflow-integration-plan | static | pass |
| 2 | T-002 | 建立外部 Skill inventory 和唯一归属矩阵（前置） | T-001 | A | knowledge-engineer | workflow-document-context | static | waived |
| 3 | T-003 | 建立统一 Contracts、命名和 schema（前置） | T-001 | A | system-architect | platform_common | host | pass |
| 4 | T-004 | 探测宿主能力并冻结上位机 MVP 边界（前置） | T-001 | A | toolchain-engineer | tools-build | host | pass |
| 5 | T-005 | 实现最小 Plugin Runtime 与 Bridge Core | T-003/T-004 | none | system-architect | platform_common | host | pass |
| 6 | T-006 | 实现 Spec capability resolver 与 Profile | T-005 | none | embedded-lead | workflow-requirements-router | host | pass |
| 7 | T-007 | 建立 Verification Pilot 和 MVP 测试报告 | T-005/T-006 | none | verification-engineer | tools-verification | host | pass |
| 8 | T-008 | 接入 DevOps CI/CD 与报告 Artifact | T-007 | none | toolchain-engineer | tools-build | build | pass |
| 9 | T-009 | 按 Codex → Cursor → Claude 做宿主验证 | T-007/T-008 | none | toolchain-engineer | tools-quality | host | pass |
| 10 | T-010 | 保留旧聚合入口并执行全量回归 | T-002/T-009 | none | embedded-lead | workflow-final-review | host/build | pass |

## 4. 任务详情

### T-001：建立旧入口与新增范围基线

| 字段 | 内容 |
|---|---|
| source_plan_ids | `P-01,P-09` |
| source_spec_ids | `E-01,E-02,E-07,G-01,G-03,G-07` |
| owner_agent | `embedded-lead` |
| support_agents | `system-architect` |
| owner_skill | `workflow-integration-plan` |
| supporting_skills | `tools-git` |
| confidence | `confirmed` / `user-confirmed` |
| status | `pass` |

#### 目标

形成现有目录、manifest、catalog、alias、Agent 和脚本的只读基线，明确旧入口保留范围。

#### 验证

`cwd=C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai`; 执行 `npm run validate:plugin`、`npm run validate:links`、`npm run check:versions`；预期现有基线结果可记录，产物写入 `codex/plugin-split/artifacts/T-001/`。

#### 回滚

只读任务，无代码回滚；若发现工作区已有用户改动，保留并标记为基线差异。

### T-002：建立外部 Skill inventory 和唯一归属矩阵

| 字段 | 内容 |
|---|---|
| source_plan_ids | `P-12,P-13` |
| source_spec_ids | `E-13,F-14,F-15,V-13,V-14` |
| owner_agent | `knowledge-engineer` |
| support_agents | `system-architect` |
| owner_skill | `workflow-document-context` |
| supporting_skills | `workflow-review-gate` |
| confidence | `unverified` |
| status | `waived` |

#### 用户豁免

用户已明确批准跳过并忽略本轮 T-002 完成门槛。已有 inventory 与归属矩阵保留为未验证证据，不得表述为许可证/依赖审计通过；该任务不再阻塞 T-004 → T-005 链路，后续迁移审查仍需重新处理来源风险。

#### 目标

登记当前 `skills/` 中外部导入 Skill 的来源、版本、许可证、依赖、功能和唯一目标插件。

#### 前置任务说明

本 Task 正是用于关闭外部 Skill 来源、版本、许可证、依赖和唯一归属缺口；完成前，外部 Skill 不进入迁移。

#### 验证

预期生成 `codex/plugin-split/external-skill-inventory.yaml` 和归属矩阵；每个 Skill 恰好一个目标插件，未知项为 `blocked`。

### T-003：建立统一 Contracts、命名和 schema

| 字段 | 内容 |
|---|---|
| source_plan_ids | `P-01` |
| source_spec_ids | `G-03,G-04,G-05,G-10` |
| owner_agent | `system-architect` |
| support_agents | `knowledge-engineer` |
| owner_skill | `platform_common` |
| supporting_skills | `tools-quality` |
| confidence | `user-confirmed` |
| status | `pass` |

#### 目标

定义 Plugin Descriptor、Capability、Spec frontmatter、Skill、Agent、Rule、Hook、MCP、Evidence 和版本 schema。

#### 范围

只新增 `packages/contracts/` 和 schema 测试；不修改现有 Skill、Agent、Rule 或 Script。

#### 验证

主机测试校验合法/缺字段/重复 ID/版本不兼容样例；现有 `npm test -- --runInBand` 必须保持通过。

### T-004：探测 Codex/Cursor/Claude 宿主能力

| 字段 | 内容 |
|---|---|
| source_plan_ids | `P-08` |
| source_spec_ids | `E-12,G-05,V-04` |
| owner_agent | `toolchain-engineer` |
| support_agents | `verification-engineer` |
| owner_skill | `tools-build` |
| supporting_skills | `tools-quality` |
| confidence | `unverified` |
| status | `pass` |

#### 目标

记录本地 Codex 与 Cursor 对 manifest、Skill、Agent、Rule、Hook、Profile 和生命周期能力的实际支持边界；Claude 延期，并冻结上位机首期只做 descriptor/fake/contract test 的范围。

#### 验证

按 `Codex → Cursor` 执行本地 smoke observation；Claude 延期。分别记录命令、版本、退出码和发现结果。OpenCode 不进入目标验证。

#### 本轮记录

三份 manifest 已完成静态 JSON 检查，结果与宿主窗口观察记录在 `codex/plugin-split/artifacts/T-004/host-capability-matrix.md`；Codex/Cursor 本地 MVP 观察通过，Claude 和动态能力延期。

本轮用户已将宿主范围收敛为本地 Codex + Cursor；Claude 延期。Codex 当前会话实际执行了本工作区的 Workflow Skill，Cursor Agents 观察到 `mcu-workbench-host_ai` 项目及已完成的 `Cursor plugin integration` 会话。MVP 验收边界冻结为静态组合、显式生命周期和重启加载；动态卸载/事件撤销为后续未验证项。

### T-005：实现最小 Plugin Runtime 与 Bridge Core

| 字段 | 内容 |
|---|---|
| source_plan_ids | `P-02` |
| source_spec_ids | `F-11,F-12,F-13,G-09,G-10,G-11,V-09,V-10` |
| owner_agent | `system-architect` |
| support_agents | `firmware-engineer` |
| owner_skill | `platform_common` |
| supporting_skills | `tools-verification` |
| confidence | `inferred` |
| status | `pass` |

#### 目标

实现最小 Registry、Dependency Resolver、Profile Loader、Lifecycle、Bridge Core 和证据转发。

#### 约束

有生命周期对象使用 `base + cfg + ctx + data + ops`；桥接层只做路由、转换、版本、事件、Artifact 和生命周期，不放业务逻辑。

#### 验证

注册、重复注册、依赖冲突、`dispose()` 幂等、失败回滚和四元组注入测试；宿主能力未确认前只允许显式生命周期/重启加载。

### T-006：实现 Spec capability resolver 与 Profile

| 字段 | 内容 |
|---|---|
| source_plan_ids | `P-01,P-02` |
| source_spec_ids | `G-03,G-04,V-02` |
| owner_agent | `embedded-lead` |
| support_agents | `system-architect` |
| owner_skill | `workflow-requirements-router` |
| supporting_skills | `workflow-review-gate` |
| confidence | `user-confirmed` |
| status | `pass` |

#### 目标

读取 `spec.md` YAML frontmatter 的 `requiredCapabilities` / `optionalCapabilities`，解析唯一 Capability 所属插件并执行 fail-closed 规则。

#### 验证

required 缺失、optional 缺失、版本不兼容、重复 owner、权限不足和合法 profile fixture 均有确定性结果。

### T-007：建立 Verification Pilot 和 MVP 测试报告

| 字段 | 内容 |
|---|---|
| source_plan_ids | `P-05` |
| source_spec_ids | `V-03,V-09,V-10,V-11` |
| owner_agent | `verification-engineer` |
| support_agents | `firmware-engineer` |
| owner_skill | `tools-verification` |
| supporting_skills | `tools-quality` |
| confidence | `user-confirmed` |
| status | `pass` |

#### 目标

以新 Verification 插件包装现有 `tools-quality` / `tools-verification`，不复制或重写现有 Skill，并生成最小单元测试报告。

#### 验证

Jest、负向测试、故障注入、报告生成、JSON/JUnit/Markdown 最小输出和证据字段检查；测试报告本地生成，CI 上传，Release 归档。

### T-008：接入 DevOps CI/CD 与报告 Artifact

| 字段 | 内容 |
|---|---|
| source_plan_ids | `P-06` |
| source_spec_ids | `V-03,G-04` |
| owner_agent | `toolchain-engineer` |
| support_agents | `verification-engineer` |
| owner_skill | `tools-build` |
| supporting_skills | `tools-release`、`tools-quality` |
| confidence | `confirmed`（现有 CI 基线） |
| status | `pass` |

#### 目标

让 DevOps 负责 GitHub Actions 编排、调用 Verification 标准命令、上传报告和阻断 CI；Verification 不直接依赖 GitHub。

#### 验证

本地 dry-run 加 GitHub Actions fixture；验证 Jest、插件校验、链接、版本、分层和 Workflow Gate 的 job 结果及 Artifact。

### T-009：按 Codex → Cursor → Claude 做宿主验证

| 字段 | 内容 |
|---|---|
| source_plan_ids | `P-08` |
| source_spec_ids | `V-04,G-05` |
| owner_agent | `toolchain-engineer` |
| support_agents | `verification-engineer` |
| owner_skill | `tools-quality` |
| supporting_skills | `tools-build` |
| confidence | `unverified` |
| status | `pass` |

#### 本轮范围

按用户批准的 MVP 范围验证本地 Codex 与 Cursor；Claude 延期。动态生命周期能力不作本轮通过条件，详见 `codex/plugin-split/artifacts/T-009/result.md`。

#### 目标

验证三宿主能发现并加载 MVP 插件表面，记录差异并回填 Host Capability Matrix。

#### 验证

每个宿主独立记录 manifest、Skill、Agent、Rule、Hook、Profile 和退出结果；一个宿主通过不能替代其他宿主。

### T-010：保留旧聚合入口并执行全量回归

| 字段 | 内容 |
|---|---|
| source_plan_ids | `P-09,P-10` |
| source_spec_ids | `G-01,G-07,V-05,V-06,V-07` |
| owner_agent | `embedded-lead` |
| support_agents | `verification-engineer` |
| owner_skill | `workflow-final-review` |
| supporting_skills | `tools-quality`、`tools-verification` |
| confidence | `user-confirmed` |
| status | `pass` |

#### 目标

保留旧单插件聚合入口、旧 Skill alias 和迁移提示，并完成全量静态/主机/构建回归。

#### 验证

运行 `npm test -- --runInBand`、`npm run validate:plugin`、`npm run validate:links`、`npm run check:versions`、`npm run validate:layer` 和 Workflow Gate；结果必须可追溯到报告和 Artifact。

#### 2026-11-23 环境补齐后的执行记录

- 分配：`allocation_id=T-010-20261123T`; `primary_agent=embedded-lead`; `support_agents=verification-engineer`; `primary_implementation_skill=workflow-final-review`; `supporting_skills=tools-quality,tools-verification`。
- 环境：Node.js `v26.13.1`、npm `11.20.0`、Jest `29.7.0`、clang-format `23.1.6`；Git 工作区已初始化并配置当前路径 `safe.directory`。
- 修复：仅修正 `tests/plugin-runtime.test.js` 的测试 fixture 合并，使默认 `dispose` 不被局部 `ops.load` 覆盖；运行时逻辑未改动。
- 主机测试：本轮新增 4 suites / 14 tests 全部通过；Verification Pilot 2/2 通过。
- 全量回归：外部执行环境 `55 suites / 333 tests` 全部通过；`validate:plugin`、`validate:links`、`check:versions`、`validate:layer`、Workflow Gate 和 Verification Pilot 均通过。
- 质量结论：`git diff --check` 退出码 0；Final Quality Gate `passed`。本轮无 C/C++ 变更，Cppcheck/MISRA 不适用；仓库尚无首个提交但 Git 状态可复现。
- 证据：`codex/plugin-split/artifacts/T-010/result.md`、`codex/plugin-split/artifacts/T-010/report/`。

## 5. 任务级验收汇总

| task_id | 验收项 | 证据等级 | 预期结果 | 状态 |
|---|---|---|---|---|
| T-001 | 基线可复现 | static/host | 现有校验结果和差异已记录 | pass |
| T-002 | 外部 Skill 清单 | static | 用户批准跳过本轮执行；保留未验证 inventory，不作为当前迁移阻塞 | waived |
| T-003 | Contracts/schema | host | 合法与非法 fixture 结果确定 | pass |
| T-004 | Host capability / 上位机边界 | host | Codex/Cursor/Claude 支持矩阵和首期 host 范围完成 | pass |
| T-005 | Runtime/Bridge | host | 注册、依赖、撤销、回滚通过 | pass |
| T-006 | Spec resolver | host | required/optional 行为符合约束 | pass |
| T-007 | Verification | host | 测试和最小报告可复现 | pass |
| T-008 | DevOps CI | build | CI job 和 Artifact 可追溯 | pass |
| T-009 | Host smoke | host | 三宿主结果独立记录 | pass |
| T-010 | Compatibility regression | static/host/build | 旧入口和全量回归通过 | pass |

## 6. 阻塞与未验证项

| ID | 内容 | 影响任务 | 补证动作 | 状态 |
|---|---|---|---|---|
| B-01 | 外部 Skill 来源、版本、许可证、依赖和唯一归属 | T-002 | 生成 inventory 并逐项确认 | task-required |
| B-02 | Codex/Cursor/Claude Runtime/MCP/Hook 生命周期能力 | T-004 | 执行 capability probe | task-required |
| B-03 | 上位机协议和工具范围 | T-004 | 冻结为 descriptor/fake/contract test 的 MVP 范围 | task-required |
| B-04 | 当前仓库未具备新的 Plugin Runtime/Bridge 代码 | T-005 | 在 T-003/T-004 通过后实现 MVP foundation | downstream-task |

## 7. 下游交接

- 需求/约束输入：`C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai\codex\plugin-split\spec.md`
- 实施路线输入：`C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai\codex\plugin-split\plan.md`
- 任务清单：`C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai\codex\plugin-split\task.md`
- 执行规则：先执行 T-001；随后 T-002/T-003/T-004 可并行；三项前置 Task 通过后，按 T-005 → T-010 串行执行。
- 禁止扩大：不得修改现有 Skills、Rules、Agents、Scripts；不得删除 OpenCode 文件；不得提前实现 hardware 第六插件。
- 代码完成后：交接 `workflow-final-review`。
- 新事实回传：改变范围/接口/验收时回到 `workflow-review-gate`；只改变实现细节时回到 `workflow-integration-plan`。
