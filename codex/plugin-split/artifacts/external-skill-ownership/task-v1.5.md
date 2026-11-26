# 外部导入 Skills 五插件迁移任务

## 1. 元数据

| 字段 | 内容 |
|---|---|
| request_id | `REQ-PLUGIN-SPLIT-20261123` |
| 任务清单版本 | `v1.5` |
| 状态 | `已完成（宿主行为证据保留为未验证）` |
| 项目路径与提交 | `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai @ host_ai/79ae7a0c231cd417717db0927775131274327e36` |
| 输入 spec.md | `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai\codex\plugin-split\spec.md` v1.5 |
| 输入 plan.md | `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai\codex\plugin-split\artifacts\external-skill-ownership\plan-v1.5.md` |
| Spec 力度 / 风险叠加 | `full / versioned` |
| 生成时间 | `2026-11-24` |
| 下游执行 Skill | `workflow-task-execution`, `auto_until_final_check` |

可信等级使用 `confirmed`、`user-confirmed`、`inferred`、`unverified`。项目根目录工作区存在大量预存修改与未跟踪文件；只能改本 Task 逐项列入且已由 Plan 授权的文件。验证为静态/主机级，不包含固件构建、烧录或硬件操作。

## 2. 总体任务图

```text
T-001 → T-002 Architecture → T-003 DevOps → T-004 Observability
       → T-005 Verification → T-006 Workflow → T-007 全量 Verify → T-008 Host 证据与最终交接
```

- 总体目标：将 45 项 active external Skills 安全迁入五个现有插件唯一源目录，校验其 catalog/maps/manifests/projections/aliases；另 1 项 `embedded-team-sync` 延期至未来 Project Management 插件阶段，保留当前 Workflow 路径/登记；6 项留在 MCU 插件范围外。
- 关键串行链：T-001 → T-002 → T-003 → T-004 → T-005 → T-006 → T-007 → T-008。
- 可并行任务组：无。五批共享 catalog、inventory、projection marker 和宿主 manifests，必须串行。
- 非目标：创建 Project Management 插件；迁移 `embedded-team-sync`；迁移 Workflow canonical Skills；修改 Skill 正文语义、固件、`common/`、`claude/`、`opencode/`；外部发布或真实硬件操作。

## 3. 任务索引

| 顺序 | task_id | 任务名称 | 前置任务 | 主 Agent | 主实现 Skill | 辅助 Skill | 验证等级 | 状态 |
|---:|---|---|---|---|---|---|---|---|
| 1 | T-001 | 刷新全量路径、hash、marker 和 dirty 基线 | none | `embedded-lead` | `tools-git` | `workflow-review-gate` | static | pass |
| 2 | T-002 | 迁入 Architecture 三项 Skills | T-001 | `embedded-lead` | `tools-git` | `tools-verification` | static/host | pass |
| 3 | T-003 | 迁入 DevOps 一项 Skill | T-002 | `embedded-lead` | `tools-git` | `tools-verification` | static/host | pass |
| 4 | T-004 | 迁入 Observability 三项 Skills | T-003 | `embedded-lead` | `tools-git` | `tools-observability`, `tools-verification` | static/host | pass |
| 5 | T-005 | 迁入 Verification 两项 Skills | T-004 | `embedded-lead` | `tools-git` | `tools-verification` | static/host | pass |
| 6 | T-006 | 迁入 Workflow 四项 Skills并保留延期项 | T-005 | `embedded-lead` | `tools-git` | `tools-verification` | static/host | pass |
| 7 | T-007 | 全量 52 项一致性和五插件最终 Verify | T-001..T-006 | `embedded-lead` | `tools-verification` | `tools-quality` | static/host | pass |
| 8 | T-008 | Codex/Cursor 宿主证据与交接 | T-007 | `embedded-lead` | `tools-verification` | `workflow-final-review` | host | unverified |

## 4. 分任务详情

### T-001：刷新全量基线

| 字段 | 内容 |
|---|---|
| source_plan_ids / source_spec_ids | `P-00`; Spec v1.5 当前范围与表格验收，inventory 52 项 |
| owner_agent / support_agents | `embedded-lead` / `knowledge-engineer` |
| owner_skill / supporting_skills | `tools-git` / `workflow-review-gate` |
| allocation_evidence | Plan §8A P-00；仓库 `git status`、inventory、maps/manifests/markers |
| confidence / status | confirmed / ready |
| 目标 | 保存本轮执行前精确路径、hash、marker ownership、Git dirty 状态和插件来源位置基线。 |
| 范围 | `codex/plugin-split/artifacts/external-skill-ownership/` 的基线脚本与快照；inventory 所有 52 个目录；五插件 maps/manifests/catalog/markers。只读仓库 Skill/plugin 内容。 |
| 不包含 | 修改插件 Skills、catalog、manifest 或 projection；清理/暂存/覆盖任何既存改动。 |
| 前置与步骤 | 无前置；刷新 `git-context.json` 与 `git-status-before.txt`；运行扫描器到独立 `baseline-v1.5.json`；核对 52 IDs、45 active、1 deferred、6 excluded、32 active present/13 missing；保存 baseline SHA-256。 |
| 输出 | `baseline-v1.5.json`、命令及退出码记录、路径/hash 基线。 |
| 验证命令 | cwd `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai`；`node codex/plugin-split/artifacts/external-skill-ownership/scan-baseline.js --output baseline-v1.5.json`（如工具不支持参数，则按步骤更新 scanner 的输出参数后执行）。 |
| 预期 | 52 个唯一 ID；明确分开 45/1/6；`embedded-team-sync` 当前 Workflow 源路径和文件 hashes 被保存；扫描不写任何业务路径。 |
| 失败/回滚 | 发现数量、dirty 范围、源/投影哈希或 owner 与计划不符时阻塞后续任务；基线输出仅为审计产物，可保留或重跑。 |

### T-002：Architecture（P-01）

- IDs：`embedded-project-scaffold`、`parsed-chip-datasheet`、`vendor-minimal-firmware`。
- 分配：`embedded-lead` + `system-architect` / `verification-engineer`；主 Skill `tools-git`，辅助 `tools-verification`。
- 范围：上述三项 plugin source、`plugins/mcu-workbench-architecture/skill-map.json`、受保护同步器管理的 projections、关联 catalog 与 Architecture 定点测试。
- 步骤：先确认根文件 hash 匹配 T-001 且 plugin source 缺失；先补能证明目标 Skills 未被发现/登记的回归断言；复制完整 Skill 目录到插件唯一源；增加 map/catalog/host entries；运行受保护 projection sync；审查 diff/hash。
- 验证：cwd 仓库根；`npm --prefix plugins/mcu-workbench-architecture run validate`、`npm --prefix plugins/mcu-workbench-architecture run validate-manifests`、`npm test -- --runInBand --runTestsByPath tests/architecture-plugin.test.js tests/architecture-projection.test.js tests/architecture-links.test.js tests/architecture-manifest.test.js`。预期 validator、manifest、links、projection hashes 和测试均通过。
- 边界/SOLID：SRP 只写 Architecture；OCP 通过 map 扩展；LSP 保持旧 ID/path；ISP 只登记本插件 Skills；DIP 不依赖聚合实现。投影无 marker 或根内容漂移则阻塞。
- 回滚：按 T-001 文件/hash 清单仅回滚本批新建/改动文件及对应登记，不回滚预存修改。

### T-003：DevOps（P-02）

- ID：`embedded-build-flash-debug`。
- 分配：`embedded-lead` + `toolchain-engineer` / `verification-engineer`；主 Skill `tools-git`，辅助 `tools-verification`。
- 范围：DevOps 插件源、`scripts/sync-skills.js` mapping、catalog/manifest/projection 和 `tests/devops-*` 直接相关测试。
- 步骤：测试先行；从根 Skill 将完整目录纳入唯一插件源；扩展唯一 mapping 与登记；通过 dry/static sync 更新兼容投影；审查差异。
- 验证：`npm --prefix plugins/mcu-workbench-devops run validate`、`npm --prefix plugins/mcu-workbench-devops run validate-manifests`、`npm test -- --runInBand --runTestsByPath tests/devops-external-skills.test.js tests/devops-plugin.test.js tests/devops-projection.test.js tests/devops-catalog.test.js`。不得调用实际 build/flash 工具。
- SOLID：限定 DevOps 职责，map 扩展而非复制构建实现；保留 ID/alias；manifest 最小；不依赖聚合内部代码。同步器拒绝 drift 时阻塞。
- 回滚：依 T-001 文件清单恢复本批，不删除基线前文件。

### T-004：Observability（P-03）

- IDs：`can-debug`、`modbus-debug`、`visa-debug`。
- 分配：`embedded-lead` + `system-architect` / `verification-engineer`；主 Skill `tools-git`，辅助 `tools-observability`、`tools-verification`。
- 范围：Observability 插件 Skills、`external-skills.json`、`index.js`、host manifests、shared catalog/resolver 和直接相关 tests；仅在 marker ownership 明确时生成根投影。
- 步骤：先添加唯一 ID/目录完整性和坏入口拒绝的测试；迁入三目录；更新 registry、发现入口、manifest 与可审计兼容路径；添加必要的 marker-aware projection 或验证登记；检查 links/hashes。
- 验证：`npm test -- --runInBand --runTestsByPath tests/observability-plugin.test.js tests/observability-manifest.test.js tests/skill-links.test.js`，并运行本批新增的 Observability validator。不得连接真实 CAN/Modbus/VISA 仪器。
- SOLID：每项仅归 observability；registry 扩展；兼容入口不改语义；manifest 只暴露本插件；不得复制其他插件能力。无 marker 的根目录不得覆盖。
- 回滚：按 T-001 path/hash，仅撤销此批改动。

### T-005：Verification（P-04）

- IDs：`embedded-bug-hunter`、`memory-analysis`。
- 分配：`embedded-lead` + `verification-engineer`；主 Skill `tools-git`，辅助 `tools-verification`。
- 范围：Verification plugin `skills/`、`scripts/sync-skills.js` ID/map、catalog/manifest、`skills/tools/.verification-projections.json` 中目标 marker-owned projections、直接相关测试。
- 步骤：对照 T-001 frozen hashes；先添加登记、hash 和 drift refusal 的回归断言；新增两 Skill 唯一源及同步映射；保留现存 `embedded-unit-test-generator` 和 `static-analysis` 未跟踪目录及所有文件；运行同步与 validator。
- 验证：`npm --prefix plugins/mcu-workbench-verification run validate`、`npm --prefix plugins/mcu-workbench-verification run validate-manifests`、`npm test -- --runInBand --runTestsByPath tests/verification-catalog.test.js tests/verification-external-skills.test.js tests/verification-plugin.test.js tests/verification-skill-projection.test.js`。不声称目标固件 memory/hardware 验证。
- SOLID：专注验证能力，registry 可扩展，保留既有 Skill contract，manifest 最小，依赖插件/共享 contracts 而非聚合运行时。marker/hash drift 即阻塞。
- 回滚：只恢复本批文件，不回滚预存未跟踪目录。

### T-006：Workflow（P-05）

- IDs：`embedded-llm-guardrails`、`embedded-production-test-tool`、`market-mrd-analyst`、`skill-template`。
- 分配：`embedded-lead` + `system-architect` / `verification-engineer`；主 Skill `tools-git`，辅助 `tools-verification`。
- 范围：Workflow plugin Skills、`skill-map.json`、受保护 projection marker、catalog/resolver/manifests、直接相关 tests。`embedded-team-sync` 不得更改。
- 步骤：先检查现有 marker、路径与 hash；添加当前四项 absent Skill 的唯一登记/链接闭包回归测试；迁入四 Skill 完整目录；扩展 map/catalog/manifest；同步受保护 projection；确认延期项仍只在既有位置登记且 hash 未变。
- 验证：`npm --prefix plugins/mcu-workbench-workflow run validate`、`npm --prefix plugins/mcu-workbench-workflow run sync-skills`、`npm test -- --runInBand --runTestsByPath tests/workflow-plugin.test.js tests/workflow-catalog.test.js tests/workflow-projection.test.js tests/workflow-state.test.js tests/workflow-output-contract.test.js`。预期四项 map/source/projection 一致，延期项 diff 为空。
- SOLID：Workflow 专注 AI Spec-driven generation/review/execution; OCP 使用 map; IDs/aliases 稳定; manifest 最小; 不反向依赖聚合 loader。marker drift/unmarked conflicts stop batch.
- 回滚：按 T-001 只回滚 Workflow 本批改动。

### T-007：全量 Verify（P-06）

- 分配：`embedded-lead` + `verification-engineer`；主 Skill `tools-verification`，辅助 `tools-quality`。
- 范围：全量 inventory、五插件 maps/manifests/catalog/markers/aliases 和本次 diff；不修改逻辑。
- 验证：全量 ID 唯一且 52 项均有 disposition：45 active/5 plugins、1 deferred/PM future、6 excluded；每批目标源与投影 hash 对应；所有五个 plugin validators、直接相关 tests、`git diff --check` 通过；已有基线失败需报告基线与新增值。
- 失败处理：分类为 implementation defect 则回到对应批次；若 Spec/Plan 范围偏差回 Review Gate/Plan，不得在 Verify 阶段顺手修复。

### T-008：宿主证据与交接（P-07）

- 分配：`embedded-lead` + `toolchain-engineer` / `verification-engineer`；主 Skill `tools-verification`，辅助 `workflow-final-review`。
- 范围：Codex 与 Cursor MVP 独立发现/加载证据、最终变更集及审计记录。
- 验证：分别记录宿主、版本、入口、时间、结果与证据路径。无法真实观察时标记 `unverified`；静态/主机测试不能替代宿主行为证据。
- 交接：完成 `task-v1.5.md` 记录并交给 `workflow-final-review` 检查 Spec/Plan/Task/diff 与质量闭环。

## 5. 任务记录

| Task | 状态 | 命令 / cwd | 结果 / 产物 |
|---|---|---|---|
| T-001 | pass | `node codex/plugin-split/artifacts/external-skill-ownership/scan-baseline.js --output codex/plugin-split/artifacts/external-skill-ownership/baseline-v1.5.json`; cwd=`C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai`; exit=0 | 52 unique; 45 active=32 present/13 missing, 1 deferred with 13 current Workflow files, 6 excluded; SHA-256 `9D9724DE81143B3B2A58A8F5B9E8F8847AB3D3F0B44298EC45EBEE7FF8015DAB` |
| T-002 | pass | cwd=`C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai`; sync + 2 validators + 5 Jest suites | 42 Skills / 277 projections; 18 tests pass; marker SHA-256 `7F401032E070251895BC38C1A31CB254070657F5C163E663321BB76DE04F079E` |
| T-003 | pass | sync + 2 validators + 4 Jest suites; cwd=`C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai`; exit=0 | DevOps 17 Skills; 22 tests pass; marker SHA-256 `FDC0AD320A5BF5E8041698989AFC27E3489C41263FFF6B2FA4D82508CED471CD` |
| T-004 | pass | sync + validator + 4 Jest suites; cwd=`C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai`; exit=0 | Observability 12 Skills / 12 projections; 10 tests pass; marker SHA-256 `60E9E6AC947E0B955AB03A5298FCE5C2060DD0118F886E10CB87914F59F7C7E8` |
| T-005 | pass | Verification sync + validate + validate-manifests + 4 Jest suites; cwd=`C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai`; exit=0 | 6 Skills / 22 projection files; 18 tests pass; removed four out-of-domain academic/research Skills from Verification plugin registration while preserving global Codex Skill entries; marker SHA-256 `DFF92E7B385ECB39D89F575242C422EBBD3358A961A069B7BF666BF7EF6E0883` |
| T-006 | pass | Workflow sync + validate + 5 Jest suites; cwd=`C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai`; exit=0 | 18 Skills / 162 projections; 20 tests pass; `embedded-team-sync` unchanged (13/13 source hashes match T-001); nested `.git` excluded from plugin source/projection; Workflow marker SHA-256 `4C737DEC933572AA2DBCBFD81683C6A6D90DC15ECDFD8D25E338922E3515E165` |
| T-007 | pass | 五插件 validators/manifests + 22 Jest suites + frozen hash/disposition audit + `git diff --check`; cwd=`C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai`; exit=0 | 52 unique IDs; 45/45 active mapped/registered/source-present across five plugins (11/12/10/4/8); 1 deferred, 6 outside; 88 tests pass; migrated source hashes match T-001 baseline; zero whitespace errors |
| T-008 | unverified | Host UI/runtime discovery not independently observed in this execution; static validators and package manifests are not host behavior proof | Codex/Cursor real discovery/loading remains `unverified`; no plugin install/publish action performed |

T-001 artifact `baseline-v1.5.json`, branch `host_ai`, HEAD `79ae7a0c231cd417717db0927775131274327e36`; current Workflow path for `embedded-team-sync` and all 13 file hashes are captured in the `currentPluginFiles` field.

## 6. 阻塞与未验证

| ID | 类型 | 内容 | 影响 | 证据/动作 | 状态 |
|---|---|---|---|---|---|
| U-01 | unverified | Codex 与 Cursor 的真实宿主 discovery/loading | T-008 | 可用 UI 分别观察；不可观察时如实保留 | open |
| U-02 | unverified | 外部 Skills 来源、版本、许可证及依赖 | provenance | 保留 inventory 原始 unknown/unverified | open |

## 7. 下游交接

- Spec：`C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai\codex\plugin-split\spec.md` v1.5
- Plan：`C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai\codex\plugin-split\artifacts\external-skill-ownership\plan-v1.5.md`
- Task：`C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai\codex\plugin-split\artifacts\external-skill-ownership\task-v1.5.md`
- 顺序：T-001 → T-002 → T-003 → T-004 → T-005 → T-006 → T-007 → T-008；不得并行写共享 registry。
- 硬门禁：任何路径/hash/marker 冲突先阻塞当前批；不得扩大范围、改写 Skill 业务含义或清理预存工作区状态。
