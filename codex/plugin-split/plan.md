# MCU Workbench Workflow 插件拆分计划

> 本计划对应用户已批准的 `spec.md v0.9-workflow-fifth-plugin`。用户选择方案 A：插件目录是唯一可编辑 Skill 源；旧根路径由带 marker/hash 的保护同步器生成投影。本 Plan 尚待用户审阅批准；批准前不生成 Task、不执行迁移。

## 1. 元数据与状态

| 字段 | 内容 |
|---|---|
| request_id | `REQ-PLUGIN-SPLIT-20261123` |
| 计划版本 | `v0.1-workflow-fifth-plugin` |
| 计划状态 | `approved` |
| 项目路径 | `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai` |
| 分支/HEAD | `host_ai @ 43eb4e731568b606451083b0e479a29a5722fb98`（基线；工作树有预存改动） |
| 输入 Spec | `codex/plugin-split/spec.md`，`v0.9-workflow-fifth-plugin`，用户已批准 |
| Spec 力度/叠加门禁 | `full` / `versioned` |
| 选定方案 | A：插件持有 canonical Skill 源 |
| 方案选择人 | 用户，2026-11-24 回复“A” |
| 用户审查状态 | `approved`（用户于 2026-11-24 回复“同意执行”） |
| Review 状态 | `方案 A 有条件通过；Plan 用户审查待定` |

## 2. 目标、范围与结果

新增 `plugins/mcu-workbench-workflow/`，让 Codex 与 Cursor 可分别发现、加载及验证独立 Workflow 插件，同时保持旧聚合入口、Skill ID 和 aliases 可用。插件 `skills/` 是唯一编辑源；原根目录 Skill 路径转为带本插件 marker/hash 的受保护投影。

纳入 14 个完整 Skill 树（含 references、scripts、assets 和必要随附文件）：

| 类别 | Skill IDs | 当前根路径 |
|---|---|---|
| Canonical（9） | `workflow-requirements-router`、`workflow-claude-layering`、`workflow-document-context`、`workflow-requirements-challenge`、`workflow-review-gate`、`workflow-integration-plan`、`workflow-task-breakdown`、`workflow-task-execution`、`workflow-final-review` | `skills/workflow/<id>/` |
| External（5） | `embed-ai-tool`、`embedded-change-report`、`embedded-project-intake`、`embedded-team-sync`、`mrd-to-prd` | `skills/<id>/` |

每个插件源目标为 `plugins/mcu-workbench-workflow/skills/<id>/`。确切文件清单、哈希、相对链接闭包、投影旧路径和冲突状态在实施前重新盘点并作为可审计产物；14 个 ID 清单不得由目录猜测扩张。

明确排除：改归其他插件的 8 项 Skill 的实体迁移（只维护 ownership/inventory）；4 项 `unknown`；`skills/workflow/SKILL.md`（ID `workflow`）、`skills/workflow/references/usage.md`、`skills/workflow/scripts/workflow_runner.py`；`embedded-lead` 等 Agent；根级 `rules/mcu-workflow-io.mdc`；Claude/OpenCode 适配；固件代码与任何构建、烧录或硬件操作。旧 `workflow` 入口及其两项文件保留在聚合仓库，不纳入 Workflow 插件 registry。

外部 Skill provenance 的来源、版本、许可证、依赖未知项继续如实标为 `blocked/unverified`。不得补造元数据或空占位内容。

## 3. 输入证据与当前事实

| ID | 事实 | 证据 | 可信等级 | 计划影响 |
|---|---|---|---|---|
| WF-E01 | 当前分支/HEAD 如元数据所列；工作树含本任务前已有多处修改和未跟踪文件 | 本轮 `git rev-parse HEAD`、`git status --short` | confirmed | 所有操作限定本 Plan 批准后的 Workflow 文件范围；不清理、不暂存无关项 |
| WF-E02 | 9 canonical 与 5 external 的归属已由 v0.9 Spec 明确；其他归属实体迁移另立后续任务 | Spec RCP、ownership matrix、inventory | user-confirmed/confirmed | 源 ID 固定为上表 14 项 |
| WF-E03 | catalog 通过 `pluginSkills()` 将 Plugin ID 映射到 `plugins/<pluginId>/skills/<id>`；目前尚未登记 Workflow | `skills/catalog.js` | confirmed | 新注册须遵循现有映射契约，并保留既有 resolver/alias |
| WF-E04 | alias `workflow-requirements-router` → `workflow-router` 已存在；旧 `workflow` ID 属另一聚合入口 | `skills/catalog-metadata.js` 与目录清单 | confirmed | alias 必须保留；不能误注册/投影旧 `workflow` Skill |
| WF-E05 | Architecture/DevOps 有插件源、marker/hash、adoption guard、漂移拒绝和 staging/rollback 同步器 | 相应插件 `scripts/sync-skills.js` 与 validator | confirmed | 复核并复用已验证策略，不直接假设两个实现完全相同 |
| WF-E06 | `lib/skill-links.js` 提供 Markdown 链接处理；是否足以支撑 Workflow 跨插件闭包须实施前确认 | `lib/skill-links.js` | confirmed / capability detail unverified | 明确插件内、共享 owner、外部和缺失链接的分类及校验 |
| WF-E07 | 14 棵 Skill 当前扫描为 112 个文件、75 个 Markdown；75 条直接本地链接、45 个唯一目标；其中 5 个目标缺失 | 本轮只读目录/link 扫描 | confirmed（扫描快照） | 实施前重新计算完整闭包，变化时按真实证据调整执行任务，不静默忽略 |
| WF-E08 | 五条缺失链接位于 `embed-ai-tool`：两个 `/home/leo/.../skill-template` 链接，一个 `failure-taxonomy.md` 绝对链接，以及 README/README_EN 中两个 `templates/skill-template/` 链接 | `embed-ai-tool` 的 `CONTRIBUTING.md`、`shared/contracts.md`、README | confirmed（当前字节） | 不导入 unknown `skill-template`；保留来源内容并登记未解析/外部依赖，不把链接校验豁免伪装成闭包通过。实施时确定可审计的显式外部链接声明形式；若无法保留引用语义且满足 Spec，暂停该项并回报 |
| WF-E09 | 其他直接链接指向 15 个既有 Skill 根；不能复制为 Workflow 所有源，也不能无登记地形成插件运行时跨插件路径依赖 | 本轮只读 link 扫描 | confirmed（扫描快照） | Task 定义 owner/hash 快照或稳定外链/映射，源 owner 只读且投影边界清楚 |
| WF-E10 | 真实 Codex/Cursor 发现不能由 manifest、静态或主机测试单独证明 | Spec 的宿主证据规则 | confirmed | 两个宿主分开记录；未实际观察时明确标未验证 |

扫描为时间快照，不构成对 14 项后续内容、第三方许可或宿主行为的证明。实施前重新盘点为开工条件。

## 4. 备选方案审查与用户决定

### 方案 A：插件持有唯一源（用户已选）

迁移 14 棵完整 Skill 树至插件目录；根目录旧路径由 Workflow 专属 marker/hash 投影同步器管理。更新 registry 与必要聚合入口，保留旧 IDs/aliases。优点是包边界自包含、编辑源唯一，符合已采用的 Architecture 模式；成本是链接闭包、投影接管和回滚审计范围较大。主要风险为误覆盖、跨插件引用、外部缺失目标、alias 漂移；通过前置冲突盘点、专属 marker、安全 adoption、链接台账和故障注入验收控制。

### 方案 B：根目录保持源、插件包生成副本

保留 `skills/` 可编辑并用仓库级打包器生成插件副本。初期搬动较少，但发布持续依赖根目录脚本，造成根与插件的构建耦合，插件脱离仓库无法作为唯一来源验证，与本轮用户指定的沿用模式不一致。

| 比较维度 | A | B |
|---|---|---|
| 唯一源与独立性 | 插件目录唯一源；根目录投影 | 根目录唯一源；插件为副本 |
| 与既有模式一致性 | 高，用户明确要求沿用 | 低 |
| 初始复杂度 | 较高：完整树迁移、链接闭包、投影保护 | 中：需维护根级打包器 |
| 持续发布成本 | 插件可自验证 | 持续依赖 monorepo 构建 |
| 风险重点 | adoption、漂移、闭包、回滚 | 生成遗漏/过期、隐含根依赖 |
| 决定 | **用户选择** | 未选择 |

**方案审查：有条件通过。** A 符合 Spec 与仓库现有模式。Plan 将外部引用台账、alias 保留、仅 Workflow marker 管理的回滚边界、五项 SOLID 证据和真实宿主证据列为放行/验收要求。五条指向缺失目标的原始链接不得悄然丢弃；不复制 unknown Skill。若实施阶段不能在保留语义的前提下对这些目标进行显式登记，相关验收应阻塞并交回用户/Spec 决策。

## 5. 调用链和所有权

```text
Codex / Cursor → Workflow manifest → plugins/mcu-workbench-workflow/skills/<id>
旧聚合调用 → catalog/resolver + 保留 aliases → 同一 Skill ID 的受保护根投影
同步器 → 仅 Workflow marker 所有的根投影（不接管 Agent、规则或 workflow ID）
```

- 插件 descriptor/package/manifests 的 ID 与版本一致；Skill registry 仅登记 14 个批准 ID。
- 根投影 marker 必须独立于其他插件，并记录相对路径、源/目标哈希及生成器版本；仅管理 marker 声明拥有的路径。
- marker 缺失时，只有明确配置允许且源目标逐字节/hash 一致的文件可安全 adopt；不一致、无标记冲突、未知 marker、路径逃逸或投影漂移均拒绝覆盖。
- 同步采用预检、staging、目标备份、写入后核验及错误恢复；不得通过宽泛删除/重建 `skills/workflow/` 清理旧入口或用户文件。
- 旧 aliases 原值与解析结果写入兼容测试；重点验证 `workflow-router`。旧 ID `workflow` 继续由聚合入口持有。
- 跨 Skill 引用先做完整递归闭包分类：插件内引用随源迁移；指向其他 owner 的引用采用有登记的 owner/hash 快照或经 Spec 允许的稳定外部映射；缺失目标进入显式 ledger。快照不得注册成 Workflow Skill、改写来源 owner 或覆盖其他插件内容。
- 插件不得反向依赖根聚合实现；共享功能只通过已定义 contracts/library API 接入。

## 6. 文件施工与依赖顺序

以下阶段只有在本 Plan 获用户批准后才可拆 Task、执行。精确改动文件由基线 Task 产物锁定；文件变化或冲突必须先更新 Task/Plan。

| ID | 阶段/目标 | 预期范围 | 主实现 Skill | 前置条件/输出与验收 |
|---|---|---|---|---|
| P-01 | 基线冻结和闭包审计 | 只读扫描 14 源树、旧目标、所有子文件、alias/registry、现有 markers、完整递归链接闭包及 owner/hash；记录绝对路径和 SHA-256 | `tools-git` | 工作区基线、逐文件映射、冲突表、外部引用 ledger；五缺失链接与跨插件目标有明确分类，未解项标阻塞 |
| P-02 | 插件包骨架 | 新增 `plugins/mcu-workbench-workflow/` package、descriptor、Codex/Cursor manifests、Skill map、validator/tests 入口 | `tools-build` | schema 与既有插件契约复核；包自身静态校验负例可失败 |
| P-03 | canonical 和外部源迁移 | 按清单完整复制/迁移 9 + 5 目录及随附文件；逐文件哈希核对 | `tools-git` | P-01 清单、目标冲突已解决；插件成为唯一可编辑源；不改 Skill 语义、不纳入排除项 |
| P-04 | 引用闭包和投影同步 | 插件专属同步器、Workflow marker/hash、链接映射、必要 shared 引用快照、staging/backup/rollback | `tools-build` | P-01..03；覆盖 adoption、未知/畸形 marker、无标记文件、漂移、重复运行、部分写入中断和 rollback；只回滚 Workflow 所有路径 |
| P-05 | registry 与旧入口兼容 | `skills/catalog.js`、metadata/alias、resolver 或必要根转发与聚合登记 | `tools-git` | P-04 投影安全就绪；registry 恰有 14 项，保留 `workflow-router`，排除 `workflow` 旧 ID |
| P-06 | 自动化与宿主验收 | Workflow 包 validator、链接/清单/manifest/alias/回滚测试；Codex/Cursor 分别发现和代表性调用记录 | `tools-verification` | P-01..05；静态、主机、Codex、Cursor 分级；不伪称宿主通过 |
| P-07 | 统一 Verify 与 Final Review | 对照 Spec 验收表、差异/基线、生成文件、初检/复检质量证据 | `workflow-final-review` | P-01..06 有证据；所有 Spec 偏差回到 Spec/Plan；通过后才可交付 |

### 回滚序列

1. 停止同步和 registry 发布操作，保存失败日志与临时目录清单。
2. 读取 Workflow marker，验证其 schema、路径边界、当前投影哈希和备份哈希；未知/漂移状态下禁止自动清理。
3. 仅恢复本次 Workflow marker 明确拥有且哈希校验通过的根投影路径；保留任何用户修改或其他插件文件。
4. 恢复 catalog/alias/manifest 变更到本次变更前快照；插件目录可保留用于诊断，或在逐项确认无用户内容后移出活动发现范围。
5. 重跑只读一致性检查并记录恢复前后哈希、退出码和未恢复项。不得使用 `git reset`、宽泛递归删除或触及其他插件 marker。

## 7. Agent/Skill 基线与 SOLID 审查

| 阶段 | 主 Agent | 协作 Agent | 主实现 Skill | 辅助审查/验证 |
|---|---|---|---|---|
| P-01 | `embedded-lead` | `knowledge-engineer` | `tools-git` | `workflow-review-gate` |
| P-02/P-04 | `embedded-lead` | `toolchain-engineer`、`verification-engineer` | `tools-build` | `tools-verification` |
| P-03/P-05 | `embedded-lead` | `knowledge-engineer`、`system-architect` | `tools-git` | `workflow-review-gate` |
| P-06/P-07 | `embedded-lead` | `verification-engineer`、`toolchain-engineer` | `tools-verification` | `workflow-final-review`、`tools-quality` |

此为阶段分配基线，不表示已调用这些 Agent。每项 Task 只允许一个主实现 Skill；辅助角色不得并行改同一代码。

| 原则 | 本 Plan 中的适用判断 | 实现证据/放行条件 |
|---|---|---|
| SRP | 适用；迁移源、链接闭包、投影同步、catalog 注册职责应分离 | 每个模块单一理由变化；同步器不承担 Skill 业务逻辑；对应单元测试 |
| OCP | 适用；新增/移除 Skill 应通过 manifest/map 扩展，不改其他插件实现 | 新增 Skill fixture 仅改 Workflow map/内容即可发现；其他插件回归零新增失败 |
| LSP | 适用；Workflow validator/syncer 遵守共享插件与同步接口契约 | 契约测试验证成功、拒绝、失败回滚的行为；不降低通用契约保证 |
| ISP | 适用；manifest、Skill map 和 CLI 接口保持最小且按需 | 不要求宿主消费无关规则/Agent；CLI flags/输出仅暴露本包职责 |
| DIP | 适用；包依赖共享 contracts 与 `lib/skill-links.js` 等稳定接口 | 插件代码不 import 根聚合 resolver/其他插件私有实现；依赖静态扫描/测试证明 |

任何原则若实现后无法验证或违反，必须阻塞，不可用“重构后再说”放宽。

## 8. 验收映射及证据规则

| ID | 等级 | 通过条件 | 证据 |
|---|---|---|---|
| WF-A01 | 静态 | 新插件 descriptor/package/Codex/Cursor manifest ID、版本、Skill roots 一致合法 | validator 命令、版本、退出码、文件哈希 |
| WF-A02 | 静态/主机 | 精确发现 9 canonical + 5 external；所有随附文件与批准范围匹配，无遗漏/越界/重复 | 源-投影清单、哈希和插件 validator 输出 |
| WF-A03 | 静态/主机 | 完整相对链接闭包分类；内部链接有效；跨插件与五个缺失目标均有显式 ledger，未知不伪报有效 | link checker、ledger、每项状态及 owner/hash |
| WF-A04 | 主机 | manifest、Skill 遗漏/重复、链接错误、marker 格式/路径、冲突 adoption、漂移、重复同步、写入失败及回滚测试有预期结果 | 定点测试报告、命令、版本、cwd、退出码 |
| WF-A05 | 主机 | catalog 保留旧 aliases 和 aggregate 解析行为；`workflow` build/flash/monitor Skill 未误注册到新插件 | catalog/alias 测试及精确 14 ID registry |
| WF-A06 | 安全/回滚 | 未标记路径、其他插件 marker、漂移文件和用户修改不被覆盖；回滚仅恢复 Workflow 所有文件 | 隔离 fixture/哈希前后对比 |
| WF-A07 | 宿主 | Codex 独立发现、加载并完成代表性 Workflow Skill 调用 | 真实宿主操作记录；否则标未验证/阻塞，不以静态结果替代 |
| WF-A08 | 宿主 | Cursor 独立发现、加载并完成代表性 Workflow Skill 调用 | 与 Codex 分开的真实宿主记录；否则标未验证/阻塞 |
| WF-A09 | 审计 | 5 项 external provenance 按实际证据记录；其他 8 项仅归属登记，4 unknown 与旧 `workflow` 仍排除 | inventory/ownership 对照，不声称审计/迁移完成 |
| WF-A10 | 质量 | 五项 SOLID 各自有适用判断与证据；`git diff --check` 通过且限定整改无行为变化 | Review 记录和命令输出 |

静态校验、主机测试、Codex 真实宿主、Cursor 真实宿主分别报告；不得把其中一类结果写成另一类证明。遵循仓库记录要求：每条命令记绝对 `cwd`、退出码、工具版本、产物绝对路径/SHA-256、证据等级与重试次数；对既有基线问题同时报告基线和新增数。固件构建/硬件证据标记为不适用，不推断为通过。

## 9. 阶段交接及停止条件

- Plan 批准后，`workflow-task-breakdown` 才可基于本 Plan 和最新仓库文件生成依赖明确的 `task.md`；此时的旧 `task.md` 属于上一插件阶段，须先归档后重制，不得直接执行其 Architecture Tasks。
- Task 全部完成后统一 Verify；任何 Spec 偏差先回 Spec，旧 Plan/Task 作废并重审。
- 遇到已有目标文件、marker 不属于 Workflow、哈希漂移、路径逃逸、owner 内容变化、外部引用无法按 Spec 透明处理、aliases 将冲突或宿主无法观察时，保留证据并按具体验收项阻塞；不自动扩大范围、不覆盖、不把未验证写成通过。
- Final Review 对最终代码/diff 执行仓库要求的格式与必要注释门禁。整改只能触及格式/注释，不得借门禁改业务逻辑或边界。

## 10. 用户批准记录

用户于 2026-11-24 明确回复“同意执行”，批准本 Plan 并授权进入 Task 拆解和后续按依赖执行。此批准不扩大 Spec 范围。

Plan 已获用户批准。下一步由 `workflow-task-breakdown` 生成 Workflow Task；批准本 Plan 尚未授权跳过逐 Task 验证、最终 Verify 或 Final Review。