# MCU Workbench DevOps 插件拆分计划

> 本计划对应已批准的 `spec.md v0.7-devops-third-plugin`，采用用户选择的方案 A：插件持有 canonical Skill 源，根目录通过受保护的生成投影保持兼容。

## 1. 元数据与状态

| 字段 | 内容 |
|---|---|
| request_id | `REQ-PLUGIN-SPLIT-20261123` |
| 生成时间 | `2026-11-24T14:34:31+08:00` |
| 计划版本 | `v0.1-devops-plugin-owned-sources` |
| 计划状态 | `approved` |
| 项目路径 | `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai` |
| 分支/提交 | `host_ai @ 969398e6f5aea785da143ca4535d76ebf6b86188` |
| 输入 Spec | `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai\codex\plugin-split\spec.md` |
| Spec 版本/力度 | `v0.7-devops-third-plugin / full` |
| 风险叠加 | `versioned` |
| Review Gate | `approved`；v0.7 已获用户批准 |
| 选定方案 | `方案 A`；用户选择 |
| 方案选择理由 | 采用与 verification 插件一致的 canonical source + generated compatibility projection，插件有独立内容边界，旧聚合路径可再生成 |
| 用户审查状态 | `approved`（用户要求更新 Task，视为批准本 Plan） |
| 方案审查结论 | `通过` |

## 2. 一句话说明

- 要解决的问题：DevOps 能力目前以根目录聚合仓库为主，尚无独立插件包边界。
- 计划做什么：建立 `mcu-workbench-devops` 包，将五项 canonical Skills 和批准的 11 项外部 Skills 纳入插件；由插件源生成受保护的根目录兼容投影。
- 明确不做什么：不改变 Skills 业务语义，不执行真实构建、烧录、签名、发布或远端写操作，不迁移其他插件归属。
- 预期结果：插件可独立校验并由 Codex、Cursor 分别发现；根聚合入口和 aliases 继续有确定行为。

## 3. 输入依据与工程事实

| ID | 事实或约束 | 证据 | 可信等级 | 对计划的影响 |
|---|---|---|---|---|
| DVO-E01 | 工作区已有多项未提交修改 | `git status --short --branch` | confirmed | 每个阶段只改本计划拥有的文件 |
| DVO-E02 | 五项 canonical Skills 位于 `skills/tools/tools-{build,linker,flash,git,release}` | 当前目录树 | confirmed | 迁移其完整相对目录树及必要资源 |
| DVO-E03 | 11 项外部 Skill 已登记为 DevOps 目标归属 | ownership matrix / inventory | confirmed（登记） | 纳入范围；不提升 provenance 可信等级 |
| DVO-E04 | 外部来源、版本、许可证、依赖仍为 blocked/unknown | external-skill-inventory.yaml | confirmed（当前记录） | 同步迁移状态，不伪造来源审计 |
| DVO-E05 | Verification 插件已有 plugin-owned source 与 root projection 的样例 | `plugins/mcu-workbench-verification/scripts/sync-skills.js` | confirmed | 复用其概念和安全策略；实现需按 DevOps 清单独立核对 |
| DVO-E06 | Verification 插件提供 descriptor、package、Codex/Cursor manifest 和 validator 样例 | `plugins/mcu-workbench-verification/{descriptor.json,package.json,plugin.json,.codex-plugin/plugin.json,.cursor-plugin/plugin.json}` | confirmed | 沿用已存在的仓库契约形态 |
| DVO-E07 | catalog 已登记五项 canonical IDs 和 build/flash/linker/release aliases | `skills/catalog.js`、`skills/catalog-metadata.js` | confirmed | 保留旧解析行为；避免同 ID 双重注册 |
| DVO-E08 | 真正宿主加载不能由静态 manifest 验证证明 | Spec DVO-T06/DVO-T07 | confirmed | 分开记录静态、主机、Codex UI、Cursor UI 证据 |

## 4. 两个候选方案与用户选择记录

### 方案 A：插件持有 canonical 源，根目录生成兼容投影（已选）

- 适用场景：插件需要独立包含 Skill 内容，同时现有根目录使用方需要过渡兼容。
- 做什么：将 canonical Skill 源纳入插件目录；根目录投影通过插件脚本生成，记录文件哈希和来源标记；检测用户编辑后拒绝覆盖。
- 主要改动：插件包、projection marker/synchronizer、根 catalog/aliases、相关脚本和测试。
- 优点：插件目录包含完整可维护内容；与 verification 插件现有模式一致；兼容路径可重建。
- 缺点：需要迁移并审阅相对链接、脚本路径、能力引用；生成脚本需正确保护现有改动。
- 成本：中等；涉及大体量文档/脚本的完整目录迁移和校验。
- 风险：投影写入错误或未识别用户修改。通过哈希标记、暂存目录、冲突拒绝和回滚降低风险。
- 验收方式：插件级静态/主机校验；links/catalog/alias 检查；Codex 与 Cursor 独立发现。
- 回滚方式：由 marker 反向定位投影，先验证未修改，再恢复原源目录与聚合入口；有漂移则保留现场并人工审查。

### 方案 B：根目录持有 canonical 源，打包时生成插件副本（未选）

- 做什么：保持当前 Skill 路径为可编辑源，打包步骤复制到独立插件目录。
- 优点：原路径引用改动少；可降低首次迁移的链接改写量。
- 缺点：插件目录依赖打包生成才能完整；开发态与插件态存在生成副本；容易漏掉新资源或在发布前忘记同步。
- 成本：中等；需完整打包器与源/包一致性校验。
- 风险：提交或发布的插件副本陈旧；包独立校验未覆盖根源。
- 验收方式：除插件校验外，需证明从根源可重复构建完全一致的包副本。
- 回滚方式：移除包副本和构建输出，根目录源不变。

### 方案对比

| 维度 | 方案 A | 方案 B | 结论依据 |
|---|---|---|---|
| 易理解程度 | 插件即 canonical 所有者 | 根源与包副本间有生成关系 | A 与插件边界相符 |
| 改动范围 | 需迁移路径与修复链接 | 需新增打包流程 | 两者均中等；A 可复用已有投影模式 |
| 实现复杂度 | 迁移/回滚及漂移保护 | 打包、源包差异和发布校验 | A 有仓库内现成模式可参照 |
| 运行时资源 | 静态文件，无新增运行时服务 | 静态文件，无新增运行时服务 | 等同 |
| 架构风险 | 旧路径被生成为兼容视图 | 打包副本可能过期 | A 的风险可由 marker/hash 检测 |
| 可验证性 | 可从插件源重新生成并核对 | 需检查打包输入和产物 | A 便于直接校验独立目录 |
| 回滚难度 | 需恢复原路径，冲突时人工处理 | 删除生成插件副本即可 | B 简单；A 需严格保存现场 |
| 后续扩展性 | 新 DevOps Skill 由插件所有 | 每次发布均需生成包 | A 更直观 |

### 用户选择

```text
selected_option: A
decision_owner: user
decision_rationale: 用户选择方案 A（2026-11-24）；与已批准 Spec 的单一 canonical source、独立插件边界和根目录兼容要求一致。
rejected_option: B
new_constraints: none
```

## 5. 选定方案概览

- 选定方案：A。
- 选定原因：插件目录拥有 canonical 内容，根目录只保留受 marker 管理的兼容投影；模式与已存在的 verification 插件一致。
- 与 Spec 一致性：满足 DVO-F01..DVO-F08、DVO-G01..DVO-G10、DVO-A01..DVO-A08。
- 施工边界：DevOps 插件、五项 canonical、11 项已批准外部 Skills、共享 catalog/aliases、必要投影/校验脚本与测试。
- 非目标：修改其他插件内容；改写 DevOps Skill 语义；实际执行固件构建、烧录、签名、发布或远端 Git 操作。
- 主要风险：工作区有预存改动；外部 Skill provenance 不完整；宿主 UI 验收依赖 Codex/Cursor 当前可用状态。

## 6. 分层、调用链与接口边界

```text
Codex/Cursor host → DevOps plugin manifest → plugin Skill discovery
Legacy mcu-workbench entry → shared catalog/aliases → DevOps canonical Skill ID
DevOps plugin canonical sources → projection synchronizer → root compatibility paths
```

- 目标调用链：宿主只发现插件 manifest 和 Skills；旧聚合入口通过单一 catalog/resolver 映射到 canonical Skill ID。
- 各层职责：DevOps 插件拥有其工具 Skills 和包校验；共享 contracts 约束 descriptor；根 catalog/resolver 提供向后兼容；projection script 只生成内容兼容视图。
- 允许依赖：插件依赖共享 contracts 和 Node 内置模块；根聚合层可依赖插件 exports/descriptor。
- 禁止依赖：插件不得反向依赖根聚合实现；插件内容不得改动 workflow、architecture、verification、observability/hardware 业务语义。
- 兼容投影所有权：插件源为唯一可编辑内容；根目录投影需 marker 列出源 ID、目标路径、生成文件和 SHA-256。同步前检查 marker 匹配及投影哈希；任何投影漂移则拒绝覆盖。
- 相对链接：同步器只在 Markdown 文本链接中改写相对路径；避开代码围栏与行内代码；每个链接目标必须通过 boundary 校验或作为已登记外部依赖。
- 线程安全/资源：不引入常驻服务、后台线程、硬件接口或共享可变运行时状态；文件生成使用 staging + rollback，避免半成品替换。
- 生命周期：插件按静态 manifest 显式加载；不声明热卸载或动态依赖能力。

## 7. 文件施工顺序

| ID | 阶段 | 动作 | 文件或目录 | 所属层 | 施工内容与理由 | 责任 Skill | 前置条件 | 生成/覆盖边界 | 状态 |
|---|---|---|---|---|---|---|---|---|---|
| P-01 | 1 | 新增 | `plugins/mcu-workbench-devops/{descriptor.json,plugin.json,package.json,index.js}` | DevOps plugin | 建立独立包和共享 descriptor 契约 | `tools-build` | Plan 批准；确认 contracts API | 仅新目录 | ready |
| P-02 | 2 | 迁移 | `plugins/mcu-workbench-devops/skills/{tools-build,tools-linker,tools-flash,tools-git,tools-release}/` | DevOps skills | 将完整 canonical 树作为唯一源；维护路径清单 | `tools-git` | P-01 | 目标不存在时新建；保留来源快照 | ready |
| P-03 | 3 | 迁移/登记 | 11 项外部 Skills 的插件目录、ownership matrix、inventory | DevOps skills/audit | 迁移本地可用内容；逐项保留来源/版本/许可/依赖状态 | `tools-git` | P-02；源内容可访问 | 不覆盖源；不可用条目标注 blocked | ready-with-blocked-metadata |
| P-04 | 4 | 新增 | `plugins/mcu-workbench-devops/scripts/sync-skills.js`、marker | DevOps projection | 可重复生成根目录投影；加入哈希保护、链接改写、staging/rollback | `tools-build` | P-02、P-03 | 仅标记文件可更新；漂移即停止 | ready |
| P-05 | 5 | 修改 | `skills/catalog.js`、`catalog-metadata.js`、resolver、Agent route（需证据确认） | shared registry | 保留既有 canonical ID/aliases，确保唯一注册 | `tools-git` | P-04 | 不动未相关 catalog 项 | ready |
| P-06 | 6 | 新增 | Codex/Cursor manifests、validator、manifest tests、package scripts | host/package | 形成两宿主独立 manifest 与包级验收入口 | `tools-build` | P-01..P-05 | 新增 DevOps 专属路径 | ready |
| P-07 | 7 | 修改 | 根聚合入口、package scripts、相关测试 | compatibility | 根命令可薄转发；兼容测试覆盖 alias/失败/回滚 | `tools-git` | P-04..P-06 | 根 package 只增 DevOps 转发脚本 | ready |
| P-08 | 8 | 验证 | 插件 validator、链接/catalog/alias checks、Codex+Cursor host checks | verification | 对照 DVO-T01..T10 分级记录证据 | `tools-verification` | P-01..P-07 | 不执行真实 build/flash/release/write | ready |

## 8. 阶段计划与交接

| 阶段 | 目标 | 输入 | 输出 | 完成条件 | 交接对象 |
|---|---|---|---|---|---|
| 1 | 固定源目录与包契约 | Spec、当前 plugin skeleton/contracts | DevOps plugin skeleton | descriptor/manifest ID/version契约明确 | Task breakdown |
| 2 | 纳入 canonical 与外部 Skill 源 | skill roots、ownership/inventory | 插件 Skill trees、迁移状态 | 清单一致；外部状态真实保留 | Task breakdown |
| 3 | 建立兼容投影 | 插件 Skill trees、目标根路径 | sync script、marker、generated projections | 重复运行稳定；漂移保护与回滚验证 | Task breakdown |
| 4 | catalog 与聚合兼容 | catalog、resolver、root package | aliases/入口更新 | 旧 ID 可解析且不重复注册 | Task breakdown |
| 5 | 包校验与宿主适配 | manifests、plugin source | validator、tests、Codex/Cursor package surfaces | 静态/主机通过；宿主结果分别记录 | Task breakdown |
| 6 | 集成与最终 Verify | 前述产物、批准 Spec | verification report | 对照 DVO-A01..A08 完成逐项判定 | workflow-final-review |

## 8A. 下游执行 Agent 与 Skill 基线

| 阶段/ID | 主 Agent | 协作 Agent | 主实现 Skill | 辅助 Skill | 分配理由与证据 | 状态 |
|---|---|---|---|---|---|---|
| P-01/P-02/P-03 | embedded-lead | knowledge-engineer | `tools-git` | `tools-build` | 内容归属迁移、清单与旧入口兼容；由 ownership matrix 和 DevOps Skill 边界支持 | ready |
| P-04/P-06 | embedded-lead | toolchain-engineer | `tools-build` | `tools-verification` | 同步器/manifest/validator 属包构建和生成入口；按 verification 模式参照实现 | ready |
| P-05/P-07 | embedded-lead | system-architect | `tools-git` | `workflow-review-gate` | 共享注册和聚合入口变更；保证唯一 ID、兼容和依赖方向 | ready |
| P-08 | embedded-lead | verification-engineer, toolchain-engineer | `tools-verification` | `tools-quality` | 运行静态/主机/宿主验收并分级记录 | ready |

## 9. 资源、并发与生命周期约束

- RTOS、任务、栈、队列、ISR、DMA：不适用；本计划只改仓库插件文档、manifest、脚本与测试。
- 硬件生命周期：不连接或控制目标硬件；不运行实际烧录。
- 文件生成：同步器使用临时 staging 和备份目录；完成或失败后清理由本任务创建的临时目录；仅在 marker 所有权校验通过时替换投影。
- 错误恢复：复制/rename 任一步失败时回滚已替换项；若用户修改过投影，停止并报告冲突，不覆盖。
- 并发：所有写入按 Task 顺序串行，不让两个任务并行修改同一 catalog、projection marker 或包目录。

## 10. 代码生成约束

| ID | 约束类别 | 必须遵守 | 禁止事项 | 证据 | 状态 |
|---|---|---|---|---|---|
| G-01 | source ownership | 插件 Skill 为 canonical；根内容为生成投影 | 两份可编辑源 | DVO-G01 | ready |
| G-02 | generation | marker+hash 校验；Markdown 链接安全改写；staging/rollback | 覆盖漂移投影或代码围栏中的链接文本 | DVO-G01/DVO-G06 | ready |
| G-03 | package contract | descriptor/plugin/package/Codex/Cursor IDs 与 versions 一致 | 将静态文件存在称作宿主通过 | DVO-G02/DVO-G07 | ready |
| G-04 | scope | 保留 DevOps canonical 行为及其他插件边界 | 顺带改写内容语义 | DVO-G03 | ready |
| G-05 | provenance | 11 项 external metadata 按证据保留 | 猜许可证、版本、依赖 | DVO-G04 | ready-with-limitation |
| G-06 | external side effects | mock/dry-run only | 真实烧录、发布、签名、远端写入 | DVO-G05 | ready |
| G-07 | compatibility | 聚合入口和 aliases 有确定路径且可回滚 | 静默删除旧路径 | DVO-G06 | ready |
| G-08 | SOLID | Task 拆解和实现逐项提供 SRP/OCP/LSP/ISP/DIP 证据 | 无证据泛称 SOLID 已满足 | DVO-G09 | ready |

## 11. 验收与验证计划

| ID | 证据等级 | 验收项 | 命令/条件 | 预期结果 | 责任 Skill | 产物 | 状态 |
|---|---|---|---|---|---|---|---|
| V-01 | 静态 | descriptor/manifests | `node plugins/mcu-workbench-devops/scripts/validate-manifests.js` | 所有 manifest ID/version/skill root 一致 | `tools-verification` | validation log | not-run |
| V-02 | 主机 | 插件独立校验 | `npm --prefix plugins/mcu-workbench-devops run validate` | 目录、Skill ID、contracts 合法 | `tools-verification` | validation log | not-run |
| V-03 | 主机 | Skill projection 干净同步与链接 | `npm --prefix plugins/mcu-workbench-devops run skills -- --check`（绝对 cwd：仓库根目录） | marker/hash 一致、无未登记断链 | `tools-verification` | projection report | not-run |
| V-04 | 主机 | catalog/aliases/root regression | `npm test -- --runInBand`（仓库根目录）及 DevOps 专项 tests | 既有和新增相关测试通过；无 ID 重复/旧 alias 失效 | `tools-verification` | Jest report | not-run |
| V-05 | 静态 | 插件边界 links | `node scripts/validate-skill-links.js --root plugins/mcu-workbench-devops/skills --boundary-root .` | plugin-contained links resolve; external refs tracked | `tools-verification` | link report | not-run |
| V-06 | 宿主 | Codex discovery | 在 Codex 插件管理/Skills UI 刷新后检查 | 独立插件和五项 canonical Skills 可发现；保存截图/记录 | `tools-verification` | host evidence | not-run |
| V-07 | 宿主 | Cursor discovery | 在 Cursor plugin/Skill UI 执行等价刷新检查 | 独立插件和五项 canonical Skills 可发现；保存记录 | `tools-verification` | host evidence | not-run |
| V-08 | 主机/审计 | rollback + provenance | 负例修改 projection 后运行 sync check；审阅 inventory | 修改过的投影被拒绝覆盖；11 项 metadata 未知字段保持显式 | `tools-verification` | rollback/provenance report | not-run |
| V-09 | 证据边界 | real build/flash/release | 不运行生产命令；只核对执行记录 | 报告明确无目标构建、烧录、签名或生产发布证据 | `tools-verification` | final evidence matrix | not-run |

## 12. 方案审查记录

| 审查项 | 责任 Agent | 结论 | 证据 | 后续动作 |
|---|---|---|---|---|
| 分层和接口 | system-architect | 可采用 | DevOps 插件只声明工具 Skill，不涉及 App/Service/Platform/Impl/Vendor 代码 | 实施时维持边界 |
| 文件和数据流 | firmware-engineer | 可采用 | plugin source -> projection -> legacy resolver，所有权链明确 | Task 中验证 marker/hash |
| 验收和回归 | verification-engineer | 可采用 | DVO-T01..T10 覆盖静态/主机/宿主/回滚/审计 | 分级生成证据记录 |
| 硬件边界 | hardware-integration | 不适用 | 不涉及板卡、引脚、电源或目标运行 | 不安排硬件操作 |
| 工具链和产物 | toolchain-engineer | 可采用 | 有既有 plugin package/validator 模式；具体两宿主加载仍需实测 | 宿主验收失败则报告 blocked |

### 审查结论

- 可采用项：方案 A；插件拥有源；根目录生成投影；宿主分开验收。
- 已完成修订：未新增超出 Spec 的目标；添加显式外部状态与漂移保护方案。
- 未关闭阻塞：11 项 provenance 字段未知；不阻塞插件目录边界，但对应审计结论不得通过。
- 是否改变 Spec：否。
- 最终结论：Plan 内容可采用；用户于 2026-11-24 要求更新 Task，据此记录 H-03 批准并进入任务拆解。

## 13. 回滚与失败处理

- 开始投影前保存 marker 和目标目录基线 hash；所有既有用户文件保留。
- 若目标投影路径已存在但没有符合 DevOps source marker，停止同步并列出冲突文件；不得覆盖或删除。
- 同步器按目录 staged install，失败后还原刚才备份的投影；清理仅限本次创建且验证路径在 plugin projection 根下的临时目录。
- 若迁移后链接无法在插件边界内解析，保留源内容并回传 Task；不删引用、不伪造内容。
- 若真实 Codex 或 Cursor 加载不可用，记录为宿主证据未验证，不得用另一宿主通过替代。

## 14. 下游交接

- 正式需求输入：`C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai\codex\plugin-split\spec.md`（v0.7，已批准）。
- 正式实施计划：本文件（DevOps v0.1；待 H-03 批准）。
- 目标文件范围：DVO-F01..DVO-F08。
- 执行前确认：插件 API 以 `packages/contracts` 实际校验函数为准；所有源和 projection 目标先检查存在性及 marker。
- 禁止扩大：DVO Spec 的非目标与 DVO-G05 外部状态约束。
- 未验证项：Codex/Cursor 真实发现；11 项外部 Skill provenance。
- 回传规则：任何范围、接口、资源边界或验收变化回 Review Gate；不改变 Spec 的文件级事实缺口回本 Plan 审查。

## 15. 当前状态与下一步

- 当前状态：`approved`
- 当前唯一动作：将 DevOps v0.1 Plan 拆解为 task.md。
- 阻塞项：none
