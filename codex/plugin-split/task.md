# MCU Workbench DevOps 插件拆分任务

> 本 Task 对应已批准的 `spec.md v0.7-devops-third-plugin` 和用户选择并批准的 `plan.md v0.1-devops-plugin-owned-sources`。按方案 A，插件持有唯一 canonical Skill 源，根目录兼容文件由插件脚本生成。

## 1. 元数据

| 字段 | 内容 |
|---|---|
| request_id | `REQ-PLUGIN-SPLIT-20261123` |
| 任务清单版本 | `v0.1-devops-plugin-owned-sources` |
| 状态 | `完成（保留未验证项）` |
| 项目路径与提交 | `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai @ host_ai/969398e6f5aea785da143ca4535d76ebf6b86188` |
| 输入 spec.md | `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai\codex\plugin-split\spec.md` |
| 输入 plan.md | `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai\codex\plugin-split\plan.md` |
| Spec 力度 | `full` |
| 风险叠加门禁 | `versioned` |
| 生成时间 | `2026-11-24T14:35:00+08:00` |
| 阶段级 Agent/Skill 基线 | `plan.md` 第 8A 节 |
| 下游执行 Skill | `workflow-task-execution` |

可信等级使用 `confirmed`、`user-confirmed`、`inferred`、`unverified`。外部 Skill provenance 未知不是移除其归属的理由，但相关审计项须保持 blocked/unverified。

## 2. 总体任务图

```text
T-001 → T-002 → T-003 → T-004 → T-005 → T-006 → T-007 → T-008
```

- 总体目标：建立独立的 `mcu-workbench-devops` 插件包，迁移五项 canonical Skills 与批准的 11 项外部 Skills，并保持根聚合入口兼容。
- 非目标：改写 DevOps Skills 语义；迁移其他插件归属；执行实际固件构建、烧录、签名、发布或远端写操作。
- 关键串行链：T-001 → T-002 → T-003 → T-004 → T-005 → T-006 → T-007 → T-008。
- 可并行任务组：none。插件 Skill tree、projection marker、共享 catalog 与根 package 有连续文件所有权关系，按顺序串行避免覆盖。
- 任务通过静态/主机检查后，宿主 UI 发现需由用户可用环境分别验证；不得把静态结果写成宿主通过。

## 3. 任务索引

| 顺序 | task_id | 任务名称 | 前置任务 | 并行组 | 主 Agent | 主实现 Skill | 辅助 Skill | 验证等级 | 状态 |
|---:|---|---|---|---|---|---|---|---|---|
| 1 | T-001 | 建立 DevOps 插件包骨架 | none | none | embedded-lead | tools-build | tools-verification | static/host | pass |
| 2 | T-002 | 迁移五项 canonical Skill 源 | T-001 | none | embedded-lead | tools-git | tools-build | static/host | pass |
| 3 | T-003 | 纳入 11 项外部 Skill 并登记来源状态 | T-002 | none | embedded-lead | tools-git | knowledge-engineer（审计） | static/host | pass |
| 4 | T-004 | 实现受保护的根目录兼容投影 | T-002,T-003 | none | embedded-lead | tools-build | tools-verification | host | pass |
| 5 | T-005 | 更新 catalog、aliases 和聚合入口 | T-004 | none | embedded-lead | tools-git | workflow-review-gate | host | pass |
| 6 | T-006 | 增加 DevOps 包级校验和 Codex/Cursor manifests | T-001..T-005 | none | embedded-lead | tools-build | tools-verification | static/host | pass |
| 7 | T-007 | 增加回归测试并分别执行 Codex/Cursor 宿主检查 | T-006 | none | embedded-lead | tools-verification | tools-quality | host | pass |
| 8 | T-008 | 对照 Spec 执行统一最终 Verify | T-001..T-007 | none | embedded-lead | tools-verification | tools-quality | static/host | pass with limitations |

## 4. 任务详情

### T-001：建立 DevOps 插件包骨架

| 字段 | 内容 |
|---|---|
| order | 1 |
| parallel_group | none |
| source_plan_ids | P-01 |
| source_spec_ids | DVO-F01,DVO-F02,DVO-G02,DVO-A01 |
| owner_agent | embedded-lead |
| support_agents | toolchain-engineer |
| owner_skill | tools-build |
| supporting_skills | tools-verification |
| allocation_evidence | plan.md P-01/P-06；verification 插件 descriptor/manifest 结构为仓库内证据 |
| confidence | confirmed |
| status | pass |

#### 目标
创建 ID/version 一致、引用共享 contracts 的 DevOps 插件基础包及两个宿主 manifest。

#### 范围
- 包含：新增 `plugins/mcu-workbench-devops/{descriptor.json,plugin.json,package.json,index.js,.codex-plugin/plugin.json,.cursor-plugin/plugin.json}`。
- 不包含：Skill 内容迁移、根目录脚本、运行时动态加载。
- 所属层：插件包/宿主适配。

#### 前置条件与依赖
- 前置任务：none。
- 外部前提：Plan 已批准；共享 descriptor 校验 API 以 `packages/contracts` 当前源码为准。
- 依赖证据：`plugins/mcu-workbench-verification/` manifests 与 `packages/contracts`。

#### 执行步骤
1. 按当前 contract schema 创建 descriptor 与 package metadata。
2. 为 Codex/Cursor 分别创建 manifest，指向插件 Skills 根。
3. 创建最小入口，仅暴露 DevOps 插件声明，不执行硬件/发布操作。

#### 输出物
- 文件：上述新插件骨架。
- 中间产物：可校验的包 ID/version/capability 声明。

#### 约束边界
- 接口和依赖：依赖共享 contracts，不反向导入聚合实现。
- 资源与生命周期：静态加载，不承诺热卸载。
- 并发、ISR、DMA：不适用。
- 内存和生成边界：仅新建插件文件。

#### 验证
| 字段 | 内容 |
|---|---|
| 证据等级 | static/host |
| 命令或条件 | cwd `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai`；执行插件 manifest/descriptor validator |
| 预期结果 | ID/version 一致，contract 校验通过 |
| 产物位置 | `plugins/mcu-workbench-devops/artifacts/T-001/` |
| 当前状态 | not-run |

#### 失败处理与回滚
- 失败现象：contract 字段或 manifest schema 不匹配。
- 定位顺序：读 contract schema → 对照 verification 样例 → 修正插件新增文件。
- 重试/降级：不降级 schema；修正后复验。
- 回滚：删除仅由本 Task 新建且经路径确认的骨架文件。
- 回传条件：共享 contract 无法满足 Spec 时回 workflow-review-gate。

### T-002：迁移五项 canonical Skill 源

| 字段 | 内容 |
|---|---|
| order | 2 |
| parallel_group | none |
| source_plan_ids | P-02 |
| source_spec_ids | DVO-E02,DVO-F03,DVO-G01,DVO-A02 |
| owner_agent | embedded-lead |
| support_agents | knowledge-engineer |
| owner_skill | tools-git |
| supporting_skills | tools-build |
| allocation_evidence | plan.md P-02；真实源目录已确认存在 |
| confidence | confirmed |
| status | pass |

#### 目标
在 DevOps 插件中建立五项完整 canonical Skill 树，并保证原内容可追踪。

#### 范围
- 包含：`tools-build`、`tools-linker`、`tools-flash`、`tools-git`、`tools-release` 的完整目录树及必要脚本、references、profiles、agent metadata。
- 不包含：语义重写、工具算法变更、修复与拆分无关的缺陷。
- 所属层：DevOps Skills。

#### 前置条件与依赖
- 前置任务：T-001。
- 外部前提：每个源和目标路径在操作前检查；不得覆盖同名目标。
- 依赖证据：`skills/tools/tools-build`、`tools-linker`、`tools-flash`、`tools-git`、`tools-release`。

#### 执行步骤
1. 记录五项源目录文件清单与 hash。
2. 迁移完整目录树至插件 `skills/`，只修正必要的相对链接/脚本引用。
3. 对照源清单和 hash，确认非链接改写内容一致；记录任何必要路径转换。

#### 输出物
- 文件：插件内五项 canonical Skill 目录。
- 中间产物：源/目标文件清单与差异记录。

#### 约束边界
- 接口和依赖：Skill ID 保持不变。
- 资源与生命周期：不涉及固件资源。
- 并发、ISR、DMA：不适用。
- 内存和生成边界：插件目录为唯一编辑源；根路径只作为后续生成投影。

#### 验证
| 字段 | 内容 |
|---|---|
| 证据等级 | static/host |
| 命令或条件 | cwd 仓库根；对源/目标清单执行逐文件 hash 比较、Skill link validator |
| 预期结果 | 五项 Skill 与必要资源均存在；链接目标可解析或已登记为外部依赖 |
| 产物位置 | `plugins/mcu-workbench-devops/artifacts/T-002/` |
| 当前状态 | not-run |

#### 失败处理与回滚
- 失败现象：目标缺文件、链接失效、同名目录冲突或内容不一致。
- 定位顺序：源树清单 → 相对链接 → 同名目标 → hash 差异。
- 重试/降级：不得跳过资源；只对必要链接做路径调整。
- 回滚：验证源目录仍完整后移除本 Task 生成的插件副本。
- 回传条件：源文件不存在或实际需要改写 Skill 行为时暂停并回 Spec/Plan。

### T-003：纳入 11 项外部 Skill 并登记来源状态

| 字段 | 内容 |
|---|---|
| order | 3 |
| parallel_group | none |
| source_plan_ids | P-03 |
| source_spec_ids | DVO-E03,DVO-E04,DVO-F04,DVO-F06,DVO-G04,DVO-A06 |
| owner_agent | embedded-lead |
| support_agents | knowledge-engineer |
| owner_skill | tools-git |
| supporting_skills | tools-verification |
| allocation_evidence | ownership matrix/inventory 已登记 11 个 DevOps 目标项；来源 metadata 未验证 |
| confidence | user-confirmed（迁移范围）；unverified（来源元数据） |
| status | pass |

#### 目标
将已批准的 11 项 DevOps 外部 Skill 纳入插件发现/审计范围，并保留来源可信等级。

#### 范围
- 包含：`build-cmake`、`build-iar`、`build-idf`、`build-keil`、`build-makefile`、`build-platformio`、`flash-idf`、`flash-jlink`、`flash-keil`、`flash-openocd`、`flash-platformio`。
- 不包含：推断许可证/版本/依赖、迁移其它归属 Skill、创建空占位 Skill。
- 所属层：外部 DevOps Skill 适配/审计。

#### 前置条件与依赖
- 前置任务：T-002。
- 外部前提：inventory 中的 source path 可读；不可读条目保持 blocked 并记录原因。
- 依赖证据：`codex/plugin-split/skill-ownership-matrix.md`、`external-skill-inventory.yaml`。

#### 执行步骤
1. 逐项核对本地源目录、inventory 来源说明和目录树。
2. 把可用内容迁入插件并登记文件清单；缺失来源不制造内容。
3. 更新 inventory 和 ownership 状态，保留未知元数据及阻塞原因。

#### 输出物
- 文件：可访问的外部 Skill 目录和审计清单更新。
- 中间产物：11 项逐条状态报告。

#### 约束边界
- 接口和依赖：原 Skill ID 保持不变。
- 资源与生命周期：不执行来源仓库操作。
- 并发、ISR、DMA：不适用。
- 内存和生成边界：未验证 provenance 一直显式标记。

#### 验证
| 字段 | 内容 |
|---|---|
| 证据等级 | static/host |
| 命令或条件 | cwd 仓库根；按 11 个 ID 与 inventory/source tree 逐项比对 |
| 预期结果 | 归属一对一；metadata 未知项未被伪填 |
| 产物位置 | `codex/plugin-split/artifacts/devops/T-003/` |
| 当前状态 | not-run |

#### 失败处理与回滚
- 失败现象：来源不可用、inventory 与目录不一致或误填 provenance。
- 定位顺序：ownership row → inventory entry → source path → plugin tree。
- 重试/降级：保持不可用项 blocked，继续独立处理其它条目。
- 回滚：恢复本 Task 修改的 inventory/ownership 行及新建插件目录。
- 回传条件：若缺失项阻止插件核心发现/验收，回传 Review Gate，不得宣称通过。

### T-004：实现受保护的根目录兼容投影

| 字段 | 内容 |
|---|---|
| order | 4 |
| parallel_group | none |
| source_plan_ids | P-04 |
| source_spec_ids | DVO-F03,DVO-F04,DVO-G01,DVO-G06,DVO-A02,DVO-A05 |
| owner_agent | embedded-lead |
| support_agents | toolchain-engineer |
| owner_skill | tools-build |
| supporting_skills | tools-verification |
| allocation_evidence | verification synchronizer 提供 marker/hash/staging 参照；DevOps 目标路径需单独核实 |
| confidence | confirmed |
| status | pass |

#### 执行分配与先行检查

- allocation_id: `T-004-20261124-DEVOPS-PROJECTION`
- primary_agent: `embedded-lead`; support_agents: `toolchain-engineer`
- primary_implementation_skill: `tools-build`; supporting_skills: `tools-verification`
- allocation_basis: Plan P-04 与 Task T-004；verification synchronizer 提供仓库内先例。
- scope_boundary: 只创建 DevOps 专属同步器和投影；不得触及 verification/observability marker。
- 当前行为：根 DevOps 目录原为源目录，搬迁后尚无插件拥有的生成兼容路径。
- 缺失证明：新增测试断言插件内可列出每个源到投影映射，并拒绝覆盖未标记路径。
- 测试路径：`tests/devops-projection.test.js`；先行结果需记录为同步器缺失/测试失败。

#### 目标
生成根目录 DevOps Skill 兼容投影，并在投影被修改或 marker 不匹配时拒绝覆盖。

#### 范围
- 包含：插件级 `sync-skills.js`、projection marker、旧根目录 DevOps paths。
- 不包含：覆盖 verification/observability projection；改写行内代码或 fenced code 示例。
- 文件范围：`plugins/mcu-workbench-devops/scripts/`、DevOps projection targets。
- 所属层：插件生成/兼容面。

#### 前置条件与依赖
- 前置任务：T-002、T-003。
- 外部前提：投影目标逐项检查 marker 和用户修改；路径必须解析在预期根目录内。
- 依赖证据：`plugins/mcu-workbench-verification/scripts/sync-skills.js`。

#### 执行步骤
1. 为 5 项 canonical 和 11 项可用外部 Skill 定义显式源到投影映射。
2. 实现 Markdown 链接改写、哈希 marker、暂存和失败回滚。
3. 同步前拒绝未知 marker、文件漂移和路径逃逸；仅写入 DevOps 所有投影范围。

#### 输出物
- 文件：插件同步器、marker、生成投影。
- 中间产物：投影 hash 和同步报告。

#### 约束边界
- 接口和依赖：无新增运行时服务；仅文件生成。
- 资源与生命周期：临时 staging/backup 限定于 DevOps projection root。
- 并发、ISR、DMA：不适用。
- 内存和生成边界：禁止覆盖无标记或已漂移文件；同步失败需回滚。

#### 验证
| 字段 | 内容 |
|---|---|
| 证据等级 | host |
| 命令或条件 | cwd 仓库根；执行插件 `sync-skills --check`，另在临时 fixture 验证漂移拒绝与回滚 |
| 预期结果 | 干净同步可重复；漂移投影不会被覆盖；失败不会留下半成品 |
| 产物位置 | `plugins/mcu-workbench-devops/artifacts/T-004/` |
| 当前状态 | not-run |

#### 失败处理与回滚
- 失败现象：哈希漂移、路径越界、链接目标缺失、复制/rename 失败。
- 定位顺序：marker → hash → target path → link rewrite → staging/rollback。
- 重试/降级：不对漂移用户文件自动重试覆盖；报告冲突。
- 回滚：只撤销本 Task 创建的临时文件，保留所有冲突投影。
- 回传条件：若无法在不覆盖用户内容的情况下保留兼容，暂停并回 Plan。

### T-005：更新 catalog、aliases 和聚合入口

| 字段 | 内容 |
|---|---|
| order | 5 |
| parallel_group | none |
| source_plan_ids | P-05,P-07 |
| source_spec_ids | DVO-F05,DVO-G03,DVO-G06,DVO-A03,DVO-A05 |
| owner_agent | embedded-lead |
| support_agents | system-architect |
| owner_skill | tools-git |
| supporting_skills | workflow-review-gate |
| allocation_evidence | 现有 catalog 定义和 alias tests 已确认；改动影响共享 resolver |
| confidence | confirmed |
| status | pass |

#### 目标
让新旧入口均解析至同一 DevOps canonical Skills，且不重复登记 ID。

#### 范围
- 包含：`skills/catalog.js`、`skills/catalog-metadata.js`、resolver/Agent route 的必要修改、根 `package.json` 的薄转发命令和相关测试。
- 不包含：改动其它插件路由和 Skill aliases 的行为。
- 所属层：共享 registry/兼容层。

#### 前置条件与依赖
- 前置任务：T-004。
- 外部前提：修改前确认实际 catalog source 与生成边界；只改源文件。
- 依赖证据：`skills/catalog.js`、`skills/catalog-metadata.js`、现有 skills tests。

#### 执行步骤
1. 为五项 canonical 和 11 项外部 ID 确定唯一解析路径。
2. 保留已有 build/flash/linker/release aliases，加入 DevOps plugin ownership。
3. 添加根入口薄转发和兼容/负向测试。

#### 输出物
- 文件：共享 catalog metadata/resolver 的定点修改、根入口和测试。
- 中间产物：canonical ID/alias 解析矩阵。

#### 约束边界
- 接口和依赖：聚合层调用插件声明；插件不导入聚合实现。
- 资源与生命周期：不新增持久运行状态。
- 并发、ISR、DMA：不适用。
- 内存和生成边界：不手工改生成产物，不删除旧 alias。

#### 验证
| 字段 | 内容 |
|---|---|
| 证据等级 | host |
| 命令或条件 | cwd 仓库根；执行 DevOps catalog/alias tests |
| 预期结果 | alias 解析确定、canonical ID 唯一、旧调用不静默失败 |
| 产物位置 | `codex/plugin-split/artifacts/devops/T-005/` |
| 当前状态 | not-run |

#### 失败处理与回滚
- 失败现象：重复 ID、旧 alias 回归、聚合入口环依赖。
- 定位顺序：canonical registry → alias map → Agent route → package command。
- 重试/降级：不删除旧映射来消除冲突；找出唯一事实源后修正。
- 回滚：恢复本 Task 触及的 catalog/route/package 文件。
- 回传条件：兼容要求与 Spec 有冲突时回 Review Gate。

### T-006：增加 DevOps 包级校验和 Codex/Cursor manifests

| 字段 | 内容 |
|---|---|
| order | 6 |
| parallel_group | none |
| source_plan_ids | P-01,P-06 |
| source_spec_ids | DVO-F01,DVO-F02,DVO-F07,DVO-G02,DVO-G07,DVO-A01,DVO-A03 |
| owner_agent | embedded-lead |
| support_agents | toolchain-engineer |
| owner_skill | tools-build |
| supporting_skills | tools-verification |
| allocation_evidence | 插件 manifest 和 validator 属包构建/静态验证 |
| confidence | confirmed |
| status | pass |

#### 目标
使 DevOps 插件可独立校验，两个宿主声明一致且无未声明动态能力。

#### 范围
- 包含：package scripts、validator、manifest validator 和测试。
- 不包含：真实宿主 UI 结果（由 T-007）、外部副作用。
- 所属层：插件包/宿主适配。

#### 前置条件与依赖
- 前置任务：T-001 至 T-005。
- 外部前提：descriptor schema 与 manifest roots 已确认。
- 依赖证据：共享 contracts、插件 Skill roots、catalog entries。

#### 执行步骤
1. 添加包级 `validate`、`validate-manifests`、`skills` 命令。
2. 校验目录清单、包 ID/version、manifest host 名称和 Skill roots。
3. 补充坏 manifest、遗漏 Skill、重复 ID 的负例测试。

#### 输出物
- 文件：validator、package scripts、相关静态/主机测试。
- 中间产物：validator report。

#### 约束边界
- 接口和依赖：Node 内置模块与共享 contracts。
- 资源与生命周期：无硬件访问。
- 并发、ISR、DMA：不适用。
- 内存和生成边界：manifest 只声明 Codex/Cursor，不伪报动态卸载。

#### 验证
| 字段 | 内容 |
|---|---|
| 证据等级 | static/host |
| 命令或条件 | cwd 仓库根；`npm --prefix plugins/mcu-workbench-devops run validate` 与 `validate-manifests` |
| 预期结果 | 正常输入通过，负例明确失败 |
| 产物位置 | `plugins/mcu-workbench-devops/artifacts/T-006/` |
| 当前状态 | not-run |

#### 失败处理与回滚
- 失败现象：manifest 不同宿主格式不一致、validator 漏检。
- 定位顺序：schema → package metadata → manifest → Skill root。
- 重试/降级：不降低 schema；增加/修正检查后复验。
- 回滚：删除/恢复本 Task 新增入口和测试。
- 回传条件：宿主格式无法满足已批准 Spec 时回 Plan/Review Gate。

### T-007：增加回归测试并分别执行 Codex/Cursor 宿主检查

| 字段 | 内容 |
|---|---|
| order | 7 |
| parallel_group | none |
| source_plan_ids | P-06,P-07,P-08 |
| source_spec_ids | DVO-T01..DVO-T10,DVO-A01..DVO-A08 |
| owner_agent | embedded-lead |
| support_agents | verification-engineer, toolchain-engineer |
| owner_skill | tools-verification |
| supporting_skills | tools-quality |
| allocation_evidence | Spec 指定分宿主验收；Plan V-01..V-08 |
| confidence | user-confirmed |
| status | pass |

#### 执行记录

- allocation_id: `T-007-20261124-DEVOPS-REGRESSION`；primary_agent `embedded-lead`；support_agents `verification-engineer, toolchain-engineer`；owner_skill `tools-verification`；supporting_skills `tools-quality`。
- 测试先行：新增并执行 `tests/devops-plugin.test.js`、`tests/devops-catalog.test.js`、`tests/devops-projection.test.js`、`tests/devops-skills.test.js`、`tests/devops-external-skills.test.js`；断言缺失先失败，补实现后通过。
- 当前专项验证：上述 5 个 DevOps 测试文件及 `tests/skills.test.js` 共 6 suites、41 tests，通过；包 validator 报告 16 Skills；manifest validator 通过；链接 validator 报告 73 个 Markdown 文件有效；根聚合插件 validator 通过。
- 完整 Jest：修正 `tests/sync-codex-skills.test.js` 中总数与分类计数不一致的断言（总计 23 = academic 22 + bibliography 1；排除 bibliography 后 22）。使用系统 Node、获准沙箱外执行并设 30 秒单测超时后，全量 exit 0，64/64 suites、376/376 tests 通过；日志为 `codex/plugin-split/artifacts/devops/T-007/jest-full-system-node.log`。此前沙箱内外失败日志保留为诊断历史，不代表最终状态。
- 宿主检查：新建用户级 Codex personal marketplace 与插件副本后，`codex plugin list` 报告 DevOps `installed: true`、`enabled: true`；用户确认 Codex 和 Cursor 中均可查找到 DevOps，记录为 `user-confirmed`。Codex 桌面中的实际 Skill 调用仍未验证。详细证据见 `codex/plugin-split/artifacts/devops/T-007/result.md`。
- npm 命令在 PowerShell 中不可用；使用仓库根目录下 Node 直接执行目标测试/校验脚本。该限制不影响已通过的专项测试。
- 状态：`blocked`；不把静态 manifest 或主机测试记作 Codex/Cursor UI 通过，也不把部分 Jest 输出写成全量通过。

#### 目标
形成静态/主机回归结果，并分别记录 Codex 和 Cursor 的真实发现情况。

#### 范围
- 包含：插件 validator、links、catalog/aliases、rollback、provenance 和两宿主 discovery。
- 不包含：真实固件构建、烧录、生产发布、签名或远端推送。
- 所属层：验证/宿主验收。

#### 前置条件与依赖
- 前置任务：T-006。
- 外部前提：Codex 与 Cursor 当前环境可用；不可用时记录为未验证。
- 依赖证据：DVO-T01..T10。

#### 执行步骤
1. 运行包级静态/主机验证和根 Jest 相关回归。
2. 单独检查 Codex 插件及 Skill discovery，保存 UI/会话证据。
3. 单独检查 Cursor 插件及 Skill discovery，保存 UI/会话证据。
4. 汇总 provenance 和 rollback 负例，不将静态结果提升为宿主证据。

#### 输出物
- 文件：直接相关的回归测试（如需）。
- 中间产物：分宿主验收记录与验证报告。

#### 约束边界
- 接口和依赖：不改业务实现，仅补测试或修正 Spec 内兼容缺陷。
- 资源与生命周期：不触发硬件和外部生产系统。
- 并发、ISR、DMA：不适用。
- 内存和生成边界：保留测试数据边界，不操作用户投影。

#### 验证
| 字段 | 内容 |
|---|---|
| 证据等级 | host |
| 命令或条件 | cwd 仓库根；运行项目现有 Jest 和 package validators；Codex/Cursor UI 分别刷新检查 |
| 预期结果 | 静态/主机通过；两个宿主结果分别明确 pass/blocked/unverified |
| 产物位置 | `codex/plugin-split/artifacts/devops/T-007/` |
| 当前状态 | pass；全量回归通过；Codex/Cursor discovery 为 user-confirmed；Codex 桌面 Skill 实际调用列为未验证项；见 T-007 result.md |

#### 失败处理与回滚
- 失败现象：回归失败、宿主不可发现或宿主环境不可用。
- 定位顺序：插件 manifest → Skill path → catalog/alias → host cache/UI。
- 重试/降级：修复 Spec 范围内缺陷并重跑；宿主无法测试则保留未验证，不假报通过。
- 回滚：仅回滚本 Task 新增测试或宿主适配改动。
- 回传条件：若发现需求或验收变化回 Spec；普通实现失败由 task-execution 修复复测。

### T-008：对照 Spec 执行统一最终 Verify

| 字段 | 内容 |
|---|---|
| order | 8 |
| parallel_group | none |
| source_plan_ids | P-08 |
| source_spec_ids | DVO-A01..DVO-A08 |
| owner_agent | embedded-lead |
| support_agents | verification-engineer |
| owner_skill | tools-verification |
| supporting_skills | tools-quality |
| allocation_evidence | workflow contract 要求全部 Task 完成后统一 Verify |
| confidence | confirmed |
| status | pass with limitations |

#### 目标
逐项判定 DevOps 插件整体是否满足 Spec DVO-A01..A08。

#### 范围
- 包含：汇总所有 Task 证据；检查变更范围、基线新增问题和未验证项。
- 不包含：Verify 阶段直接改实现；发现偏差返回对应 Task 或 Review Gate。
- 所属层：最终验证。

#### 前置条件与依赖
- 前置任务：T-001..T-007 全部通过。
- 外部前提：全部验证产物可读。
- 依赖证据：DVO-A01..DVO-A08。

#### 执行步骤
1. 建立 Spec 验收项到 Task 证据的映射。
2. 逐项核对通过、失败、阻塞或未验证。
3. 有偏差则停止并回传，不在 Verify 中修代码。

#### 输出物
- 文件：`codex/plugin-split/artifacts/devops/final-verify.md`。
- 中间产物：验收矩阵及未验证项列表。

#### 约束边界
- 接口和依赖：只读检查，发现偏差回传。
- 资源与生命周期：不执行外部副作用。
- 并发、ISR、DMA：不适用。
- 内存和生成边界：不更改被验证内容。

#### 验证
| 字段 | 内容 |
|---|---|
| 证据等级 | static/host |
| 命令或条件 | cwd 仓库根；按 DVO-A01..A08 对照 Task 产物并执行 `git diff --check` |
| 预期结果 | 所有可验收项有证据；未验证项明确列出；无未解释范围外差异 |
| 产物位置 | `codex/plugin-split/artifacts/devops/final-verify.md` |
| 当前状态 | pass with limitations；Spec 验收映射见 `codex/plugin-split/artifacts/devops/final-verify.md`；Codex 桌面 Skill 实际调用与外部 provenance 保持未验证 |

最终 Verify 证据 SHA-256：`final-verify.md` = `1C4726CA490B2E74A709E097253F1778BAF7A7605F2F053904F2AC75FCDE152D`；`T-007/result.md` = `D28BBD942C3EEA7D438E81F7A15E46BB989B121DEB98850BB2DAA1360A00F674`；`T-007/jest-full-system-node.log` = `684341D28AB6E4584380C21E11AD658A3D6C64E7459EB64E0273BA5134B8C351`；`T-007/codex-cli-discovery.log` = `4540AF1D8ADCB0CFC83103603C7A39AD08C4B36BB4796899F429981EFC214632`；`diff-check.log` = `FC2E7E1282C49B605AB86ACE38EE838389DCBC7658011FE7EB2A5FF6CC5BF378`。完整 Jest 日志的 SHA-256 和退出码见最终 Verify 报告。

#### 失败处理与回滚
- 失败现象：任一验收项缺证据或失败。
- 定位顺序：Spec ID → Plan ID → Task 产物 → 当前差异。
- 重试/降级：不得降低验收门槛；按偏差返回上游。
- 回滚：不适用；此任务只读。
- 回传条件：需求偏差回 workflow-review-gate；实现偏差回 task-execution。

## 5. 任务级验收汇总

### 已完成任务记录（T-001 至 T-006）

项目绝对 cwd：`C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai`。

| task_id | 先行检查 | 实现后验证 | 结果/证据等级 |
|---|---|---|---|
| T-001 | 专项测试在包目录不存在时以 module-not-found 失败 | `node node_modules/jest-cli/bin/jest.js --runInBand tests/devops-plugin.test.js`，2/2 pass | pass，host；descriptor + package + manifests |
| T-002 | 五项插件 canonical SKILL.md 断言 5/5 失败 | 同命令 `tests/devops-skills.test.js`，5/5 pass；链接检查后 51 个 Markdown 文件有效 | pass，host/static |
| T-003 | 外部 Skill 目录断言 11/11 失败 | 同命令 `tests/devops-external-skills.test.js`，11/11 pass；全插件链接检查 73 个 Markdown 文件有效；inventory 的 provenance 状态保留 blocked | pass，host/static |
| T-004 | 投影脚本不存在时测试加载失败；第一次实现暴露重复运行状态断言 | `tests/devops-projection.test.js` 2/2 pass；`node plugins/mcu-workbench-devops/scripts/sync-skills.js` 首次创建、再次运行 unchanged | pass，host |
| T-005 | DevOps 插件映射/根兼容命令断言缺失时失败 | `tests/devops-catalog.test.js` 3/3 pass；`node scripts/validate-plugin.js` 通过，105 个注册 Skills、7 个 Agents、9 个架构层 | pass，host/static |
| T-006 | standalone validator 缺失测试失败 | 五个 DevOps 测试文件 + `tests/skills.test.js` 共 6 suites/41 tests pass；插件 validator 显示 16 Skills；manifest validator pass | pass，static/host |

以上各命令均从表列绝对 cwd 执行。PowerShell 无 `npm` 命令，因此同步/校验使用 Node 入口；测试使用仓库本地 Jest CLI。

| task_id | 验收项 | 证据等级 | 命令/条件 | 预期结果 | 产物 | 状态 |
|---|---|---|---|---|---|---|
| T-001 | 包骨架契约 | static/host | 仓库根执行插件 validator | descriptor/manifest 合法 | plugin report | pass |
| T-002 | canonical 树完整 | static/host | 仓库根核对文件清单和 hash | 五项内容和必要引用完整 | migration report | pass |
| T-003 | 外部项登记 | static/host | 逐项核对 11 IDs/inventory/source | 状态准确，未知值未伪填 | provenance report | pass with limitation |
| T-004 | 投影安全 | host | 插件同步器正常/漂移 fixture | clean sync 可重跑，漂移时拒绝覆盖 | sync report | pass |
| T-005 | 旧调用兼容 | host | DevOps catalog/alias tests | 唯一 ID，旧 alias 确定解析 | Jest report | pass |
| T-006 | 包级检查 | static/host | 插件 validate 与 manifest checks | 正常通过，坏输入失败 | validator report | pass |
| T-007 | 分宿主发现 | host | Codex UI 与 Cursor UI 分别检查 | 分别记录发现状态和证据 | `artifacts/devops/T-007/result.md` | pass |
| T-008 | 最终 Verify | static/host | 对照 DVO-A01..A08 + diff check | 证据闭合或明确 blocked/unverified | final-verify.md | pass with limitations |

## 6. 阻塞与未验证项

| ID | 类型 | 内容 | 影响任务 | 证据/补证动作 | 状态 |
|---|---|---|---|---|---|
| B-01 | 未验证 | 11 项外部 Skill 的来源/版本/许可证/依赖 | T-003,T-008 | 保持 inventory blocked/unknown；逐条确认可用文件 | open |
| B-02 | 已确认 | 用户确认 Codex 可查找到 DevOps 插件；CLI 已安装并启用 | T-007,T-008 | 如需提高证据等级，再观察 Codex Skill 调用 | closed (user-confirmed) |
| B-03 | 已确认 | 用户确认 Cursor 可查找到 DevOps 插件 | T-007,T-008 | 如需提高证据等级，再独立观察 Cursor Skill 调用 | closed (user-confirmed) |
| B-04 | 阻塞 | projection 目标存在的用户改动状态 | T-004 | marker/hash 检查与漂移拒绝测试通过 | closed |
| B-05 | 历史阻塞（已解决） | 初次 Jest 运行受 Codex Node 沙箱子进程限制；已切换系统 Node 并在获准环境重跑通过 | T-007,T-008 | 最终命令 exit 0，64 suites/376 tests | closed |
| B-06 | 未验证 | Codex/Cursor 插件发现均已 user-confirmed；Codex CLI 已安装启用，实际 Skill 调用未执行 | T-007,T-008 | 如需确认运行时技能执行，再用 Codex 会话调用 DevOps Skill | carried limitation |

## 7. 下游交接

- 需求/约束输入：`C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai\codex\plugin-split\spec.md`
- 实施路线输入：`C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai\codex\plugin-split\plan.md`
- 任务清单：本文件。
- 阶段级 Agent/Skill 基线：Plan 第 8A 节。
- 执行规则：T-001 到 T-007 严格串行；每项通过独立审查和验证后再进入下一项；最后运行 T-008。
- 代码完成后：T-007/T-008 阻塞关闭，且全体验收完成后，将 Spec、Plan、Task、变更集、逐项验证产物和外部 metadata 限制交给 `workflow-final-review`。
- 新事实回传：不改变范围的文件级事实更新 Task；范围、依赖或验收变化回 `workflow-review-gate`。
