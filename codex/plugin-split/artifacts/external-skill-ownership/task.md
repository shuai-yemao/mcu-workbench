# 外部导入 Skills 分批迁移任务

> **已过期**：本 Task 针对 Spec v1.2 的五插件范围；Spec v1.4 新增项目管理插件。本文件只作为旧计划记录保留，不得执行；待新 Spec 放行后重制 Task。

## 1. 元数据

| 字段 | 内容 |
|---|---|
| request_id | `REQ-PLUGIN-SPLIT-20261123` |
| 任务清单版本 | `v1.2-option-b`（superseded by Spec v1.4） |
| 状态 | `superseded` |
| 项目路径/分支 | `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai @ host_ai` |
| Spec | `codex/plugin-split/spec.md` v1.2 |
| Plan | `codex/plugin-split/artifacts/external-skill-ownership/plan.md` v1.2-option-b, approved |
| Spec 力度 | `full + versioned` |
| 生成日期 | `2026-11-24` |
| 下游执行 | `workflow-task-execution`, `auto_until_final_check` |

## 2. 总体目标与任务图

```text
T-001 → T-002 → T-003 → T-004 → T-005 → T-006 → T-007
```

- 总体目标：将 46 项纳入范围的外部 Skill 按已确认内容归属分批落实到五个插件唯一源目录，维护 52 项 inventory、插件登记、兼容投影和验证记录。
- 非目标：5 项通用学术 Skills 与 `patent-disclosure-skill` 不迁入 MCU 插件；不改 Skill 业务语义；不做硬件/固件操作、远端发布或推送。
- 分批顺序：Architecture → DevOps → Observability → Verification → Workflow；禁止并行，因为各批涉及同一 catalog、根 projections 和聚合 Skill registry。
- 唯一实现边界：每个 T 仅一个主实现 Skill 写入该插件批次；共享 registry 集成在相应批次串行完成。

## 3. 任务索引

| 顺序 | ID | 任务 | 前置 | 主实现 Skill | 辅助 | 验证 | 状态 |
|---:|---|---|---|---|---|---|---|
| 1 | T-001 | 冻结 52 项来源、目标、markers 与哈希基线 | none | `tools-git` | `workflow-review-gate` | static | ready |
| 2 | T-002 | Architecture 两项归属和迁移 | T-001 | `tools-git` | `tools-verification` | static/host | ready |
| 3 | T-003 | DevOps 一项归属和迁移 | T-002 | `tools-git` | `tools-verification` | static/host | ready |
| 4 | T-004 | Observability 三项归属和迁移 | T-003 | `tools-git` | `tools-verification` | static/host | ready |
| 5 | T-005 | Verification 两项归属和迁移 | T-004 | `tools-git` | `tools-verification` | static/host | ready |
| 6 | T-006 | Workflow 四项归属和迁移 | T-005 | `tools-git` | `tools-verification` | static/host | ready |
| 7 | T-007 | 全量 52 项一致性、宿主与最终 Verify | T-001..T-006 | `tools-verification` | `workflow-final-review`, `tools-quality` | static/host | ready |

## 4. 分任务

### T-001 冻结 52 项来源、目标、markers 与哈希基线

- `source_plan_ids`: `P-00`
- `source_spec_ids`: `EXT-E01..EXT-E08`, `EXT-T01`, `EXT-G06..EXT-G08`
- `owner_agent`: `embedded-lead`; `support_agents`: `knowledge-engineer`
- `owner_skill`: `tools-git`; `supporting_skills`: `workflow-review-gate`
- 目标：生成不写业务文件的基线记录，逐项列出 52 项的源目录、当前插件目录、目标、文件 SHA-256、Catalog/manifest/map/source-map 状态、marker ownership、Git dirty 状态和排除原因。
- 步骤：读取当前五插件 manifests、map/sync scripts、catalog、投影 markers；对 52 项逐文件算 hash；记录差异/未标记冲突；更新本 Task 记录和单独基线 JSON，不改 Skill、插件或 registry。
- 输出：`codex/plugin-split/artifacts/external-skill-ownership/baseline.json`。
- 检查：根目录 cwd，PowerShell/Node 只读扫描；52 项恰好一次，46 plugin owners，6 excluded；相同路径/hash 再跑结果一致（时间戳除外）。
- 失败/回滚：基线发现未知 marker、dirty projection 或 source/root hash drift 时停止后续对应批次，保留现有内容并回报；无需回滚只读扫描。

### T-002 Architecture 两项归属和迁移

- `source_plan_ids`: `P-01`; `source_spec_ids`: `EXT-F01`, `EXT-G01..EXT-G08`, `EXT-T01..EXT-T05`
- `owner_agent`: `embedded-lead`; `support_agents`: `system-architect`, `verification-engineer`
- `owner_skill`: `tools-git`; `supporting_skills`: `tools-verification`
- 范围 IDs：`embedded-project-scaffold`, `parsed-chip-datasheet`；复核同插件现有 9 项内容归属与 ID 唯一性，不重写其正文。
- 文件：Architecture 插件 `skills/`, `skill-map.json`, plugin/codex/cursor manifests, scripts/validator; `skills/catalog.js`; `.architecture-projections.json` 所拥有的根 targets; 关联测试。
- 验收：迁移前只对当前目标 hash 对比；为两项补准确 map entries; 逐项插件源唯一可编辑、根 projection 由 marker 覆盖且哈希相符；validator 和定点 Jest 通过。
- 停止条件：源或目标 drift/unmarked conflict、共享 links 闭包未解析、plugin ID 冲突。

### T-003 DevOps 一项归属和迁移

- `source_plan_ids`: `P-02`; `source_spec_ids`: `EXT-F02`, `EXT-G01..EXT-G08`, `EXT-T01..EXT-T05`
- `owner_agent`: `embedded-lead`; `support_agents`: `toolchain-engineer`, `verification-engineer`
- `owner_skill`: `tools-git`; `supporting_skills`: `tools-verification`
- 范围 ID：`embedded-build-flash-debug`；复核现有 11 项 DevOps external entries 的职责/唯一路由。
- 文件：DevOps 插件 `skills/embedded-build-flash-debug/`, `scripts/sync-skills.js` mapping/validator/manifests, `skills/catalog.js`, DevOps marker-owned targets, tests。
- 验收：投影位置由插件同步表唯一确定；只运行 dry/static/host checks，不执行真实固件 build/flash；插件 validator 和相关 tests 通过。
- 停止条件：受保护同步器拒绝漂移、脚本入口需要破坏内容语义或触发真实构建/烧录。

### T-004 Observability 三项归属和迁移

- `source_plan_ids`: `P-03`; `source_spec_ids`: `EXT-F03`, `EXT-G01..EXT-G08`, `EXT-T01..EXT-T05`
- `owner_agent`: `embedded-lead`; `support_agents`: `system-architect`, `verification-engineer`
- `owner_skill`: `tools-git`; `supporting_skills`: `tools-verification`, `tools-observability`
- 范围 IDs：`can-debug`, `modbus-debug`, `visa-debug`；复核既有 7 项 external records。
- 文件：Observability `skills/`, `external-skills.json`, plugin manifests, `skills/catalog.js`, 本批所需 marker-aware projection/sync metadata, tests。
- 验收：三项进入 plugin source 并注册唯一 ID；root compatibility targets 由新增/既有 marker 安全管理，链接闭包有效；静态/主机测试通过，不操作实际 CAN/Modbus/VISA 仪器。
- 停止条件：现有 root 目录存在未标记用户内容或无法在不覆盖下建立 marker，保留目标并报告。

### T-005 Verification 两项归属和迁移

- `source_plan_ids`: `P-04`; `source_spec_ids`: `EXT-F04`, `EXT-G01..EXT-G08`, `EXT-T01..EXT-T05`
- `owner_agent`: `embedded-lead`; `support_agents`: `verification-engineer`
- `owner_skill`: `tools-git`; `supporting_skills`: `tools-verification`
- 范围 IDs：`embedded-bug-hunter`, `memory-analysis`；复核既有 `embedded-unit-test-generator`, `static-analysis`。
- 文件：Verification plugin `skills/`, sync ID table/validator/manifests, `skills/catalog.js`, `skills/tools/.verification-projections.json` 所拥有目标, tests。
- 验收：map/source/projection IDs 4 项准确；validator/test 通过；不伪称目标固件内存或硬件验证完成。
- 停止条件：现存 marker drift、root collisions 或迁移改变 API/行为。

### T-006 Workflow 四项归属和迁移

- `source_plan_ids`: `P-05`; `source_spec_ids`: `EXT-F05`, `EXT-G01..EXT-G08`, `EXT-T01..EXT-T05`
- `owner_agent`: `embedded-lead`; `support_agents`: `system-architect`, `verification-engineer`
- `owner_skill`: `tools-git`; `supporting_skills`: `tools-verification`
- 范围 IDs：`embedded-llm-guardrails`, `embedded-production-test-tool`, `market-mrd-analyst`, `skill-template`；复核既有 Workflow external 5 项。
- 文件：Workflow `skills/`, `skill-map.json`, manifests, sync/validator, `skills/.workflow-projections.json` targets, `skills/catalog.js`, tests。
- 验收：Workflow 9 项 external 归属唯一且 map 正确；投影/link closure/validator/定点测试通过。
- 停止条件：marker/hash drift、`embed-ai-tool` links 无法登记或需更改 Skill 语义。

### T-007 全量一致性、宿主与最终 Verify

- `source_plan_ids`: `P-06..P-07`; `source_spec_ids`: `EXT-T01..EXT-T08`
- `owner_agent`: `embedded-lead`; `support_agents`: `verification-engineer`, `toolchain-engineer`
- `owner_skill`: `tools-verification`; `supporting_skills`: `workflow-final-review`, `tools-quality`
- 验收：inventory 52 IDs 无遗漏/重复；46 unique plugin IDs 与 plugin packages/manifests/catalog一致；6 excluded 未进入任何 MCU plugin; 所有 5 plugin validators 与直接相关测试通过；links/projection hashes/aliases一致；`git diff --check` 通过；Codex/Cursor 实际发现证据分别记录，不能用静态证据替代。
- 失败处理：任何 spec 偏差回 Review Gate；owner/map mismatch 回 integration plan；不得在 Verify 阶段顺带修复逻辑。

## 5. 执行状态与全局边界

- 所有任务执行前先跑能证明当前登记或投影状态缺失的定点检查；记录预期失败和实测结果后再修改。
- 每次只执行一个任务；完成检查和 AI Review 后回写状态，再进入下一插件批次。
- `common/`, `claude/`, `opencode/`、6 项排除 Skill、固件工程和外部远端均不在写入范围。
- 来源/版本/许可证/依赖未知维持 unknown/unverified，不阻塞内容归属。
- 硬件、RTOS、ISR、DMA：不适用；不存在目标板验证。

## 6. 任务记录

| Task | 当前状态 | 命令/绝对 cwd | 结果 | 产物 |
|---|---|---|---|---|
| T-001 | ready | 未运行 | 待执行只读 hash/ownership baseline | `baseline.json` |
| T-002..T-007 | ready | 未运行 | 依赖前序 Task | 各插件报告及最终 Verify |

## 7. 下游交接

- Spec：`C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai\codex\plugin-split\spec.md`
- Plan：`C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai\codex\plugin-split\artifacts\external-skill-ownership\plan.md`
- Task：`C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai\codex\plugin-split\artifacts\external-skill-ownership\task.md`
- 执行模式：按 `T-001 → T-002 → ... → T-007` 串行；唯一主实现 Skill 由每任务分配字段确定。
