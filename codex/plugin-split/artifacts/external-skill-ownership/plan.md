# 外部导入 Skills 分批归属与迁移计划

> **已过期**：本方案针对 Spec v1.2 的五插件范围；Spec v1.4 新增 `mcu-workbench-project-management`，本文件只保留历史决策记录，不能作为执行依据。待 Spec v1.4 放行后重制六插件 Plan。

## 1. 元数据与状态

| 字段 | 内容 |
|---|---|
| request_id | `REQ-PLUGIN-SPLIT-20261123` |
| 计划版本 | `v1.2-option-b`（superseded by Spec v1.4） |
| 生成日期 | `2026-11-24` |
| 项目 | `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai` |
| 分支 | `host_ai`；工作区有大量既存修改和未跟踪文件 |
| 输入 Spec | `codex/plugin-split/spec.md`，`v1.2-external-skill-ownership-review` |
| Review Gate | `approved` |
| Spec 力度/叠加 | `full` / `versioned` |
| 用户选择 | 方案 B：按插件分批切换 |
| 选择人/理由 | 用户，2026-11-24 回复 `b`；用户未另述理由。方案 B 的工程特点是分批验证并按插件回滚 |
| 计划审查状态 | `superseded` |
| 阻塞项 | Spec v1.4 新增 `mcu-workbench-project-management` 并调整 Workflow/项目管理边界；须先审阅放行新 Spec，再生成六插件 Plan |

## 2. 目标与边界

完成 Spec v1.2 所列 46 项外部 Skill 的内容归属复核、唯一源迁移、插件注册和兼容投影，并保留 6 项嵌入式插件范围外 Skills。每项来源、版本、许可证和依赖仍按证据标记，未知来源不阻碍内容归属。

不改写 Skill 业务语义，不迁移 5 项通用学术研究/论文 Skills 与 `patent-disclosure-skill`，不执行固件构建/烧录、硬件操作、远端发布或推送。当前工作区中的既有改动都必须保留。

本计划虽然记录了已选路线，但由于仓库写入边界冲突，审查结论为阻塞，不能交给 `workflow-task-breakdown` 生成可执行任务或交给实现 Skill 施工。

## 3. 归属与迁移基线

| 目标插件 | 纳入数 | 当前插件源目录已有数 | 需迁入数 | Skills |
|---|---:|---:|---:|---|
| Architecture | 11 | 8 | 3 | `chip-driver-manual`, `chip-resource-finder`, `embedded-architecture-planner`, `embedded-coding-standard`, `embedded-minimal-project-builder`, `embedded-prd-to-logic`, `embedded-project-scaffold`, `parsed-chip-datasheet`, `prd-to-hardware-solution`, `schematic-pinmap-analyzer`, `vendor-minimal-firmware` |
| DevOps | 12 | 11 | 1 | `build-cmake`, `build-iar`, `build-idf`, `build-keil`, `build-makefile`, `build-platformio`, `embedded-build-flash-debug`, `flash-idf`, `flash-jlink`, `flash-keil`, `flash-openocd`, `flash-platformio` |
| Observability | 10 | 7 | 3 | `can-debug`, `debug-gdb-openocd`, `debug-jlink`, `debug-platformio`, `logic-analyzer`, `modbus-debug`, `rtos-debug`, `serial-monitor`, `serial-shell`, `visa-debug` |
| Verification | 4 | 2 | 2 | `embedded-bug-hunter`, `embedded-unit-test-generator`, `memory-analysis`, `static-analysis` |
| Workflow | 9 | 5 | 4 | `embed-ai-tool`, `embedded-change-report`, `embedded-llm-guardrails`, `embedded-production-test-tool`, `embedded-project-intake`, `embedded-team-sync`, `market-mrd-analyst`, `mrd-to-prd`, `skill-template` |
| **合计** | **46** | **33** | **13** | |

排除在 MCU 插件外的 6 项：`academic-paper`、`academic-paper-reviewer`、`academic-pipeline`、`sr-screener`、`deep-research`、`patent-disclosure-skill`。

基线来源：`codex/plugin-split/artifacts/external-skill-ownership/baseline.json`；SHA-256 `pending task execution record`。当前已发现 33 项目标源目录存在、13 项需迁入。`embedded-coding-standard` 与 `embedded-prd-to-logic` 的根 Skill 路径已有预存 dirty 状态；Verification plugin 源目录为预存 untracked 树；需先核对 marker/hash，禁止覆盖或重写这些文件。

## 4. 方案记录

### 方案 A：五插件协同一次切换（未选择）

一次性复核并同步所有 46 项，迁入缺失的 12 项，更新五个插件的注册、投影与测试，然后进行全量验收。切换窗口短、最终状态集中；跨插件变更面较大，故障定位和整体回滚范围更广。

### 方案 B：按插件分批切换（用户选择）

按 Architecture → DevOps → Observability → Verification → Workflow 顺序，每个插件独立完成：迁移前基线与哈希冻结、单插件 Skill 源与 registry/map/manifest 更新、marker/projection 更新、插件定点检查、差异审查和回滚点记录。每批通过后再进入下一插件；五批结束后进行全量 catalog/manifest/链接/alias/host 一致性验证。

每批只由一个主实现 Skill 修改当前插件任务范围。跨插件共享 catalog 或宿主清单的变更由专门集成任务串行处理，不与插件批次并行。根 Skill 路径只在其 marker 归属与源哈希经证据确认后作为生成投影管理；禁止覆盖未标记冲突和其他插件拥有的路径。

## 5. 分层、接口与 SOLID 审查

此工作不改变固件层调用链 `App → Service → Platform ← Impl → Vendor`，不修改 MCU、RTOS、ISR、DMA、硬件资源或固件代码。

| 原则 | 计划约束 | 验证证据 |
|---|---|---|
| SRP | 每项 Skill 只有一个主责插件；各插件自身负责源、发现与投影，不把迁移逻辑集中到运行时业务层 | inventory / skill map / manifest 唯一映射检查 |
| OCP | 新归属通过插件 map/catalog 登记，避免修改不相关 Skill 内容 | 变更范围审查、注册表差异 |
| LSP | 保持 Skill ID、入口路径与旧 alias 的行为 | resolver/alias 定点测试 |
| ISP | 各插件 manifest 只登记本插件 Skills；排除项不复制进 MCU 插件 | 每插件 manifest 与 catalog 精确集合对比 |
| DIP | Skill 间跨域引用使用可审计依赖，不反向依赖聚合实现 | 链接闭包与依赖声明检查 |

## 6. 分批顺序与交接

| 阶段 | 目标 | 主要范围 | 验收/交接 |
|---|---|---|---|
| P-00 | 冻结全量迁移基线 | 52 项、插件源、root projection markers、catalog、manifest、现有工作树差异 | 逐文件路径与 SHA-256；unknown/unmarked conflicts 明确登记 |
| P-01 | Architecture 波次 | 11 项；当前目录存在 8 项 | Architecture validator/定点测试通过，逐文件源/投影哈希一致 |
| P-02 | DevOps 波次 | 12 项；当前目录存在 11 项 | DevOps validator/定点测试通过；不运行真实 build/flash |
| P-03 | Observability 波次 | 10 项；当前目录存在 7 项 | Observability Skill map/manifest/链接检查通过；仪器/探针不实操 |
| P-04 | Verification 波次 | 4 项；当前目录存在 2 项 | Verification validator/定点测试通过；不声称目标验证 |
| P-05 | Workflow 波次 | 9 项；当前目录存在 5 项 | Workflow validator/投影/链接检查通过 |
| P-06 | 全量集成验证 | 五插件、共享 catalog、Codex/Cursor manifests、root projections | 52 项 disposition 精确一致；46 唯一归属、6 排除；定点测试、全部插件 validator 与 `git diff --check` 通过 |
| P-07 | Host 验证与最终审查 | Codex、Cursor 分别观察 | 发现/加载证据分宿主记录；静态或主机测试不替代真实宿主证据；交 `workflow-final-review` |

## 7. 阶段级 Agent / Skill 基线

| 阶段 | 主 Agent | 协作 Agent | 主实现 Skill | 辅助 Skill |
|---|---|---|---|---|
| P-00 | `embedded-lead` | `knowledge-engineer` | `tools-git` | `workflow-review-gate` |
| P-01..P-05 | `embedded-lead` | `system-architect`, `verification-engineer` | `tools-git` | 对应插件 validator / `tools-verification` |
| P-06 | `embedded-lead` | `verification-engineer`, `toolchain-engineer` | `tools-verification` | `tools-quality` |
| P-07 | `embedded-lead` | `verification-engineer`, `toolchain-engineer` | `tools-verification` | `workflow-final-review` |

当前只记录阶段基线；Task 层分配需 `workflow-task-breakdown` 根据实际插件契约与测试入口细化。插件外目录不可修改的限制解除前，P-01..P-07 不可执行。

## 8. 验收计划

| ID | 等级 | 条件 | 产物 |
|---|---|---|---|
| V-01 | 静态 | inventory 52 项完整；46 项唯一插件 owner，6 项排除 | 更新后 inventory / ownership matrix |
| V-02 | 静态/主机 | 各 plugin map/catalog/manifest 与目标 IDs 一致且无重复 | validator 输出与测试报告 |
| V-03 | 静态 | 唯一源、marker、source/target hashes 与链接闭包一致；无越界覆盖 | 五插件逐批迁移报告 |
| V-04 | 主机 | 每插件定点测试及 validator 通过，故障路径能拒绝冲突/漂移 | Jest/validator 报告 |
| V-05 | 静态/主机 | `git diff --check` 通过；既有未提交内容无丢失 | diff 与基线记录 |
| V-06 | 宿主 | Codex 与 Cursor 分别核验发现/加载 | 两宿主各自的记录 |
| V-07 | 硬件 | 不适用 | 不生成固件硬件通过结论 |

具体命令以各插件当前 `package.json`/scripts 和测试入口为准；Task 生成前重新读取并记录绝对 cwd、命令、退出码及产物路径。此计划阶段未运行测试。

## 9. 计划审查与阻塞

| 审查项 | 结论 | 证据/动作 |
|---|---|---|
| Spec 范围 | 通过 | Spec v1.2：46 项迁移、6 项排除、来源未知不阻塞 |
| 用户方案选择 | 通过 | 用户选择方案 B |
| 分批路线与回滚 | 通过 | 每插件为隔离批次；每批保存哈希和可独立回滚点 |
| 文件授权范围 | 通过 | 用户授权修改 Codex 规则源；`codex/AGENTS.md` §7 现明确本 Spec/Plan 范围内插件源、注册和 marker-owned projection 可写 |
| 分批路线 | 通过 | 依据实际包结构：Architecture/Workflow 使用 `skill-map.json`；DevOps 使用 `scripts/sync-skills.js` 映射；Observability 使用 `external-skills.json`；Verification 使用 `scripts/sync-skills.js` 的 ID 表。Task 前置基线逐项核验这些入口及当前 markers |
| 后续执行 | ready | 生成 Task；每插件先确认 marker/hash 和预存工作区差异，再实施、验证和回写；任何 drift/conflict 均保留并阻塞对应批次 |

**历史结论（已失效）：**用户曾选择方案 B；由于 Spec v1.4 新增项目管理插件并重划 Workflow 边界，本 Plan 已 superseded，不能交给执行链使用。

## 10. 下游交接

- Spec：`C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai\codex\plugin-split\spec.md`
- Plan：`C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai\codex\plugin-split\artifacts\external-skill-ownership\plan.md`
- 当前状态：`superseded`。
- 下一步：等待 Spec v1.4 Review Gate 与用户审阅放行，再生成六插件 Plan/Task 并冻结基线。
