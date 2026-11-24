# MCU Workbench Architecture 插件拆分计划

> 本计划对应用户批准的 `spec.md v0.8-architecture-fourth-plugin`。用户选择方案 A：插件持有 canonical Skill 源，旧聚合 Skill 路径由带 marker/hash 的安全同步器生成投影。

## 1. 元数据与状态

| 字段 | 内容 |
|---|---|
| request_id | `REQ-PLUGIN-SPLIT-20261123` |
| 生成时间 | `2026-11-24T16:20:00+08:00` |
| 计划版本 | `v0.1-architecture-plugin-owned-sources` |
| 计划状态 | `approved` |
| 项目路径 | `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai` |
| 分支/提交 | `host_ai @ 6cd4fadc93ddaff5b03efbf7b32fa6a72b97883b`；工作区有预存未提交改动 |
| 输入 spec.md | `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai\codex\plugin-split\spec.md` |
| 输入 Review-Package | `spec.md` v0.8 的 RCP、四个审计章节及 Review Gate 记录 |
| Spec 力度 | `full` |
| 风险叠加门禁 | `versioned` |
| 选定方案 | `方案 A` |
| 方案选择人 | 用户；2026-11-24 选择“方案 A：插件持有源” |
| 用户审查状态 | `approved`（用户于 2026-11-24 批准 Plan 并要求生成 Task） |
| 方案审查结论 | `通过` |

## 2. 一句话说明

- 要解决的问题：架构 Skills 目前位于聚合仓库的 `skills/`，还没有自包含的 architecture 插件包。
- 计划做什么：新增 `mcu-workbench-architecture` 插件；插件拥有 31 项 canonical 架构 Skills 和 8 项归属矩阵确认的外部 Skills；根路径由插件同步器安全生成兼容投影。
- 明确不做什么：不迁移 workflow 项目管理、其他插件或 unknown 内容，不更改 Skill 语义/固件/分层契约，不执行目标固件构建或硬件操作。
- 预期结果：插件可单独校验并分别通过 Codex、Cursor 的发现验收；旧聚合入口和 IDs/aliases 保持确定行为。

## 3. 输入依据与工程事实

| ID | 事实或约束 | 证据 | 可信等级 | 对计划的影响 |
|---|---|---|---|---|
| E-01 | 当前 HEAD 为 `6cd4fadc93ddaff5b03efbf7b32fa6a72b97883b`，工作树包含用户未提交变更 | `git rev-parse HEAD`、`git status --short --branch` | confirmed | 全程保留既有修改；只触及当前 Plan/Task 和获批阶段范围 |
| E-02 | architecture 尚无独立插件目录；verification/devops/observability 已有独立包 | `Get-ChildItem plugins -Directory`；各插件 `descriptor.json`/manifest | confirmed | 复用已存在包契约，不推断宿主运行能力 |
| E-03 | catalog 中有 31 项 App/Service/Platform/Impl/Vendor canonical Skills，路径均存在 | `skills/catalog.js` 分类查询及 `fs.existsSync` 只读脚本 | confirmed | 按 IDs 清单逐项迁移，不以目录模式猜测 |
| E-04 | ownership matrix 中 8 项 architecture 外部 Skill 均登记且其 `SKILL.md` 存在 | `skill-ownership-matrix.md`、`catalog-metadata.js`、只读存在性脚本 | confirmed（归属/存在）；provenance 依 inventory | 纳入包和投影；未知来源/许可证/依赖状态原样保留 |
| E-05 | 选定能力当前共有 217 个 Markdown 文件；主仓库链接校验在所查阶段为 0 errors | canonical + 外部目录清单；`lib/skill-links.js` 的只读扫描 | confirmed（扫描时点） | Plan 记录迁移前链接基线并与迁移后同范围比较 |
| E-06 | 被选 Skills 有 37 条相对链接指向包边界外，涉及 13 个源目标；递归引用闭包扫描到 88 个文件（79 Markdown） | 本轮只读 link closure 脚本；输出保存在本对话执行记录 | confirmed（扫描时点） | 独立包内生成只读 `_shared` 依赖快照；快照不注册为架构 Skills，不更改其源归属 |
| E-07 | DevOps 已有 plugin-owned source、根投影 marker/hash、相对链接重写的可读实现 | `plugins/mcu-workbench-devops/scripts/sync-skills.js` | confirmed | 复用安全策略并扩展映射/跨包引用；不照搬未验证行为 |
| E-08 | 当前 `pluginSkills()` 推导路径为 `plugins/<pluginId>/skills/<id>`，Descriptor schema 的 dependencies 仅为 ID 字符串 | `skills/catalog.js`、`packages/contracts/schemas/plugin-descriptor.schema.json` | confirmed | Plugin source 按 Skill ID 平铺；不新增未定义的版本范围依赖协议 |
| E-09 | 全量根链接扫描与所选 Skills 的链接扫描仅证明仓库当前快照，不证明安装包跨宿主行为 | `scripts/validate-skill-links.js`、本 Plan 验收边界 | confirmed | 静态、主机、Codex 和 Cursor 结果分别记录 |
| E-10 | `tools-quality` 与 `tools-verification` 根路径和对应 verification 插件路径在当前工作区内容 hash 不同；根路径文件含预存未提交改动 | `git status --short`、迁移前只读 SHA-256 对比 | confirmed | 本任务只读记录两边版本；共享 snapshot 以根工作树当前字节为输入，不覆盖/同步修改原 owner 内容 |

### 3.1 选中 Skill ID 与路径映射

Canonical 源迁入 `plugins/mcu-workbench-architecture/skills/<id>/`，旧路径投影如下。外部项源迁入相同的平铺目录；表中源路径是本阶段只读基线，迁移后改由插件目录唯一持有。

| Skill ID | 当前源/旧聚合路径 | Owner |
|---|---|---|
| `app-architecture` | `skills/app/app-architecture` | canonical architecture |
| `platform_mcu`, `platform_os`, `platform_bsp`, `platform_common`, `platform_middleware` | `skills/platform/<id>` | canonical architecture |
| `impl_os`, `impl_mcu`, `impl_board`, `impl_bsp`, `impl_middleware` | `skills/impl/<id>` | canonical architecture |
| `service_system`, `service_battery`, `service_backlight`, `service_calendar`, `service_diagnosis`, `service_log`, `service_ota`, `service_power`, `service_sensor`, `service_storage`, `service_watchdog` | `skills/service/<id>` | canonical architecture |
| `vendor_mcu`, `vendor_rtos`, `vendor_lvgl`, `vendor_stack`, `vendor_fatfs`, `vendor_fal`, `vendor_flashdb`, `vendor_letter_shell`, `vendor_algorithm` | `skills/vendor/<id>` | canonical architecture |
| `chip-driver-manual`, `chip-resource-finder`, `embedded-architecture-planner`, `embedded-coding-standard`, `embedded-minimal-project-builder`, `embedded-prd-to-logic`, `prd-to-hardware-solution`, `schematic-pinmap-analyzer` | `skills/<id>` | external Skill；provenance 按 inventory |

每个目标路径在实现前仍须与实际 catalog/inventory 对照；若当前映射已经变化，先更新 Plan，不得覆盖新文件。

## 4. 两个候选方案与用户选择记录

### 方案 A：插件持有 canonical 源（已选择）

- 适用场景：插件需要可独立打包、发现和验证，同时根仓库保留过渡兼容。
- 做什么：迁入 39 项 Skill 内容；插件路径成为唯一可编辑源；同步器生成根聚合兼容投影和本地依赖快照。
- 主要改动：新增 `plugins/mcu-workbench-architecture/`；调整 catalog/aliases、根转发脚本和 architecture 测试；原 `skills/` 路径变为受保护投影。
- 优点：包可自包含；独立宿主只需插件目录；兼容目录有 marker/hash 且可重建。
- 缺点：迁移/相对链接处理范围较大；根路径变成生成物，用户后续不应直接编辑投影。
- 成本：较高；需要迁移、link closure 打包、两向链接映射、marker adoption、catalog 和双宿主验证。
- 风险：错误覆盖现有技能内容、遗漏引用资源、生成文件被手工编辑、外部 provenance 被误报。
- 验收方式：逐项清单/hash；正反向链接测试；marker 漂移拒绝和 rollback fixture；包 validator；Codex/Cursor 分宿主验证。
- 回滚方式：停止同步；确认 marker/hash；恢复旧聚合目录及 registry 映射；保留插件副本供排查，不覆盖预存用户内容。

### 方案 B：聚合根目录继续持有源，插件目录生成打包副本

- 适用场景：短期优先减少根路径迁移，且所有插件发布都严格经仓库级构建器。
- 做什么：保留 `skills/` 为唯一编辑源；新增打包脚本将 39 项内容、闭包资源写入插件 `skills/` 作为生成包。
- 主要改动：根 catalog 和多宿主 manifest 仍需要调整；插件目录变成生成产物；每次打包前必须运行根级构建命令。
- 优点：初始迁移较少；旧目录与本地工具路径无需改变。
- 缺点：插件不是独立维护单元；发布依赖仓库根目录和额外构建步骤；生成目录仍需防止手工修改，脱离 monorepo 难以校验。
- 成本：中等初始成本、持续发布成本较高。
- 风险：未运行生成器就发布过期内容；Codex/Cursor 加载的是副本而非编辑源；根仓库重组会破坏打包入口。
- 验收方式：根构建器 clean build、快照 hash 对比、独立插件 validator 和两个宿主发现检查。
- 回滚方式：删除仅由构建器创建的插件目录并恢复根 catalog/manifest 映射；根源内容保留。

### 方案对比

| 维度 | 方案 A | 方案 B | 依据 |
|---|---|---|---|
| 易理解程度 | 插件目录是内容源，根目录是兼容投影 | 根目录是内容源，插件目录是发布副本 | 均可解释；A 与插件自包含目标更一致 |
| 改动范围 | 多目录迁移、链接重写和安全同步 | 根内容保留，增加根级打包器 | E-03/E-04 的 39 项来源与 E-06 链接闭包 |
| 实现复杂度 | 初始较高，后续发布直接 | 初始中等，发布持续依赖构建 | 现有 DevOps sync 作为 A 的仓库证据 |
| 运行时资源 | 无新增运行时服务；安装时静态 Skills | 无新增运行时服务；打包阶段复制 | 插件仅声明 Skills |
| 架构风险 | 投影覆盖/链接映射需严格防护 | 根仓库成为插件发布的隐含运行依赖 | 目标要求独立包和可发现 |
| 可验证性 | marker/hash、包级 validator、宿主检查 | build/hash、包级 validator、宿主检查 | 两者均可测；A 可直接验证插件源 |
| 回滚难度 | 中；需要 marker 与源/投影一致性检查 | 低到中；保留根源即可 | 用户改动保护要求 |
| 后续扩展性 | 高；插件拥有目录和版本边界 | 中；每插件依赖根打包器的持续维护 | 五插件路线与既有 DevOps 模式 |

### 用户选择

```text
selected_option: A
decision_owner: user
decision_rationale: 用户选择“方案 A：插件持有源（推荐）”
rejected_option: B
new_constraints: 无；遵守 v0.8 Spec，不扩大插件归属
```

## 5. 选定方案概览

- 选定方案：A，插件拥有 39 项迁移 Skill 的 canonical 源；根旧路径由生成器投影。
- 选定原因：让插件具有完整自包含边界，并沿用 DevOps 现有 marker/hash 迁移实践。
- 与 Spec 一致性：包含 31 项架构 canonical 与 8 项矩阵外部项；workflow 和其他归属不迁移；Codex/Cursor 单独验收。
- 施工边界：architecture 插件包、插件源 Skills、共享只读依赖快照、旧根投影、catalog/resolver、必要聚合入口/测试。
- 非目标：修改迁移 Skill 的业务解释；修改其他插件 canonical 源；改变分层契约或目标固件；Claude/OpenCode/动态卸载验收。
- 主要风险：相对链接、共享文档快照闭包和已有用户改动保护。遇到 marker 不匹配或投影漂移时拒绝写入并回报，不自动覆盖。

## 6. 分层、调用链与接口边界

```text
Codex/Cursor host → architecture manifest → plugin Skill roots → 39 registered Skills
                                         ↘ descriptor/package metadata
Old aggregate caller → catalog/resolver → generated root projection → same Skill IDs
```

- 目标调用链：宿主只从 `plugins/mcu-workbench-architecture/skills/` 发现 Skill；聚合入口通过 catalog ID/alias 与受保护根投影兼容。
- 各层职责：App/Service/Platform/Impl/Vendor 分类原样保留；插件包只提供知识/规则/脚本；不接入固件运行时层。
- 允许依赖：插件 validator 依赖共享 contracts/catalog API；共享快照仅由当前其 canonical owner 的文件生成；聚合层调用插件公开登记。
- 禁止依赖：插件 import 根聚合实现；插件以不稳定物理路径跨依赖别的插件；用目录存在替代 descriptor/registry。
- Wrapper/Port/Driver/Handle/Handler：固件软件分层中的现有定义照搬保留，不在插件拆分改写。
- 接口输入、输出和所有权：`descriptor.json` ID 为 `mcu-workbench-architecture`，版本按同插件 manifest/package 同步；`pluginSkills()` 唯一列出 39 个 ID；旧路径为脚本生成文件。
- 链接及资源所有权：源 Skill 内部和跨 Skill 链接在插件源中指向扁平插件 Skill ID；包外相对引用改写到 `references/shared/` 生成快照。快照登记源路径、source owner、hash 和生成规则，不作为 plugin Skills，也不改源 owner。
- 阻塞、线程安全和可重入性：无运行时任务/线程/ISR/DMA；同步脚本是离线文件操作，必须先验证所有映射、marker 和哈希，再 staging/backup 原子替换，失败回滚。

## 7. 文件施工顺序

| ID | 阶段 | 动作 | 文件或目录 | 所属层 | 施工内容与理由 | 责任 Skill | 前置条件 | 生成/覆盖边界 | 状态 |
|---|---|---|---|---|---|---|---|---|---|
| P-01 | 基线/审计 | 新增 | `plugins/mcu-workbench-architecture/` 的 package/descriptor/manifests 与包级校验骨架 | 插件包 | 建立独立契约和失败检查入口 | `tools-build` | Plan 获用户批准；现有插件 schema 清单复核 | 只写新插件目录及定点测试 | ready after approval |
| P-02 | canonical 迁移 | 新增 | `plugins/mcu-workbench-architecture/skills/<31 canonical IDs>/` | 插件 Skill 源 | 从旧分类路径迁移完整目录，扁平 ID 匹配 catalog pluginPath | `tools-git` | P-01；目标目录不存在/可安全采用 | 新目录为唯一可编辑源；不得覆盖外部已存在内容 | ready after approval |
| P-03 | 外部迁移 | 新增 | 插件 `skills/<8 external IDs>/`、inventory/ownership matrix | 迁移审计 | 纳入明确归属项并维持 provenance 字段 | `tools-git` | P-02；8 项逐项基线 hash/状态已记录 | 不改外部来源元信息；不迁 unknown/其他归属 | ready after approval |
| P-04 | 依赖资源 | 新增 | 插件 `references/shared/`、`shared-sources.json` | 只读生成资源 | 打包 E-06 的递归引用闭包；源仍属于原 Skills/插件 | `tools-build` | P-01..P-03；所有源映射和依赖闭包存在 | 仅由同步器生成；source owner 文件只读；与 owner 插件副本不一致时记录两边 hash，以当前根工作树输入快照，不自动改写任一来源 | ready |
| P-05 | 兼容投影 | 新增/修改 | 插件 `scripts/sync-skills.js`；根 `skills/` 中 39 个旧路径；marker | 兼容/生成 | 双向相对链接映射、安全 adopt、marker/hash、staging/rollback | `tools-build` | P-02..P-04；迁移前投影与源树清单完成 | 无 marker 时只允许内容/hash 完全一致的 adopt；否则拒绝覆盖 | ready after approval |
| P-06 | 注册与根入口 | 修改 | catalog metadata/catalog、resolver/Agent routes、根 package scripts、必要兼容转发 | 共享 registry | 注册 39 个 plugin IDs、保留 aliases 和 aggregate 行为 | `tools-git` | P-05 已生成/采用投影 | 按源定义修改；不得手改 generated registry | ready after approval |
  | P-07 | 验证/宿主 | 新增 | 插件 validator、manifest/link/alias/rollback tests、Codex `.agents/plugins/marketplace.json`、Cursor `.cursor-plugin/marketplace.json`、宿主安装/发现记录 | 验证 | 覆盖静态/主机及 Codex/Cursor 独立观察；marketplace entry 负责将本地包暴露给宿主 | `tools-verification` | P-01..P-06 | 只改本阶段对应测试、仓库 marketplace 清单和证据；用户级安装只安装已批准的本地插件 | ready after approval |
| P-08 | Final Verify | 不修改 | Spec 验收矩阵、git diff、基线对比和报告 | 最终验证 | 逐项检查 ARC-A01..A08；偏差回 Spec/Plan | `tools-verification` | P-01..P-07 各 Task 有证据 | 只读检查，不在 Verify 中修代码 | ready after approval |

## 8. 阶段计划与交接

| 阶段 | 目标 | 输入 | 输出 | 完成条件 | 交接对象 |
|---|---|---|---|---|---|
| 1 | 确认基线与迁移映射 | Spec、catalog、ownership、git status | 精确 39 ID/path/hash 清单、引用闭包及现有投影冲突表 | 无未知目标路径；预存改动基线已留存 | workflow-task-execution |
| 2 | 建立插件骨架和 canonical/external 源 | P-01 清单 | descriptor、manifests、39 Skill sources | validator 发现 39 项且源/旧路径对应明确 | workflow-task-execution |
| 3 | 处理依赖闭包并投影兼容路径 | 39 Skill 源、shared source map | shared snapshots、syncer、marker、旧目录投影 | 重复运行稳定；漂移拒绝；失败回滚 | workflow-task-execution |
| 4 | 更新 catalog、aliases、根入口 | 插件包和同步报告 | 唯一注册、旧调用兼容、根薄转发 | 无重复/孤儿 Skill；旧 ID 可解析 | workflow-task-execution |
| 5 | 执行 package、回归、宿主验证和统一 Verify | 变更集及验收矩阵 | 报告、日志、SHA-256、最终 Verify | ARC-A01..A08 有结论；未验证项明示 | workflow-final-review |

## 8A. 下游执行 Agent 与 Skill 基线

| 阶段/ID | 主 Agent | 协作 Agent | 主实现 Skill | 辅助 Skill | 分配理由与证据 | 状态 |
|---|---|---|---|---|---|---|
| P-01 | `embedded-lead` | `system-architect`, `knowledge-engineer` | `tools-git` | `workflow-review-gate` | 涉及 ownership、历史变更保护和 source mapping | ready after approval |
| P-02/P-03 | `embedded-lead` | `system-architect`, `knowledge-engineer` | `tools-git` | `tools-quality` | 以文件迁移、ID 唯一和 provenance 保护为主 | ready after approval |
| P-04/P-05 | `embedded-lead` | `toolchain-engineer`, `verification-engineer` | `tools-build` | `tools-verification` | 同步器、生成边界、marker/hash 和回滚 | ready after approval |
| P-06 | `embedded-lead` | `system-architect` | `tools-git` | `workflow-review-gate` | 共享 catalog/resolver 和兼容调用唯一事实源 | ready after approval |
| P-07/P-08 | `embedded-lead` | `verification-engineer`, `toolchain-engineer` | `tools-verification` | `tools-quality` | 主机校验、两宿主证据和 Spec 验收映射 | ready after approval |

每项 Task 执行时复核一个主实现 Skill；上述为阶段基线，不表示实际 Agent 已被调用。

## 9. 资源、并发与生命周期约束

- 任务、优先级、栈和周期：不适用；无固件运行任务。
- 队列、通知、信号量和互斥量：不适用；离线同步脚本单进程执行。
- ISR 允许/禁止调用：不适用。
- DMA 缓冲区、Cache、对齐和所有权：不适用。
- 静态分配、内存池或堆：脚本使用 Node 文件流/临时缓冲；不引入常驻运行时。
- 初始化、运行、错误恢复和释放顺序：同步前预检 source/dest/marker/hash；写入 staging；旧目标入 backup；生成后核验；异常时按记录恢复；finally 清理本次临时目录。
- 超时、重试、降级和取消：普通文件错误不自动重试覆盖；漂移/路径逃逸/未知 marker 直接失败并保持当前目录。

## 10. 代码生成约束

| ID | 约束类别 | 必须遵守 | 禁止事项 | 证据 | 状态 |
|---|---|---|---|---|---|
| G-01 | 单一事实源 | 39 Skill 可编辑源归插件；根路径为生成投影 | 双写维护 | ARC-G01；marker/hash | ready |
| G-02 | 所有权 | 仅将矩阵 architecture 项注册到插件 | workflow/unknown/其他插件混入 | ARC-G03；catalog assertions | ready |
| G-03 | 引用闭包 | shared snapshot 登记 owner/path/hash；递归链接完整 | 把依赖副本注册为 Skill 或修改源 owner | ARC-E06；shared manifest | ready |
| G-04 | 幂等与恢复 | 所有写入限制于插件路径、指定根投影及本阶段测试/registry 文件 | 路径逃逸、覆盖漂移用户文件 | projection fixtures + diff review | ready |
| G-05 | 兼容 | 保留旧 IDs/aliases/aggregate 路由 | 靜默移除旧入口 | resolver/alias tests | ready |
| G-06 | 分層與 SOLID | 插件不改固件层契约；SRP/OCP/LSP/ISP/DIP 分项验证 | 插件互相反向依赖或复制运行实现 | 下表 + test reports | ready |
| G-07 | 宿主证据 | Codex/Cursor 分别记录真实发现；静态/主机证据单独命名 | 以 manifest 通过声称宿主已加载 | host observation records | ready |

### SOLID 验证矩阵

| 原则 | 适用判断 | 设计约束 | 验证证据 | 阻塞条件 |
|---|---|---|---|---|
| SRP | 适用 | architecture 仅持有嵌入式架构内容，workflow 继续治理流程 | plugin ID 清单 + workflow 排除测试 | 出现 workflow ID 注册到 architecture |
| OCP | 适用 | 新 Skill 通过清单/映射扩展；不改其他插件核心 | 新 Skill fixture + 原插件契约回归 | 增加一项 architecture Skill 需编辑其他插件实现 |
| LSP | 适用 | Codex/Cursor manifests 都满足共享插件/Skill root 契约 | schema 和独立 manifest validator | 同一插件在任一宿主不满足对应声明 |
| ISP | 适用 | 每个 manifest 只声明本插件实际 Skill root 和入口 | manifest roots 精确集合检查 | 暴露不属于 architecture 的 Skill root |
| DIP | 适用 | registry/validator 依赖共享 contracts 接口，不依赖聚合实现细节 | import/dependency 检查 | 插件依赖根聚合私有实现或循环依赖 |

## 11. 验收与验证计划

工具仓库与固件仓库绝对根目录均为 `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai`；本阶段仅涉及工具仓库。命令均从该 cwd 执行，具体入口可在 Task 阶段依当前脚本确认。

| ID | 证据等级 | 验收项 | 命令/条件 | 预期结果 | 责任 Skill | 产物 | 状态 |
|---|---|---|---|---|---|---|---|
| V-01 | static | descriptor/package/manifests 一致 | architecture package validator | IDs/versions/roots 一致 | `tools-build` | `codex/plugin-split/artifacts/architecture/` | not-run |
| V-02 | static/host | 39 Skill 源清单与 ownership 唯一 | package/canonical inventory validators | 31+8 全部存在且无重复、越界注册 | `tools-verification` | 同上 | not-run |
| V-03 | static | Markdown/scripts/reference closure | `node scripts/validate-skill-links.js --root <architecture package root> --boundary-root <architecture package root>` 或包级等效命令 | 插件内 links 有效；shared bundle 闭包登记 | `tools-verification` | link report | not-run |
| V-04 | host | projection 幂等/漂移/回滚 | package Jest projection tests；sync `--check`/fixture | clean adoption+sync 重复稳定，漂移不覆盖，失败回滚 | `tools-build` | projection report | not-run |
| V-05 | host | catalog、aliases、Agent route、根入口 | 相关 Jest suites 和根 validator | canonical 唯一，旧 alias 确定解析 | `tools-verification` | resolver report | not-run |
| V-06 | host | package 负例 | 缺 Skill/坏 manifest/重复 ID/路径逃逸/marker 变动 fixtures | 每种无效输入明确失败并不破坏原目录 | `tools-verification` | validator report | not-run |
| V-07 | host | Codex plugin discovery/load | 用户环境可用时分别检查实际 Codex；否则记 unverified | 插件及 Skills 可被真实宿主发现 | `tools-verification` | Codex discovery log | not-run |
| V-08 | host | Cursor plugin discovery/load | 单独检查 Cursor UI/CLI | 不用 Codex 证据替代 | `tools-verification` | Cursor discovery log | not-run |
| V-09 | static/host | 根回归和基线新增问题 | 直接相关 Jest、plugin validator、link validator、`git diff --check` | 记录执行命令/exit code；无新增门禁问题或说明基线 | `tools-verification` | final Verify | not-run |

不执行目标固件构建、烧录、运行或实物测试；如宿主 UI/环境不可用，保持相应验收项 `unverified`，不阻塞已获批静态/主机交付但不得声称宿主通过。

## 12. 方案审查记录

| 审查项 | 责任 Agent | 结论 | 证据 | 修订或后续动作 |
|---|---|---|---|---|
| 分层、插件职责和引用边界 | `system-architect` | 可采用 | v0.8 ARC-G03/G06；catalog 分类及引用闭包扫描 | shared targets 只以生成快照提供，不注册为 Skills |
| 文件和源/投影数据流 | `firmware-engineer` | 可采用 | 31 canonical + 8 external 当前路径存在；DevOps sync pattern | 实施前 hash inventory；漂移时阻塞，不覆盖 |
| 验收和回归 | `verification-engineer` | 可采用 | v0.8 ARC-T01..T10/A01..A08；当前 link scan 0 errors | 任务中先补当前缺失断言，再实施 |
| 硬件边界 | `hardware-integration` | 不适用 | 插件拆分，无硬件/目标固件 | 不执行硬件工作 |
| 工具链和宿主 | `toolchain-engineer` | 有条件可采用 | Codex/Cursor manifests 参考 DevOps/verification；真实宿主另验 | 宿主 discovery UI/CLI 结果分别记证据 |

### 审查结论

- 可采用项：方案 A、平铺插件 Skill 源、镜像根路径投影、生成共享引用快照、marker/hash 安全迁移。
- 已完成修订：把 37 条包外链接的 88 文件递归闭包纳入共享只读快照方案；快照不作为 Skill 注册；补充 root projection adoption 保护。
- 未关闭阻塞：无已知 implementation blocker；Codex/Cursor 实际加载结果属于执行时验证，不是 Plan 前置事实。
- 是否改变 `spec.md`：否；引用依赖作为 ARC-F02 的必要随附资源，ownership 不变。
- SOLID：SRP/OCP/LSP/ISP/DIP 均有适用判断、设计约束、证据和阻塞条件（见第 10 节）。
- 最终结论：通过；等待用户批准本 Plan。

## 13. 回滚与失败处理

- 开工前写入 source/root projection manifest，记录每个文件的 SHA-256、当前 Git status 和 marker 状态；预存用户改动留在原地，不 stash、不清理。
- 代码或配置回滚：先停止 sync；marker 与生成 hash 必须匹配；按本次 Task 的 backup 恢复 root 投影、catalog/aliases 和根入口；删除仅由本次新建的插件文件。保留用户文件和非本阶段未提交改动。
- 中途失败后的保留状态：保留插件源、诊断和失败报告；投影恢复到任务开始前；不自动回退其他阶段的未提交内容。
- 验收失败后的定位顺序：ownership/source list → 目录/hash → link closure → source rewrite → projection marker/hash → catalog/resolver → host manifest/UI。
- 不可恢复情况：投影存在未标记差异、用户修改无法确定归属、外部目标缺失或 rollback 测试失败时，立即 blocked 并返回当前任务；不覆盖、不猜测。

## 14. 下游交接

- 正式需求/约束输入：`C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai\codex\plugin-split\spec.md`
- 正式实施计划：本文件；仅在用户批准后交给 `workflow-task-breakdown`
- 阶段级 Agent/Skill 基线：本文件第 8A 节
- 目标文件范围：`plugins/mcu-workbench-architecture/`、Plan 指定的 architecture root projections、`skills/catalog*.js`/resolver 的必要事实源、直接相关 tests 和根薄转发入口
- 执行前必须确认：当前 HEAD/工作树、39 source hashes、root target/marker、88-file dependency closure、实际 test/validator command
- 禁止扩大：不迁移 workflow 项目管理、其他插件 owner、unknown、固件/硬件；不改 canonical Skill 业务语义
- 实现完成后交接：先 `tools-verification` 统一 ARC-A01..A08 Verify，再交 `workflow-final-review`
- 未验证项：真实 Codex/Cursor 加载需在各自运行环境观察；外部 Skill provenance 保持 inventory 状态
- 回传规则：出现新 owner、scope、验收或需要新增 dependency semantics 时，退回 `workflow-review-gate`；纯实现失败按 Task 修复复测

## 15. 当前状态与下一步

- 当前状态：`approved`
- 当前唯一动作：交由 `workflow-task-breakdown` 生成 architecture Task，然后进入 `workflow-task-execution`。
- 阻塞项：无；Codex/Cursor 实际加载结果按 V-07/V-08 执行时分别验证。
