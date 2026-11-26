# MCU Workbench 插件拆分需求规格

## 元数据与状态

| 字段 | 内容 |
|---|---|
| request_id | `REQ-PLUGIN-SPLIT-20261123` |
| 生成时间 | `2026-11-25` |
| 项目路径 | `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai` |
| 分支/提交 | `host_ai`；本轮只读基线 `79ae7a0c231cd417717db0927775131274327e36`（工作区含大量预存未提交及未跟踪改动） |
| Spec 力度 | `full` |
| Spec 叠加门禁 | `[versioned]` |
| Spec 版本 | `v1.6-project-management-team-sync-and-document-context` |
| 审查状态 | `review-gate-approved` |
| 用户审查状态 | `pending-user-spec-review`（H-02；本 Spec 获用户审阅批准后再进入 Plan） |
| 当前判定 | `scope-approved / pending-user-spec-review`：新建 `mcu-workbench-project-management`，纳入 `embedded-team-sync` 和 `workflow-document-context`；Spec 批准前不更新 Plan/Task 或实现文件 |
| 2026-11-23 变更 | 用户确认修复既有 catalog/link 基线；正式 Skill 必须可登记，链接必须指向仓库内真实目标或显式记录为外部依赖，Jest/插件/链接校验目标为零失败 |
| 2026-11-24 变更 | 用户确认沿用上一轮边界，按拆分难度选择第二个插件；选定 `mcu-workbench-observability`，并允许已登记外部 Skill 作为该插件的迁移对象；宿主验收范围固定为 Codex + Cursor MVP |
| 2026-11-24 变更 | 用户明确要求清理插件中的 OpenCode 部分；移除旧聚合插件活动 OpenCode 宿主入口、运行时、配置、专属依赖/脚本/Hook、命令生成器和派生产物；保留历史审计记录中的 OpenCode 事实性文字 |
| 2026-11-24 变更 | 用户确认 observability 是第二个插件且 MVP 已完成；本阶段目标为用于单元测试的 `mcu-workbench-verification`，按完整插件边界进行物理目录拆分，并保留旧聚合入口和兼容 aliases；Spec 重新进入 Review Gate，旧 observability Plan/Task 不适用于本阶段 |
| 2026-11-24 变更 | 用户追加要求迁移外部导入的 Skills；依据本轮目标插件归属矩阵，按默认窄范围纳入全部 6 个 verification 归属项；其他插件归属和 `unknown` 项不迁移。Spec v0.5 放行并已执行 |
| 2026-11-24 变更 | 用户确认将 `academic-paper`、`academic-paper-reviewer`、`academic-pipeline`、`sr-screener` 从 verification 插件移出，转为 Codex Agent Skills；`embedded-unit-test-generator`、`static-analysis` 留在 verification 插件。Codex 现有同步器的安装目标为 `~/.agents/skills`。Spec 升至 v0.6，并经 Review Gate 及用户批准；v0.5 Plan/Task 不再适用于新范围 |
| 2026-11-24 变更 | 用户确认第三阶段拆分 `mcu-workbench-devops`：纳入五项 canonical Skills 与归属矩阵内全部 DevOps 外部 Skills；建立完整独立包，Codex + Cursor MVP 验收。Spec 升至 v0.7；v0.6 verification Plan/Task 不适用于本阶段，等待本 Spec 用户审阅后再重制 |
| 2026-11-24 变更 | 用户确认第四阶段沿用架构 Skill 归属矩阵，项目管理与工作流能力继续归 workflow；Spec 升至 v0.8，等待用户审阅后重制 Plan/Task |
| 2026-11-24 变更 | 用户确认第五阶段拆分 `mcu-workbench-workflow`：纳入 9 个 canonical Workflow Skills 和 ownership matrix 中 17 个 Workflow 外部 Skills，外部 provenance 未知状态继续保留；不迁入 `embedded-lead` 或根级 `mcu-workflow-io`；沿用插件唯一源与根目录受保护投影；旧 `skills/workflow/SKILL.md`（ID `workflow`）及其 usage/script 文件排除并留在旧聚合入口；Codex + Cursor MVP、旧聚合入口及 aliases 兼容沿用既有批准边界。Spec 升至 v0.9，等待用户审阅后重制 Plan/Task |
| 2026-11-24 变更 | 用户指出部分外部 Skills 的实际职责与 Workflow 插件范围不符；撤回 v0.9 中“17 项全部属于 Workflow”的推定及 H-05 审阅请求。先基于 Skill 正文逐项重审 ownership，确认后再更新 RCP、Spec 和验收范围；当前不进入用户审批或施工 |
| 2026-11-24 变更 | 用户批准按内容审查重分类：`can-debug`、`modbus-debug` → Observability；`embedded-bug-hunter`、`memory-analysis` → Verification；`embedded-build-flash-debug` → DevOps；`embedded-project-scaffold`、`parsed-chip-datasheet`、`vendor-minimal-firmware` → Architecture；`deep-research`、`market-mrd-analyst`、`patent-disclosure-skill`、`skill-template` → `unknown`。归属矩阵和 inventory 已更新，provenance 状态保持 blocked。以上 8 项尚未进入目标插件源目录，实体迁移时机待确认 |
| 2026-11-24 变更 | 用户确认 8 项改归其他插件的 Skill 只更新 ownership/inventory，本阶段不实体迁入已完成的其他插件；其插件源迁移另作后续维护任务。本阶段 Workflow Spec 仅覆盖 9 canonical + 5 external，恢复 Review Gate 并进入用户审阅 |
| 2026-11-24 变更 | 用户在 Spec 审阅请求后明确要求“进行下一步”；按唯一后续阶段解释为批准 Workflow v0.9，进入 full 力度 Plan 双方案选择；Task 与施工仍需后续门禁 |
| 2026-11-24 变更 | Spec 升至 `v1.0-external-skill-ownership-review`：复核全部外部导入 Skills（包含已在插件中的项），按正文职责归类，来源未标明不阻止归类；本阶段 Review Gate 待完成 |
| 2026-11-24 变更 | 用户进一步确认归属边界，Spec 升至 `v1.1-external-skill-ownership-review`：通用学术研究/论文工作流不纳入嵌入式插件；`market-mrd-analyst`、`skill-template`、`embedded-production-test-tool` 归入 Workflow；来源未标明仍按正文归类 |
| 2026-11-24 变更 | 用户确认 `patent-disclosure-skill` 留在嵌入式插件体系外；Spec 升至 `v1.2-external-skill-ownership-review` |
| 2026-11-24 变更 | 用户选择方案 B（按插件分批切换）。Plan 审查发现仓库 AGENTS.md §7 的 Codex 写入范围不包含待迁移的插件源目录、catalog 和 manifests；路线记录于 `codex/plugin-split/artifacts/external-skill-ownership/plan.md`，状态 blocked，暂不拆 Task 或修改目标文件 |
| 2026-11-24 变更 | 用户要求将嵌入式项目本身的管理能力与 AI 按 Spec 生成项目内容的工作流区分。修订项目管理插件边界：`workflow-integration-plan`、`workflow-task-breakdown`、`workflow-task-execution` 留在 Workflow，继续管理 Spec 驱动的 AI 方案/任务生成与执行链；新建 `mcu-workbench-project-management`，当前纳入外部 `embedded-team-sync`，管理嵌入式项目共享状态、团队规则、共享 Skill registry 和任务日志。`embedded-project-intake` 与 `embedded-change-report` 继续按项目理解/工程报告能力留在 Workflow。Spec 升至 v1.4，等待用户审阅；旧 Plan/Task 过期，须在本版放行后重制。 |
| 2026-11-24 变更 | 用户要求先执行现有插件迁移，暂不拆分新的项目管理插件，并确认 `embedded-team-sync` 本轮延后迁移。Spec 升至 v1.5：当前执行集为其余 45 项，沿用用户先前选定的方案 B（按插件分批）；项目管理插件与 `embedded-team-sync` 留待后续独立阶段。v1.4 Plan/Task 不可执行；当前生成新版 Plan。 |
| 2026-11-25 变更 | 用户要求重新整理项目管理相关 Skill，并依据现有内外部 Skill 正文确定归属。经内容审查后，用户确认项目管理插件纳入 `embedded-team-sync` 与 `workflow-document-context`：前者负责团队规则/当前项目状态/共享 Skill registry/追加式任务日志，后者负责 README 受管区块、文档/决策索引、生命周期和会话上下文交接。Workflow 的需求到 AI 计划/任务执行链仍保留；项目接手报告、变更报告和 LLM 代码安全门禁不纳入本插件。Spec 升至 v1.6；旧 Plan/Task 不适用，等待本 Spec H-02 审阅。 |

## 历史范围补充：项目管理插件提案（v1.4，已由 v1.5 调整）

> v1.4 曾提议立即新建项目管理插件；用户随后决定先迁移现有插件 Skills，并将 `embedded-team-sync` 延后。本节保留决策记录，不作为当前迁移执行范围。

用户新增要求：按被管理对象拆分插件职责。`mcu-workbench-project-management` 面向嵌入式项目本身的团队协作与项目状态；`mcu-workbench-workflow` 面向 AI 依据 Spec 生成、审查和执行项目内容的约束链。两者均可涉及“任务”，但前者记录真实项目共享状态与团队任务日志，后者把已批准 Spec/Plan 转换为 AI 可执行任务并管理生成过程。

### 项目管理插件初步范围

| 类别 | Skill | 归属依据 |
|---|---|---|
| External | `embedded-team-sync` | 维护团队规则、项目状态、共享 Skill registry 和 append-only 任务日志 |

`workflow-requirements-router`、`workflow-requirements-challenge`、`workflow-review-gate`、`workflow-integration-plan`、`workflow-task-breakdown`、`workflow-task-execution`、`workflow-final-review` 全部保留在 Workflow：它们对 AI 的 Spec 驱动生成、审查、计划和任务执行过程施加约束。`workflow-claude-layering`、`workflow-document-context` 继续承担工作流宿主/上下文能力。`embedded-project-intake` 是固件代码库理解与交接报告，`embedded-change-report` 是证据化工程变更报告，属于 AI 生成项目工程内容而非管理真实项目状态，继续留在 Workflow。以上归属等待本版 Spec 审阅后再重制 Plan/Task 和迁移。

外部 Skill 总数仍为 52，其中 45 项进入本轮现有五插件迁移：Architecture 11、DevOps 12、Observability 10、Verification 4、Workflow 8；`embedded-team-sync` 归属未来项目管理插件但本轮延后，当前文件与注册位置不变；另 6 项仍在嵌入式插件体系外。本轮不创建项目管理插件，也不迁移 Workflow canonical Skills。

## 2026-11-24 当前执行范围：现有五插件迁移（v1.5）

本轮迁移 45 项外部 Skills，采用已选方案 B 的按插件波次执行。现有 Workflow 内的 canonical `workflow-integration-plan`、`workflow-task-breakdown`、`workflow-task-execution` 继续约束 AI 按已批准 Spec 生成和执行项目内容，不拆入新插件。外部 `embedded-team-sync` 的内容职责属于嵌入式项目管理，但用户明确将其延后；其当前 Workflow 插件路径和登记保持原样，不纳入本轮迁移/重注册。项目管理插件创建作为后续阶段。

## 2026-11-24 当前阶段补充：Workflow 第五个插件拆分（v0.9）

本节是 Workflow v0.9 当前审计版本；原 17 项 Workflow external 范围已按用户确认的内容审查结果收窄为 5 项。当前 Workflow 范围为 9 canonical + 5 external Skills。8 项已重分配到其他插件，但本阶段只更新其 owner 登记，不进行实体迁入；实际迁移作为后续插件维护任务处理。Review Gate 已按此边界重新审查，历史阶段条目保留作审计，不作为本阶段施工范围或批准依据。

### RCP 与确认项

| 字段 | 内容 | 可信等级 |
|---|---|---|
| 项目路径 | `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai` | confirmed |
| 分支/提交 | `host_ai`；本轮只读观察 HEAD `43eb4e731568b606451083b0e479a29a5722fb98`；工作区存在预存未提交改动 | confirmed |
| 目标插件 | `mcu-workbench-workflow`，五插件体系中的第五个待拆插件 | user-confirmed（由用户“第五个插件”及既有五插件定义确认） |
| 目标结果 | 建立可由 Codex 与 Cursor 独立发现、加载和验证的 Workflow 插件，同时保持旧聚合入口及旧 Skill IDs/aliases 兼容 | user-confirmed（沿用既有 MVP 边界） |
| canonical 范围 | `workflow-requirements-router`、`workflow-claude-layering`、`workflow-document-context`、`workflow-requirements-challenge`、`workflow-review-gate`、`workflow-integration-plan`、`workflow-task-breakdown`、`workflow-task-execution`、`workflow-final-review` | confirmed（catalog metadata） |
| Workflow 外部 Skill 范围 | `embed-ai-tool`、`embedded-change-report`、`embedded-project-intake`、`embedded-team-sync`、`mrd-to-prd` | user-confirmed（内容审查后保留在 Workflow） |
| 改归其他插件的外部 Skills | 8 项：Observability 2、Verification 2、DevOps 1、Architecture 3；尚未存在于目标插件源目录，本阶段只更新归属登记，实体迁移留作后续任务 | user-confirmed |
| 暂无五插件归属的外部 Skills | `deep-research`、`market-mrd-analyst`、`patent-disclosure-skill`、`skill-template`；目标 `unknown` | user-confirmed（按建议更新） |
| 外部来源状态 | 仍在当前迁移 inventory 中的外部 Skill provenance 保持 `blocked/unverified`；更新 owner 不表示来源、版本、许可证或依赖审计完成 | confirmed（inventory）；ownership user-confirmed |
| 唯一源模式 | 插件目录作为唯一可编辑 Skill 源；旧根目录 Skill 路径由带 marker/hash 的受保护同步器生成投影 | user-confirmed（本轮明确回复“沿用该模式”） |
| 旧入口排除项 | `skills/workflow/SKILL.md`（ID `workflow`）、同级 `references/usage.md` 和 `scripts/workflow_runner.py` 排除，继续留在旧聚合入口 | user-confirmed（本轮明确回复“排除并留在旧聚合入口”） |
| Agent/Rule 边界 | 不迁入 `embedded-lead` Agent、其他领域 Agent 或根级 `rules/mcu-workflow-io.mdc` | user-confirmed（本轮明确“只迁 Skills”及确认选项） |
| 风险/力度 | 影响共享 catalog、旧调用别名、目录投影和两个宿主 manifest；跨模块且长期维护，采用 `full + versioned` | inferred from confirmed scope; Review Gate approved |

目的质疑结论：把需求路由、门禁、计划和任务执行能力形成独立插件，降低工作流能力与其他插件的发布/发现耦合；不把构建、烧录、调试或运行时观测实现复制到 Workflow。可行性质疑结论：Architecture 等插件已有独立 package、Codex/Cursor manifest、validator 和受保护投影模式可作为仓库内证据；Workflow 的详细依赖闭包、别名冲突与回滚步骤由后续 Plan 基于实际文件确定。范围结论：迁移 9 canonical + 5 留在 Workflow 的 external Skill 完整目录及其必要的随附 references/scripts；按用户批准更新 8 项 other-plugin owner 和 4 项 `unknown`，8 项实体迁移留作后续插件维护任务。明确排除 Agent、根级 Rule、旧 `workflow` build/flash/monitor Skill 及其文件、unknown 项和固件源码。验收缺口：真实 Codex 与 Cursor 的独立发现/加载/代表性调用必须分别留证；静态/主机结果不能替代真实宿主证据。Provenance 未知项保留 `blocked/unverified`，不作为已审计内容发布。

### 目标范围与非目标

**本阶段范围**

1. 新建 `plugins/mcu-workbench-workflow/` 独立包，包含与现有 package pattern 一致的 descriptor、package metadata、Codex/Cursor manifests、Skill roots、独立 validator 和迁移/兼容映射；具体文件由 Plan 据现状确定。
2. 将上述 9 个 canonical Workflow Skills 的完整目录树纳入插件，包括其内部 references、scripts、assets 和必要链接闭包，不改变 Skill 业务语义。
3. 将 ownership matrix 确认仍归 Workflow 的 5 个外部 Skills 完整目录纳入插件；保留 inventory/matrix 的原始来源、版本、许可证和依赖状态，不伪称来源审计已完成。
4. 以插件 `skills/` 为唯一可编辑事实源；根目录旧 canonical/external Skill 路径作为 marker/hash 保护的投影，拒绝覆盖无标记文件或检测到漂移时覆盖。
5. 更新必要的共享 catalog、resolver、aliases、旧聚合入口、投影标记与验证入口，使本阶段 14 个迁移项保持唯一登记且旧 ID/alias 的行为确定。
6. 独立验证 Codex 与 Cursor 的 manifest、Skill roots、插件发现/加载与代表性 Workflow Skill 请求；分宿主记录证据。
7. 保护本阶段开始前所有未提交内容；Plan 需给出精确源/目标 hash、任务文件清单、负例、回滚顺序和 SOLID 证据。

**明确非目标**

- 不迁入 `embedded-lead` 或其他 Agent，也不迁入根级 `mcu-workflow-io` 或其他全局 Rules。
- 不迁移 `skills/workflow/SKILL.md`（ID `workflow`）、`skills/workflow/references/usage.md`、`skills/workflow/scripts/workflow_runner.py`；它们继续由旧聚合入口提供。
- 不在本阶段实体迁移已改归 Architecture、Verification、DevOps、Observability 的 8 项 Skills；它们继续留在根目录，目标插件实体迁移另行制定后续范围，不修改其他插件包。
- `deep-research`、`market-mrd-analyst`、`patent-disclosure-skill`、`skill-template` 保持 `unknown`，不纳入本阶段。
- 不修改 Skills 的业务语义；不修改固件、HAL、RTOS、BSP、Vendor 或目标硬件。
- 宿主 MVP 仅为 Codex + Cursor；Claude 延期。不得新增 OpenCode 适配，不承诺热加载或动态卸载。
- 不把外部来源/许可证/版本/依赖未知改写成已完成审计；不创建空占位 Skill，也不静默排除当前 5 项 Workflow external Skills。
- 本 Spec 获用户批准前，不更新实施 Plan/Task，不迁移目录、不改插件 manifests/catalog、不执行同步或代码施工。

### 现状证据与可信边界

| ID | 事实 | 证据 | 等级 |
|---|---|---|---|
| WF-E01 | 当前 HEAD 为 `43eb4e731568b606451083b0e479a29a5722fb98`，工作区有未提交用户改动 | 本轮 `git rev-parse HEAD`、`git status --short --branch` | confirmed |
| WF-E02 | catalog 将 9 个 canonical Skills 分类到 workflow | `skills/catalog-metadata.js:71-82` | confirmed |
| WF-E03 | ownership matrix 经内容复核后保留 5 个 external Skills 在 Workflow；8 个改归其他插件，4 个为 unknown | `codex/plugin-split/skill-ownership-matrix.md:14-55`、inventory；本轮用户确认 | user-confirmed |
| WF-E04 | 现有 Architecture 插件使用 descriptor/package、独立 Codex/Cursor manifests、Skill map、validator 和 hash marker 投影 | `plugins/mcu-workbench-architecture/` 下 package/manifests/scripts/skill-map | confirmed |
| WF-E05 | 旧根目录 aliases 包含 `workflow-router` 等入口，必须验证迁移后解算仍指向唯一 canonical Skill | `skills/catalog-metadata.js:174`、`skills/catalog.js` | confirmed |
| WF-E06 | 现有同步器检测旧目录冲突并拒绝覆盖非管理文件/漂移文件 | `scripts/sync-codex-skills.js:81-98`；Architecture syncer | confirmed |
| WF-E07 | `skills/workflow/SKILL.md` 是旧 ID `workflow`，内容面向 build/flash/monitor，并引用根级 usage/script；用户明确要求排除 | `skills/workflow/SKILL.md:1-38`、`skills/workflow/references/usage.md`、`skills/workflow/scripts/workflow_runner.py`；本轮用户确认 | confirmed/user-confirmed |
| WF-E08 | Codex + Cursor 是本阶段宿主 MVP；Claude/OpenCode 不属于通过条件 | 既有已批准 Spec 范围和本轮沿用确认 | user-confirmed |
| WF-E09 | 本阶段不是固件功能变更；ISR/DMA/硬件验收不适用 | 本阶段目标仅为宿主插件与文档/Skill 包迁移 | confirmed |

## 1. 工程现状表

| ID | 工程事实/约束 | 证据 | 可信等级 | 审查结论 |
|---|---|---|---|---|
| WF-R01 | Workflow canonical Skill 根为 `skills/workflow/<id>/`，9 个 ID 由 catalog metadata 定义 | `skills/catalog-metadata.js:71-82` | confirmed | 完整复制所选目录树，不只迁移 `SKILL.md` |
| WF-R02 | 5 个外部 Skills 经正文复核仍归 Workflow；8 个归其他插件、4 个为 unknown | ownership matrix 对应条目 | user-confirmed | Workflow 仅纳入 5 项；其他 8 项实体迁移为后续插件维护任务 |
| WF-R03 | 旧 `workflow` 根 Skill 属于编译/烧录/监控流水线，和新 Workflow 项目治理能力边界不同 | `skills/workflow/SKILL.md`；用户排除确认 | user-confirmed | 留在聚合入口，不注册到新 Workflow descriptor |
| WF-R04 | Agent 和根 Rule 不属于本轮迁移范围 | 用户明确选择“只迁 Skills” | user-confirmed | 不复制/移动 `embedded-lead`、其他 Agent 或根级 Rule |
| WF-R05 | 根路径兼容依赖 catalog、resolver、alias 与 marker/hash 投影协调 | `skills/catalog.js`、`scripts/sync-codex-skills.js`、Architecture package | confirmed | Plan 指明唯一事实源和精确生成边界 |
| WF-R06 | 两宿主 manifest 静态通过不能证明实际发现/加载或 Skill 调用 | Architecture/Verification 历史宿主记录分层 | confirmed | Codex、Cursor 分别实际观察并留证；无法观察则明确未验证/阻塞 |
| WF-R07 | 既有工作区有大量未提交改动，且含 Verification 插件和相关测试改动 | `git status --short --branch` | confirmed | 不清理、不覆盖、不整体暂存；仅触及本阶段批准文件 |

## 2. 文件施工清单

| ID | 目标范围 | 职责归属 | 施工约束/交付 |
|---|---|---|---|
| WF-F01 | `plugins/mcu-workbench-workflow/` package、descriptor、Codex/Cursor manifests、validator | Workflow 独立包 | 包 ID/version/roots 与 schema 一致；不声明宿主未证实能力 |
| WF-F02 | 插件 `skills/` 中 9 个 canonical Skill 全目录 | Workflow | 完整保留必要 references/scripts/assets；不改业务语义 |
| WF-F03 | 插件 `skills/` 中 5 个外部 Skill 全目录 | Workflow 外部迁移 | 与更新后的 ownership matrix 一致；provenance 保持原状态 |
| WF-F04 | `skill-map.json`、reference 闭包清单及 hash/provenance 记录 | 迁移审计 | 唯一源/投影一一映射；不得将 `skills/workflow/SKILL.md` 或根脚本误纳入 |
| WF-F05 | catalog/resolver/aliases 与旧聚合兼容 | 共享注册 | 本阶段 14 个 Skill ID 唯一注册；旧 aliases 继续解析到同一目标；旧聚合入口保持可用 |
| WF-F06 | Workflow root projection marker/sync 与兼容校验 | 生成边界 | 拒绝未知 marker、非管理文件覆盖及漂移覆盖；有可重复回滚路径 |
| WF-F07 | 插件级/聚合级验证脚本与直接测试 | 验证 | 覆盖清单、manifest、链接、alias、marker、失败路径和回滚；不迁移 Agent/Rule |
| WF-F08 | Workflow 专属审计产物 | 需求与实现记录 | 写入 `codex/plugin-split/artifacts/workflow/`；不覆盖其他阶段产物 |

## 3. 代码生成约束清单

| ID | 必须遵守 | 禁止事项 |
|---|---|---|
| WF-G01 | 仅按 9 canonical + 5 Workflow external 清单迁移；保留完整 Skill 子树 | 将矩阵外文件、Agent、Rule 或旧 build/flash/monitor `workflow` Skill 混入 |
| WF-G02 | 每个 Skill 有唯一可编辑事实源，根路径由明确 marker/hash 管理投影 | 插件目录与旧根路径双写、静默覆盖或无法重建的手工副本 |
| WF-G03 | descriptor/package/两个 manifests/catalog 使用一致插件 ID、版本和 roots | 以静态 manifest 校验冒充真实宿主发现/加载 |
| WF-G04 | 保留旧 aggregate、canonical IDs 和 aliases；映射到唯一新源或明确兼容提示 | 删除旧入口或造成 alias 重复/歧义 |
| WF-G05 | 当前迁入的 5 项 provenance 状态按 inventory 原样保留；审计未知需明确表示 | 推测/补造版本、许可证、依赖或来源，或声称已审计完成 |
| WF-G06 | Codex 与 Cursor 独立验收并分别记录；Claude/OpenCode 不列为通过条件 | 用一宿主结果代表另一宿主或扩展到其他宿主适配 |
| WF-G07 | 对预存未提交改动进行边界保护，回滚只移除本任务新增/变更内容 | `git add -A`、清理用户文件、重置混合工作区 |
| WF-G08 | Workflow 编排其他能力时通过公开契约与 Skill 路由协作 | 复制 DevOps、Observability、Verification 或 Architecture 的实现 |
| WF-G09 | 对 marker 冲突、缺失源、重复 ID、坏 manifest、失效链接和中断写入有显式失败策略 | 对非管理文件静默覆盖或把部分同步报告成功 |
| WF-G10 | 逐项记录 SRP/OCP/LSP/ISP/DIP 适用性及可验证证据 | 仅写原则名称而无边界与测试证据 |

## 4. 验收测试清单

| ID | 等级 | 验收项 | 通过条件 |
|---|---|---|---|
| WF-T01 | 静态/主机 | 14 项 Skill inventory 与目录完整性 | 9 canonical + 5 Workflow external 全部存在，完整子树与 source map/hash 一致，无重复/遗漏 |
| WF-T02 | 静态 | descriptor/package/Codex/Cursor manifests | schema、ID、版本、Skill roots 一致；无额外 Agent/Rule 声明 |
| WF-T03 | 静态/主机 | Markdown links/scripts/references 闭包 | 包内链接目标存在；外部边界显式登记；脚本依赖路径可解析 |
| WF-T04 | 主机 | catalog、resolver、canonical IDs 和 aliases | 14 项唯一归属；旧 aliases 解析稳定；不把旧 ID `workflow` 注册到新包 |
| WF-T05 | 主机 | 受保护投影同步/重复执行/漂移拒绝 | 首次生成与重复运行结果确定；无 marker 或 hash 漂移时拒绝覆盖并给出定位 |
| WF-T06 | 主机 | 失败与回滚场景 | 坏 manifest、缺失 Skill、重复 ID、无效链接及投影冲突明确失败；回滚不丢用户文件 |
| WF-T07 | 兼容 | 旧 `mcu-workbench` aggregate 与旧 aliases | 旧入口仍能发现/转发迁移 Skills；旧 `workflow` build/flash/monitor 入口保持旧 aggregate 行为 |
| WF-T08 | 宿主 | Codex 独立发现/加载与代表性 Workflow 请求 | 记录本地 Codex 真实证据；静态测试不能替代 |
| WF-T09 | 宿主 | Cursor 独立发现/加载与代表性 Workflow 请求 | 独立记录 Cursor 真实证据；不以 Codex 结果替代 |
| WF-T10 | 静态/审计 | 外部 Skill provenance | 当前 5 项未知来源/版本/许可证/依赖维持 `blocked/unverified`，不伪称审计通过 |
| WF-T11 | 审计 | 迁移边界与 SOLID | Agent/Rule/旧 build-flash-monitor Skill/其他 owner 均未迁移；SRP/OCP/LSP/ISP/DIP 逐项有证据或阻塞 |
| WF-T12 | 记录 | 命令与产物证据 | 记录绝对 cwd、退出码、产物绝对路径/SHA-256、证据等级、重试及既有基线差异 |

### 验收标准

| ID | 通过条件 |
|---|---|
| WF-A01 | `mcu-workbench-workflow` 形成独立完整包，Codex/Cursor manifests 与 descriptor/package 一致 |
| WF-A02 | 9 canonical 与 5 Workflow external Skills 完整纳入；provenance 未知项继续明确未验证 |
| WF-A03 | catalog、resolver、aliases 和根聚合兼容明确且无重复/歧义；旧 `workflow` build/flash/monitor 入口未迁入新包 |
| WF-A04 | Skill 唯一源和受保护根投影可重复构建；漂移/冲突拒绝覆盖；回滚可重复且不丢用户文件 |
| WF-A05 | Codex 与 Cursor 分别记录独立发现、加载及代表性 Workflow Skill 调用证据 |
| WF-A06 | embedded-lead、其他 Agent、根级 `mcu-workflow-io` 规则及其他插件 owner 未迁入 |
| WF-A07 | 静态/主机/宿主证据分层记录；没有把文档或测试写成真实宿主或固件验证 |

### Review Gate 与用户闸门

- RCP 澄清：用户确认目标为第五个 `mcu-workbench-workflow`；纳入 9 canonical + 5 经内容复核仍归 Workflow 的 external Skills；只迁 Skills；插件目录唯一源、旧根路径受保护投影；旧 `workflow` build/flash/monitor Skill 留在旧 aggregate。另 8 项按用户确认改归其他 plugins，4 项改为 unknown。
- 目的质疑：独立承载工作流编排与治理能力，同时保持现有聚合调用兼容；避免复制工具/固件实现。
- 可行性质疑：仓库内 Architecture plugin 已证明同类 package、manifest、validator 与 projection 模式可实现；Workflow 交叉链接/共享资源和 alias 冲突需由 Plan/T-001 扫描后确认。
- 风险/力度：`spec_rigor=full`、`spec_overlays=[versioned]`；涉及多 package、共享 catalog、别名、投影同步、两宿主及未提交工作区。最低产物为 `spec.md + plan.md + task.md + 测试/检查证据`。
- SOLID：SRP 由职责清单与排除项验证；OCP 由新增 Skill fixture 验证；LSP 由双宿主 manifest 同契约校验；ISP 由最小 Skill roots/无 Agent/Rule 检查；DIP 由 Workflow 只依赖共享 contracts 而非插件实现的依赖检查。详细任务证据在 Plan/Task 列出。
- Review Gate 判定：本 Spec 记录范围、排除项、审计清单和验证边界，内部结论 `review-gate-approved`；外部来源元数据按用户确认保持未验证，不作为本地迁移授权缺失。实际宿主行为必须在实施阶段分别验证。
- 用户闸门 H-05 `workflow-spec-review`：`approved`（2026-11-24；用户要求进入 Spec 审阅后的下一步，解释为批准）。下一闸门 H-03 为 Plan 方案选择；H-02 为 Plan 审查/批准，二者通过前不得生成 Task 或迁移文件。
- 用户批准后交接：由 `workflow-integration-plan` 基于本 Spec 与最新工作区证据制定 Workflow 专属 Plan，明确 source map、链接闭包、注册/alias 变更、回滚和逐项 SOLID 验证；随后由 `workflow-task-breakdown` 生成 Workflow Task。v0.8 Architecture Plan/Task 不适用于本阶段。

## 2026-11-24 当前阶段补充：Architecture 第四个插件拆分（v0.8）

本节为当前有效阶段范围，优先于 v0.7 DevOps 交接。此前 Verification、Observability、DevOps 的范围和验收记录保留为历史审计，不作为本阶段施工输入。

### RCP 与确认项

| 字段 | 内容 | 可信等级 |
|---|---|---|
| 项目路径 | `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai` | confirmed |
| 分支/提交 | `host_ai`；本轮只读观察 HEAD `6cd4fadc93ddaff5b03efbf7b32fa6a72b97883b`，实施前重新确认 | confirmed |
| 目标插件 | `mcu-workbench-architecture`，五插件定义中的第四个插件 | user-confirmed |
| 目标结果 | 将嵌入式软件架构能力形成独立插件边界，可独立发现、校验并由旧聚合入口兼容调用 | user-confirmed |
| 归属规则 | 严格沿用 `codex/plugin-split/skill-ownership-matrix.md`，仅纳入目标为 architecture 的内容 | user-confirmed |
| 项目管理边界 | 项目需求/规划/任务执行/团队协同继续归 `mcu-workbench-workflow`，不迁入 architecture | user-confirmed |
| 宿主范围 | Codex + Cursor MVP；Claude 延期 | user-confirmed（沿用既有范围） |
| 风险/力度 | 跨层内容、引用、外部 Skills、catalog/aliases、双宿主 manifest 和聚合兼容同时影响；`full + versioned` | inferred from confirmed scope |

目的质疑结论：形成独立的嵌入式架构能力包；项目治理与工作流编排继续由 workflow 承担，保持单一职责。可行性质疑结论：已有三个独立插件可作为包形态参考；canonical 唯一事实源、链接迁移和回滚路径须由 Plan 依据当前实现确定。范围结论：纳入 architecture canonical Skills 及矩阵明确归属 architecture 的外部 Skills；其他插件和 `unknown` 项不迁移。验收缺口：需依据当前 catalog、manifest、sync 机制形成文件级施工与回滚方案；外部 provenance 的未知状态保持不变。

### 目标范围与非目标

**本阶段范围**

1. 建立 `plugins/mcu-workbench-architecture/` 独立包，包含 descriptor/package 元数据、Codex/Cursor manifests、Skill 发现入口和独立校验入口。
2. 纳入 canonical 架构 Skills：`app-architecture`、`service_*`、`platform_*`、`impl_*`、`vendor_*`；以当前 catalog canonical 分类为准，保留 references、脚本及必要随附内容，不改变 Skill 语义。
3. 纳入归属矩阵明确指向 architecture 的 8 个外部 Skills：`chip-driver-manual`、`chip-resource-finder`、`embedded-architecture-planner`、`embedded-coding-standard`、`embedded-minimal-project-builder`、`embedded-prd-to-logic`、`prd-to-hardware-solution`、`schematic-pinmap-analyzer`。来源/版本/许可证/依赖按 inventory 原状态记录；未知项不得伪称审计完成。
4. 保留旧聚合入口、canonical Skill IDs 和 aliases，以唯一事实源或受保护生成投影维持兼容；源目录、生成边界和回滚顺序由获批 Plan 明确。
5. 分别验证 Codex 与 Cursor 的 manifest、Skill roots、独立发现/加载；静态和主机测试不得替代真实宿主证据。
6. 保持 App → Service → Platform ← Impl → Vendor 契约不变；Plan/Task 必须为 SRP/OCP/LSP/ISP/DIP 逐项记录适用性和证据。

**明确非目标**

- 不迁移 workflow、verification、devops、observability、hardware 或 `unknown` 项。
- 不把需求路由、项目 intake/scaffold、集成规划、任务执行、团队同步等项目管理能力并入 architecture。
- 不修改固件、HAL、RTOS、BSP、Vendor 实现源码；不把插件主机验证写成目标固件构建、烧录或实物验收。
- 不改变既有 Skill 业务语义或分层契约；不新增 Claude/OpenCode 适配、热加载或动态卸载承诺。
- 本 Spec 获用户批准前，不更新实施 Plan/Task，不移动/复制 Skills，不改 manifest/catalog，不开始施工。

### 现状证据与可信边界

| ID | 事实 | 证据 | 等级 |
|---|---|---|---|
| ARC-E01 | 已有 verification、observability、devops 三个独立插件目录；尚无 architecture 插件目录 | 本轮 `plugins/` 目录清单 | confirmed |
| ARC-E02 | canonical Skills 的定义、分类与路径由 catalog metadata/catalog 派生 | `skills/catalog-metadata.js`、`skills/catalog.js` | confirmed |
| ARC-E03 | ownership matrix 将 8 个外部 Skill 指向 architecture；provenance 依 inventory 状态 | `codex/plugin-split/skill-ownership-matrix.md`、`external-skill-inventory.yaml` | confirmed（归属）；元数据按条目状态 |
| ARC-E04 | 项目 intake/scaffold/team-sync、需求与计划任务管理仍归 workflow | ownership matrix、canonical catalog | confirmed |
| ARC-E05 | 本阶段开始前工作区已有用户未提交改动 | `git status --short --branch` | confirmed |
| ARC-E06 | manifest 静态检查不能证明真实 Codex/Cursor 发现和加载 | 宿主观察要求 | confirmed（验证边界） |

### 1. 工程现状表

| ID | 工程事实/约束 | 证据 | 等级 | 审查结论 |
|---|---|---|---|---|
| ARC-R01 | canonical 架构内容由 App、Service、Platform、Impl、Vendor 分类组成 | catalog 源文件 | confirmed | 逐项清点完整目录树，不能只迁移 SKILL.md |
| ARC-R02 | 外部 architecture 集合为矩阵中的 8 项 | ownership matrix | confirmed（归属）；provenance 按 inventory | 纳入迁移审计并保留来源未知状态 |
| ARC-R03 | 项目治理和流程编排属于 workflow | 五插件定义、ownership matrix | confirmed | 不并入 architecture |
| ARC-R04 | catalog、aliases 和聚合入口需协调迁移 | catalog 与既有插件实现 | confirmed | Plan 明确唯一事实源、生成边界、兼容及回滚 |
| ARC-R05 | Codex + Cursor 为 MVP 宿主范围 | 前序确认及本轮沿用 | user-confirmed | 两宿主分别验收；Claude 不作本轮通过条件 |

### 2. 文件施工清单

| ID | 目标范围 | 职责归属 | 施工约束/交付 |
|---|---|---|---|
| ARC-F01 | `plugins/mcu-workbench-architecture/` | 独立插件包 | descriptor、package metadata、Codex/Cursor manifests、Skill roots、validate/test 入口 |
| ARC-F02 | 插件 `skills/` 中 App/Service/Platform/Impl/Vendor canonical Skills | architecture | 完整保留必要 references/脚本；唯一事实源/投影由 Plan 决定 |
| ARC-F03 | 插件 `skills/` 中 8 项 architecture 外部 Skills | 外部迁移审计 | 与 inventory/matrix 一致，不升级 provenance 状态 |
| ARC-F04 | catalog、resolver、聚合 manifests/入口和 aliases | 共享注册/兼容 | 唯一注册、旧 ID/alias 兼容；仅改 Plan 指定源文件 |
| ARC-F05 | ownership matrix、external inventory | 迁移审计 | 插件范围与唯一归属一致，未知元数据状态保留 |
| ARC-F06 | 插件级/根聚合验证入口与相关测试 | 验证/兼容 | 覆盖 manifests、链接、catalog、aliases、回滚和失败路径 |

### 3. 代码生成约束清单

| ID | 必须遵守 | 禁止事项 |
|---|---|---|
| ARC-G01 | 每项 canonical Skill 只有一个可编辑事实源；projection 标明源和重建方式 | 独立双写或静默复制造成漂移 |
| ARC-G02 | descriptor、package、Codex/Cursor manifests 与 Skill registry 的 ID/version 一致 | 以目录存在或静态检查冒充宿主加载通过 |
| ARC-G03 | 严格按 ownership matrix 迁移；workflow 项目治理维持原归属 | 因名称或目录相邻而扩大范围 |
| ARC-G04 | 外部 Skills provenance 按证据记录 | 推测许可证/版本、静默删引用或用空壳替代缺失内容 |
| ARC-G05 | 保留旧聚合入口和 aliases，提供可重复回滚步骤 | 新宿主入口及兼容路径验证前删除旧入口 |
| ARC-G06 | App → Service → Platform ← Impl → Vendor 边界不变 | 复制 DevOps、Verification 或 Observability 实现 |
| ARC-G07 | SRP/OCP/LSP/ISP/DIP 分项记录适用性及验证证据 | 以原则名称代替证据 |
| ARC-G08 | 保护任务开始前已有未提交改动 | 清理、覆盖或整体暂存无关工作 |

### 4. 验收测试清单

| ID | 等级 | 验收项 | 通过条件 |
|---|---|---|---|
| ARC-T01 | 静态 | descriptor、package metadata、Codex/Cursor manifests | schema、ID、版本及 Skill roots 一致 |
| ARC-T02 | 静态/主机 | canonical 架构 Skill 清单/随附文件 | App/Service/Platform/Impl/Vendor 内容完整，无重复 ID |
| ARC-T03 | 静态/主机 | 8 项外部 Skill 与归属/provenance | 包边界与 matrix 一致，未知来源仍标未验证 |
| ARC-T04 | 静态/主机 | Markdown links、scripts、references、唯一事实源 | 包内链接有效，外部边界显式，内容无漂移 |
| ARC-T05 | 主机 | 独立校验与根聚合兼容入口 | 正常通过；坏 manifest、缺 Skill、重复 ID、失效链接负例明确失败 |
| ARC-T06 | 兼容 | 旧入口、canonical IDs、aliases、resolver | 旧调用映射至唯一新来源或明确迁移提示，无静默失败 |
| ARC-T07 | 宿主 | Codex 独立发现/加载 | 记录真实 Codex 证据；否则标记未验证 |
| ARC-T08 | 宿主 | Cursor 独立发现/加载 | 单独记录真实 Cursor 证据，不以 Codex 替代 |
| ARC-T09 | 回滚 | 聚合路由/投影回滚 | 可重复恢复，不丢失用户文件 |
| ARC-T10 | 审计 | 项目管理边界与 SOLID | workflow 项目管理未迁入；五项原则逐项有判断和证据/阻塞 |

### 验收标准

| ID | 等级 | 通过条件 |
|---|---|---|
| ARC-A01 | 静态 | architecture 形成完整独立包，descriptor、package 与宿主 manifests 一致 |
| ARC-A02 | 静态/主机 | canonical 架构 Skills 与 8 个外部 Skills 完整可发现，inventory/matrix 与包范围一致 |
| ARC-A03 | 主机 | 包级校验覆盖 manifests、roots、链接、catalog/aliases 和失败路径；根兼容入口行为确定 |
| ARC-A04 | 宿主 | Codex/Cursor 分别记录插件发现/加载结果及证据等级 |
| ARC-A05 | 兼容/回滚 | 旧入口和 aliases 行为确定，回滚可重复且不丢数据 |
| ARC-A06 | 边界 | workflow 项目治理未并入 architecture，软件分层契约不变 |
| ARC-A07 | 审计 | 外部 provenance 未知项仍标记 blocked/unverified，不伪称审计或硬件验证通过 |
| ARC-A08 | 记录 | 验证记录命令、绝对 cwd、退出码、产物路径/SHA-256、证据等级、重试及新增基线差异 |

### Review Gate 与实现闸门

- RCP/Challenge 结论：用户已确认沿用归属矩阵；architecture 外部集合为 8 项；workflow 项目治理保持原归属。
- 目的质疑：独立提供嵌入式架构能力；workflow 继续承担项目治理，保持单一职责。
- 可行性质疑：已有三个插件可供包形态对照；目录迁移、链接、注册和回滚需在 Plan 中按实际源文件确定。
- SOLID 审查：

| 原则 | 适用性 | Spec 约束 | 下游所需证据 |
|---|---|---|---|
| SRP | 适用 | architecture 仅承载 App/Service/Platform/Impl/Vendor 与矩阵归属的架构辅助 Skills；项目治理留在 workflow | 插件 Skill inventory 与 workflow 排除项测试 |
| OCP | 适用 | 新增架构 Skill 应通过插件清单/descriptor 扩展，不修改非 architecture 插件核心 | 插件 validator 与新增 Skill fixture |
| LSP | 适用 | Codex/Cursor manifests 和共享 descriptor 遵循同一插件契约 | 两宿主 manifest schema 校验与包契约测试 |
| ISP | 适用 | 每个宿主 manifest 只声明该插件实际提供的 Skill roots/入口 | manifest 最小范围及无越界 Skill roots 检查 |
| DIP | 适用 | 插件依赖共享 contracts 和 Skill registry 契约，不依赖聚合入口实现细节 | import/dependency 检查与聚合适配回归 |

- Review Gate 结论：`spec_rigor=full`、`spec_overlays=[versioned]` 与跨层内容、共享注册和双宿主影响匹配；四个审计章节已形成。Plan 前如发现影响施工的事实缺证，须补证并阻塞相关项。
- 用户闸门 H-04：用户于 2026-11-24 明确批准 v0.8；Plan 亦于 2026-11-24 获批准。按 architecture Task 进入施工。
- 用户批准后交接：`workflow-integration-plan` 制定 architecture 专属 Plan，明确唯一事实源、生成投影、任务依赖、回滚及逐项 SOLID 证据；随后 `workflow-task-breakdown` 重制 Task。当前 DevOps Plan/Task 不适用于本阶段。

## 需求与范围

### 目标

总体目标仍是将当前单一 `mcu-workbench` 插件拆分为五个职责清晰、可独立发布又能协同工作的插件：

1. `mcu-workbench-workflow`：需求路由、审查门禁、计划执行和交接。
2. `mcu-workbench-architecture`：嵌入式软件架构与 App / Service / Platform / Impl / Vendor 分层。
3. `mcu-workbench-verification`：单元测试、主机 Fake/Unity、质量检查和代码审查。
4. `mcu-workbench-devops`：构建、链接、烧录、Git、CI/CD 和发布。
5. `mcu-workbench-observability`：日志、调试、串口/RTT、故障观测和上位机工具接入。

### 本轮第二插件范围

本轮只实施第二个插件 `mcu-workbench-observability`，不同时施工其他四个插件。选择依据是：其职责集中于调试和运行时观测，当前 canonical 能力主要为 `tools-debug` 与 `tools-observability`，跨层耦合和迁移风险低于 architecture、verification 和 devops。

本轮允许把已登记的外部 Skill 作为 observability 插件 Skill 迁移对象。候选范围包括与调试、串口、RTT、逻辑分析和运行时观测直接相关的外部 Skill；每个候选必须在归属矩阵中登记唯一目标、来源路径、当前格式、依赖和迁移状态。来源/版本/许可证尚未确认的条目可以进入迁移审计和兼容适配阶段，但不得被表述为已完成来源审计；归属不明确的条目不得强行迁移。

本轮交付目标是形成可由 Codex 与 Cursor MVP 宿主发现、加载和验证的 observability 插件边界，同时保留旧聚合入口、旧 Skill alias 和可回滚路径。

拆分后的插件体系必须为持续迭代预留扩展空间：插件是可替换、可组合、可卸载的能力单元，不把未来能力继续堆回一个新的中心插件。插件内部对象与能力装配优先复用当前软件架构的 `base + cfg / ctx / data / ops` 四元组模型；纯函数表或纯声明型契约只有在明确声明“不承载对象身份与生命周期”时才豁免。

Harness 设计借鉴 DeepSeek Harness 的可组合插件思想：模型适配、工具注册、会话/日志、执行循环等能力不应被视为不可替换的特权核心；插件通过注册表/事件总线提供能力，生命周期结束时撤销注册，配置通过 profile/bundle 组合。这里仅采纳架构思想，不假定当前 Claude/Codex/Cursor/OpenCode 已具备完整的动态卸载能力；宿主能力必须单独验证。

### 非目标

- 本阶段不修改目标固件、HAL、RTOS、BSP 或 Vendor 源码。
- 不改变现有 canonical Skill 的业务语义和 App → Service → Platform ← Impl → Vendor 契约。
- 不在未确定宿主依赖机制前删除旧的单插件入口。
- 硬件分析不并入五个核心插件，后续作为独立的第六个 `mcu-workbench-hardware` 插件规划；本阶段只保留现有硬件能力和兼容入口，不迁移硬件 Skill。
- 外部导入的现有 Skill 必须先建立清单，依据实际功能归属到唯一插件；本轮允许 observability 归属明确的外部 Skill 进入迁移，但未完成来源、依赖或许可证确认的条目必须保留 `blocked/unverified` 标记，不得伪称审计完成。
- 本阶段允许生成 `task.md` 草案；在所有阻塞项关闭前不得执行目录移动或代码迁移。
- 在能力与测试矩阵通过对齐前，不进入插件目录拆分；矩阵见 `capability-test-matrix.md`。
- MCP 作为外部工具/资源/服务适配层，不新增 Mods 层；MCP 不得绕过 Workflow、Rules 和证据门禁。
- 所有插件、Skill、Agent、Rule、Hook、脚本和 MCP descriptor 先遵循 MVP 统一格式；格式与最小 Runtime 测试通过前，不批量迁移现有能力。
- 基线修复允许修改现有 Skill 的登记元数据、链接目标和文档路径；不得通过静默排除、空占位文件或关闭校验器掩盖缺失。外部来源文件无法进入仓库时，必须保留来源标记并从本地完整性验收中显式隔离。
- 新增对象统一采用 kebab-case ID、统一命名空间和 SemVer；现有下划线/旧调用名只通过 aliases 兼容，不作为新代码标准。
- 本轮 MVP 真实宿主验收范围为 Codex + Cursor；Claude 延期。2026-11-24 用户追加批准移除旧聚合插件的活动 OpenCode 宿主适配；保留历史审计记录，不改动其他宿主边界。

### 2026-11-24 OpenCode 清理补充范围（user-confirmed）

- 清理目标：旧聚合插件中仍参与安装、导入、配置、命令生成或质量钩子执行的 OpenCode 活动宿主表面。
- 清理内容：OpenCode package export/runtime/config、专属依赖与脚本、质量 Hook、命令生成器及 `.opencode/commands/` 派生产物和 OpenCode 专属测试。
- 保留内容：`.mcu-workbench/workflows/`、`codex/plugin-split/` 等历史审计记录；这些文件只记录历史事实或范围边界，不参与运行或发布。
- 非目标：删除 Claude/Codex/Cursor 能力；清理历史记录中的所有 OpenCode 文字；改动 observability 插件运行时或 Skill 语义。
- 验收：活动包元数据、入口、脚本、配置与源码不再依赖/暴露 OpenCode；历史记录保留；package JSON/lock 一致；既有 Codex/Cursor 验证结果不被改写。

## 1. 工程现状表

| ID | 事实或约束 | 证据 | 可信等级 | 影响 |
|---|---|---|---|---|
| E-01 | 当前仓库是一个多宿主单插件源 | `package.json`、`.claude-plugin/plugin.json`、`.codex-plugin/plugin.json` | `confirmed` | 拆分需考虑 Codex/Cursor/Claude 表面；OpenCode 不在目标范围 |
| E-02 | Skill 唯一事实源由 `skills/catalog-metadata.js` 与 `skills/catalog.js` 维护 | `CONTEXT.md`“插件机制速记” | `confirmed` | 不能只移动目录，必须重构注册与兼容映射 |
| E-03 | 当前 Skill 目录同时包含 workflow、软件架构层、tools 和 hardware | `README.md` 插件结构、`.claude-plugin/plugin.json` | `confirmed` | hardware 后续独立为第六插件，当前不并入五插件迁移 |
| E-04 | Agent 技能由 `lib/agent-domains.js` 从 catalog 派生 | `README.md` Agent 团队、`lib/agent-domains.js` | `confirmed` | Agent 路由不能继续假设单 catalog |
| E-05 | 当前已有 `tools-quality`、`tools-verification`、`tools-build`、`tools-debug`、`tools-observability` 等 canonical Skill | `skills/catalog.js`、`README.md` | `confirmed` | 三个横切插件可优先通过能力迁移实现 |
| E-06 | 当前仓库包含同步、校验和本地安装脚本 | `package.json` scripts、`scripts/` | `confirmed` | 需要拆分 manifest、版本同步和安装验证入口 |
| E-07 | 旧 `mcu-workbench` 单插件入口需要在拆分后继续兼容 | 用户确认 | `user-confirmed` | 需要聚合入口、旧 Skill alias 和迁移提示 |
| E-08 | 宿主是否支持跨插件 Skill 依赖、版本约束和自动交接尚未由当前文件证明 | 未在现有 manifest/README 中确认 | `unverified` | 这是实施前阻塞项，必须先做宿主能力验证 |
| E-09 | 上位机能力尚未形成独立 canonical Skill | `skills/catalog.js` 当前 tools 列表 | `confirmed` | 需要新增 `tools-host` 或等价能力，不能伪称已有 |
| E-10 | 当前软件架构已有对象四元组约束 | `skills/platform/platform_common/references/object-four-tuple-template.md`、`skills/bsp/references/bsp-architecture-contract.md` | `confirmed` | 插件运行时对象应复用 `base + cfg/ctx/data/ops`，避免创建第二套对象模型 |
| E-11 | Harness 的“能力可替换、注册可撤销、profile 组合”来自 DeepSeek Harness 公开架构资料 | `https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md` | `confirmed`（外部资料） | 作为设计参考，不作为当前宿主已支持能力的证明 |
| E-12 | 当前 Codex/Cursor/Claude 宿主是否支持动态卸载、事件订阅撤销、跨插件 profile 组合尚未确认 | 现有 manifest 与脚本尚未证明 | `unverified` | 必须先做 capability probe；在此之前只能实现静态组合/显式生命周期 |
| E-13 | 外部导入 Skill 的来源、许可证、依赖和功能边界尚未形成统一清单 | 当前仓库未提供完整外部 Skill 登记表 | `unverified` | 必须新增 inventory 和归属审计，不能按目录名称猜测插件归属 |
| E-14 | `tools-debug`、`tools-observability` 及部分外部调试/串口/观测 Skill 可形成职责集中的 observability 候选 | `skills/catalog-metadata.js`、`codex/plugin-split/skill-ownership-matrix.md`、候选目录 | `confirmed`（候选集合）；外部元数据仍 `unverified` | 本轮先迁移 canonical 能力和归属明确的外部能力，未知归属保留阻塞 |
| E-15 | 第二插件宿主验收范围固定为本地 Codex + Cursor MVP | 用户确认 | `user-confirmed` | 不以 Claude 或 OpenCode 结果阻塞本轮；不宣称热加载/动态卸载已支持 |

## 2. 文件施工清单

| ID | 范围 | 主要文件/目录 | 归属 | 施工内容 | 状态 |
|---|---|---|---|---|---|
| F-01 | 新增 | `packages/contracts/` 或等价共享目录 | 共享契约 | 定义 Skill ID、插件能力、RCP/Spec/Plan/Task、证据等级和版本协议 | blocked：待方案选择 |
| F-02 | 重组 | `skills/workflow/` | workflow | 迁移并保留 Router-first、门禁、计划和任务执行语义 | blocked |
| F-03 | 重组 | `skills/app/`、`service/`、`platform/`、`impl/`、`vendor/` | architecture | 迁移五层架构 Skill 与分层引用 | blocked |
| F-04 | 重组 | `skills/tools/tools-quality`、`tools-verification` | verification | 迁移质量、单元测试、主机测试和代码审查能力 | blocked |
| F-05 | 重组 | `skills/tools/tools-build`、`tools-linker`、`tools-flash`、`tools-git`、`tools-release` | devops | 迁移构建、产物、版本和发布能力 | blocked |
| F-06 | 本轮 | `skills/tools/tools-debug`、`skills/tools/tools-observability` | observability | 迁移调试、日志、串口/RTT 和运行时观测能力；上位机仅保留 descriptor/fake/contract test 边界 | ready-for-plan |
| F-07 | 本轮 | `.codex-plugin/`、`.cursor-plugin/` 及 observability 插件 manifest | 宿主适配 | 为 observability 生成 Codex/Cursor manifest 和兼容入口；不新增 Claude/OpenCode 适配 | ready-for-plan |
| F-08 | 修改 | `skills/catalog.js`、`catalog-metadata.js`、`lib/agent-domains.js` | 注册与路由 | 从单 catalog 改为插件级 catalog/聚合视图，保留旧调用名解析 | blocked |
| F-09 | 本轮 | `scripts/`、`tests/` | 工具与测试 | 增加 observability 插件校验、外部 Skill 归属/适配、Codex/Cursor 表面和回滚测试 | ready-for-plan |
| F-10 | 后续 | `plugins/hardware/` | hardware | 作为第六个独立插件迁移 PCB、VISA 和硬件分析能力 | deferred |
| F-11 | 新增 | `packages/contracts/plugin-runtime/` 或等价目录 | 插件运行时契约 | 定义 plugin descriptor、profile/bundle、注册句柄、生命周期和事件契约 | blocked：待宿主能力探测 |
| F-12 | 修改 | `lib/`、新增 runtime/registry 模块 | 插件运行时 | 以对象四元组承载插件状态：`base + cfg + ctx + data + ops`；注册/撤销必须可测试 | blocked |
| F-13 | 新增 | `plugins/*/profiles/` 或等价目录 | 组合配置 | 允许按项目组合五个现有插件及未来插件 | blocked |
| F-14 | 本轮 | `codex/plugin-split/external-skill-inventory.yaml`、归属矩阵和许可证记录 | 迁移审计 | 筛选 observability 外部 Skill，登记来源、版本、许可证、功能、依赖、目标插件和迁移状态 | ready-for-plan |
| F-15 | 本轮 | `plugins/mcu-workbench-observability/adapters/external/` 或等价目录 | 兼容适配 | 对归属明确但尚未改写格式的外部 Skill 提供 descriptor/alias/adapter；不得静默修改原内容 | ready-for-plan |

## 3. 代码生成约束清单

| ID | 约束 | 必须遵守 | 禁止事项 | 状态 |
|---|---|---|---|---|
| G-01 | 兼容性 | 旧 `mcu-workbench` 入口至少保留一个过渡版本或聚合入口 | 直接删除旧入口 | ready |
| G-02 | 依赖方向 | workflow 编排其他插件；architecture 不依赖 devops/observability 实现 | 在 architecture 中复制工具实现 | ready |
| G-03 | 契约唯一性 | Skill ID、别名、schema、证据等级只保留一个事实源 | 每个插件维护一套互不一致的 catalog | ready |
| G-04 | 版本化 | 插件间依赖必须带版本范围、兼容矩阵和迁移说明 | 依赖 latest 或未锁定版本 | ready |
| G-05 | Host 能力 | 本轮分别验证 Codex、Cursor 的 manifest、命令和 Skill 加载 | 用一个宿主成功替代另一个宿主验收；将 Claude/OpenCode 结果写成本轮通过证据 | ready |
| G-06 | 生成边界 | 脚本生成 manifest、catalog 和兼容映射时保留源文件归属 | 手工修改生成文件绕过源事实 | ready |
| G-07 | 回滚 | 迁移阶段支持恢复单插件入口和旧调用别名 | 在验证前进行不可逆删除 | ready |
| G-08 | 上位机边界 | 新增上位机能力只允许 descriptor/fake/contract test；若涉及协议、进程、串口/USB/TCP 权限必须显式登记 | 将具体 PC 工具名称推测为已存在能力，或把 fake 结果写成真实设备验证 | ready-for-plan |
| G-09 | Harness 插件化 | 每个插件通过 descriptor 注册能力、依赖、事件和生命周期 | 依赖修改中心循环或隐式 monkey patch | blocked：待 runtime 设计 |
| G-10 | 对象建模 | 有身份/生命周期的插件对象使用 `base + cfg / ctx / data / ops`；纯能力表显式声明豁免 | 为每类插件发明不同状态对象 | ready |
| G-11 | 可撤销注册 | `register()` 返回可调用的 `dispose()`/撤销句柄；卸载顺序可重复执行 | 把全局注册表当作永久状态 | blocked：待宿主能力探测 |
| G-12 | 扩展兼容性 | 新插件只需新增 descriptor/profile/adapter，不应修改旧插件核心逻辑 | 为加入新插件修改所有既有插件 | ready |

## 4. 验收测试清单

| ID | 证据等级 | 验收项 | 预期结果 | 状态 |
|---|---|---|---|---|
| V-01 | 静态 | 五个插件 manifest、目录和 Skill 归属矩阵完整 | 无重复 canonical Skill、无孤儿 Skill | not-run |
| V-02 | 主机 | catalog、别名、插件依赖和 Agent 路由测试 | 新旧调用名解析结果稳定 | not-run |
| V-03 | 构建/脚本 | `npm test -- --runInBand`、`npm run validate:plugin`、`npm run validate:links` | 现有测试与新增拆分测试通过 | not-run |
| V-04 | 宿主 | 按 Codex + Cursor 加载 observability 插件 | observability manifest、Skill、命令和兼容入口可发现；Claude 延期 | ready-for-plan |
| V-05 | 兼容性 | 以旧 `mcu-workbench` 入口执行代表性 workflow、architecture、quality、build、debug 请求 | 旧入口能路由到新插件或给出明确迁移提示 | not-run |
| V-06 | 版本化 | 构造插件版本不兼容场景 | 安装或路由明确阻止，并指出升级路径 | not-run |
| V-07 | 回滚 | 在迁移中途恢复旧聚合入口 | 无需丢弃用户文件即可恢复可用状态 | not-run |
| V-08 | 上位机 | 对 observability 的 descriptor/fake/contract test 运行主机测试 | 未连接硬件时能区分 mock 与真实观测；不扩大为具体设备协议实现 | ready-for-plan |
| V-09 | 主机 | 构造插件 descriptor、注册、撤销和重复加载测试 | 注册无残留、撤销幂等、重复加载不重复执行 | blocked |
| V-10 | 主机 | 验证 `base + cfg/ctx/data/ops` 的生命周期和依赖注入 | 状态、配置、运行上下文、数据缓存和操作表边界清晰 | blocked |
| V-11 | 静态/主机 | 新增一个示例扩展插件，不修改既有五插件核心代码 | 仅增加 descriptor/profile/adapter 即可接入 | blocked |
| V-12 | 宿主 | 对 Codex/Cursor 做静态组合和显式生命周期探测 | 明确记录本轮支持静态组合、显式生命周期和重启加载；热加载/动态卸载保持未验证 | ready-for-plan |
| V-13 | 静态/主机 | observability 外部 Skill inventory 和归属矩阵校验 | 每个候选只有一个目标插件；未知元数据显式标记，不阻塞已确认归属条目的适配审计 | ready-for-plan |
| V-14 | 主机 | observability 外部 Skill 兼容适配测试 | 归属明确的外部 Skill 可通过 alias/adapter 被目标插件调用，且不改变原内容 | ready-for-plan |
| V-15 | 静态/主机 | observability 与其他候选插件的边界检查 | debug/RTT/串口/运行时观测归 observability；质量、构建、烧录和架构职责不重复迁移 | ready-for-plan |

## 方案审查结论

- 可采用：五插件职责聚合；本轮优先执行职责集中、依赖较少的 Observability；外部 Skill 可作为归属明确的迁移对象。
- 需修订：硬件 Skill 的归属、跨插件依赖机制、上位机能力的具体边界、动态卸载能力和 profile/bundle 语义。
- 阻塞风险：当前未确认宿主是否支持动态插件生命周期、跨插件依赖和版本约束；外部 Skill 的部分来源/版本/许可证仍未确认；具体上位机协议仍不在本轮范围。
- SOLID 约束：拆分后每个插件应保持单一职责；workflow 通过契约依赖能力而非复制实现；新增插件应可扩展而不修改其他插件核心；各宿主适配应遵守同一契约；依赖注入通过共享 descriptor/schema 和四元组对象完成。实现阶段必须用测试证明。
- 代码阶段判定：`blocked`，等待本 Spec 的 Review Gate 和用户审查；放行后仅允许进入 observability 的 Plan/Task 链路。

## 用户闸门

`H-03 spec-review-second-plugin`: `approved`

已确认决策：

1. 已确认：采用这五个插件名称和职责边界。
2. 已确认：硬件分析后续另建第六个插件。
3. 已确认：旧单插件入口保留为兼容聚合入口。
4. 已确认：插件运行时统一采用 `base + cfg / ctx / data / ops`，并以 Harness 风格的 descriptor、profile、注册/撤销生命周期作为扩展机制。
5. 已确认：硬件分析后续作为独立第六插件，不进入本轮五插件拆分。

6. 已确认：本轮跳过并忽略 T-002 外部 Skill inventory 的完成门槛；现有 inventory 仅作为未验证记录保留，不作为本轮迁移阻塞条件。来源、版本、许可证和依赖审计延期到后续迁移审查。

7. 已确认：T-004 本轮只验证本地 Codex 与 Cursor 宿主表面；Claude 延期，不阻塞 MVP。MVP 只承诺静态组合、显式生命周期和重启加载；热加载、动态卸载、事件撤销保持 `unverified`。

8. 已确认：T-009 沿用同一 Codex/Cursor MVP 宿主范围；Claude 的真实加载验证延期，不阻塞本轮兼容交付。
9. 已确认：第二个插件按拆分难度选择为 `mcu-workbench-observability`。
10. 已确认：已登记且归属明确的外部 Skill 可以作为 observability 插件 Skill 迁移；来源、版本、许可证或依赖未知的条目必须保留未验证/阻塞标记，不得伪称审计完成。
11. 已确认：本轮验收范围为 Codex + Cursor MVP；不以 Claude、OpenCode、热加载或动态卸载作为通过条件。

### 本轮交接状态

- 现有 `plan.md` 和 `task.md` 仍对应上一轮五插件整体拆分，不能直接作为本轮施工输入。
- Spec 获用户批准并通过 `workflow-review-gate` 后，必须重新生成仅针对 observability 的 `plan.md` 与 `task.md`。
- 在 Spec 放行前不得迁移目录、修改 manifest、调整 catalog 或执行代码施工。

## 2026-11-24 当前阶段补充：Verification 插件物理目录拆分

本节是当前有效的阶段范围，优先于上文“本轮第二插件范围”及其 observability 交接说明。前述 observability 范围、决策和验证记录保留为已完成阶段的历史审计，不视为本阶段施工输入。

### RCP 与确认项

| 字段 | 内容 | 可信等级 |
|---|---|---|
| 项目路径 | `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai` | confirmed |
| 分支/提交 | `host_ai`；`969398e6f5aea785da143ca4535d76ebf6b86188` | confirmed |
| 目标插件 | `mcu-workbench-verification`，用户说明为用于单元测试的插件 | user-confirmed |
| 目标结果 | 将 verification 能力从旧聚合插件结构中物理拆分为独立插件目录，具备独立宿主发现和验证入口 | user-confirmed |
| 拆分边界 | 完整插件边界：本插件归属的 Skill 内容、descriptor/manifest、运行入口、插件专属校验/测试入口及必要 catalog/alias 兼容映射 | user-confirmed |
| 外部迁移集合 | 将四个论文/研究 Skill `academic-paper`、`academic-paper-reviewer`、`academic-pipeline`、`sr-screener` 从 verification 插件转移到 Codex Agent Skills；将 `embedded-unit-test-generator`、`static-analysis` 留在 verification 插件；其他归属和 unknown 项不迁移 | user-confirmed |
| 兼容要求 | 保留旧 `mcu-workbench` 聚合入口和现有 Skill 调用 aliases，使既有调用可继续工作或获得确定的迁移提示 | user-confirmed（沿用既有决策） |
| 已有基线 | `plugins/verification/index.js` 已有 `mcu-workbench-verification` descriptor、`verification-run` 能力、`tools-quality`/`tools-verification` 来源 Skill 声明及报告生成逻辑；尚未形成独立 Codex/Cursor manifest 和完整物理目录 | confirmed |
| 验收宿主 | Codex + Cursor MVP；Claude 延期，沿用已批准的宿主范围 | user-confirmed |
| 风险/力度 | 多目录迁移、catalog/alias/manifest 与旧入口兼容均会受影响；采用 `full` + `versioned` | inferred from confirmed scope |

目的质疑结论：为嵌入式 verification 插件保留直接服务于嵌入式测试/静态分析的 Skill；论文撰写、同行评审、研究流水线与系统综述筛选归入 Codex 通用 Agent Skills。用户确认四项 Skill ID 及两项留存范围。可行性质疑结论：仓库已有 `scripts/sync-codex-skills.js`，默认安装到 `~/.agents/skills`；本次需验证它能把四项可发现地交付，并确认 verification 插件 manifest 不再包含它们。范围结论：verification 插件继续拆分；四项 Codex Skill 归属迁移；两个嵌入式验证外部 Skill 留在插件；其他归属与 `unknown` 不动。验收缺口：新增 Codex 注册及插件排除验收，原 v0.5 Plan/Task 失效，须在 v0.6 放行后重制。

### 目标范围与非目标

**本阶段范围**

1. 在 `plugins/mcu-workbench-verification/` 建立独立、可验证的插件包边界；既有 `plugins/verification/` 作为迁移基线处理，不默认将骨架视作已完成物理拆分。
2. 纳入归属矩阵指向 `mcu-workbench-verification` 的验证能力。核心 canonical Skill 至少包括 `tools-verification` 与 `tools-quality`；质量门禁、单元测试/主机 Fake、Map/RAM/ROM/栈分析及 Final Review 职责继续遵循能力矩阵和现有 Skill 契约。
3. 从 verification 插件的独立包中移除 4 个论文/研究 Skill：`academic-paper`、`academic-paper-reviewer`、`academic-pipeline`、`sr-screener`；将其注册为 Codex Agent Skills，通过仓库现有 Codex Skill 同步机制安装到其配置目标 `~/.agents/skills`。其仓库 canonical 源路径与兼容投影由放行后的 Plan 明确，必须满足 Codex 特化写入边界并保持单一事实源。逐项保留来源、版本、许可证和依赖状态；未验证元数据继续标记，不得伪称审计完成。
4. verification 独立包仅纳入 `tools-verification`、`tools-quality`、`embedded-unit-test-generator` 和 `static-analysis`；提供 descriptor、Codex/Cursor manifest、Skill 发现入口、包级校验/测试入口和必要版本元数据。四个论文/研究 Skill 不得列入 verification 插件的物理 `skills/` 目录或插件 manifest。不得把单元测试运行能力伪装成目标固件测试已通过。
5. 更新共享 catalog/生成映射时保留原始事实源和旧 Skill IDs/aliases；旧聚合入口须能通过兼容映射访问迁移后的 verification 能力。
6. 目录移动或复制策略须在后续 Plan 中明确单一事实源、生成边界、去重方式和回滚顺序；不得形成两个可独立编辑、内容漂移的 canonical Skill 副本。

**明确非目标**

- 不迁移 workflow、architecture、devops、observability 或 hardware 插件归属内容；不重做已完成的 observability MVP。
- 不改变 Skill 业务语义、单元测试框架语义、质量规则、报告格式契约或 App → Service → Platform ← Impl → Vendor 边界。
- 不修改目标固件、HAL、RTOS、BSP、Vendor 源码；本阶段插件主机测试不等同于目标板/真实硬件验证。
- 不新增 Claude/OpenCode 适配，不实现热加载、动态卸载或跨插件动态依赖。
- 不在本 Spec 放行前移动目录、改 manifest/catalog、重写 `plan.md`/`task.md` 或施工代码。

### 现状证据与可信边界

| ID | 事实 | 证据 | 等级 |
|---|---|---|---|
| VFY-E01 | 目前存在 verification 插件 MVP 骨架和测试报告生成逻辑 | `plugins/verification/index.js` | confirmed |
| VFY-E02 | 当前骨架声明的源 Skill 为 `tools-quality`、`tools-verification` | `plugins/verification/index.js` | confirmed |
| VFY-E03 | 当前根包仍提供共享测试、catalog、兼容和安装脚本；verification 专属 pilot 从根脚本调用旧目录 | `package.json`、`scripts/verification-pilot.js`、`tests/plugin-contracts.test.js` | confirmed |
| VFY-E04 | 归属矩阵为 verification 登记多项外部 Skill，但其来源/许可证/依赖仍可能未验证 | `codex/plugin-split/skill-ownership-matrix.md`、`external-skill-inventory.yaml` | confirmed（登记状态）；元数据依各条目状态 |
| VFY-E05 | Codex + Cursor 是本阶段宿主 MVP 范围；Claude 延期 | 前序用户确认及本次沿用既有边界 | user-confirmed |
| VFY-E06 | 当前物理拆分尚未按本 Spec 验收；旧 verification 插件 MVP 的完成证据不能自动证明独立宿主加载 | 本次只读检查；未见独立 Codex/Cursor manifest 于 `plugins/verification/` | confirmed |
| VFY-E07 | v0.5 inventory 曾将 6 项标为 verification；用户现已确认四个论文/研究 Skill 改归 Codex Agent Skills，两项嵌入式验证 Skill 仍归 verification；元数据仍按条目未验证状态保留 | inventory、ownership matrix 与本次用户确认 | confirmed（旧登记）；user-confirmed（新归属）；元数据按条目状态 |
| VFY-E08 | 仓库 `scripts/sync-codex-skills.js` 默认同步登记 Skill 至 `~/.agents/skills`；仓库 canonical source 通过 `skills/catalog.js` 注册 | `scripts/sync-codex-skills.js`、`skills/catalog.js` | confirmed | Codex Skill 可沿用宿主同步入口；Plan 需规定单一源和旧聚合兼容投影 |
| VFY-E09 | 四个研究类 Skill 的插件边界检查原报 22 条失效引用；已修正指向仓库 deep-research Skill 的 1 条，剩余 21 条/12 个目标未在仓库或用户提供的额外 Skills ZIP 中找到 | `node scripts/validate-skill-links.js --root plugins/mcu-workbench-verification/skills --boundary-root .`；`C:\Users\shuaitan2\Desktop\嵌入式工作台额外skills` 压缩包目录只读检查 | confirmed | 迁移到 Codex 时保留原始 Skill 内容并显式记录缺失目标；不得伪造、静默删除引用或把目录发现写成内容验证通过 |

### 1. 工程现状表

以下四个审计章节共同适用：`request_id=REQ-PLUGIN-SPLIT-20261123`；项目路径为本表所列绝对根目录，分支/提交为 `host_ai@969398e6f5aea785da143ca4535d76ebf6b86188`；当前审查状态 `review-gate-approved / pending-user-approval`；输入 RCP 为本 Spec 的“RCP 与确认项”及上述目的/可行性质疑结论；证据等级使用 `confirmed`、`user-confirmed`、`inferred`、`unverified`。证据来源均列于每条事实行。

| ID | 工程事实 | 证据 | 等级 | 审查结论 |
|---|---|---|---|---|
| VFY-R01 | 仓库已有以 `mcu-workbench-verification` 为 ID 的插件骨架，但路径为 `plugins/verification/` | `plugins/verification/index.js` | confirmed | 可作为迁移基线，不能据此判定物理拆分和宿主发现已完成 |
| VFY-R02 | 骨架依赖共享 `packages/contracts`，并暴露 `verification-run`、两项来源 Skill 和报告生成逻辑 | `plugins/verification/index.js` | confirmed | 保留现有契约行为；独立包仍需声明清晰的共享契约依赖 |
| VFY-R03 | pilot、catalog、安装和测试入口当前位于根包 | `package.json`、`scripts/verification-pilot.js`、`tests/` | confirmed | Plan 需规定插件专属入口与根聚合兼容入口的所有权 |
| VFY-R04 | Codex/Cursor 独立 manifest 尚未位于当前 `plugins/verification/` | 当前目录清单；独立 manifest 未发现 | confirmed | 两个宿主加载均列入验收 |
| VFY-R05 | 外部归属矩阵中 verification 项存在，但部分来源元数据未验证 | `codex/plugin-split/skill-ownership-matrix.md`、`external-skill-inventory.yaml` | confirmed（登记事实） | 不把名称推断成来源审计结果；逐条保留状态 |
| VFY-R06 | 本阶段 verification 插件仅保留 `embedded-unit-test-generator`、`static-analysis` 两个外部 Skill；四个论文/研究 Skill 改由 Codex Agent Skills 管理 | 用户于 2026-11-24 明确确认四项迁移集合及两项留存范围 | user-confirmed | 更新 inventory/ownership 唯一归属、Codex 注册与 verification 包排除映射 |

### 2. 文件施工清单

| ID | 目标范围 | 职责归属 | 约束/交付 |
|---|---|---|---|
| VFY-F01 | `plugins/mcu-workbench-verification/` | 独立插件包 | descriptor、包元数据、Codex/Cursor manifest、运行入口和验证入口 |
| VFY-F02 | `plugins/mcu-workbench-verification/skills/` | verification | `tools-verification`、`tools-quality`、`embedded-unit-test-generator`、`static-analysis`；不得包含四个论文/研究 Skill |
| VFY-F03 | catalog、Skill resolver、旧聚合 manifest/入口 | 共享兼容面 | 保留旧 Skill IDs/aliases，映射至迁移后的唯一事实源，不重复注册 |
| VFY-F04 | 插件包校验、测试与报告入口 | verification | 可独立校验与运行主机 pilot；根包可保留薄兼容转发 |
| VFY-F05 | inventory、归属矩阵与 Codex Skill 注册 | 迁移审计 | 四个论文/研究 Skill 唯一归属 Codex Agent Skills；两个嵌入式验证 Skill 唯一归属 verification；未知元数据状态保留 |
| VFY-F06 | Codex Skill registry/sync adapter | Codex 宿主适配 | 四个迁移 Skill 可通过现有 Codex Skill 同步入口进入 `~/.agents/skills`；具体 source/projection 由 Plan 明确且无双写事实源 |

### 3. 代码生成约束清单

| ID | 必须遵守 | 禁止事项 |
|---|---|---|
| VFY-G01 | 插件 ID、capability ID、版本和 Codex/Cursor manifest 声明一致，并通过共享 contracts 校验 | 在插件 manifest 和根 catalog 中维护相互漂移的重复定义 |
| VFY-G02 | 旧入口与 aliases 兼容映射指向单一 canonical Skill 内容 | 保留两个可独立修改的 Skill 副本或静默删除旧调用名 |
| VFY-G03 | 测试报告明确记录命令、绝对 cwd 和证据等级，host 结果只声明 host 证据 | 把主机测试/插件加载写成固件、目标板或实物通过 |
| VFY-G04 | 四项论文/研究 Skill 注册到 Codex Agent Skills；两项嵌入式验证 Skill 随 verification 插件发布；元数据未知则保留未验证标记 | 将四项论文/研究 Skill 放入 verification 插件，或推断未审计来源信息 |
| VFY-G05 | 提供可执行的兼容回滚步骤，保持旧聚合入口可恢复 | 在兼容映射和新宿主入口未验证前删除旧聚合面 |

### 4. 验收测试清单

| ID | 级别 | 验收项 | 通过条件 |
|---|---|---|---|
| VFY-T01 | 静态 | descriptor、包版本和 Codex/Cursor manifests | Schema/ID/版本一致且无缺失入口 |
| VFY-T02 | 主机 | 插件独立校验和 verification pilot | 成功、失败、异常、报告字段与证据等级符合现有契约 |
| VFY-T03 | 主机 | Skill 链接、catalog、aliases 与唯一事实源 | 两个 canonical Skill 均可解析；无重复 ID、失效链接或内容漂移 |
| VFY-T04 | 兼容 | 旧聚合入口和 aliases | 请求可路由至迁移能力或输出明确迁移提示；无静默失败 |
| VFY-T05 | 宿主 | Codex 独立发现和加载 | 插件及其 Skills 可发现 |
| VFY-T06 | 宿主 | Cursor 独立发现和加载 | 插件及其 Skills 可发现 |
| VFY-T07 | 回滚 | 恢复旧聚合入口和注册映射 | 无需丢弃用户数据，可恢复兼容状态 |
| VFY-T08 | 静态/审计 | verification 外部 Skill 归属与元数据状态 | 唯一归属；未知项不迁移，未验证来源保持显式标记 |
| VFY-T09 | 静态/主机 | verification 保留的两个外部 Skill | `embedded-unit-test-generator`、`static-analysis` 在插件目录发现、链接有效且逐项元数据状态保持；不改变原内容语义 |
| VFY-T10 | 静态/主机/Codex host | 四个 Codex Agent Skills | 四项可经 `scripts/sync-codex-skills.js` 注册到配置目标、在 Codex Skills 中独立发现；不出现在 verification 插件目录/manifest；兼容映射无重复 ID；21 条既有缺失引用逐项登记且 Skill 原内容语义不变 |

### 验收标准

| ID | 级别 | 通过条件 |
|---|---|---|
| VFY-A01 | 静态 | 独立插件目录包含合法 descriptor、包元数据和 Codex/Cursor manifest，ID 均为 `mcu-workbench-verification`，版本与能力声明一致 |
| VFY-A02 | 静态/主机 | 两个 canonical Skill 在插件内可发现、链接有效、catalog/别名唯一且指向同一事实源；verification 归属项有明确迁移状态，unknown 项未被迁移 |
| VFY-A03 | 主机 | 插件包独立校验和既有单元测试/报告 pilot 可从插件包入口执行；测试通过、失败、异常及证据等级表达确定且与现有契约兼容 |
| VFY-A04 | 兼容 | 旧聚合入口和既有 aliases 可访问迁移后的能力，或按既有迁移规则给出明确提示；不得出现静默失效或重复注册 |
| VFY-A05 | 宿主 | Codex 和 Cursor 分别发现 verification 插件与其 canonical Skills；一个宿主通过不得替代另一个宿主验收 |
| VFY-A06 | 回滚 | 按 Plan 定义可恢复旧聚合入口和 catalog/alias 映射，不丢失迁移前用户数据 |
| VFY-A07 | 证据分级 | 静态、主机、宿主加载结果分开报告；不得声称已完成目标固件、目标板或实物验证 |
| VFY-A08 | 范围完整性 | 迁移内容与归属矩阵一致；外部来源/版本/许可证/依赖未知的项继续标记未验证，不阻塞核心 canonical 插件的独立边界验收，除非其运行时依赖实际构成阻塞 |
| VFY-A09 | 外部 Skill 迁移 | verification 包中仅包含归属 verification 的两个外部 Skill；四个论文/研究 Skill 不出现在 verification 包或其 Skill manifest 中；归属矩阵/inventory 与物理目录一致，未知项不得伪称审计完成 |
| VFY-A10 | Codex Skill 注册 | 四个论文/研究 Skill 均可由仓库 Codex Skill registry/sync 安装到配置目标 `~/.agents/skills` 并在 Codex 独立发现；同一 ID 不同时重复注册为 verification 插件 Skill；旧聚合 aliases 在迁移期有确定行为 |

### Review Gate 与实现闸门

- Review-Package 必须保留范围/非目标、业务/契约规则、状态/兼容边界、可验证验收四个审查章节；重点审查单一事实源与生成边界、verification 包排除四个研究 Skill、Codex Skill 注册与发现、旧 catalog/alias 兼容、外部 Skill 证据等级及回滚。
- SOLID 施工约束：SRP 要求 verification 只承载测试/质量验证职责；OCP 要求新增验证能力不需改动其他插件核心；LSP 要求插件适配满足 descriptor/capability 契约；ISP 要求宿主 manifest 与测试能力接口最小化；DIP 要求插件依赖共享 contracts 而非旧聚合实现。Plan/实现阶段须给出逐项证据。
- v0.5 Review Gate 与用户批准仅作为历史状态；本 v0.6 变更了外部 Skill 归属和验收，旧结论不适用于当前范围。
- 当前 Review Gate 状态：`approved`；四个审计章节按 v0.6 复核通过，用户确认的四项/两项归属、Codex 同步目标和排除规则已进入验收。21 条旧引用缺口有明确证据并要求保留审计，不再作为 verification 插件自身的目录边界失败。
- 用户审查状态：`approved`；用户明确批准 Spec v0.6。
- 用户审查历史：用户于 2026-11-24 批准本 Spec v0.6，范围为四个研究 Skill 转 Codex Agent Skills、两个验证 Skill 留在 verification。
- 代码施工状态：`complete-with-limitations`；按已批准 v0.3 Plan 与 Task 完成实施和最终验证。
- 已完成：Codex native registry/定向同步、四项从 verification 插件移除、ownership 更新；定向 Jest 18/18、完整 Jest（30 秒 timeout）59/59 suites、352/352 tests 通过。Codex UI 刷新后的当前会话发现未独立观察；21 个历史资源目标及一个 `deep-research` 兄弟 Skill 引用仍未验证。

## 2026-11-24 当前阶段补充：DevOps 第三个插件拆分（v0.7）

本节是当前阶段唯一有效的施工范围，优先于本文件中 observability 和 verification 阶段的历史范围/状态记录。前两阶段的范围仅作为兼容基线；其 Plan/Task 不适用于本阶段。

### RCP 与确认项

| 字段 | 内容 | 可信等级 |
|---|---|---|
| 项目路径 | `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai` | confirmed |
| 分支/提交 | `host_ai@969398e6f5aea785da143ca4535d76ebf6b86188`；工作区存在其他未提交改动 | confirmed |
| 目标插件 | 第三个独立插件 `mcu-workbench-devops`，负责构建、链接、烧录、Git、CI/CD 与发布工具能力 | user-confirmed（插件 ID/职责沿用已有 Spec） |
| Skill 范围 | 五项 canonical Skills：`tools-build`、`tools-linker`、`tools-flash`、`tools-git`、`tools-release`；以及归属矩阵当前列出的全部 11 项外部 Skills：`build-cmake`、`build-iar`、`build-idf`、`build-keil`、`build-makefile`、`build-platformio`、`flash-idf`、`flash-jlink`、`flash-keil`、`flash-openocd`、`flash-platformio` | user-confirmed（范围选择）；清单 confirmed（ownership matrix） |
| 插件边界 | 完整独立包，含 descriptor、包元数据、Codex/Cursor manifests、运行/发现入口、包级校验与测试入口，以及旧聚合入口兼容 | user-confirmed |
| 宿主验收 | Codex + Cursor MVP；分别验证，Claude 不属于本轮 | user-confirmed（沿用前序宿主边界并在本轮重申） |
| 兼容 | 保留 `mcu-workbench` 聚合入口和现有调用 aliases；新旧入口映射到唯一 canonical 内容或返回明确迁移提示 | user-confirmed（沿用 v0.6 决策） |
| 外部来源状态 | 当前 11 项在归属矩阵中按目录/名称语义推断归属，来源、版本、许可证、依赖仍标记 blocked/unverified；迁移审计不得把归属确认写成来源审计完成 | confirmed（矩阵/inventory）；来源真实性仍 blocked |
| 力度与门禁 | `spec_rigor=full`，`spec_overlays=[versioned]`；影响多插件 catalog/aliases、两个宿主适配和回滚，必须版本化；Spec 先经 Review Gate，再由用户审阅批准 | inferred（风险选择）；review gate 当前通过，用户闸门待批准 |

**目的质疑：** 用户目标是按已有五插件体系继续拆分第三个职责插件，避免构建、链接、烧录、Git 与发布工具继续只存在于聚合插件边界中。成功标准是插件具备独立发现、校验和回滚边界，同时旧聚合入口继续可用。目的结论为 `user-confirmed`；未扩展到实际固件构建、烧录或发布操作。

**可行性质疑：** 仓库已有独立 verification 与 observability 插件目录和 Codex/Cursor manifest 样例；DevOps canonical 来源位于 `skills/tools/tools-build`、`tools-linker`、`tools-flash`、`tools-git`、`tools-release`，外部项由 inventory/ownership matrix 登记。完整包结构可沿用现有契约形态；实际 Codex/Cursor 发现行为尚须按宿主验收确认。外部 Skills 的来源/许可证/依赖信息未验证，必须显式保留状态，但不阻塞建立包边界。结论为 `有条件可行`。

**范围质疑：** 本轮只迁移 DevOps 归属内容及必要的共享注册、别名、manifest 生成/校验和测试适配；不得迁移 observability、verification、workflow、architecture 或 hardware 归属项。对当前未提交工作区只做本任务所需的定点改动，不能清理或覆盖其他改动。影响施工范围和验收的决策均已回答；Plan/Task 和实施工作须等 H-02 用户批准。

### 目标范围与非目标

**本阶段范围**

1. 在 `plugins/mcu-workbench-devops/` 建立完整可独立发现和校验的插件包，包 ID 为 `mcu-workbench-devops`，版本遵循 SemVer，并提供 descriptor、包元数据、Codex/Cursor manifests、包级入口及校验/测试入口。
2. 将五项 canonical DevOps Skills 纳入插件：`tools-build`、`tools-linker`、`tools-flash`、`tools-git`、`tools-release`，连同其必要 references、scripts、profiles、agent metadata 和相对链接；不改变 Skill 的业务语义。
3. 将归属矩阵中上述 11 个外部 DevOps Skill 纳入迁移审计和插件发现范围。逐项登记来源路径/URL、当前格式、依赖、版本、许可证、目标插件和迁移状态；未知字段保持 `unknown`/`blocked`，不得推断为已审计。若外部来源文件不可用，保留明确的外部依赖/阻塞记录，不创建空占位内容。
4. 维护唯一 canonical 内容源。Plan 必须规定源文件归属、插件包投影或物理迁移、生成边界、相对链接处理和回滚顺序；禁止形成可独立编辑且可能漂移的双份 Skill 内容。
5. 保留旧 `mcu-workbench` 聚合入口、已有 Skill IDs/aliases 和迁移兼容行为；更新共享 catalog、resolver、Agent/Skill 路由时保证旧入口指向新插件能力或给出确定迁移提示。
6. 分别验证 Codex 与 Cursor 对独立插件 manifest、Skills 和兼容入口的发现；主机/静态证据与真实宿主 UI 证据分开记录。
7. 对实际构建、烧录、发布动作只验证插件声明、模拟入口或测试契约；不得在本轮自动触发真实固件烧录、生产发布或对外 Git 操作。

**明确非目标**

- 不改写五项 canonical Skill 的业务流程、脚本算法、构建配置语义、烧录算法或发布策略；发现原内容缺陷时记录并单独回报，不在迁移中顺带修复。
- 不迁移其他插件归属或 `unknown` 项，不重做 observability/verification 已完成边界，不创建 workflow、architecture、hardware 插件。
- 不修改目标固件、HAL、RTOS、BSP、Vendor 源码，不把插件测试表述为交叉编译、目标板运行或实物烧录通过。
- 不新增 Claude/OpenCode 适配，不实现热加载、动态卸载或未由宿主证明的跨插件动态依赖。
- 不运行真实烧录、签名、生产发布、远端推送或其他会改变外部状态的 DevOps 操作。
- 本 Spec 获用户批准前，不改 Plan/Task 施工范围、不移动/复制 Skill 目录、不改 manifests/catalog/代码。

### 现状证据与可信边界

| ID | 事实 | 证据 | 等级 | 影响 |
|---|---|---|---|---|
| DVO-E01 | 当前分支及 HEAD 为 `host_ai@969398e6f5aea785da143ca4535d76ebf6b86188`；工作区存在多个已修改和未跟踪文件 | `git status --short --branch`、`git rev-parse HEAD` | confirmed | 必须保护无关工作区状态，只处理本任务范围 |
| DVO-E02 | 五项 canonical Skills 分别存在于 `skills/tools/tools-build`、`tools-linker`、`tools-flash`、`tools-git`、`tools-release` | 当前目录树 | confirmed | 迁移/投影必须保留 references、scripts、profiles 与链接 |
| DVO-E03 | ownership matrix 把 11 个外部 Skill 指向 `mcu-workbench-devops` | `codex/plugin-split/skill-ownership-matrix.md` 第 8–13、35–39 行及 `external-skill-inventory.yaml` | confirmed（登记）；归属依据仍为推断 | 依用户确认纳入本轮，不把登记状态误称来源审计 |
| DVO-E04 | 上述 11 项 external inventory 的版本、许可证、依赖字段未知或来源未登记，状态为 `blocked` | `codex/plugin-split/external-skill-inventory.yaml` | confirmed（当前记录） | 每项保留未验证字段；禁止伪造补齐 |
| DVO-E05 | 仓库已存在 verification/observability 的独立目录及 Codex/Cursor manifest 模式 | `plugins/mcu-workbench-verification/`、`plugins/mcu-workbench-observability/` | confirmed | 可复用已有契约形态；不代表 DevOps 宿主加载已验证 |
| DVO-E06 | 根 `package.json` 当前仍承载共享测试、插件校验和宿主同步脚本 | `package.json` | confirmed | Plan 确定插件级入口与根聚合脚本所有权/兼容关系 |
| DVO-E07 | 现有未提交变更同时触及 split Spec/Plan/Task、测试、插件、Skill 和脚本 | 当前 `git status` | confirmed | 仅按本阶段批准范围改动；不覆盖或回退其它改动 |
| DVO-E08 | Codex 与 Cursor 插件的真实 UI 发现/加载不能由 manifest 静态检查单独证明 | 当前 Spec 的宿主证据规则；需宿主实测 | confirmed（验证边界） | 两个宿主分开记录；若不可实测则标为未验证 |

### 1. 工程现状表

本阶段沿用 request_id `REQ-PLUGIN-SPLIT-20261123`，Spec 版本 `v0.7-devops-third-plugin`；项目、分支和提交见元数据。RCP 澄清记录为本节表格与用户确认项，可信等级使用 `confirmed`、`user-confirmed`、`inferred`、`unverified`。

| ID | 工程事实/约束 | 证据 | 等级 | 审查结论 |
|---|---|---|---|---|
| DVO-R01 | DevOps canonical 范围为五项 build/linker/flash/git/release Skill | 五个 `skills/tools/tools-*` 目录及既有总范围表 | confirmed | 纳入插件；实现不改业务语义 |
| DVO-R02 | 用户明确选择完整独立包边界 | 本轮需求对齐回答 | user-confirmed | 包含 descriptors、Codex/Cursor manifests、发现/校验/测试入口和聚合兼容 |
| DVO-R03 | 用户明确选择矩阵全部 DevOps 外部 Skills | 本轮需求对齐回答 + ownership matrix | user-confirmed | 11 项进入迁移范围；每项 provenance 按实际证据保持状态 |
| DVO-R04 | 用户明确选择 Codex + Cursor 为 MVP 宿主验收范围 | 本轮需求对齐回答 | user-confirmed | 两个宿主分别验收，不以静态检查代替真实加载 |
| DVO-R05 | 旧聚合入口和兼容 aliases 是已批准拆分策略的一部分 | v0.6 已批准 Spec | user-confirmed（沿用） | 兼容面不能静默删除；需确定回滚路径 |
| DVO-R06 | 本轮未指定目标固件、具体板卡或连接探针 | 本轮目标是插件包拆分，未指定固件工程 | unverified/not applicable | 不执行固件构建、烧录和硬件验收，不臆造目标环境 |
| DVO-R07 | 工作区在本任务开始前已包含其它未提交改动 | Git 状态 | confirmed | 文件变更必须限定于本阶段 Spec 后续批准范围 |

### 2. 文件施工清单

| ID | 目标范围 | 职责归属 | 施工约束/交付 |
|---|---|---|---|
| DVO-F01 | `plugins/mcu-workbench-devops/` | 新插件包 | descriptor、package metadata、入口及包级 validate/test 命令；ID/版本一致 |
| DVO-F02 | `plugins/mcu-workbench-devops/.codex-plugin/`、`.cursor-plugin/` | 宿主适配 | 分别提供可发现 manifest；不得声明未经验证的宿主特性 |
| DVO-F03 | 插件 `skills/` 下五项 canonical Skill | DevOps | 携带必要 references/scripts/profiles/agent metadata；保持唯一事实源并修正迁移后相对链接 |
| DVO-F04 | 插件 `skills/` 下 11 项外部 Skill | 外部迁移审计 | 按 inventory 迁移可用内容；来源不可用则显式记录外部依赖/阻塞，不建空壳 |
| DVO-F05 | `skills/catalog.js`、`catalog-metadata.js`、resolver、`lib/agent-domains.js` 或对应生成源 | 共享注册与兼容 | 依据 Plan 修改；保留旧 ID/aliases 与聚合入口，避免重复注册/双写 |
| DVO-F06 | `codex/plugin-split/skill-ownership-matrix.md`、`external-skill-inventory.yaml` | 迁移审计 | 记录 11 项唯一目标插件和 provenance 状态；不扩展到其它插件归属 |
| DVO-F07 | `plugins/mcu-workbench-devops/scripts/` 与根 `scripts/` 聚合入口 | 校验/运行 | 插件可独立校验；根命令保留必要兼容转发；不得运行真实发布/烧录 |
| DVO-F08 | `tests/` 与插件级 tests | 测试 | 覆盖 manifest、Skill 发现、链接、唯一 ID、兼容 alias、失败路径和回滚；仅修改直接相关测试 |

### 3. 代码生成约束清单

| ID | 约束 | 必须遵守 | 禁止事项 |
|---|---|---|---|
| DVO-G01 | 单一事实源 | 每个 canonical Skill 只有一份可编辑来源；projection/generated 文件需标明源和重建方式 | 双份独立维护或静默复制造成漂移 |
| DVO-G02 | 包边界 | 插件 descriptor、package metadata、Codex/Cursor manifests、catalog/registry ID 与版本一致 | 以目录存在冒充宿主发现通过 |
| DVO-G03 | DevOps 职责 | build/linker/flash/git/release 内容属于 DevOps；运行时观测/verification 仍调用各自插件契约 | 将构建或烧录实现复制进其它插件 |
| DVO-G04 | 外部来源 | 11 个外部 Skill 的源/版本/许可证/依赖逐项登记；无证据值维持 blocked/unknown | 根据目录名或 URL 猜测许可、版本或完整性 |
| DVO-G05 | 安全与外部状态 | 插件测试只使用静态/mock/dry-run 契约；真实烧录、发布、签名和远端写入不得自动触发 | 自动执行可能改变外部状态的操作 |
| DVO-G06 | 兼容与回滚 | 保留旧聚合入口/aliases；回滚可恢复入口映射而不丢失用户文件 | 未验证新入口前删除旧兼容面 |
| DVO-G07 | Host 证据 | Codex 与 Cursor 分开记录静态、主机和真实宿主发现证据 | 用一个宿主结果替代另一个；声称未观察到的 UI 行为 |
| DVO-G08 | 版本化 | 新插件使用 kebab-case ID、SemVer 与明确兼容范围；共享依赖有版本约束 | latest 或未锁定依赖 |
| DVO-G09 | SOLID | SRP：只封装 DevOps 工具能力；OCP：新增 DevOps Skill 不改非 DevOps 核心；LSP：适配满足共享插件契约；ISP：manifest/接口最小；DIP：依赖共享 contracts，不反向依赖聚合实现。Plan/实现需逐项给出证据 | 将 SOLID 声明当作无需证据的口号 |
| DVO-G10 | 工作区保护 | 修改前后审阅本任务文件差异，保留所有预存未提交内容 | 清理、覆盖或整体暂存无关文件 |

### 4. 验收测试清单

| ID | 等级 | 验收项 | 通过条件 |
|---|---|---|---|
| DVO-T01 | 静态 | 插件 descriptor、package metadata、Codex/Cursor manifests | ID/version/Skill roots 一致且结构合法 |
| DVO-T02 | 静态/主机 | canonical Skill 清单和包边界 | 五项 canonical 与 11 项批准外部 Skills 可发现；无重复 ID、遗漏的必要文件或未登记 Skill 混入 |
| DVO-T03 | 静态/主机 | 相对链接、脚本依赖和唯一事实源 | 插件边界内链接有效；外部引用逐项登记；canonical 内容无漂移副本 |
| DVO-T04 | 主机 | 独立插件校验/测试入口 | 插件级校验成功；坏 manifest、丢失 Skill、重复 ID、失效链接等负例能明确失败 |
| DVO-T05 | 主机 | 根聚合入口、aliases、Agent/Skill resolver 兼容 | 旧调用映射至 DevOps 能力或给出明确迁移提示；不存在静默失败/双重注册 |
| DVO-T06 | 宿主 | Codex 独立发现和加载 | 真实 Codex 环境可发现插件与其 Skills；若仅静态检验则标记宿主行为未验证 |
| DVO-T07 | 宿主 | Cursor 独立发现和加载 | 真实 Cursor 环境可发现插件与其 Skills；结果独立于 Codex 记录 |
| DVO-T08 | 回滚 | 新旧注册映射回滚 | 可恢复聚合入口/aliases，不丢失用户数据且步骤可重复 |
| DVO-T09 | 审计 | 外部 DevOps Skill provenance | 11 项唯一归属正确；未知来源/版本/许可证/依赖继续标记 blocked/unverified，不宣称完成来源审计 |
| DVO-T10 | 证据等级 | 构建/烧录/发布能力边界 | 主机 mock/dry-run 与宿主发现明确标记；本阶段没有真实固件构建、目标烧录或生产发布证据 |

### 验收标准

| ID | 等级 | 通过条件 |
|---|---|---|
| DVO-A01 | 静态 | `plugins/mcu-workbench-devops/` 为完整独立包；descriptor、包元数据、Codex/Cursor manifests 的 ID 与版本一致 |
| DVO-A02 | 静态/主机 | 五项 canonical Skills 与 11 项范围内外部 Skills 可发现，链接/必要资源完整，inventory/ownership 与包目录一致 |
| DVO-A03 | 主机 | 插件级 validator/test 能检查 manifest、Skill ID、链接、catalog/aliases 和失败分支；根入口兼容 |
| DVO-A04 | 宿主 | Codex 与 Cursor 分别验证发现/加载；静态证据、主机证据、真实宿主证据分开报告 |
| DVO-A05 | 兼容/回滚 | 旧聚合入口和 aliases 保持确定行为，可执行回滚，不丢失用户数据 |
| DVO-A06 | 审计 | 11 项外部 Skill 的来源元数据按证据如实记录；blocked 项不得伪称审计完成，不因未知信息制造空内容 |
| DVO-A07 | 安全边界 | 本轮不执行真实烧录、生产发布、签名或远端写操作；不声称任何目标硬件通过 |
| DVO-A08 | 基线 | 最终校验记录绝对 cwd、命令、退出码、产物路径/SHA-256、证据等级及重试次数；对既有问题记录基线与新增差异 |

### Review Gate 与实现闸门

- RCP 缺口检查：范围、Skill 列表、包边界、宿主、兼容目标已由用户回答或仓库证据确认；外部 provenance 未验证状态已明确作为审计限制，未被当作已确认事实。
- 目的质疑结论：`user-confirmed`；目的是将既有 DevOps 能力形成独立、可发现、可回滚的插件边界，不扩展到执行实际固件交付操作。
- 可行性质疑结论：`有条件可行`；现有目录和两个独立插件提供结构证据，Codex/Cursor 实际发现必须按 DVO-T06/T07 单独验证。
- 范围结论：仅第三插件 DevOps 清单；完整包边界；旧聚合兼容；Codex + Cursor MVP；外部 11 项纳入并保留未验证元数据；没有固件/硬件验收范围。
- 阻塞风险：外部项 provenance 仍 `blocked/unverified`，但已按用户确认纳入迁移审计，要求原样披露；若实现时发现缺少外部文件导致 Skill 内容无法形成，须回报并保持该项 blocked，不得以占位文件冒充完成。
- Review Gate 结论：四个审计章节已形成，`spec_rigor=full`、`spec_overlays=[versioned]` 与跨插件/多宿主风险匹配；Spec 门禁通过，状态 `review-gate-approved / pending-user-approval`。
- 用户闸门 H-02：等待用户审阅并批准 v0.7。批准前不得修改 `plan.md`/`task.md` 施工范围或开始任何 DevOps 目录迁移。
- 用户批准后交接：`workflow-integration-plan` 更新 DevOps 专属 `plan.md`，明确单一事实源、投影/迁移方式、任务依赖、回滚和逐项 SOLID 证据；随后 `workflow-task-breakdown` 重制 `task.md`。v0.6 verification Plan/Task 不适用于此阶段。

> **历史快照，已由 v1.5 supersede：**以下 v1.2 Review-Package 原按五个既有插件形成，但不包含一项项目管理延期。当前有效数量、延期状态与迁移范围以文件顶部的 v1.5 补充为准；不得依据本历史快照恢复旧 Plan/Task。

## 历史阶段补充：外部导入 Skills 全量归属复核与迁移（v1.2）

本节作为本轮需求更新的正式范围。复核对象为 `codex/plugin-split/external-skill-inventory.yaml` 中记录的全部嵌入式领域 Skills，以及盘点后发现但尚未登记的嵌入式外部 Skill；包括根 `skills/` 中尚未迁移的项、已存在于任一插件 `skills/` 中的项，以及登记为 `unknown` 的项。用户明确归入 Workflow 的通用产品工作流/工具也纳入 Workflow 复核。通用学术研究/论文工作流（`academic-paper`、`academic-paper-reviewer`、`academic-pipeline`、`sr-screener`、`deep-research`）不纳入嵌入式插件体系，保留在体系外的现有管理边界。历史 owner、目录名、旧迁移目标和来源标注都只能作为审计线索，不能代替正文判断。纳入项需阅读完整 `SKILL.md` 的职责、触发条件、边界及必要 references/scripts，确定唯一主责插件；来源缺失、版本/许可证/依赖未知不构成归属或迁移阻塞，相关来源字段继续如实标 `unknown/unverified`。

### RCP、范围与证据

| 字段 | 内容 | 可信等级 |
|---|---|---|
| 项目路径/分支 | 仓库根目录；`host_ai`；本轮开始时工作区已有大量用户未提交及未跟踪改动 | confirmed |
| 目标 | 将全部纳入范围的嵌入式外部导入 Skills 按内容归入现有领域插件，并把尚未位于目标插件唯一源目录的项迁入对应插件 | user-confirmed |
| 复核范围 | 当前 external inventory 基线 52 项中全部嵌入式领域项、用户明确归入 Workflow 的通用产品工作流/工具，以及扫描中发现的新增嵌入式导入项；包含已在插件中的外部 Skills | user-confirmed |
| 明确排除 | `academic-paper`、`academic-paper-reviewer`、`academic-pipeline`、`sr-screener`、`deep-research`：通用学术研究/论文工作流；`patent-disclosure-skill`：通用专利工作流；均留在嵌入式插件体系之外 | user-confirmed |
| 明确归属 | `market-mrd-analyst`、`skill-template`、`embedded-production-test-tool` → `mcu-workbench-workflow` | user-confirmed |
| 归类原则 | 正文实际职责、触发条件、输出物、依赖和排除边界优先；每项唯一主责插件。旧目录、文件名、source/provenance 和历史 matrix 不作归属证据 | user-confirmed |
| 来源缺失处理 | 不因未标明来源而排除或搁置；照样按内容确定目标插件。不得由归属反推作者、版本、许可证或依赖 | user-confirmed |
| 插件目标集合 | 仓库当前已登记领域插件；目标 ID 以当前 plugin manifests/catalog 为准。只有确无合适领域插件时才记录 `unassigned` 并说明内容证据及原因，不以 provenance unknown 作为理由 | confirmed + user-confirmed |
| 唯一事实源 | 每项 Skill 最终只允许一个可编辑源；旧根目录兼容入口如需保留，只能是已登记、可校验、可重建的投影 | confirmed（仓库约束） |
| 风险/力度 | 跨插件目录、registry、同步器和 host manifests 的归属/迁移；采用 `full + versioned` | inferred；Review Gate 必须复核 |

### 目标、施工边界与非目标

1. 逐项对全部外部导入 Skill 完成内容审查，登记 `reviewed_content`、唯一 `target_plugin`、证据路径/行号、目标理由、现有位置、迁移状态和未决风险；不能只检查 frontmatter 或名称。
2. 对目标插件相符且已在其中的 Skill，核验其职责与周边 plugin map/manifest/registry 一致；保持原位并登记复核证据。对误放项或尚留在根目录/native registry 的项，迁入唯一目标插件并同步插件 Skill map、外部 inventory、catalog/host package discovery 和受保护投影等必要登记。
3. 对跨领域 Skill 以其主要执行职责及主要交付物决定唯一 owner；可在必要文档中登记相关联插件，但不得将同一个 Skill ID 重复注册到多个插件。Skill 内指向其他领域能力的引用保持为已登记依赖，不据此复制另一 Skill。
4. 保留外部来源字段的证据等级。无来源证据的 source/version/license/dependencies 仍为 `unknown/unverified`；这不阻止上述内容审查与插件归类。
5. 不改写 Skills 的业务流程、领域要求或输出语义；若迁移必须改变内容或接口，先回到 Spec 更新与 Review Gate。保留所有当前工作区内容，按哈希/差异逐项迁移，不能覆盖未知文件或删除用户改动。
6. 验收要求逐项覆盖 inventory 基线及新增项：每项恰有一个目标领域插件；正文复核证据充分；源目录、plugin map、catalog、manifest、marker/projection、测试和 inventory 状态一致；不存在遗留错误归属、重复注册、遗漏、漂移或未登记的重复可编辑副本。

**非目标：**补造外部 provenance；仅为追求完整而改写 Skill 内容；执行外部下载/发布、真实构建/烧录或硬件操作；调整 Claude/OpenCode 适配；修改公共规则层 `common/` 或其他宿主适配层；新增插件领域以收容与当前产品边界无关的内容。通用学术研究/论文工作流及通用专利工作流明确留在嵌入式插件体系外，不迁移到 MCU 领域插件。

### 需求变化审查章节与门禁

| 审查项 | 结论 |
|---|---|
| 范围/非目标 | 复核嵌入式领域外部 Skills（包括已进入插件的项目）；5 项通用学术研究/论文工作流及 1 项通用专利工作流留在嵌入式插件体系外；不改变 Skill 业务语义 |
| 业务规则 | 正文内容是归属依据；一个纳入范围的 ID 一个主责插件；用户明确指定的 3 项归 Workflow；来源缺失不影响归属；来源真实性元数据继续单独标 unknown/unverified |
| 状态/权限/资源 | 不变更用户/固件数据，不执行烧录/发布；迁移只涉及仓库 Skill 源、插件发现/registry、inventory 与兼容投影；所有既有未提交文件必须保留 |
| 可验证验收 | 对 inventory 全集及新增项形成完整归属账本；全量唯一性、内容证据、插件发现/链接/投影一致性检查；插件测试与 `git diff --check`；真实 Codex/Cursor 发现证据与静态/主机证据分开记录 |

**Review Gate 状态：**`approved`。内容归属账本已更新：46 项纳入现有五插件；5 项通用学术工作流及 1 项通用专利工作流留在体系外；来源 provenance 单独保留 unknown/unverified。用户要求开始 Plan 方案生成并确认了关键边界。`workflow-integration-plan` 当前输出同目标方案 A/B；用户选择后再更新正式 `plan.md`，随后由 `workflow-task-breakdown` 重制 Task。历史 Workflow v0.9 的 Plan/Task 不适用于本阶段。

### Review-Package 审查章节（v1.2）

#### 1. 工程现状表

| ID | 工程事实 | 证据 | 等级 | 结论 |
|---|---|---|---|---|
| EXT-E01 | 外部导入 inventory 共 52 项；内容归属矩阵覆盖相同 52 IDs | `codex/plugin-split/external-skill-inventory.yaml`、`skill-ownership-matrix.md` | confirmed | 本轮审查全集基线固定为 52 项 |
| EXT-E02 | 46 项内容归入现有五插件：Architecture 11、DevOps 12、Observability 10、Verification 4、Workflow 9 | ownership matrix；各源 `SKILL.md` 的职责、触发条件、输出范围 | user-confirmed / confirmed by content | 纳入本轮迁移/归属登记 |
| EXT-E03 | 5 项通用学术研究/论文工作流与 1 项通用专利工作流不进入嵌入式插件 | 用户确认；`academic-*`、`sr-screener`、`deep-research`、`patent-disclosure-skill` 内容 | user-confirmed | 保留在嵌入式插件边界之外 |
| EXT-E04 | 用户指定 `market-mrd-analyst`、`skill-template`、`embedded-production-test-tool` 属 Workflow | 用户当前确认；对应 `SKILL.md` | user-confirmed | 纳入 Workflow 插件 |
| EXT-E05 | 用户工作区已有大量未提交与未跟踪变更，插件源已有部分外部 Skill | 本轮 `git status --short --branch`、`plugins/**/skills/` | confirmed | 迁移前逐项 hash/marker 冻结；不覆盖既有改动 |
| EXT-E06 | 插件目录中已存在部分目标 Skill 源，但根 `skills/` 同时保留入口/内容；其 marker/source ownership 需逐路径复核 | Architecture/DevOps/Observability/Verification/Workflow `skill-map.json`、sync scripts、`skills/.{plugin}-projections.json`（按插件适用） | confirmed; per-file ownership requires baseline | 方案必须先区分 canonical source 与生成投影 |
| EXT-E07 | 来源、版本、许可证、依赖中有未知值；未知 provenance 不影响已确认内容归属 | inventory provenance fields；用户明确要求 | confirmed / user-confirmed | 保留未知值，不作来源审计或许可结论 |
| EXT-E08 | 未指定硬件、固件目标、烧录器或板级验收目标 | 本轮请求范围 | user-confirmed / not applicable | 不执行固件构建、烧录和实机验证 |

#### 2. 文件施工清单

| ID | 目标范围 | 所属职责 | 施工要求 |
|---|---|---|---|
| EXT-F01 | `plugins/mcu-workbench-architecture/skills/`、`skill-map.json`、validator 与 projection manifest | Architecture | 核验并迁入 11 项唯一源；纳入技能 map 和根受保护投影 |
| EXT-F02 | `plugins/mcu-workbench-devops/skills/` 与 package/map/validator | DevOps | 核验并迁入 12 项唯一源；保留 build/flash 工具域边界 |
| EXT-F03 | `plugins/mcu-workbench-observability/skills/`、`external-skills.json`、validator | Observability | 核验并迁入 10 项唯一源，包含 CAN/Modbus/VISA 观测与交互 |
| EXT-F04 | `plugins/mcu-workbench-verification/skills/`、package/map/validator | Verification | 核验并迁入 4 项缺陷/测试/内存/静态分析能力 |
| EXT-F05 | `plugins/mcu-workbench-workflow/skills/`、skill-map、sync/validator | Workflow | 核验并迁入 9 项，包括市场 MRD、模板与生产测试桌面工具脚手架 |
| EXT-F06 | `codex/plugin-split/skill-ownership-matrix.md`、`external-skill-inventory.yaml` | 审计 | 52 项都保留唯一 disposition、内容依据、迁移状态和 provenance 状态 |
| EXT-F07 | `skills/catalog.js`、插件/宿主 manifests、根投影 marker | 注册/兼容 | 只登记唯一主责插件，保留旧 ID/alias；投影由对应插件 marker 管理 |
| EXT-F08 | 与本阶段直接关联的 `tests/` 和插件 validator/tests | 验证 | 覆盖唯一 ID、插件归属、链接、来源/目标哈希、漂移拒绝、回滚与坏 manifest |

#### 3. 代码生成约束清单

| ID | 约束 | 放行要求 |
|---|---|---|
| EXT-G01 | SRP | 每个 Skill 只由一个职责插件负责；插件 map、校验器与同步器分别保持单一职责 |
| EXT-G02 | OCP | 纳入新增外部 Skill 通过唯一插件 map/catalog 扩展，不修改不相关插件能力或 Skill 正文 |
| EXT-G03 | LSP | 保持既有 Skill ID、入口文件和被引用行为；根路径兼容投影语义不变 |
| EXT-G04 | ISP | 每个宿主 manifest 只暴露该插件批准的 Skills；不把全部 52 项复制进每个插件 |
| EXT-G05 | DIP | 插件 Skill 之间只依赖显式、可解析引用；不得反向依赖根聚合加载器实现 |
| EXT-G06 | 唯一源 | 每项迁入后仅插件目录可编辑；根路径如保留只作为受保护投影；迁移前扫描 marker、哈希和未标记冲突 |
| EXT-G07 | 来源状态 | `source/version/license/dependencies=unknown` 必须如实保留；不能据此阻塞归类，也不能补造值 |
| EXT-G08 | 工作区保护 | 迁移只改计划冻结的路径；执行前后审阅 diff 与 hashes，保留全部预存变更 |

#### 4. 验收测试清单

| ID | 证据等级 | 验收项 | 通过条件 |
|---|---|---|---|
| EXT-T01 | 静态 | inventory 和 ownership matrix 覆盖 | 恰有 52 项；46 项唯一指向六插件；6 项按用户决定留在嵌入式插件之外 |
| EXT-T02 | 静态/主机 | 内容归属与插件 map/catalog | 每项归属证据可回到 SKILL 内容；目标插件、map、catalog、host manifest 一致，无重复 ID |
| EXT-T03 | 静态 | 唯一源/投影/链接闭包 | 46 项唯一源可追踪，根投影 marker/hash 匹配，无冲突、漂移或未登记链接 |
| EXT-T04 | 主机 | 插件 validator 与相关测试 | 六个目标插件 validator 及定点测试通过；坏入口、重复 ID、缺文件、坏链接能失败 |
| EXT-T05 | 静态/主机 | 兼容与回滚 | 旧 aliases/聚合入口确定可用；每个插件变更可独立回滚且不丢失用户文件 |
| EXT-T06 | 宿主 | Codex 与 Cursor | 两宿主分别记录发现/加载；静态检查不冒充真实宿主证据 |
| EXT-T07 | 审计 | provenance | 未知来源、版本、许可证、依赖仍标记 unknown/unverified，不作为归属阻塞 |
| EXT-T08 | 证据边界 | 固件/硬件 | 不声称构建、烧录、目标运行或实物验证通过 |

**历史 Gate 结论（v1.2，已过期）：**本版外部归属复核已被 v1.5 的项目管理延期决策 supersede。当前迁移只覆盖 45 项及现有五插件；执行依据为 `plan-v1.5.md`，需先完成 Plan 用户审阅和后续 Task 重制。

## 2026-11-25 当前阶段：项目管理插件拆分（v1.6）

本节 supersede v1.5 的“项目管理插件延期”状态，并取代此前只纳入 `embedded-team-sync` 的 v1.4 窄范围提案。当前阶段唯一范围是创建 `mcu-workbench-project-management`，并将两个已确认能力从 Workflow 插件分出：外部 Skill `embedded-team-sync` 与 canonical Skill `workflow-document-context`。其余 45 项既有插件迁移、历史阶段 Plan/Task 均不属于本阶段施工范围。

### RCP、需求目的与可行性质疑

| 字段 | 内容 | 可信等级 |
|---|---|---|
| 项目路径/分支/提交 | 仓库 `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai`；分支 `host_ai`；本轮只读基线 `79ae7a0c231cd417717db0927775131274327e36`；工作区已有大量未提交及未跟踪改动 | confirmed |
| 需求目的 | 将“嵌入式项目本身的持续协作/文档状态管理”与“AI 按需求生成并执行工程任务的 Workflow”分开，使项目资料有清晰责任边界、Skill 所属插件和可独立验证的能力入口 | user-confirmed；内容依据见 PM-E01–E08 |
| 用户确认范围 | 新建 `mcu-workbench-project-management`，纳入 `embedded-team-sync` 与 `workflow-document-context` 两项。用户于 2026-11-25 明确同意 | user-confirmed |
| 插件宿主 | Codex 与 Cursor MVP；沿用仓库已存在的双宿主插件形态 | confirmed（现有插件 manifests）/ user-confirmed（既有产品边界） |
| 风险力度 | `full` + `versioned`：新增插件并跨插件移动一个 canonical Skill、一个 external Skill、文档上下文运行时代码、host manifests、注册表和受保护投影 | inferred from scope; reviewed |
| 目的质疑结论 | 两组能力都直接管理嵌入式项目中的持久状态/文档信息；按“被管理对象”与 AI 执行流水线分离，可减少对状态文件、文档索引及任务执行记录的混用 | confirmed by inspected Skill content + user-confirmed boundary |
| 可行性质疑结论 | 仓库已有五个双宿主插件、唯一源/受保护投影机制、Workflow plugin map/catalog 和文档上下文 CLI/库/测试；可按现有插件骨架拆分。需迁移实现入口和测试，不能只移动 Skill 描述 | confirmed for repository evidence; implementation plan pending |
| 未决风险 | `.ai/PROJECT_STATUS.md` 与 `.mcu-workbench/document-context/` 均有 handoff/状态相关字段；必须明确各自所有权，避免复制同一状态。所有源文件迁移前需冻结当前哈希并保护混合工作区改动 | confirmed risk; mitigation specified below |

### 已读取 Skill 内容及唯一职责判断

| Skill | 当前身份/位置 | 正文职责与触发产物 | 本阶段判定 |
|---|---|---|---|
| `embedded-team-sync` | External；源 `plugins/mcu-workbench-workflow/skills/embedded-team-sync/`，投影 `skills/embedded-team-sync/` | 维护 `.ai/TEAM_RULES.md`、`PROJECT_STATUS.md`、`SKILL_REGISTRY.md`、append-only `TASK_LOG.md`；初始化、任务启动说明、任务结束同步和轻量项目快照；正文明确要求保持轻量，不发展成完整 PM 系统 | 移入 project-management；继续只负责团队协作状态和任务日志 |
| `workflow-document-context` | Canonical；源 `plugins/mcu-workbench-workflow/skills/workflow-document-context/`，投影 `skills/workflow/workflow-document-context/` | 管 README 受管区块、`.mcu-workbench/document-context/` 的项目/文档/对话/决策索引、生命周期/版本关系、漂移基线、上下文选择和请求/对话交接；明确不生成或审批 Spec/Plan/Task，不替代开发日志或代码验证 | 移入 project-management；只负责文档登记/关系/生命周期/上下文选择 |
| `embedded-project-intake` | External；Workflow 插件 | 对固件仓库作一次性/按需的工程理解，生成架构与模块分析、调用路径和接手报告（Markdown + standalone HTML） | 保留 Workflow；产物是工程理解/接手报告，不维护共享项目状态或文档生命周期 |
| `embedded-change-report` | External；Workflow 插件 | 收集 Git、构建、测试、通信及内存等证据，生成变更/缺陷/发布/验证报告 | 保留 Workflow；属于工程报告生成，不拥有持续状态文件 |
| `embedded-llm-guardrails` | External；Workflow 插件 | 建立和检查 `.ai/LLM_RULES.md`、`LLM_BOUNDARY.md` 及 Agent 入口；代码修改前执行边界确认和最小验证约束 | 保留 Workflow；它约束 LLM 改码行为，不管理团队进度/项目文档索引 |
| `workflow-requirements-router`、`workflow-requirements-challenge`、`workflow-review-gate` | Canonical；Workflow | 收集需求约束、目的/可行性质疑、Spec 审查放行 | 保留 Workflow；治理 AI 需求链，不管理项目运行状态 |
| `workflow-integration-plan`、`workflow-task-breakdown`、`workflow-task-execution`、`workflow-final-review` | Canonical；Workflow | 将放行 Spec 转为实施 Plan/Task，按批准任务执行，并按 Spec 验证/最终 Review | 保留 Workflow；管理 AI 生成和执行工程变更的过程，不等同项目团队状态/任务历史 |
| `workflow-claude-layering` | Canonical；Workflow | 管理 Claude Code 的项目级指令配置、静态扫描和架构状态映射 | 保留 Workflow；宿主适配 Skill，不并入通用项目管理插件 |

判定原则：按 Skill 正文的主要受管对象、写入产物和执行边界归属；文件名、历史分类或互相引用仅作线索。被某 Skill 引用不等于被同一插件拥有。以上审阅覆盖两项拟迁移 Skill、所有最直接相邻的项目管理/文档/报告/规则 Skills，以及 Workflow 需求到执行链。

### 持久化状态与数据所有权

| 对象 | 唯一所有者 | 责任边界及禁止重复 |
|---|---|---|
| `.ai/TEAM_RULES.md` | `embedded-team-sync` | 项目团队约定、代码编辑边界、验证记录要求和 AI 使用规则；不承载 Workflow Router/Gate 规则正文 |
| `.ai/PROJECT_STATUS.md` | `embedded-team-sync` | 当前项目阶段/focus、build/test/flash 状态、风险、阻塞和总体下一步；状态必须有证据等级，不声称未执行的验证 |
| `.ai/SKILL_REGISTRY.md` | `embedded-team-sync` | 项目团队认可/可用的共享 Skills、工具和脚本登记；来源与安装信息未知时如实标记 |
| `.ai/TASK_LOG.md` | `embedded-team-sync` | 按时间追加任务目标、变更文件、验证、结果、风险和下一步；默认 append-only |
| README 受管区块 | `workflow-document-context` | 由项目结构/源码证据生成并保留手写区块；仅改专属标记区间 |
| `.mcu-workbench/document-context.json` 与 `readme.state.json` | `workflow-document-context` | README 扫描范围、排除项、目录映射、扫描摘要、hash、未确认路径及漂移基线 |
| `.mcu-workbench/document-context/{project-index,documents,conversations,decisions,events}.json*` | `workflow-document-context` | 文档和决策的登记索引、生命周期/版本关系、事件和可筛选上下文；文档正文继续由原项目路径/其原作者维护 |
| `.mcu-workbench/document-context/requests/<request_id>/conversations/<conversation_id>/handoff.json` | `workflow-document-context` | 绑定 request/conversation/base_revision 的对话级 handoff、证据和阻塞项 |

handoff 不合并：Team Sync 快照描述整个项目的总体进度，Doc Context handoff 描述某 request/conversation 的版本化交接；需要关联时使用 request/conversation 标识引用对方，不复制正文或覆盖对方状态。Workflow 仍拥有 `spec.md`、`plan.md`、`task.md` 的内容生成/审批链；Doc Context 只能登记这些文档的引用、状态和关系。

### 1. 工程现状表

| ID | 工程事实 | 证据 | 等级 | 结论 |
|---|---|---|---|---|
| PM-E01 | 仓库已有 Architecture、DevOps、Observability、Verification、Workflow 五个插件；暂无 project-management 插件 | `plugins/` 目录清单；各插件 `plugin.json`、host manifests | confirmed | 新插件按现有双宿主插件结构创建 |
| PM-E02 | `embedded-team-sync` 当前登记在 Workflow external skill map，目标项目管理归属标记 deferred | `plugins/mcu-workbench-workflow/skill-map.json:17`；`skills/catalog.js:306-311`；`codex/plugin-split/external-skill-inventory.yaml` | confirmed | 从 Workflow 唯一源/map/catalog/projection 迁出并登记到新插件 |
| PM-E03 | `workflow-document-context` 当前为 Workflow canonical，唯一源、投影和 catalog 均在 Workflow | `plugins/mcu-workbench-workflow/skill-map.json:7`；`skills/catalog.js:306-309`；`skills/workflow/workflow-document-context/SKILL.md` | confirmed | 保持 Skill ID 和对外 API 语义，移动唯一源并更新唯一 owner |
| PM-E04 | Doc Context 运行时代码在根 `lib/` 和 `scripts/`，不是 Skill 目录内文件 | `lib/document-context.js`、`lib/document-context-context-selector.js`、`lib/document-context-readme.js`、`lib/document-context-store.js`、`scripts/document-context-api.js`、根 `package.json` 的 `document-context:*` 命令 | confirmed | 新插件必须拥有可发现/可打包的运行时代码与命令入口；不得只迁移 SKILL.md 留下隐式根依赖 |
| PM-E05 | Doc Context 有六个专用主机测试，Workflow 有注册/插件/投影测试 | `tests/document-context-cli.test.js`、`document-context-context.test.js`、`document-context-lifecycle.test.js`、`document-context-readme.test.js`、`document-context-store.test.js`、`document-context.test.js`；`workflow-catalog.test.js`、`workflow-plugin.test.js`、`workflow-projection.test.js` | confirmed | 迁移必须保留/调整现有覆盖并补 project-management plugin/投影验收 |
| PM-E06 | 双宿主插件市场清单在仓库根登记 | `.agents/plugins/marketplace.json`、`.cursor-plugin/marketplace.json`；各插件 `.codex-plugin/plugin.json`、`.cursor-plugin/plugin.json` | confirmed | 两个宿主都要发现新插件；不能把静态文件存在当作真实宿主加载证明 |
| PM-E07 | 根 `package.json` 暴露 `document-context:*` 命令；README、测试和脚本有 Skill/命令引用 | `package.json:45-52`；扫描 `workflow-document-context`、`embedded-team-sync` 的仓库引用 | confirmed | 保留根命令兼容入口或提供等价、文档化别名；移除/更新指向旧 owner 的注册引用 |
| PM-E08 | 用户工作区已有大量混合未提交/未跟踪内容，且若干目标文件已有变更 | 本轮 `git status --short --branch` | confirmed | 只触及本 Spec 明列路径；实施 Plan 必须逐文件冻结路径/hash 并避免覆盖既有改动 |
| PM-E09 | 外部 Skill 的 source attribution 曾被用户确认，但版本/许可证/依赖仍有 unknown 值 | `external-skill-inventory.yaml` 中 `embedded-team-sync` provenance 字段 | confirmed | 内容归属不代替 provenance；未知 metadata 不得伪造或作为本轮阻塞理由 |

### 2. 文件施工清单

以下路径是本阶段唯一允许的施工边界。生成投影只可由所属插件同步器生成；实施 Plan 必须在执行前按当前工作区逐项冻结 SHA-256 和 marker 状态，并细化任何动态 manifest/resolver 文件。若发现必要文件不在清单中，先回到本 Spec 追加范围并重新 Review Gate，不得顺手修改。

| ID | 明确路径 | 施工要求 |
|---|---|---|
| PM-F01 | `plugins/mcu-workbench-project-management/descriptor.json`、`index.js`、`package.json`、`plugin.json`、`skill-map.json`、`.codex-plugin/plugin.json`、`.cursor-plugin/plugin.json`、`scripts/prepare-skill-links.js`、`scripts/sync-skills.js`、`scripts/validate.js` | 按现有插件模式建立双宿主可发现、可同步、可校验的独立插件；其 skill map 唯一登记本 Spec 的两个 Skill |
| PM-F02 | `plugins/mcu-workbench-project-management/skills/embedded-team-sync/**`、`plugins/mcu-workbench-project-management/skills/workflow-document-context/**` | 从 Workflow 当前唯一源迁入两项 Skills 所需完整内容/资源；ID、触发语义和用户项目数据格式保持兼容 |
| PM-F03 | `plugins/mcu-workbench-workflow/skill-map.json`、`package.json`、`plugin.json`、`descriptor.json`、`.codex-plugin/plugin.json`、`.cursor-plugin/plugin.json`、`scripts/sync-skills.js`、`scripts/validate.js`、`references/shared-sources.json`、`references/external-dependencies.json` | 移除被迁出 Skills 的唯一 owner/引用并维持 Workflow 剩余 Skills 注册完整；仅在实际引用存在时更新对应 references |
| PM-F04 | `plugins/mcu-workbench-project-management/lib/document-context.js`、`document-context-context-selector.js`、`document-context-readme.js`、`document-context-store.js`、`scripts/document-context-api.js`；现有对应源 `lib/document-context.js`、`lib/document-context-context-selector.js`、`lib/document-context-readme.js`、`lib/document-context-store.js`、`scripts/document-context-api.js` | 将 Doc Context 可执行实现/CLI 纳入项目管理插件唯一源；旧根 CLI 路径改为仅委托的兼容入口；不得保留第二份可编辑实现副本 |
| PM-F05 | 根 `package.json`、`README.md`、根 `scripts/document-context-api.js` | 保持现有 `document-context:*` 命令和直接 CLI 入口兼容（委托到新插件唯一源）；更新插件/命令说明，不改变其他构建、工具或 Skills 的 npm 行为 |
| PM-F06 | `skills/catalog.js`、`skills/catalog-metadata.js`、`skills/.workflow-projections.json`、`skills/.project-management-projections.json`（新建）、`skills/embedded-team-sync/**`、`skills/workflow/workflow-document-context/**` | 两个 Skill ID 唯一归属新插件；由受保护 projection manifest 管理兼容入口；移除旧 Workflow projection owner 后再生成新投影 |
| PM-F07 | `.agents/plugins/marketplace.json`、`.cursor-plugin/marketplace.json`、`.cursor-plugin/plugin.json`、`scripts/sync-codex-skills.js`、`scripts/sync-cursor-plugin.js`、新插件及 Workflow 的 `.codex-plugin/plugin.json` 与 `.cursor-plugin/plugin.json` | 注册新插件、移除迁出的 Workflow Skill 暴露；Codex 与 Cursor 清单互相一致；只在现有同步器确实需要时更新注册逻辑 |
| PM-F08 | `codex/plugin-split/external-skill-inventory.yaml`、`codex/plugin-split/skill-ownership-matrix.md` | 将 `embedded-team-sync` 状态从 deferred 更新为 migrated/本阶段目标；记录 `workflow-document-context` 从 Workflow 到 PM 的迁移证据及唯一 owner；不改动其余 45 项归属 |
| PM-F09 | `tests/document-context-cli.test.js`、`tests/document-context-context.test.js`、`tests/document-context-lifecycle.test.js`、`tests/document-context-readme.test.js`、`tests/document-context-store.test.js`、`tests/document-context.test.js` | 保留现有 Doc Context 行为覆盖，按新唯一源更新 import/命令路径；不删除既有测试以规避失败 |
| PM-F10 | `tests/workflow-catalog.test.js`、`tests/workflow-plugin.test.js`、`tests/workflow-projection.test.js`、`tests/plugin-contracts.test.js`、`tests/capability-resolver.test.js`、`tests/architecture-marketplace.test.js`、`tests/codex-plugin.test.js`、`tests/cursor-plugin.test.js`、`tests/sync-codex-skills.test.js`、`tests/project-management-plugin.test.js`（新建）、`tests/project-management-projection.test.js`（新建） | 验证旧插件不再拥有迁出项、新插件双宿主注册/唯一源/投影/链接闭包有效，且其余注册不回归 |

除上表路径以外，禁止修改 `common/`、`claude/`、`opencode/`、固件目标工程文件、其他插件 Skill 源/测试、用户 `.ai/` 项目状态文件以及任何未列明的根规则或实现文件。既有 `plan.md`、`task.md` 只作历史材料，本阶段不得直接沿用或覆盖为施工依据。

### 3. 代码生成约束清单

| ID | 约束 | 放行要求 |
|---|---|---|
| PM-G01 | 唯一源和单一插件 owner | 每个 Skill ID、Doc Context CLI/lib 仅有一个可编辑源；旧 `skills/` 路径若保留，只作为由 owner manifest/hash 保护并可重建的投影 |
| PM-G02 | 被管理对象分离 | Team Sync 拥有 `.ai/TEAM_RULES.md`、`PROJECT_STATUS.md`、`SKILL_REGISTRY.md`、`TASK_LOG.md`；Doc Context 拥有 README 受管区块与 `.mcu-workbench/document-context/` 索引状态；任何更新不得双写对方的主数据 |
| PM-G03 | Handoff 互通而不复制 | 总体项目快照与 request/conversation 版本化 handoff 使用稳定标识互相引用；不可把 Doc Context 中间索引伪作整体项目状态，亦不可让 Team Sync 追加日志替代版本化 handoff |
| PM-G04 | 原行为/API 兼容 | 保留 Skill ID `embedded-team-sync`、`workflow-document-context`，既有命令和状态语义；改变路径不改变调用契约，根 CLI 命令保留兼容委托 |
| PM-G05 | 不扩展为完整 PM 系统 | 本阶段不新增看板、工时/预算、排期/里程碑、团队账号/权限服务、远程协作后端、数据库或云同步；持续使用当前文件式轻量工作流 |
| PM-G06 | 不改变内容职责 | 不把 intake/change-report/LLM guardrails 或需求路由、Spec/Plan/Task 生成和执行 Skill 移入新插件；跨 Skill 链接只声明依赖，不复制 Skill |
| PM-G07 | 编码结构和 SOLID | SRP：两项 Skills 各自唯一数据职责、插件注册和运行时实现职责独立；OCP：新插件经 map/catalog 扩展；LSP：旧 Skill ID/命令/数据契约保持可替换；ISP：宿主暴露仅含批准 Skills；DIP：通用 CLI/数据层不反向依赖 Workflow 插件内部。Plan/Task 必须逐原则列出证据，不满足则阻塞 |
| PM-G08 | 数据保护与冲突处理 | 初始化不得覆盖已有 `.ai/`/`.mcu-workbench/` 文件；`TASK_LOG.md` 默认 append-only；document-context 过期 `base_revision` 标为 stale，不静默覆盖；受管 README 只改标记区块 |
| PM-G09 | 工作区保护 | 实施前后审阅 Git diff 与基线 hashes；只修改 PM-F01–PM-F10 的列明路径；任何越界或无 marker 冲突立即阻塞并保留用户改动 |
| PM-G10 | Provenance | 保留外部 Skill 来源/版本/许可证/依赖真实状态；未知继续标注 `unknown/unverified`，不能从 owner 迁移推断来源事实 |

### 4. 验收测试清单

| ID | 证据等级 | 验收项 | 通过条件 |
|---|---|---|---|
| PM-T01 | 静态 | 需求范围与所有权 | 两项 Skill 各只有一个 `mcu-workbench-project-management` owner；Workflow 不再暴露这两项；其余 Workflow Skill ID 和其他 45 项归属不变 |
| PM-T02 | 静态/主机 | 插件注册与双宿主 manifests | PM plugin descriptor/package/plugin/map/marketplace/host manifests 一致；Codex 与 Cursor validator/manifest 检查都识别正确 Skills |
| PM-T03 | 静态 | 唯一源/投影/hash | 两项唯一源均可追踪；旧根路径仅为登记的受保护投影；不存在重复可编辑副本、owner 碰撞、坏链接或漂移 |
| PM-T04 | 主机 | Doc Context 行为 | 六个现有 `document-context*.test.js` 在迁移后通过；README 受管区块、登记/决策/上下文选择、生命周期/冲突和 CLI 行为未退化 |
| PM-T05 | 主机 | Team Sync 数据保护 | 初始化保留现有文件；任务完成记录 append-only；状态、风险、阻塞和验证证据按允许词汇写入；无证据不升级为已验证 |
| PM-T06 | 主机/静态 | Workflow 回归和根命令兼容 | `workflow-catalog`、plugin、projection、resolver/contract 定点检查通过；既有根 `document-context:*` 命令仍可调用新唯一源 |
| PM-T07 | 差异审计 | 混合工作区与回滚 | 变更只在 PM-F01–PM-F10；迁移前后 hashes/diff 可审计；可独立回滚新插件注册且不丢失用户文件/数据 |
| PM-T08 | 宿主 | 实际 Codex/Cursor 加载 | 如可复现真实宿主，分别记录发现/加载证据；未运行时标为 `unverified`，静态/主机测试不得写成宿主证明 |
| PM-T09 | 来源审计 | External provenance | `embedded-team-sync` provenance 中未有证据的版本/许可证/依赖仍为 unknown/unverified，不影响其内容归属 |
| PM-T10 | 硬件边界 | 固件/板级 | 本工作只涉及插件和工具仓库；不声称固件构建、烧录、目标运行或实物验证通过 |

### Review Gate 结论与交接

| 审查项 | 结论 |
|---|---|
| 范围/非目标 | 通过：本阶段只创建 Project Management 插件并迁移上述两项 Skills 及 Doc Context 运行时/测试；明确不纳入其余报告与 AI 执行链能力 |
| 业务规则 | 通过：Team Sync 与 Doc Context 的持久化对象已分权；总体项目状态与对话级 handoff 通过稳定标识关联、不双写 |
| 状态/权限/资源 | 通过：只在 PM-F01–PM-F10 列明的插件/注册/运行时代码/测试路径操作；不得写入实际用户固件工程的数据目录；保留混合工作区内容 |
| 可验证验收 | 通过：存在六项 Doc Context 主机测试和插件注册/投影测试入口；双宿主真实加载证据另行分级记录 |
| 可行性/阻塞 | 无阻塞范围缺口；实际迁移顺序、逐文件 hash/marker 冻结、回滚命令与阶段级 Agent/Skill 基线由后续 `workflow-integration-plan` 细化 |
| `spec_rigor` / overlays | `full` / `[versioned]`，匹配跨插件唯一源、runtime、注册表和投影变更 |
| Review Gate | `approved`；本结论只表示 Spec 约束审查通过，不代表实现或测试已完成 |
| 用户闸门 H-02 | `pending-user-spec-review`；用户审阅批准前不得更新正式 Plan/Task 施工范围或修改 PM-F01–PM-F10 实现文件 |
| 下一步 | H-02 批准后交给 `workflow-integration-plan` 为本 v1.6 生成两种同目标实施方案；用户选择并 Plan 审查批准后，重制 Task，再由 `workflow-task-execution` 自动按依赖执行并验证 |
