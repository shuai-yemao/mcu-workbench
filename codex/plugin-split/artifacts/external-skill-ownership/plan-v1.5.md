# 外部导入 Skills 五插件分批迁移计划

## 1. 元数据与决策

| 字段 | 内容 |
|---|---|
| request_id | `REQ-PLUGIN-SPLIT-20261123` |
| 计划版本 | `v1.5-option-b` |
| 输入 Spec | `codex/plugin-split/spec.md` v1.5 |
| Spec 状态 | `approved-for-plan`（用户要求先迁移现有插件，项目管理插件暂缓） |
| 用户方案选择 | 方案 B：按插件分批（用户此前已选；本版保留该路线） |
| 执行状态 | `approved`（用户 2026-11-24 要求开始生成 Task 并执行） |
| 项目/分支 | `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai` / `host_ai` |
| 风险力度 | `full + versioned` |

## 2. 目标与范围

按内容归属，将 45 项外部 Skill 迁移/核验到现有五个插件唯一源目录，并保持 Codex/Cursor manifests、plugin maps、catalog、compatibility projections 与旧聚合入口一致。总 inventory 仍为 52 项：45 项本轮处理，`embedded-team-sync` 一项按用户决定延后至项目管理插件阶段，另 6 项留在嵌入式插件范围外。

本轮不创建 `mcu-workbench-project-management`，不迁移 Workflow canonical Skills，不改变 Skill 业务语义；不操作固件构建、烧录、硬件、外部发布或远端服务。`embedded-team-sync` 当前在 Workflow 插件中的路径和登记作为明确的延后项保留，不参与本轮所有权/投影改写。

## 3. 方案比较与选定路线

| 方案 | 做法 | 优缺点 | 决策 |
|---|---|---|---|
| A：五插件集中批次 | 同一集成分支一次更新五插件源、registries 和 markers，最后整体验证 | 共享 catalog 一次改完，但故障定位、回滚和既有 dirty 文件隔离较难 | 未选 |
| B：按插件顺序分批 | 每次只处理一个插件，先基线/冲突检查，再迁移、注册、验证、审查和记录回滚点；通过后进入下一插件 | 每批边界清楚、失败可局部停止，工期较长且共享 registry 要串行维护 | 已选 |

## 4. 迁移批次与冻结计数

| 顺序 | 插件 | 当前源目录已存在 | 待迁入 | 纳入数量 | 主要清单 |
|---:|---|---:|---:|---:|---|
| 0 | 全局基线 | 32/45 active items | 13 | 45 | 全量 52 IDs；1 项 deferred、6 项 excluded |
| 1 | Architecture | 8 | 3 | 11 | `embedded-project-scaffold`, `parsed-chip-datasheet`, `vendor-minimal-firmware` |
| 2 | DevOps | 11 | 1 | 12 | `embedded-build-flash-debug` |
| 3 | Observability | 7 | 3 | 10 | `can-debug`, `modbus-debug`, `visa-debug` |
| 4 | Verification | 2 | 2 | 4 | `embedded-bug-hunter`, `memory-analysis` |
| 5 | Workflow | 4/8 active items | 4 | 8 | `embedded-llm-guardrails`, `embedded-production-test-tool`, `market-mrd-analyst`, `skill-template` |
| Deferred | Future Project Management | not migrated in this phase | 0 | 1 | `embedded-team-sync`; preserve current Workflow path and registration |

Counts derive from the frozen baseline: 46 historical plugin-assigned items = 33 present + 13 missing; subtract the deferred, already-present `embedded-team-sync` to obtain 45 active = 32 present + 13 missing. Re-run the baseline before execution and stop if counts or hashes drift.

## 5. Work sequence and gates

1. **P-00 Baseline refresh:** record branch/commit, complete `git status`, source/target file lists and SHA-256 for all 52 inventory items, plugin maps/manifests/catalog, marker files and current projection files. Confirm 45 active, 1 deferred, 6 excluded; active baseline expected 32 present/13 missing. Do not normalize or clean existing dirty/untracked files.
2. **P-01 Architecture:** review the three missing Skills and their links; add plugin source/map entries; update required catalog/host registration; run Architecture validator and relevant tests; verify marker ownership and rollback snapshot.
3. **P-02 DevOps:** migrate the one missing Skill through the DevOps canonical mapping/sync path; run plugin validation and relevant tests. Do not invoke actual build or flash scripts.
4. **P-03 Observability:** migrate three Skills, register them in `external-skills.json` and the plugin discovery surface; establish/extend only marker-owned projections, refusing existing unmarked roots; run link/manifest checks and tests without instrument access.
5. **P-04 Verification:** migrate two Skills through the Verification ID map and protected projection path. Preserve the plugin’s pre-existing untracked source directories and unrelated files; validate both existing and new entries.
6. **P-05 Workflow:** migrate four Skills through Workflow `skill-map.json` and its sync path. Keep `embedded-team-sync` byte-for-byte and registration-stable in its existing location; verify canonical workflow compatibility and link closure.
7. **P-06 Integration Verify:** verify all 52 IDs occur exactly once in inventory; 45 active owners across five plugins, one deferred PM item, six out-of-scope items; plugin maps/catalog/manifests/markers/aliases agree; all five plugin validators and relevant tests pass; `git diff --check` passes.
8. **P-07 Host evidence:** separately record Codex and Cursor discovery/loading evidence if available. Static and host tests must not be described as real host behavior unless observed in those hosts.

Each plugin is a hard gate. Stop that batch on hash drift, unmarked target conflict, duplicate ID, unresolvable link, validator failure or unexpected source modification. Preserve state and report the exact conflict; do not force overwrite. Continue only after review and explicit recovery decision where needed.

## 6. Files and boundaries

Expected mutable paths per batch: the named plugin’s Skill source/map/metadata/manifests/validator or synchronizer; `skills/catalog.js` and narrowly necessary resolver/alias code; projections only when the target path is owned by that plugin’s marker; tests directly covering the batch; this Plan/Task and inventory/ownership evidence. Exact paths and hashes are frozen in P-00 before writes.

Never edit `common/`, `claude/`, `opencode/`, unrelated plugin directories, firmware projects, or unrelated dirty/untracked files. Do not remove or re-register the deferred `embedded-team-sync`; do not create the future Project Management plugin in this phase.

## 7. Validation and rollback

- Before each batch: compare target path/hash against P-00 and current marker ownership; explicitly record pre-existing dirty files.
- After each batch: run that plugin’s `package.json` validator/manifests commands and directly relevant Jest suites; inspect generated map/marker diff and source/projection hashes. Record absolute cwd, command, exit code and artifact paths.
- Roll back only files changed by the current batch, using its frozen hash/file list; preserve user data and all changes from prior successful batches. Shared catalog changes are reverted only if no later successful batch depends on them.
- Final checks cover five validators, targeted tests, catalog/links/aliases/projections, and `git diff --check`. No hardware validation applies.

## 8. Review status and handoff

Plan B retains the user's prior route choice and includes the latest scope decision to defer `embedded-team-sync` and the new plugin. The user approved proceeding to Task generation/execution on 2026-11-24. The old `plan.md` and `task.md` remain historical v1.2 artifacts and are superseded.

### 8A. Stage-level Agent/Skill baseline

| Stage | Primary Agent | Supporting Agents | Primary Skill | Supporting Skills | Allocation rationale |
|---|---|---|---|---|---|
| P-00 | `embedded-lead` | `knowledge-engineer` | `tools-git` | `workflow-review-gate` | Freeze source, target, dirty and marker evidence before writes |
| P-01..P-05 | `embedded-lead` | `system-architect`, `verification-engineer` | `tools-git` | `tools-verification`, target plugin validator | One plugin at a time; source/map/projection migration with local validation |
| P-06 | `embedded-lead` | `verification-engineer` | `tools-verification` | `workflow-final-review`, `tools-quality` | Cross-plugin ownership and final evidence audit |
| P-07 | `embedded-lead` | `toolchain-engineer`, `verification-engineer` | `tools-verification` | `workflow-final-review` | Host discovery evidence and final handoff |
