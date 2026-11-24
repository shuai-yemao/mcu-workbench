# MCU Workbench Workflow 插件拆分任务清单

> 本文件由 `workflow-task-breakdown` 根据已批准 Spec v0.9 与 Plan v0.1 生成。只定义可执行任务，不扩大范围。上游计划已获用户 2026-11-24“同意执行”批准。

## 1. 元数据

| 字段 | 内容 |
|---|---|
| request_id | `REQ-PLUGIN-SPLIT-20261123` |
| 任务清单版本 | `v0.1-workflow-fifth-plugin` |
| 状态 | `完成` |
| 项目路径与提交 | `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai @ host_ai/43eb4e731568b606451083b0e479a29a5722fb98`（生成时 HEAD；工作树含预存改动） |
| 输入 spec.md | `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai\codex\plugin-split\spec.md` |
| 输入 plan.md | `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai\codex\plugin-split\plan.md`（approved） |
| Spec 力度 | `full` |
| 风险叠加门禁 | `versioned` |
| 生成时间 | `2026-11-24` |
| 阶段级 Agent/Skill 基线 | Plan §7：`embedded-lead` 协调；P-01 tools-git；P-02/P-04 tools-build；P-03/P-05 tools-git；P-06/P-07 tools-verification；各阶段协作见 Plan |
| 下游执行 Skill | `workflow-task-execution` |

可信等级：`confirmed`、`user-confirmed`、`inferred`、`unverified`。本 Task 中关键的 Skill 清单、唯一源模式、排除边界和 Plan 批准均为 confirmed/user-confirmed；跨插件闭包细节按 T-001 实测。在解决前标为阻塞，不得猜测。

## 2. 总体任务图

```text
T-001 → T-002 → T-003 → T-004 → T-005 → T-006 → T-007 → T-008 → T-009
```

- 总体目标：建立独立的 `mcu-workbench-workflow` 插件，以插件目录为 14 项 Skill 的唯一源，安全生成兼容投影并分别验证 Codex/Cursor。
- 非目标：8 项改归其他插件 Skill 的实体迁移、4 项 unknown、旧 ID `workflow` 的聚合 Skill/usage/runner、Agents、根 Rules、Claude/OpenCode、固件构建/烧录/硬件操作。
- 关键串行链：`T-001 → T-002 → T-003 → T-004 → T-005 → T-006 → T-007 → T-008 → T-009`。
- 可并行组：无。每项任务共享插件目录、Skill registry 或投影边界；串行避免并发写入同一所有权资源。T-007 与 T-008 技术上可分别观察，但记录基线顺序执行以保持环境快照可追溯。

## 3. 任务索引

| 顺序 | task_id | 任务名称 | 前置任务 | 并行组 | 主 Agent | 主实现 Skill | 辅助 Skill | 验证等级 | 状态 |
|---:|---|---|---|---|---|---|---|---|---|
| 1 | T-001 | 冻结 Skill 源、投影与链接闭包基线 | none | none | `embedded-lead` | `tools-git` | `workflow-review-gate` | static | pass |
| 2 | T-002 | 建立 Workflow 插件包骨架与 validator | T-001 | none | `embedded-lead` | `tools-build` | `tools-verification` | static/host | pass |
| 3 | T-003 | 迁移 9 canonical 与 5 external Skill 源 | T-002 | none | `embedded-lead` | `tools-git` | `workflow-review-gate` | static | pass |
| 4 | T-004 | 实现链接闭包与受保护根投影 | T-003 | none | `embedded-lead` | `tools-build` | `tools-verification` | static/host | pass |
| 5 | T-005 | 接入 catalog、aliases 与聚合兼容 | T-004 | none | `embedded-lead` | `tools-git` | `workflow-review-gate` | host | pass |
| 6 | T-006 | 完成包校验与同步失败路径测试 | T-005 | none | `embedded-lead` | `tools-verification` | `tools-quality` | host | pass |
| 7 | T-007 | 验证 Codex 独立发现与代表性调用 | T-006 | none | `embedded-lead` | `tools-verification` | `tools-quality` | host | pass (`user-confirmed`) |
| 8 | T-008 | 验证 Cursor 独立发现与代表性调用 | T-007 | none | `embedded-lead` | `tools-verification` | `tools-quality` | host | pass (`user-confirmed`) |
| 9 | T-009 | 统一 Verify 与 Final Review | T-001..T-008 | none | `embedded-lead` | `tools-verification` | `workflow-final-review`、`tools-quality` | static/host | complete |

## 4. 任务详情

### T-001：冻结 Skill 源、投影与链接闭包基线

| 字段 | 内容 |
|---|---|
| order / parallel_group | `1` / `none` |
| source_plan_ids | `P-01` |
| source_spec_ids | `WF-E01..WF-E10`、`WF-A02`、`WF-A03`、`WF-A09` |
| owner_agent / support_agents | `embedded-lead` / `knowledge-engineer` |
| owner_skill / supporting_skills | `tools-git` / `workflow-review-gate` |
| allocation_evidence | Plan §6 P-01 与 §7；基线冻结和路径所有权以 Git/文件证据为主 |
| confidence / status | `confirmed` / `pass` |

#### 目标

生成可复现的逐文件映射、hash、投影冲突表及完整链接闭包 ledger，供后续写入前判断目标路径安全性。

#### 范围

- 包含：只读扫描 Plan 中 14 个当前源目录、排除项边界、manifest/catalog/aliases、existing projection markers、每棵树文件清单/哈希、递归相对链接与目标 owner/hash。
- 不包含：迁移、修改 catalog、同步器、修 Skill 链接。
- 文件范围：输出至 `codex/plugin-split/artifacts/workflow/baseline/`；如目标已有内容，先比较并保留，不覆盖未知文件。
- 所属层：插件迁移审计。

#### 前置条件与依赖

- 前置任务：无。
- 外部前提：仓库可读；工作区基线和绝对根路径已确认。
- 依赖证据：Plan §3 WF-E01..E10；Spec §当前 Workflow 补充。

#### 执行步骤

1. 重读 `git status --short --branch`、14 个源根和旧根目标路径，记录扫描时间、分支、HEAD 与预存 dirty 路径。
2. 生成 14 个源树完整路径及 SHA-256 清单，并逐项核对 `SKILL.md` 存在；确认三个旧 `workflow` 排除文件未混入。
3. 递归解析 Markdown 相对链接，分类为同 Skill、Workflow 内其他 Skill、其他 owner、外部绝对路径或缺失；登记 owner/版本/hash 证据。
4. 特别逐项登记 5 个 `embed-ai-tool` 缺失链接；不把 unknown `skill-template` 内容带入。若解决方式将改变 Spec/Plan，停止并回传。
5. 对照当前 markers、目标路径内容与 catalog 解析规则，输出冲突/adoption 表和只读审计报告。

#### 输出物

- 文件：`artifacts/workflow/baseline/skill-files.json`、`link-closure.json`、`projection-conflicts.json`、`baseline-report.md`。
- 中间产物：14 项源/旧路径一对一映射及逐文件哈希。

#### 约束边界

- 接口和依赖：只读仓库；不得依赖外部网络下载补齐来源。
- 资源与生命周期：无固件运行资源。
- 并发、ISR、DMA：不适用。
- 内存和生成边界：审计产物仅写 Workflow artifact 目录；不修改源 Skill。

#### 验证

| 字段 | 内容 |
|---|---|
| 证据等级 | `static` |
| 命令或条件 | cwd `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai`；执行清单生成/链接扫描入口并记录实际命令、Node 版本、退出码 |
| 预期结果 | 14 项源各有完整清单；所有本地引用分类；缺失项与冲突明确，无未登记异常 |
| 产物位置 | `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai\codex\plugin-split\artifacts\workflow\baseline\` |
| 当前状态 | `pass` |

#### 失败处理与回滚

- 失败现象：源目录变化、目标冲突、无法分类链接或外部闭包归属不明。
- 定位顺序：检查当前文件和 catalog，再核验 owner/inventory，最后对照 Plan/Spec。
- 重试/降级：仅重跑只读扫描；不得跳过缺项。
- 回滚：无源文件变更；移除本任务仅生成且确认无用户数据的审计临时文件。
- 回传条件：范围/owner/验收发生变化回 workflow-review-gate；Plan 路径策略不足回 workflow-integration-plan。

### T-002：建立 Workflow 插件包骨架与 validator

| 字段 | 内容 |
|---|---|
| order / parallel_group | `2` / `none` |
| source_plan_ids | `P-02` |
| source_spec_ids | `WF-A01`、`WF-A02` |
| owner_agent / support_agents | `embedded-lead` / `toolchain-engineer`、`verification-engineer` |
| owner_skill / supporting_skills | `tools-build` / `tools-verification` |
| allocation_evidence | Plan §6 P-02、§7；复用已存在插件包契约 |
| confidence / status | `confirmed` / `pass` |

#### 目标

创建仅包含合法包元数据、宿主 manifests、固定 Skill map 和可独立运行 validator 的 Workflow 插件骨架。

#### 范围

- 包含：`plugins/mcu-workbench-workflow/` 的 package/descriptor/plugin manifests、Codex/Cursor manifests、Skill map、validator 与最小负例测试。
- 不包含：Skill 内容迁移、catalog 注册、根投影。
- 文件范围：只写上述新插件目录及明确关联的 Workflow 定点测试；若既有目录出现，先审查并回传，不覆盖。
- 所属层：独立插件包与校验入口。

#### 前置条件与依赖

- 前置任务：T-001；基线输出无未决的包目录冲突。
- 外部前提：复核 `packages/contracts/schemas/plugin-descriptor.schema.json` 和 Architecture/DevOps 包字段。
- 依赖证据：`plugins/mcu-workbench-architecture/`、`plugins/mcu-workbench-devops/`。

#### 执行步骤

1. 按当前共享 schema 和成熟插件格式设计最小文件，不复制无关 Agent/Rule。
2. 声明 14 个准确 ID，暂缺 Skill 目录时 validator 可提供明确“源未迁移”状态；不把骨架校验误报为完整插件通过。
3. validator 检查 descriptor/package/manifest ID/version 一致性、每项 `SKILL.md`、无额外注册项。
4. 为坏 descriptor、重复 ID、缺失 Skill 和失效入口添加最小负例。

#### 输出物

- 文件：`plugins/mcu-workbench-workflow/{package.json,descriptor.json,plugin.json,.codex-plugin/,.cursor-plugin/,skill-map.json,scripts/validate.js}` 与定点测试。
- 中间产物：包校验 JSON/控制台报告。

#### 约束边界

- 不新增共享 contract schema，不反向依赖根聚合实现。
- 无固件资源/ISR/DMA/内存池。
- 仅 validator/test skeleton 为本任务生成物。

#### 验证

| 字段 | 内容 |
|---|---|
| 证据等级 | `static/host` |
| 命令或条件 | cwd 为仓库根；运行 `node plugins/mcu-workbench-workflow/scripts/validate.js` 与对应 Jest 定点文件（以实际新增文件名为准） |
| 预期结果 | schema/manifest 结构正确；正常 skeleton 在迁移前如预期标 incomplete；负例均明确失败 |
| 产物位置 | 插件目录和 Jest 报告；记录绝对路径、版本和退出码 |
| 当前状态 | `pass` |

#### 失败处理与回滚

- 失败现象：共享 schema 与参考插件不一致或 Codex/Cursor 字段语义未确认。
- 定位顺序：查看 schema、合同包和独立 manifest validator。
- 重试/降级：不得假设未定义字段；将未支持能力标未验证。
- 回滚：仅移除本 Task 新增且确认由本 Task 创建的文件。
- 回传条件：需要修改共享 schema 或 Spec 宿主边界时停止上报。

### T-003：迁移 9 canonical 与 5 external Skill 源

| 字段 | 内容 |
|---|---|
| order / parallel_group | `3` / `none` |
| source_plan_ids | `P-03` |
| source_spec_ids | `WF-A02`、`WF-A09` |
| owner_agent / support_agents | `embedded-lead` / `knowledge-engineer`、`system-architect` |
| owner_skill / supporting_skills | `tools-git` / `workflow-review-gate` |
| allocation_evidence | Plan §6 P-03、§7；文件迁移及 ownership/语义保护 |
| confidence / status | `user-confirmed` / `pass` |

#### 目标

把 T-001 锁定的 14 个完整 Skill 树放入插件源目录并验证逐文件内容一致，确保插件源成为唯一编辑源。

#### 范围

- 包含：9 个 `skills/workflow/<id>/` canonical 源与 5 个 `skills/<id>/` external 源的完整文件树。
- 不包含：根投影删除/覆盖、链接改写、其他插件源、外部 provenance 补造。
- 文件范围：`plugins/mcu-workbench-workflow/skills/<14 IDs>/`；迁移策略仅按获批 Plan 和 repo 模式选择。
- 所属层：插件 Skill 内容。

#### 前置条件与依赖

- 前置任务：T-002；T-001 所有源/目标哈希已锁定；源与目标无未解决碰撞。
- 外部前提：外部来源原样登记为 blocked/unverified。
- 依赖证据：T-001 `skill-files.json` 和冲突表。

#### 执行步骤

1. 逐项按审计清单复制/迁入插件树，保留嵌套资源与文件字节；排除 3 个旧 `workflow` 文件。
2. 不改 Skill 正文或外部来源元数据；如发现复制后链接需重写，留给 T-004。
3. 逐文件比较源快照与插件目录 SHA-256，并核对每项 `SKILL.md` 与 14 项无多无少。
4. 记录原根路径随后作为投影处理，不在本 Task 删除来源。

#### 输出物

- 文件：插件内 14 个 Skills 的完整树；更新 Workflow 专属迁移清单/来源状态。
- 中间产物：逐文件迁移 hash diff。

#### 约束边界

- 禁止带入 Agents、Rules、旧聚合 `workflow` Skill。
- 不改变脚本算法、示例、引用语义和 provenance。
- 无运行时资源、ISR、DMA。
- 根源到插件唯一源的交接只在迁移核验后生效，保护既有 dirty 文件。

#### 验证

| 字段 | 内容 |
|---|---|
| 证据等级 | `static` |
| 命令或条件 | cwd 仓库根；按 T-001 manifest 比较每个相对文件 SHA-256，运行插件 Skill 数量/完整性 validator |
| 预期结果 | 恰好 14 项、目录树和文件哈希对应；业务文件无未批准差异 |
| 产物位置 | `plugins/mcu-workbench-workflow/skills/` 及迁移审计报告 |
| 当前状态 | `pass` |

#### 失败处理与回滚

- 失败现象：源漂移、目标冲突、漏文件、哈希差异或迁移过程中断。
- 定位顺序：对比 T-001 基线、当前源和目标；查明 dirty/owner 状态。
- 重试/降级：仅恢复缺失的新目标文件；不覆盖已变化的源或目标。
- 回滚：只移除 marker 尚未接管且确认由本 Task 新建的插件文件；保留源树和用户改动。
- 回传条件：源字节不一致需用户决策或扩大范围时回传上游。

### T-004：实现链接闭包与受保护根投影

| 字段 | 内容 |
|---|---|
| order / parallel_group | `4` / `none` |
| source_plan_ids | `P-04` |
| source_spec_ids | `WF-A03`、`WF-A04`、`WF-A06` |
| owner_agent / support_agents | `embedded-lead` / `toolchain-engineer`、`verification-engineer` |
| owner_skill / supporting_skills | `tools-build` / `tools-verification` |
| allocation_evidence | Plan §5、§6 P-04、回滚序列和 §7；投影风险及文件事务处理 |
| confidence / status | `confirmed` / `pass` |

#### 目标

提供幂等 Workflow 投影同步器和链接闭包 ledger，使源到根路径映射安全、漂移可检测、失败只回滚 Workflow 拥有路径。

#### 范围

- 包含：Workflow syncer/marker、source map、链接重写或显式依赖登记、必要只读 shared snapshot、测试 fixture。
- 不包含：注册 catalog、编辑 other-owner 内容、导入未知 `skill-template`、全局替换链接检查规则。
- 文件范围：插件 `scripts/`、`references/shared/`/来源 ledger、Workflow marker（按 Architecture/DevOps 现存目录位置实现）；旧路径仅 marker 所有路径。
- 所属层：插件打包/根兼容投影。

#### 前置条件与依赖

- 前置任务：T-003；T-001 完整递归闭包分类完毕；五条缺失引用有可审计声明方案，若需改 Spec 则本任务阻塞。
- 外部前提：绝对路径安全校验在当前平台（Windows）可复现。
- 依赖证据：成熟同步器和 `lib/skill-links.js`；Plan §5。

#### 执行步骤

1. 实现路径映射、相对链接转换和 Workflow 自有 marker/hash；处理 Skill 名称与旧根路径不对称映射。
2. 同步前检查来源、marker schema、目标所有权、哈希和路径逃逸；默认拒绝 unmarked/conflicting/drifted targets。
3. 对确可安全采用的旧目标执行显式 adopt 并记录原始哈希；不碰 `skills/workflow/SKILL.md`、usage 或 runner。
4. 通过 staging、backup、逐目标写入、写后核验和按 Workflow marker 回滚实现失败一致性。
5. 针对其他 owner 链接采用 ledger 中批准的快照/映射；owner 文件只读，快照登记 owner/hash，不注册成 Skill。
6. 对 5 个缺失 `embed-ai-tool` 链接保留来源内容及显式未解析/外部记录；如果 validator 无法以透明方式表示，停止并回传，不伪报链接完整。

#### 输出物

- 文件：Workflow `scripts/sync-skills.js`、专属 marker/map、引用闭包 ledger/shared snapshots、同步器测试。
- 中间产物：同步预检和投影变更报告。

#### 约束边界

- 单一源是插件目录；根路径为生成投影。只管理本插件 marker 明确列出的路径。
- 同步单进程离线；无需固件线程/ISR/DMA；使用临时文件时清理范围限本次操作。
- 不以递归删除重建 `skills/workflow/`；不写入其他插件 marker 或 owner 内容。

#### 验证

| 字段 | 内容 |
|---|---|
| 证据等级 | `static/host` |
| 命令或条件 | cwd 仓库根；运行 Workflow syncer 的 dry-run/同步和定点 Jest；对 source/dest/marker 哈希记录前后值 |
| 预期结果 | 连续运行幂等；漂移、未知 marker、无标记冲突、路径逃逸拒绝；注入写失败后只恢复 Workflow 拥有文件 |
| 产物位置 | 插件同步日志、测试报告和 marker hash |
| 当前状态 | `pass` |

#### 失败处理与回滚

- 失败现象：链接解析遗漏、adoption 错误、部分写入、marker/hash 不一致。
- 定位顺序：先只读检查 marker/backup，再比较源/目标/共享 owner hash，然后复现测试 fixture。
- 重试/降级：只在源和目标仍符合本次快照时重跑；用户文件/漂移目标不降级覆盖。
- 回滚：严格按 Plan §6 回滚序列，只恢复本 Workflow marker 声明所有且 hash 符合的投影。
- 回传条件：需改变外部依赖语义、包外链接政策或 Spec 验收时回 Review Gate。

### T-005：接入 catalog、aliases 与聚合兼容

| 字段 | 内容 |
|---|---|
| order / parallel_group | `5` / `none` |
| source_plan_ids | `P-05` |
| source_spec_ids | `WF-A05`、`WF-A09` |
| owner_agent / support_agents | `embedded-lead` / `knowledge-engineer`、`system-architect` |
| owner_skill / supporting_skills | `tools-git` / `workflow-review-gate` |
| allocation_evidence | Plan §6 P-05、§7；catalog/alias 属共享入口且须单一登记 |
| confidence / status | `confirmed` / `pass` |

#### 目标

将恰好 14 个批准 ID 注册到 Workflow 插件，同时保留旧 alias/聚合行为且旧 `workflow` Skill 仍在原所有者。

#### 范围

- 包含：`skills/catalog.js`、`skills/catalog-metadata.js` 或实际 canonical registry 来源、必要 Agent/Skill resolver 聚合引用及相关测试。
- 不包含：其他插件 owner 内容迁移；排除 ID 注册；Agent/Rule 迁移。
- 文件范围：仅 T-001 实际确认的共享 catalog/alias 源和相关定点测试。
- 所属层：共享 registry/兼容入口。

#### 前置条件与依赖

- 前置任务：T-004 的安全投影校验通过。
- 外部前提：当前 catalog/alias 文件未出现未审查改动；若 dirty，逐块保留并核验。
- 依赖证据：`skills/catalog.js`、`skills/catalog-metadata.js`、T-001 registry report。

#### 执行步骤

1. 注册 14 个 ID 到 Workflow Plugin ID，确保 `pluginSkills()` 推导路径与插件源一致。
2. 保留 `workflow-requirements-router` → `workflow-router` alias 原语义及其他既有兼容映射。
3. 检查 resolver/aggregate 能解析旧 ID；`workflow` build/flash/monitor 仍使用旧路径且未列入 pluginSkills。
4. 增加唯一性与兼容回归测试；不重排/重写非本任务 catalog 内容。

#### 输出物

- 文件：catalog/metadata/必要 resolver 与定点测试。
- 中间产物：ID/alias 前后解析矩阵。

#### 约束边界

- 接口依赖方向：插件 source 可被 catalog 指向；插件不得依赖根聚合 resolver。
- 不改其他 Plugin ID/aliases；无运行时资源约束。

#### 验证

| 字段 | 内容 |
|---|---|
| 证据等级 | `host` |
| 命令或条件 | cwd 仓库根；运行 catalog 与 Cursor/Codex registry 定点测试，并调用 `pluginSkills('mcu-workbench-workflow')` 核对 ID/path |
| 预期结果 | 精确 14 项；旧 alias 可解析；ID `workflow` 不属于 Workflow；无重复/孤儿注册 |
| 产物位置 | Jest/验证报告及解析矩阵 |
| 当前状态 | `pass` |

#### 失败处理与回滚

- 失败现象：重复 Skill、alias 指向改变、旧 resolver 断裂。
- 定位顺序：比对 catalog metadata、alias map、aggregate resolver 测试。
- 重试/降级：不得删除旧 alias 规避冲突。
- 回滚：按本任务 diff 恢复 Workflow registry entry，保留其它 staged/dirty 行。
- 回传条件：兼容目标在现有 resolver 中无法实现或要求改变旧 ID 语义时回 Spec/Plan。

### T-006：完成包校验与同步失败路径测试

| 字段 | 内容 |
|---|---|
| order / parallel_group | `6` / `none` |
| source_plan_ids | `P-06` |
| source_spec_ids | `WF-A01..WF-A06`、`WF-A09`、`WF-A10` |
| owner_agent / support_agents | `embedded-lead` / `verification-engineer`、`toolchain-engineer` |
| owner_skill / supporting_skills | `tools-verification` / `tools-quality` |
| allocation_evidence | Plan §6 P-06、§7；任务级契约与失败路径验证 |
| confidence / status | `confirmed` / `pass` |

#### 目标

通过 Workflow 插件 validator 和自动化测试验证包清单、链接、投影、兼容 alias、失败恢复及 provenance 边界。

#### 范围

- 包含：插件自校验、link checker 适配、同步器坏输入/失败注入、目录/hash 基线与 catalog 回归测试。
- 不包含：真实宿主 UI 验收（分 T-007/T-008）；任何固件构建或硬件验证。
- 文件范围：插件/根 `tests/` 中与 Workflow 直接相关的测试和必要 npm script。
- 所属层：主机验证。

#### 前置条件与依赖

- 前置任务：T-005。
- 外部前提：已确认项目现有 Jest 入口（根 `package.json` 提供 `npm test -- --runInBand`；执行时限定定点测试优先）。
- 依赖证据：根 package.json、T-001/T-004 reports、现有 Architecture/DevOps validators。

#### 执行步骤

1. 编写正例和负例：manifest、Skill 数量、缺文件、重复 ID、失效内部链接、未登记外部链接。
2. 覆盖 marker unknown/malformed、unmarked conflict、drift、repeat sync、path traversal、部分写入中断和限定 rollback。
3. 核对 5 external provenance 和 8/4 排除项在清单中如实呈现。
4. 运行插件 validator 与 Workflow 定点测试；记录命令、版本、绝对 cwd、退出码、报告路径和重试次数。
5. 如现有代码基线有失败，记录基线与新增差异，不扩大测试范围掩盖失败。

#### 输出物

- 文件：Workflow validator/link/projection/catalog tests、必要 npm script。
- 中间产物：定点测试日志、覆盖矩阵及 hash 记录。

#### 约束边界

- 测试使用隔离 temp fixture，不改真实根投影以模拟破坏情形。
- 无固件运行资源；测试临时目录按测试自身边界清理。

#### 验证

| 字段 | 内容 |
|---|---|
| 证据等级 | `host` |
| 命令或条件 | cwd 仓库根；`node plugins/mcu-workbench-workflow/scripts/validate.js`；`npm test -- --runInBand --runTestsByPath <Workflow test paths>`（具体路径以新增文件为准） |
| 预期结果 | 正例通过、每个负例按预期拒绝；无新增非 Workflow 失败；diff check 通过 |
| 产物位置 | Workflow Jest 报告、插件 validator 输出、审计 artifacts |
| 当前状态 | `pass` |

#### 失败处理与回滚

- 失败现象：测试不能重现真实同步行为或既有套件出现新增失败。
- 定位顺序：区分 fixture/validator/同步器/既有基线，核对日志和 hash。
- 重试/降级：普通缺陷由执行流程诊断修复复测；不能静默跳过失败路径。
- 回滚：只回退当前 Workflow 测试/脚本改动。
- 回传条件：测试要求改变验收标准或省略外部链接失败需回 Review Gate。

### T-007：验证 Codex 独立发现与代表性调用

| 字段 | 内容 |
|---|---|
| order / parallel_group | `7` / `none` |
| source_plan_ids | `P-06` |
| source_spec_ids | `WF-A01`、`WF-A07` |
| owner_agent / support_agents | `embedded-lead` / `verification-engineer`、`toolchain-engineer` |
| owner_skill / supporting_skills | `tools-verification` / `tools-quality` |
| allocation_evidence | Plan §7 P-06/P-07 与 Spec Codex + Cursor 独立宿主要求 |
| confidence / status | `user-confirmed` / `pass (usability); exact call unrecorded` |

#### 目标

取得真实 Codex 环境独立发现 Workflow 插件、加载 Skill roots 并完成代表性 Workflow Skill 调用的证据。

#### 范围

- 包含：Codex 本地插件目录/manifest 发现、加载和一项代表性 workflow skill request 的观察记录。
- 不包含：Cursor 结论、用户级未获批准安装/改变外部配置；不能观察时不得以静态结果替代。
- 文件范围：`codex/plugin-split/artifacts/workflow/hosts/codex.md`；必要临时配置限项目/临时目录并经当前已授权本地开发入口处理。
- 所属层：Codex 宿主验证。

#### 前置条件与依赖

- 前置任务：T-006 全部静态/主机校验通过。
- 外部前提：当前 Codex 宿主具备可观察的本地插件测试方式；若触及用户级安装/配置，先确认仓库既有授权流程，不擅自扩大。
- 依赖证据：Codex manifest 与实际宿主 UI/session 观察。

#### 执行步骤

1. 用项目既有 Codex 插件发现流程加载本地插件，不做远端注册或发布。
2. 记录插件显示/发现状态、Skill 清单和代表性 Skill 请求结果。
3. 区分 manifest 静态校验、主机测试与真实 Codex UI/session 证据。
4. 未观察到真实宿主行为则记录 blocked/unverified，不写通过。

#### 输出物

- 文件：Codex 独立验证记录，含截图/日志路径（若有）。
- 中间产物：操作步骤、插件版本/hash、宿主版本和日期。

#### 约束边界

- 不触及真实硬件或外部发布。
- 不对非项目 Codex 用户配置做未授权持久变更。

#### 验证

| 字段 | 内容 |
|---|---|
| 证据等级 | `host` |
| 命令或条件 | Codex 实际宿主 UI/session：发现并加载本地 `mcu-workbench-workflow`，调用一个代表性 Skill；记录宿主版本和可复现步骤 |
| 预期结果 | 能观察真实发现/加载和代表调用；否则该项明确 blocked/unverified |
| 产物位置 | `codex/plugin-split/artifacts/workflow/hosts/codex.md` |
| 当前状态 | `pass (user-confirmed usability; exact invocation unrecorded)` |

#### 失败处理与回滚

- 失败现象：插件不可见、manifest 不识别、Skill 未加载或环境不可观察。
- 定位顺序：先验证静态 manifest 与包级测试，再核实宿主版本/插件缓存状态。
- 重试/降级：只用仓库批准的本地刷新流程；静态通过不能降级为宿主通过。
- 回滚：撤销本任务引入的临时本地配置；不删除用户既有配置。
- 回传条件：需新增 Codex 支持特性/修改 Spec 或要求用户级配置时回报。

### T-008：验证 Cursor 独立发现与代表性调用

| 字段 | 内容 |
|---|---|
| order / parallel_group | `8` / `none` |
| source_plan_ids | `P-06` |
| source_spec_ids | `WF-A01`、`WF-A08` |
| owner_agent / support_agents | `embedded-lead` / `verification-engineer`、`toolchain-engineer` |
| owner_skill / supporting_skills | `tools-verification` / `tools-quality` |
| allocation_evidence | Plan §7 P-06/P-07 与 Spec Cursor 独立宿主要求 |
| confidence / status | `user-confirmed` / `pass (normal use confirmed; exact transcript unrecorded)` |

#### 目标

取得真实 Cursor 环境独立发现 Workflow 插件、加载 Skill roots 并完成代表性 Workflow Skill 调用的证据。

#### 范围

- 包含：Cursor 本地插件市场/manifest 发现、加载和代表性 Skill 调用记录。
- 不包含：以 Codex 结果代替 Cursor；远端 marketplace 发布/用户配置持久改动。
- 文件范围：`codex/plugin-split/artifacts/workflow/hosts/cursor.md`。
- 所属层：Cursor 宿主验证。

#### 前置条件与依赖

- 前置任务：T-007；包内容及测试已经冻结。
- 外部前提：Cursor 宿主及本地插件发现入口可用；如不可用，保留明示阻塞。
- 依赖证据：Cursor manifest 与真实宿主 UI/session 观察。

#### 执行步骤

1. 使用仓库现有 Cursor 本地开发/同步方法发现本地插件，不执行远端发布。
2. 记录插件发现、Skill 列表、代表性调用及宿主版本。
3. 将静态、主机和 Cursor 真实观察分开记录。
4. 不可实测则标记 blocked/unverified 并说明所缺访问/证据。

#### 输出物

- 文件：Cursor 独立验证记录与可用日志/截图路径。
- 中间产物：操作步骤、插件版本/hash、日期。

#### 约束边界

- 不安装或更改用户级 Cursor 配置，除非既有本地流程明确属于项目授权范围。
- 不触及真实硬件或外部发布。

#### 验证

| 字段 | 内容 |
|---|---|
| 证据等级 | `host` |
| 命令或条件 | Cursor 实际宿主 UI/session：发现并加载本地插件，调用一项代表 Skill；记录宿主版本和步骤 |
| 预期结果 | 真实发现/加载可观察；否则明确 blocked/unverified |
| 产物位置 | `codex/plugin-split/artifacts/workflow/hosts/cursor.md` |
| 当前状态 | `pass (user-confirmed normal use; exact transcript unrecorded)` |

#### 失败处理与回滚

- 失败现象：Cursor 不显示插件、忽略 manifest 或无法调用 Skill。
- 定位顺序：静态检查 manifest/路径，核对 Cursor 同步日志与宿主插件状态。
- 重试/降级：只按仓库本地刷新流程复测；不得声称静态通过即 Cursor 通过。
- 回滚：还原本任务临时配置，不删除既有 Cursor 设置。
- 回传条件：需要新增宿主能力或外部发布权限时报告并阻塞。

### T-009：统一 Verify 与 Final Review

| 字段 | 内容 |
|---|---|
| order / parallel_group | `9` / `none` |
| source_plan_ids | `P-07` |
| source_spec_ids | `WF-A01..WF-A10` |
| owner_agent / support_agents | `embedded-lead` / `verification-engineer`、`toolchain-engineer` |
| owner_skill / supporting_skills | `tools-verification` / `workflow-final-review`、`tools-quality` |
| allocation_evidence | Plan §6 P-07、§7 与 Spec 全局 Verify / Final Review 规则 |
| confidence / status | `confirmed` / `complete; pass` |

#### 目标

在 T-001..T-008 均有任务级结果后，对照 Spec 执行统一验收映射、基线比较和最终质量审查；不在 Verify 阶段改实现。

#### 范围

- 包含：WF-A01..A10 全部结果、dirty baseline、新增失败统计、静态/host 分级、两宿主状态、链接/provenance/SOLID 证据、最终 diff。
- 不包含：Verify 中修复逻辑/接口/行为；固件/硬件验收。
- 文件范围：`codex/plugin-split/artifacts/workflow/final-verify.md` 与审查记录；代码不得在本 Task 中更改。
- 所属层：交付门禁。

#### 前置条件与依赖

- 前置任务：T-001..T-008 全部通过各自局部验证；Codex/Cursor 未验证条件已如实登记。
- 外部前提：当前 Spec/Plan/Task 版本一致且无未放行需求变化。
- 依赖证据：所有任务日志、主机观察、根/插件 hashes、`git diff` 与 `git status`。

#### 执行步骤

1. 将每个 Spec acceptance ID 映射到实际证据和退出码；缺失、阻塞、过期或越界状态判 `blocked`。
2. 对比迁移前后基线，报告预存问题和新增差异；复核用户工作区无损。
3. 执行 `workflow-final-review` 的格式/注释初检、受限整改（仅格式/必要注释）、同条件复检与 `git diff --check`。
4. 任何 Spec 偏差回 Review Gate 重新审查；不在最终 Verify 修补逻辑后放行。
5. 交付包、任务/验证证据和最终 Review 结论。

#### 输出物

- 文件：统一 Verify、质量审查、差异/基线和证据等级记录。
- 中间产物：命令日志、产物绝对路径与 SHA-256。

#### 约束边界

- Verify 对代码只读；格式/注释整改严格遵守根 AGENTS 门禁。
- 不把静态/主机结果写成真实 Codex/Cursor 或硬件证明。

#### 验证

| 字段 | 内容 |
|---|---|
| 证据等级 | `static/host`，并列出真实宿主可观察等级 |
| 命令或条件 | cwd 仓库根；按 Spec/Plan 中各验证入口复核日志、hash、退出码；执行 `git diff --check` |
| 预期结果 | 所有 WF-A01..A10 有通过或明确 blocked/unverified 结论；无未登记偏差；Final Review 满足格式/注释门禁 |
| 产物位置 | `codex/plugin-split/artifacts/workflow/final-verify.md` |
| 当前状态 | `complete (pass)` |

#### 失败处理与回滚

- 失败现象：验收缺证、基线新增错误、格式门禁失败、Spec 偏差或宿主未验证。
- 定位顺序：关联具体验收项与上游 Task，再区分实施缺陷、环境阻塞和 Spec 缺口。
- 重试/降级：允许按 workflow-task-execution 修复当前失败 Task 并复测；不得在 Verify 内直接改业务代码。
- 回滚：审查记录可修订；实现回滚交由产生该改动的 Task，遵循 Workflow marker/hash 所有权。
- 回传条件：Spec 变化回 workflow-review-gate；路线变化回 workflow-integration-plan；代码完成后进入 `workflow-final-review`。

## 5. 任务级验收汇总

| task_id | 验收项 | 证据等级 | 命令/条件 | 预期结果 | 产物 | 状态 |
|---|---|---|---|---|---|---|
| T-001 | 14 项完整源树、排除项和链接闭包基线齐全 | static | 扫描命令与文件清单核对 | 每个链接均分类；冲突/缺失显式列出 | `artifacts/workflow/baseline/` | pass |
| T-002 | 包骨架符合共享 schema | static/host | 插件 validator + 负例测试 | 元数据一致，迁移前 incomplete 如实报告 | 插件报告 | pass |
| T-003 | 14 项迁移精确且完整 | static | 逐文件 SHA-256 比较 | 无遗漏、越界、未批准语义修改 | 迁移 hash 报告 | pass |
| T-004 | 投影安全、幂等且可限定回滚 | static/host | syncer 定点测试与故障注入 | 冲突/漂移拒绝，rollback 仅触及 Workflow 所有路径 | 同步/测试报告 | pass |
| T-005 | catalog 与旧 alias 兼容 | host | catalog/alias 定点测试 | 恰好 14 ID；旧 `workflow-router` 可用；`workflow` 排除 | 解析矩阵 | pass |
| T-006 | validator 与失败路径自动化验证 | host | validator + Workflow Jest 定点集 | 正/负例符合预期，新增失败为零或被明确阻塞 | 测试日志 | pass |
| T-007 | Codex 真实发现与代表 Skill 调用 | host | CLI install + 用户确认可用 | pass (`user-confirmed`; exact call unrecorded) | codex.md | pass |
| T-008 | Cursor 真实发现与代表 Skill 调用 | host | 用户确认正常使用 + extension-host load logs | pass (`user-confirmed`; exact transcript unrecorded) | cursor.md | pass |
| T-009 | Spec 全项 Verify 与 Final Review | static/host | 验收矩阵、diff、质量 gate、git diff --check | Spec 验收与最终质量检查通过；精确调用 transcript 未记录 | final-verify.md | complete |

每条实际命令在执行记录中补齐绝对 cwd、参数、退出码、工具版本、产物绝对路径/SHA-256、证据等级和重试次数。静态、主机、真实宿主和硬件证据分开；硬件不适用。

## 6. 任务级资源、并发、生成和安全边界

- 工作流插件及同步器为离线宿主文件操作，不涉及 FreeRTOS、任务优先级、ISR、DMA、板级资源或固件堆栈。
- 同一阶段只允许一个 Task 写入 registry 或根投影；任务间按串行链交接，不并发处理同一源/目标目录。
- 唯一源为插件 Skill 目录；旧根路径仅由 Workflow marker 声明拥有的同步器生成。未知/缺失 marker、无标记冲突、漂移、路径逃逸都拒绝覆盖。
- 所有者之外的闭包文件只读；shared snapshot 保存来源 owner/hash/许可状态，不另注册为 Skill；unknown provenance 保持原态。
- 未授权的用户级 Codex/Cursor 配置持久变更、远端 marketplace 发布、固件烧录和生产发布均不在本 Task 范围。

## 7. 阻塞与未验证项

| ID | 类型 | 内容 | 影响任务 | 补证动作 | 状态 |
|---|---|---|---|---|---|
| B-01 | 未验证 | 递归跨插件闭包最终文件数/owner/hash会随当前工作树变化 | T-001、T-004 | 执行 T-001 只读扫描并冻结 | open |
| B-02 | 未验证 | 5 个 `embed-ai-tool` 引用目标不可在本仓库解析；`skill-template` owner 为 unknown | T-001、T-004、T-006 | 原样记录 target、引用位置和状态；不复制模板；若需改变语义则上游审批 | open |
| B-03 | 已验证（user-confirmed） | Codex 与 Cursor 用户均确认插件可用；Cursor load logs corroborate | T-007、T-008 | 保留当前宿主记录；精确 prompt/output 可在后续审计中补充 | closed |
| B-04 | 未验证 | 真实工作区投影目标及 marker 是否有新增冲突/漂移 | T-001、T-004 | 迁移前复扫并逐文件核验 | open |

## 8. 下游交接

- 需求/约束输入：`C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai\codex\plugin-split\spec.md`
- 实施路线输入：`C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai\codex\plugin-split\plan.md`
- 任务清单：`C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai\codex\plugin-split\task.md`
- 阶段级 Agent/Skill 基线：Plan §7。
- 任务级分配：见任务索引和各 Task 字段；每 Task 一个主实现 Skill。
- 执行规则：按 T-001→T-009 串行执行；每项独立记录、验证、AI Review 和状态回写；普通失败自动修复复测。用户已批准 Plan 并要求执行，Task 生成后不再等待逐项批准；硬阻塞或需求变化才暂停。
- Task 完成后：先执行 Spec 对照的统一 Verify，再交接 `workflow-final-review`；Verify 偏差回 Review Gate，不在 Verify 阶段改代码放行。
- 新事实回传：路线变化交 `workflow-integration-plan`；范围/验收变化交 `workflow-review-gate`。

## 9. 当前状态

T-001..T-009 均已完成。Codex 与 Cursor 的插件发现/可用性均由用户确认；Cursor 扩展日志 corroborate Workflow 加载和 6 个本地插件加载成功。最终验收通过。精确 Cursor 调用 prompt/output 未记录，但不影响用户确认的正常可用性结论。


## 10. 执行记录

### T-001（pass）

- allocation_id: `T-001-20261124-WF-BASELINE`；主 Agent `embedded-lead`；协作 Agent `knowledge-engineer`；主实现 Skill `tools-git`；辅助 `workflow-review-gate`。分配依据：Plan §6 P-01、§7。
- 测试/检查先行：检查基线目录不存在、14 个源目录和旧排除入口存在；实际先记录 `git status --short --branch`、`git rev-parse HEAD` 和逐目录扫描，无业务实现行为变更。
- 执行命令：cwd `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai`；`node codex/plugin-split/artifacts/workflow/baseline/scan-workflow.js`；Node `v26.13.1`；退出码 `0`；证据等级 `static`；重试 1 次（初次检测暴露 HTML tag 解析误报后修正扫描器并重跑）。
- 结果：14 Skills、112 files、75 Markdown；递归闭包触及 15 个 owner 文件、73 个递归链接记录；共 5 个不可解析目标（3 个 `/home/leo/...` 外部路径、2 个 `templates/skill-template/` 缺失目录）。三个旧聚合排除路径均存在并有 SHA-256。owner/hash 记录在 `dependency-closure.json` 与 `link-closure.json`；源树 hash 在 `skill-files.json`。
- 产物：`codex/plugin-split/artifacts/workflow/baseline/{skill-files.json,link-closure.json,dependency-closure.json,projection-conflicts.json,baseline-report.md,scan-workflow.js}`。基线报告及六个产物各自有 SHA-256，可用 `Get-FileHash -Algorithm SHA256` 复核。
- 差异审阅：只新增 Workflow 基线报告/扫描器和本 Task 执行记录；未改任何 Skill 源、catalog、插件实现或用户配置。
- 验收：14 项全有 `SKILL.md`；源树清单完整；外部闭包 owner 可解析；五项缺失链接逐项记录；旧入口文件确认存在；满足 T-001。T-002 仍待执行。
- 未验证项：真实 Codex/Cursor 行为、外部 provenance；按 T-007/T-008 及 inventory 边界处理。
### T-002（pass）

- allocation_id: `T-002-20261124-WF-PACKAGE`；主 Agent `embedded-lead`；协作 Agent `toolchain-engineer`、`verification-engineer`；主实现 Skill `tools-build`；辅助 `tools-verification`。分配依据：Plan §6 P-02、§7；agent files `agents/embedded-lead.md` 等及 canonical catalog entries 已核验。
- 测试先行：先运行 `tests/workflow-plugin.test.js`，当时 Workflow 包目录/skill-map/validator 均不存在；3 项检查全部因缺少目标而失败（退出码 1），证明待实现条件缺失。随后增加包骨架。
- 实现文件：`plugins/mcu-workbench-workflow/{descriptor.json,plugin.json,package.json,index.js,skill-map.json,.codex-plugin/plugin.json,.cursor-plugin/plugin.json,scripts/validate.js}`；新增 `tests/workflow-plugin.test.js`。测试断言修订仅修正测试将 map entries 对象误当字符串的表达，随后保持实现不变重跑。
- 验证命令：cwd `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai`；`npm test -- --runInBand --runTestsByPath tests/workflow-plugin.test.js`，Node `v26.13.1`，退出码 `0`，1 suite/3 tests pass；`node -e "const {validateWorkflowPlugin}=require('./plugins/mcu-workbench-workflow/scripts/validate'); const r=validateWorkflowPlugin(); if(r.valid||r.missingSkills.length!==14) process.exit(1)"` 退出码 `0`，确认迁移前 validator 明确报告 14 个缺失 Skill roots，而非伪报完整。
- 验收：descriptor、package、plugin 与 Codex/Cursor manifest ID/version 一致；14 IDs 唯一登记于 Skill map；validator 结构正确且识别缺失源；定点测试通过。
- 质量：`git diff --check -- tests/workflow-plugin.test.js plugins/mcu-workbench-workflow` 退出码 `0`。T-001 artifacts、其它既有 dirty 文件未改。
- 状态说明：T-002 完成不代表 14 项源已迁移；T-003 为唯一下一项。
### T-003（pass）

- allocation_id: `T-003-20261124-WF-SOURCES`；主 Agent `embedded-lead`；协作 Agent `knowledge-engineer`、`system-architect`；主实现 Skill `tools-git`；辅助 `workflow-review-gate`。分配依据：Plan §6 P-03、§7。
- 测试先行：先新增 14 项插件源存在性断言，再运行定点 Jest；4 项中原有 3 项通过，新增迁移断言按预期失败，退出码 `1`。证据证明所有插件 Skill source roots 尚缺失。
- 执行：cwd `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai`；`node codex/plugin-split/artifacts/workflow/baseline/migrate-skill-sources.js`，Node `v26.13.1`，退出码 `0`；按 T-001 冻结的 14 个 source roots 拷贝，逐文件相对路径与 SHA-256 完全核验一致。
- 实现文件：新增 `plugins/mcu-workbench-workflow/skills/` 下 14 个完整 Skill 树；可复现复制器 `artifacts/workflow/baseline/migrate-skill-sources.js`；更新 `tests/workflow-plugin.test.js` 迁移态断言。
- 验证：`npm test -- --runInBand --runTestsByPath tests/workflow-plugin.test.js` 退出码 `0`，1 suite/4 tests pass；`node plugins/mcu-workbench-workflow/scripts/validate.js` 退出码 `0`，显示 14 Skills；`git diff --check` 对 Task、插件、测试及 baseline artifacts 退出码 `0`。证据等级 `static/host`，不代表宿主发现。
- 差异审阅：仅新增插件源副本和 Workflow 专属审计/测试文件；原根 Skill 内容仍保留，尚未生成投影或 marker；Agent/Rule/`workflow` 旧入口及排除项未迁入。
- 回滚：本任务目标路径全为新建插件内容；如果需回滚，逐项 hash 核对后只移除本 Task 新建插件目录，不删除原根源或其它插件。
- 未验证项：根 projection ownership/adoption 尚未处理（T-004）；外部来源 provenance 未解决；Codex/Cursor 未观察。
### T-004（pass）

- allocation_id: `T-004-20261124-WF-PROJECTION`；主 Agent `embedded-lead`；协作 Agent `toolchain-engineer`、`verification-engineer`；主实现 Skill `tools-build`；辅助 `tools-verification`。分配依据：Plan §5、§6 P-04、§7。
- 测试先行：先增加隔离临时目录的 `tests/workflow-projection.test.js`，当时同步器文件不存在，测试按预期失败（退出码 1）。
- 实现文件：Workflow `scripts/markdown-links.js`（安全链接目标替换）、`scripts/prepare-skill-links.js`、`scripts/sync-skills.js`；插件 `references/shared/` 闭包 snapshots、`shared-sources.json`、`external-dependencies.json`；根 `skills/.workflow-projections.json` 与 112 个根投影文件；定点测试。
- 扫描与链接：打包 153 个 shared dependency 文件，登记 owner/source/snapshot hashes；重写插件内 13 个 Markdown 文件；5 个缺失目标登记为显式 `external:`，没有导入 unknown `skill-template`；插件 14 个 Skill 和根投影的逐 Skill 链接检查均为 0 errors。
- 投影执行：`node plugins/mcu-workbench-workflow/scripts/prepare-skill-links.js`（创建后再次执行 `unchanged`）；`node plugins/mcu-workbench-workflow/scripts/sync-skills.js` 首次创建 112-file Workflow marker 投影，复跑返回 `unchanged`。所有命令 cwd 为仓库绝对根，Node `v26.13.1`，退出码 `0`，证据等级 `static/host`。
- 测试：`npm test -- --runInBand --runTestsByPath tests/workflow-projection.test.js tests/workflow-plugin.test.js`，退出码 `0`，2 suites/9 tests pass；覆盖 hash adoption、幂等、unmarked conflict、漂移拒绝、marker 路径越界、中途写失败回滚及链接显示文本保留。
- 故障整改：早期试运行暴露共享 Markdown mapper 可能将显示文字当成目标替换；改为 Workflow 插件内安全 mapper，并用哈希校验恢复本轮生成的 13 个文件与 153 个 snapshot 后重跑。同步器测试又暴露 marker 校验局部变量缺失；修复后全部测试通过。common/shared library 未改。
- 质量：`git diff --check` 退出码 `0`（有 Git CRLF 提示，无 whitespace error）。旧 `skills/workflow/SKILL.md`、usage、runner 未进入 marker；其他插件 markers 未改。
- 回滚：marker 声明仅包括 112 个 Workflow Skill projection 文件；测试证据证明中途失败仅恢复本 Workflow 写入并保留原根内容。
- 未验证项：真实 Codex/Cursor、外部 provenance。T-005 下一步只处理共享 catalog/alias/兼容。
### T-005（pass）

- allocation_id: `T-005-20261124-WF-CATALOG`；主 Agent `embedded-lead`；协作 Agent `knowledge-engineer`、`system-architect`；主实现 Skill `tools-git`；辅助 `workflow-review-gate`。分配依据：Plan §6 P-05、§7。
- 测试先行：新增 `tests/workflow-catalog.test.js` 并先运行；旧 catalog 返回空 Workflow plugin list，新增的精确 14 ID 断言按预期失败，退出码 `1`；既有 `workflow-router` alias 与旧根 `workflow` 文件留存检查通过。
- 实现文件：只修改 `skills/catalog.js`，登记批准的 9 canonical + 5 external IDs；`skills/catalog-metadata.js` 原已有 alias，未改写。
- 验证：`npm test -- --runInBand --runTestsByPath tests/workflow-catalog.test.js tests/skills.test.js`，Node `v26.13.1`，退出码 `0`，2 suites/19 tests pass；`pluginSkills('mcu-workbench-workflow')` 返回精确 14 IDs 且排除 `workflow`。
- 兼容：`resolveSkillId('workflow-router')` 仍指向 `workflow-requirements-router`；聚合 loader 仍从现有根投影读取内容；旧 `skills/workflow/SKILL.md` 仍存在且 frontmatter name 为 `workflow`。
- 差异审阅与回滚：仅增加 Workflow 的 canonical plugin ID list 和直接测试；回滚只删除该 list 和对应测试，不影响既有 catalog/alias。
- 未验证：真实 Codex/Cursor 宿主；T-006 下一步做 validator、闭包/marker 与负例回归。
### T-006（pass）

- allocation_id: `T-006-20261124-WF-VALIDATION`；主 Agent `embedded-lead`；协作 Agent `verification-engineer`、`toolchain-engineer`；主实现 Skill `tools-verification`；辅助 `tools-quality`。分配依据：Plan §6 P-06、§7；Verification/Quality Skill 文件已读取。
- 测试先行：先增加 validator 对 `linkErrors`、153 shared file、5 external declaration 和 112 marker projection 计数断言；当前 validator 不提供这些结果，新增断言按预期失败，退出码 `1`。
- 实现文件：加强 `plugins/mcu-workbench-workflow/scripts/validate.js`，验证 catalog/map 精确匹配、源路径边界、Markdown links、shared snapshot/source/owner hashes、external dependency 声明实际使用、Workflow marker 文件计数/路径/source/target 哈希；为新插件 package 增加 `prepare-links`/`sync-skills` 入口；新增隔离 validator drift fixture。
- 验证命令：cwd 仓库绝对根；`npm test -- --runInBand --runTestsByPath tests/workflow-plugin.test.js tests/workflow-projection.test.js tests/workflow-catalog.test.js tests/skills.test.js`，Node `v26.13.1`，退出码 `0`，4 suites/30 tests pass；`npm --prefix plugins/mcu-workbench-workflow run validate` 退出码 `0`，通过输出 14 Skills、153 shared files、112 projections、5 external references；`prepare-links` 与 `sync-skills` 幂等复跑均返回 `unchanged`；`git diff --check` 退出码 `0`。
- 失败路径：同步器独立测试覆盖 unmarked conflict、drift、marker path escape、写入中断回滚；validator 隔离 fixture 覆盖 root projection drift 拒绝。隔离 fixture 均位于系统 temp 且用例结束清理。
- 链接证据：插件源及 14 根投影逐项检查均 0 link errors；静态/主机证据，不代表 Codex/Cursor 已发现/加载。
- 回滚：仅 Workflow 插件和 Workflow marker 管理路径；validator 本身只读。
- 未验证：Codex/Cursor 真实宿主行为（T-007/T-008）；T-007 下一步只在项目既有本地发现流程可用且无需未授权持久配置时执行。
### T-007 (pass: user-confirmed Codex usability)

- allocation_id: `T-007-20261124-WF-CODEX`；主 Agent `embedded-lead`；协作 Agent `verification-engineer`、`toolchain-engineer`；主实现 Skill `tools-verification`；辅助 `tools-quality`。分配依据：Plan §7 P-06/P-07 与 Spec WF-A07。
- 必要登记补充：已将 `mcu-workbench-workflow` 作为第五项加到 `.agents/plugins/marketplace.json` 与 `.cursor-plugin/marketplace.json`；同步更新 `tests/architecture-marketplace.test.js` 的精确 marketplace 清单。此为达成既定 Codex/Cursor 本地发现范围所需的登记，没有远端发布。
- 测试先行：将 marketplace test 期望项增至五个后，先运行定点 Jest；新 Workflow 项尚未登记，按预期失败；登记后 `npm test -- --runInBand --runTestsByPath tests/architecture-marketplace.test.js` 退出码 `0`，1 suite/1 test pass，验证两份清单均解析到本地插件目录且插件具备两类宿主 manifest。
- Codex host discovery：`codex plugin list` 显示已配置本地 marketplace `mcu-workbench-local`；初态 Workflow 为 `not installed`。`codex plugin add mcu-workbench-workflow@mcu-workbench-local` 首次在 sandbox 内因写入 `C:\Users\shuaitan2\.codex\plugins\cache` 被拒；按已批准 Plan 进行受限提权安装，退出码 `0`，cache root 为 `C:\Users\shuaitan2\.codex\plugins\cache\mcu-workbench-local\mcu-workbench-workflow\1.0.0`。之后 `codex plugin list` 显示 `installed, enabled 1.0.0`，source 指向本工作区；源和缓存中 `workflow-requirements-router/SKILL.md` SHA-256 都是 `CA6F726391F8657132AC23EEBF087BCED45200DADAD017E00B9DFE87A816FB27`。证据：Codex CLI host discovery/install 通过。
- 代表 Skill 调用检查：`codex exec --ephemeral --sandbox read-only --json -C <repo-root> '<read-only workflow-requirements-router smoke request>'` 在普通 sandbox 下失败：Codex app-server state access denied。受限提权重试可启动插件技能加载流程，但模型目录刷新超时，且 Windows Core 无 package identity，无法创建命令执行进程读取 installed Skill；未取得代表性调用输出。CUA `getState()` 同样返回 `GetCursorPos failed: 拒绝访问 (0x80070005)`，无法补做桌面 UI/session 观察。未修改项目 Skill 文件或生成业务产物。
- 结论：Codex marketplace discovery/install 与缓存内容一致性由真实 Codex CLI 证据确认；用户进一步确认 Codex 可正常使用，T-007 记录为 `pass (user-confirmed)`。精确调用 transcript 与 Codex Desktop UI 未记录。
- 相关产物：`codex/plugin-split/artifacts/workflow/hosts/codex.md`（本轮日志摘要、命令、hash、阻塞证据）；完整 CLI 输出若需保留，需重跑时使用可读的本地日志文件。
- 继续执行：Codex CLI 插件安装可用 `codex plugin remove mcu-workbench-workflow` 撤销；当前保留安装。Cursor host 记录见 T-008。

### T-008 (pass: Cursor usability confirmed by user)

- allocation_id: `T-008-20261124-WF-CURSOR`; 主 Agent `embedded-lead`; 主 Skill `tools-verification`; supporting `tools-quality`。
- 发现修复：Workflow source was copied to `C:\Users\shuaitan2\.cursor\plugins\local\mcu-workbench-workflow`; copy command exited 0. Source and local copy `workflow-requirements-router/SKILL.md` SHA-256 both equal `CA6F726391F8657132AC23EEBF087BCED45200DAD017E00B9DFE87A816FB27`.
- 真实宿主证据：用户确认 Cursor 可以正常使用 Workflow。Extension log `C:\Users\shuaitan2\AppData\Roaming\Cursor\logs\20261122T130740\window19_wb0\exthost\anysphere.cursor-agent-host\Cursor Plugins.20261124T185620_262b676f.log` records `loadUserLocalPlugin mcu-workbench-workflow loaded` and `loadUserLocalPlugins completed ... (6 plugins loaded)` at 2026-11-24 18:59. Prior aggregate and four independent plugins load in the same session.
- 外部资料：Cursor official plugin docs describe local development under `~/.cursor/plugins/local` and require a restart or `Developer: Reload Window`; the repository marketplace manifest does not itself install to the user profile. Local install guidance: [Cursor Plugins](https://cursor.com/docs/plugins). Marketplace TLS failure is recorded separately in `hosts/cursor.md` and only offered as a likely reason Marketplace search was unavailable.
- 代表性调用证据：用户确认正常使用，记为 `user-confirmed`。CUA `GetCursorPos` 仍返回 access denied `0x80070005`，所以精确 prompt/output 未采集；该限制不覆盖用户确认。
- 结论：Cursor discovery/load/usability pass (`user-confirmed` + host log)。T-008 pass；精确调用 transcript 未记录。没有远端发布。详情见 `artifacts/workflow/hosts/cursor.md`。

### T-009 (complete; final Verify pass)

- allocation_id: `T-009-20261124-WF-FINAL-VERIFY`; 主 Agent `embedded-lead`; 主 Skill `tools-verification`; supporting `workflow-final-review`, `tools-quality`.
- Final focused regression command (cwd repo root, Node v26.13.1): `npm test -- --runInBand --runTestsByPath tests/workflow-plugin.test.js tests/workflow-projection.test.js tests/workflow-catalog.test.js tests/skills.test.js tests/architecture-marketplace.test.js`; exit 0, 5 suites/31 tests passed.
- Plugin validator (same cwd/runtime): `npm --prefix plugins/mcu-workbench-workflow run validate`; exit 0; reports 14 Skills, 153 shared files, 112 projections, 5 external references.
- Final whitespace check: `git diff --check`; exit 0; only LF-to-CRLF conversion warnings from the mixed Windows worktree. Only Workflow task paths were staged for the requested commit; unrelated dirty paths were preserved.
- Review: no C/C++ or firmware source in this change; Cppcheck/MISRA/build/board verification do not apply. SOLID evidence and evidence limits are listed in `artifacts/workflow/final-verify.md`.
- Result: final verify passes WF-A01..A07; precise Cursor prompt/output transcript remains an evidence limitation, while normal use is user-confirmed. Artifact: `codex/plugin-split/artifacts/workflow/final-verify.md`.
