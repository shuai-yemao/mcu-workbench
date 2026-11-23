# MCU Workbench 插件拆分迁移计划

> 本计划依赖已获用户确认的 `spec.md`。当前允许生成阻塞状态的 Task 草案，但未关闭阻塞前不得执行代码迁移。

## 1. 元数据与状态

| 字段 | 内容 |
|---|---|
| request_id | `REQ-PLUGIN-SPLIT-20261123` |
| 生成时间 | `2026-11-23T00:00:00+08:00` |
| 计划版本 | `v0.1` |
| 计划状态 | `approved` |
| 项目路径 | `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai` |
| 输入 spec.md | `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai\codex\plugin-split\spec.md` |
| Spec 力度 | `full` |
| 风险叠加门禁 | `[versioned]` |
| 用户审查状态 | `approved` |
| 方案审查结论 | `通过，存在执行前补证阻塞` |
| 2026-11-23 修复范围 | 用户确认进入基线修复：catalog 登记、链接目标、外部路径和全量测试均纳入 T-010；不得以排除规则代替修复 |

## 2. 一句话说明

- 要解决的问题：当前所有能力共用一个插件，发布、依赖和职责边界耦合。
- 计划做什么：抽取共享契约和可扩展 Harness-style runtime，拆出 workflow、architecture、verification、devops、observability 五个插件，并保留兼容聚合入口。
- 明确不做什么：不直接修改目标固件，不在本阶段删除旧入口，不新增未经确认的上位机协议。
- 预期结果：各插件可以独立校验、版本化和发布，同时旧调用名可迁移到新插件。

## 3. 两个候选方案

### 方案 A：单仓库多插件包（推荐）

- 做法：保留一个 monorepo，将 `plugins/*`、`packages/contracts`、`packages/plugin-runtime`、共享测试和宿主适配脚本集中管理。插件通过 descriptor 注册 capability、依赖、事件和生命周期；profile/bundle 负责组合插件。
- 优点：迁移成本最低；共享 catalog、schema 和测试容易保持一致；适合当前仓库已有的同步脚本。
- 缺点：发布仍有一个仓库级协调点；不同插件的版本节奏需要额外配置；宿主若不支持动态卸载，则先实现显式生命周期和重启加载。
- 验收：在同一仓库中分别执行五插件 manifest、Skill、依赖和宿主加载测试。
- 回滚：保留旧目录或生成旧聚合包，按版本切回单插件入口。

### 方案 B：五个独立仓库

- 做法：workflow、architecture、verification、devops、observability 各自独立仓库，另建共享 contracts 包。
- 优点：完全独立发布；团队权限和版本节奏清晰。
- 缺点：迁移和同步成本高；多宿主适配、跨仓库变更和兼容测试复杂；当前仓库已有的 catalog/Agent 派生机制需要重建。
- 验收：每个仓库单独通过宿主验证，再通过跨仓库兼容矩阵和集成测试。
- 回滚：按插件逐一回滚版本，依赖锁定要求更高。

### 方案对比

| 维度 | 方案 A | 方案 B | 结论 |
|---|---|---|---|
| 初始迁移成本 | 低 | 高 | 当前仓库更适合 A |
| 契约一致性 | 强 | 依赖共享包发布 | A 风险较低 |
| 独立发布能力 | 中 | 强 | B 更适合成熟团队 |
| 多宿主验证 | 集中 | 分散 | A 更容易先建立基线 |
| 长期自治 | 中 | 强 | 可在 A 稳定后演进到 B |
| 回滚 | 简单 | 分插件处理 | A 更安全 |

### 推荐选择

```text
selected_option: A
decision_owner: user
decision_rationale: 当前仓库已有单一 catalog、Agent 派生和多宿主同步机制，先采用 monorepo 多插件可降低拆分风险。
rejected_option: B 暂不采用
new_constraints: 共享 contracts 与 plugin-runtime 必须独立版本化；插件采用 descriptor + profile/bundle；对象状态统一使用 base + cfg/ctx/data/ops；旧单插件入口必须保留过渡期。
```

## 4. 选定方案概览（待用户确认）

- 选定方案：`方案 A`
- 施工顺序：四元组/插件 descriptor 契约 → plugin-runtime 注册与撤销 → profile/bundle 组合 → 插件归属矩阵 → workflow/architecture → verification/devops/observability → 宿主适配 → 兼容入口 → 全量验证。
- 非目标：本轮不拆硬件插件、不修改目标固件、不新增 OpenCode 适配、不绑定未经确认的上位机具体协议；硬件分析作为后续第六插件规划。
- 主要风险：宿主动态生命周期能力、旧单插件聚合入口兼容、版本同步、旧调用名兼容、生成脚本迁移、四元组对象与宿主 manifest 的映射。
- 外部 Skill 迁移原则：先 inventory，再功能归属，再兼容适配，最后决定是否改写；不按目录名或文件名推断归属。

## 5. 文件施工顺序

| ID | 阶段 | 动作 | 文件/目录 | 主实现 Skill | 前置条件 |
|---|---|---|---|---|---|
| P-01 | 0 | 新增 | `packages/contracts/`、插件 descriptor、版本与 schema | `workflow-integration-plan` | Spec 和方案 A 放行 |
| P-02 | 1 | 新增 | `packages/plugin-runtime/`、registry、lifecycle、profile/bundle | `platform_common` | P-01 完成；先通过主机能力探测 |
| P-03 | 2 | 新增/迁移 | `plugins/workflow/` | `workflow-requirements-router` | P-02 通过注册/撤销测试 |
| P-04 | 3 | 新增/迁移 | `plugins/architecture/` | `app-architecture` | P-02 完成，保留五层契约和四元组边界 |
| P-05 | 4 | 新增/迁移 | `plugins/verification/` | `tools-verification` | P-02 完成，质量入口唯一 |
| P-06 | 5 | 新增/迁移 | `plugins/devops/` | `tools-build` | P-02 完成，产物协议明确 |
| P-07 | 6 | 新增/迁移 | `plugins/observability/` | `tools-observability` | host 需求补证 |
| P-08 | 7 | 修改 | 各宿主 manifest、命令和 Agent 适配 | `workflow-integration-plan` | P-03 至 P-07 通过局部测试 |
| P-09 | 8 | 保留/适配 | 旧 `mcu-workbench` 聚合入口、MIGRATION_MAP | `workflow-final-review` | 所有新插件可加载 |
| P-10 | 9 | 验证 | `tests/`、CI、版本矩阵、示例扩展插件 | `tools-quality` | P-01 至 P-09 完成 |
| P-11 | 后续 | 新增 | `plugins/hardware/` | `hardware-pcb-analysis` / `hardware-visa-debug` | 五插件稳定、硬件范围重新立项 |
| P-12 | 1.5 | 新增 | `external-skill-inventory`、归属矩阵、许可证记录 | `knowledge-engineer` | 外部 Skill 清单可访问 |
| P-13 | 1.6 | 新增 | `plugins/*/adapters/external/` | `workflow-integration-plan` | P-12 完成且归属唯一 |

## 6. 阶段级 Agent/Skill 基线

| 阶段 | 主 Agent | 协作 Agent | 主 Skill | 辅助 Skill |
|---|---|---|---|---|
| P-01 | `system-architect` | `knowledge-engineer` | `platform_common` | `workflow-review-gate` |
| P-02 | `system-architect` | `firmware-engineer` | `platform_common` | `tools-verification` |
| P-03 | `embedded-lead` | `system-architect` | `workflow-requirements-router` | `workflow-review-gate` |
| P-04 | `system-architect` | `firmware-engineer` | `app-architecture` | `platform_mcu`、`impl_mcu` |
| P-05 | `verification-engineer` | `firmware-engineer` | `tools-verification` | `tools-quality` |
| P-06 | `toolchain-engineer` | `verification-engineer` | `tools-build` | `tools-linker`、`tools-release` |
| P-07 | `toolchain-engineer` | `hardware-integration` | `tools-observability` | `tools-debug` |
| P-08 | `embedded-lead` | `toolchain-engineer` | `workflow-integration-plan` | `tools-quality` |
| P-09 | `embedded-lead` | `verification-engineer` | `workflow-final-review` | `tools-quality` |

## 7. 验收与回滚

- 每个阶段先运行局部测试，再进入下一阶段。
- 统一验证：`npm test -- --runInBand`、`npm run validate:plugin`、`npm run validate:links`、`npm run validate:architecture`。
- 宿主验证：按 Codex → Cursor → Claude 分开记录加载结果，不互相替代；OpenCode 不在目标范围。
- 运行时验证：注册、撤销、重复加载、依赖注入、profile 组合和示例扩展插件。
- 四元组验证：对象身份放在 `base`，静态配置放在 `cfg`，运行上下文放在 `ctx`，运行数据放在 `data`，行为接口放在 `ops`；纯函数表必须显式豁免。
- Harness 能力探测：分别记录四宿主是否支持静态组合、重启加载、热加载、卸载和事件撤销。
- 兼容验证：旧 Skill ID、旧命令和旧聚合入口至少在过渡版本中可解析。
- 回滚：先恢复旧 manifest 和聚合入口，再恢复 catalog/Agent 路由；不删除用户项目产物。

## 8. 当前状态与下一步

- 当前状态：`approved_with_execution_blockers`
- 阻塞项：动态卸载和事件撤销能力延期验证；硬件第六插件不属于本轮阻塞项。
- 用户决策：本轮跳过 T-002 外部 Skill inventory 的完成门槛；其 inventory 和归属矩阵保留为未验证记录，来源/版本/许可证/依赖审计延期，不阻塞当前 T-004 → T-005 链路。
- 用户决策：T-004 本轮只验证本地 Codex 与 Cursor；Claude 延期。MVP 采用静态组合、显式生命周期和重启加载，不宣称热加载/动态卸载/事件撤销。
- 下一步：T-004 通过后进入 T-005；动态能力保留为后续验证项。
- T-010 基线修复顺序：先为顶层外部 Skill 增加真实路径/来源元数据，再修复或明确隔离缺失链接，最后修复文档路径测试并运行全量回归；无法确认来源内容时保持阻塞，不生成空占位。
- 新增前置闸门：先审查 `capability-test-matrix.md`，确认每个插件的功能边界、测试手段和证据等级，再生成 `task.md`。
- MCP 作为独立外部能力适配面先完成契约和测试设计，再进入 plugin-runtime 实现；不新增 Mods 层，也不假设当前宿主已支持动态 MCP 卸载。
- MVP 约定见 `mvp-conventions.md`：先统一 descriptor、Skill/Agent/Rule/Hook/script/MCP 格式，再实现最小 Runtime 和代表性插件，最后批量迁移。
- 命名迁移采用“canonical 新名 + legacy alias”策略，先验证解析和报告，再逐步更新文档、脚本和目录，避免一次性破坏现有调用。
- MVP 宿主验证顺序：Codex → Cursor → Claude；OpenCode 适配从目标范围移除，现有文件暂不删除。
