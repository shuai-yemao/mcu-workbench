# MCU Workbench Project Management 插件拆分计划

> 依据 codex/plugin-split/spec.md v1.6。用户选择方案 B：分阶段切换。用户于 2026-11-26 指示“生成task开始执行”，据此批准 Plan 并授权进入 Task 与执行。
>
> 路线约束：先准备不含重复 Skill/runtime 的插件骨架；随后协调迁移唯一源并同步 owner/catalog/projection/host 注册；最后分阶段验收。不得产生双重可编辑源或重复 owner。

## 1. 元数据与状态

| 字段 | 内容 |
|---|---|
| request_id | REQ-PLUGIN-SPLIT-20261123 |
| 生成时间 | 2026-11-26T13:00:00+08:00 |
| 计划版本 | v0.1-project-management-staged-cutover |
| 计划状态 | approved / execution-authorized |
| 项目路径 | C:/Users/shuaitan2/Desktop/mcu-workbench-host_ai |
| 分支/提交 | host_ai；远程基线 origin/host_ai @ aa632a91229b15446279494066cf666704593d2c；本地索引待按路径冻结 |
| 输入 spec.md | C:/Users/shuaitan2/Desktop/mcu-workbench-host_ai/codex/plugin-split/spec.md |
| 输入 Review-Package | Spec v1.6 的 RCP、PM-E01–PM-E09、PM-F01–PM-F10、PM-G01–PM-G10、PM-T01–PM-T10 |
| Spec 力度 / 风险门禁 | full / versioned |
| 选定方案 | 方案 B：分阶段切换 |
| 选择人 | 用户；2026-11-26 回复“b” |
| 用户审查状态 | approved（H-03；用户于 2026-11-26 指示“生成task开始执行”） |
| 方案审查结论 | 初审问题已按多视角审查修订；复核通过，Plan 待用户审阅 |

用户先要求输出 Plan 方案后选择 B；2026-11-26 用户指示“生成task开始执行”，批准本 Plan 并授权按任务依赖进入执行。该指示同时确认接受 Spec v1.6 范围；此前 H-02/H-03 待审状态更新为已批准。

## 2. 目标与边界

- 目标：建立独立双宿主插件，迁入 embedded-team-sync 和 workflow-document-context；将 Doc Context runtime/CLI 归于新插件唯一源；Workflow 不再拥有这两个 Skill；保留 Skill IDs、数据格式和根 document-context 命令兼容。
- 不做：迁入 project-intake、change-report、LLM guardrails 或 Workflow 的 Spec/Plan/Task 执行链；不扩展完整 PM 系统；不迁移其余插件 Skills；不修改固件或用户项目数据。
- 预期：新插件可独立校验；旧聚合 Skills 路径是受 marker/hash 保护的生成投影；Codex 与 Cursor 分别留验收证据。

## 3. 工程事实与计划依据

| ID | 事实 | 证据 | 等级 | 计划影响 |
|---|---|---|---|---|
| E-01 | 当前 HEAD 为 79ae7a0c231cd417717db0927775131274327e36，工作区有大量改动 | git rev-parse HEAD；git status --short --branch | confirmed | 施工前按 PM-F01–F10 逐路径记录存在性、SHA-256、Git 状态及 marker/hash；禁止广域 reset/checkout/清理 |
| E-02 | Workflow 插件已有 descriptor/package/host manifests、skill-map、syncer、validator | plugins/mcu-workbench-workflow 下相应文件 | confirmed | 复用既有插件契约，不另造协议 |
| E-03 | 两项 Skill 目前归 Workflow；Doc Context 为 canonical，Team Sync 为 external | Workflow skill-map.json；Spec PM-E02/PM-E03 | confirmed | 保持 ID，迁移唯一 owner 和投影 |
| E-04 | Doc Context runtime 位于根 lib/document-context*.js、scripts/document-context-api.js，根 package 暴露命令 | 上述路径与 package.json | confirmed | 实现随 Skill 一起归插件；根入口只保留薄委托 |
| E-05 | marketplace 在根级，专用 Doc Context 测试共六项 | .agents/plugins/marketplace.json、.cursor-plugin/marketplace.json；tests/document-context*.test.js | confirmed | 更新双宿主注册并保留六项测试 |
| E-06 | 全局 Team Sync 状态与 request/conversation handoff 是不同数据对象 | Spec PM-G02/PM-G03 | user-confirmed | 两类状态以稳定 ID 互引，不复制正文、不双写 |
| E-07 | embedded-team-sync provenance 的部分版本/许可证/依赖未知 | Spec PM-E09/PM-G10 | confirmed | 保留 unknown/unverified，不推断 |
| E-08 | 本阶段只涉及插件仓库，无固件目标验收 | Spec PM-E09/PM-T10 | confirmed | 静态/主机/宿主证据分级，不声称硬件验证通过 |

## 4. 候选方案与选择

**方案 A：单批次切换。** 同一批完成插件、唯一源、owner、catalog、投影、marketplace、CLI 委托和验证。优点是过渡状态少；缺点是多个注册面同时变化，失败定位和回滚较集中。

**方案 B：骨架准备、协调切换、分段验收（已选）。** 先建立不含重复源的骨架；将源转移与 owner/catalog/projection/marketplace/CLI 更新作为一个协调切换批次；再分别验收静态、主机和宿主。优点是有阶段检查点且不出现双源；代价是阶段记录更多。协调切换内部不可拆成两个可交付状态。

| 维度 | A | B |
|---|---|---|
| 改动范围 | 相同，PM-F01–F10 | 相同，分阶段推进 |
| 复杂度 | 中 | 中偏高 |
| 架构风险 | 注册面集中变化 | 过渡状态受阶段门控制；切换批次仍须完整 |
| 可验证性 | 最终整体验收 | 骨架、切换、主机、宿主分段留证 |
| 回滚 | 一次整体回滚 | 按阶段回滚；协调切换失败则整体回退该批次 |
| 选择记录 | 未选 | 用户选择“b”；未另行陈述理由；此前建议 B 基于阶段可验证与便于定位 |

## 5. 选定路线与接口边界

本项目不是固件 App/Service/Platform/Impl/Vendor 分层变更。调用和所有权边界为：

- Codex/Cursor manifests → 插件 Skill 源。
- 根 document-context CLI → 插件 CLI → 插件 Doc Context library。
- catalog/owner map → 受保护的旧路径 projection。
- Team Sync 独占 .ai/TEAM_RULES.md、PROJECT_STATUS.md、SKILL_REGISTRY.md、TASK_LOG.md。
- Doc Context 独占 README 受管区块及 .mcu-workbench/document-context 索引、事件、版本化 handoff。
- 根 CLI 只委托，不保留第二份实现；新插件不得引用 Workflow 私有实现。
- 不新增固件线程、ISR、DMA、内存或硬件生命周期约束。

## 6. 文件阶段与施工顺序

| ID | 阶段 | 目标/文件边界 | 完成条件 | 前置/失败处理 |
|---|---|---|---|---|
| P-00 | 基线冻结 | 只读核对 PM-F01–F10 路径、引用、hash、Git 状态和 projection marker | 所有目标路径均有基线；无未处理冲突 | 用户批准 Plan 后执行；发现目标文件新变化则重核，不覆盖 |
| P-01 | 插件骨架 | 新建 PM-F01 包结构、descriptor/package、Codex/Cursor manifest、空 map 和工具入口；不复制两项 Skills/runtime，不改 owner | 仅检查本次新增 JSON/schema 与路径存在性；不要求空 map 通过完整插件 validator；不出现重复 Skill 源 | 仅新增批准范围内文件；冲突则阻塞 |
| P-02 | 协调切换 | 同一切换批次完成 PM-F02–F08：迁移两项 Skill 全目录和 Doc Context runtime；更新 Workflow/new plugin map、catalog、projection、根 CLI 委托、marketplace/host manifests、inventory/matrix | 唯一 owner/source；Workflow 不再暴露迁出项；旧入口委托到新实现；双宿主清单一致 | P-00/P-01 通过；任一关键登记失败时暂停，不标记阶段完成 |
| P-03 | 主机回归 | PM-F09/F10：调整既有六项 Doc Context 测试导入；补插件和投影测试；执行定点验证 | Skill 行为、根命令、Workflow 回归和链接/投影检查通过 | P-02 完成；失败保留日志，不删测试绕过 |
| P-04 | 宿主验收 | 独立验证 Codex 与 Cursor 插件发现/加载 | 两宿主分别有真实证据或明确标记 unverified | P-03 通过；只使用仓库级/隔离环境；如需持久化用户级安装，另行取得授权 |
| P-05 | 最终审查 | 按 Spec 核对 PM-T01–T10、hash/diff、回滚与未验证项 | 全部验收有状态；无隐藏 blocker | 交给 workflow-final-review；Verify 偏差回 Spec/Plan |

**PM-F 文件对应：**P-01 对 PM-F01；P-02 对 PM-F02–F08；P-03 对 PM-F09–F10；P-04 按 PM-F07；P-00/P-05 是工作区保护与交付审计，不扩大实现文件范围。

## 7. 阶段 Agent/Skill 基线

| 阶段 | 主 Agent / 协作 | 执行/辅助 Skills | 理由 |
|---|---|---|---|
| P-00/P-01 | embedded-lead；system-architect | 主实现 Skill 待 Task 基于真实文件确认 | 插件契约和基线盘点；不虚构仓库中不存在的实现 Skill |
| P-02 | embedded-lead；system-architect、firmware-engineer（按仓库迁移职责映射）、verification-engineer | 主实现 Skill 待 Task 确认；workflow-document-context、embedded-team-sync 仅提供契约约束 | 唯一源、owner、CLI 及数据所有权协同 |
| P-03/P-04 | embedded-lead；verification-engineer、toolchain-engineer | workflow-task-execution 控制；验证工具由 Task 核实 | 分层留存主机与宿主证据 |
| P-05 | embedded-lead；system-architect、verification-engineer | workflow-final-review | 对照 Spec 最终验收 |

Task 拆分时需核对 Agent/Skill canonical ID 和实际可用命令；无合适实现 Skill 时如实指定工具/人工实现责任。阶段按依赖串行；P-02 不得并行修改 owner map/catalog。

## 8. SOLID 与数据保护

- **SRP：**两个 Skill 继续拥有不同项目数据；Doc Context runtime 只有一份实现。出现双写即阻塞。
- **OCP：**通过插件 descriptor/map/catalog 增加能力；若需改无关插件契约则回 Spec。
- **LSP：**保留 Skill ID、CLI 参数/退出语义和用户数据格式；兼容测试失败不得放行。
- **ISP：**宿主只暴露批准的两项 Skill；不夹带其他 Workflow 功能。
- **DIP：**根 CLI 薄委托到新插件公开入口；插件不反向依赖 Workflow 私有路径。
- 初始化不得覆盖用户项目的 .ai/ 或 .mcu-workbench/ 文件；TASK_LOG append-only；README 仅改管理标记区。
- 外部来源/版本/许可证/依赖未知保持原状态。
- 任何修改越出 PM-F01–F10 或出现无 marker 冲突，立即停下并保留原工作区差异。

## 9. 验收与验证计划

命令均从仓库根目录执行。具体 validator 参数和 npm scripts 在 Task 阶段再次核实；本 Plan 阶段未运行命令或测试。

| ID | 等级 | 验收项 | 计划入口/条件 | 通过结果 |
|---|---|---|---|---|
| V-01 | 静态 | 唯一 owner/source 与 Workflow 移出 | 新旧 plugin skill-map、catalog、projection manifest、plugin validator | 两 ID 仅 PM owner；无重复实现/坏链接/漂移 |
| V-02 | 静态/主机 | 双宿主注册一致 | 当前 Workflow validator：node plugins/mcu-workbench-workflow/scripts/validate.js；PM validator 创建后由 Task 核验实际入口 | manifests 与 marketplace 一致 |
| V-03 | 主机 | Doc Context 行为 | node node_modules/jest-cli/bin/jest.js --runInBand tests/document-context-cli.test.js tests/document-context-context.test.js tests/document-context-lifecycle.test.js tests/document-context-readme.test.js tests/document-context-store.test.js tests/document-context.test.js | 六项现有用例通过，不删除绕过 |
| V-04 | 主机 | Team Sync 保护 | 隔离临时 project fixture | 初始化不覆盖；TASK_LOG 追加；状态证据等级正确 |
| V-05 | 主机 | 根 CLI 与 Workflow 回归 | 定点运行 Workflow catalog/plugin/projection、contract/resolver、marketplace、Codex/Cursor、sync 测试；运行既有 document-context:* 命令 | 命令委托新唯一实现；相关回归通过 |
| V-06 | 静态/主机 | 投影/链接闭包 | syncer check/validator 与共享链接检查 | 无未登记覆盖、owner 冲突或链接错误 |
| V-07 | 差异审计/来源状态 | 工作区保护和 PM-T09 provenance | 对照 P-00 清单审查 git diff/hash，并检查 external-skill-inventory.yaml 的 embedded-team-sync 来源字段 | 实现差异限定 PM-F01–F10；原改动未丢失；未知版本/许可证/依赖仍为 unknown/unverified；保留 provenance 审计清单 |
| V-08 | 宿主 | Codex / Cursor | 使用仓库级或隔离的本地宿主方式分别发现并加载；不执行持久化用户级安装 | 分宿主真实证据；不能复现则 unverified；持久化用户级安装另行授权 |
| V-09 | 实物/固件 | 目标固件与硬件 | 不适用 | 本阶段不声称固件构建、烧录、目标运行或实物验证通过 |

验收顺序：静态 owner/link → 主机行为和 CLI → 插件回归 → Codex/Cursor → 全部任务完成后的 Spec 最终 Verify。PM-T09 来源状态通过 V-07 清单检查。低等级证据不能替代高等级证据。

## 10. 内部方案审查

| 审查面 | 结论 | 依据/动作 |
|---|---|---|
| 架构和依赖方向 | 可采用；复核通过 | 唯一 owner、根 CLI 单向委托；P-02 协调切换 |
| 文件范围和数据流 | 可采用；格式修订后通过 | PM-F01–F10、唯一源切换；V 验收表统一五列 |
| 验收和回归 | 可采用；复核通过 | 六项 Doc Context 测试、PM-T01–T10 覆盖、分级证据 |
| 硬件 | 不适用 | 本阶段无固件/硬件操作 |
| 工具链/宿主环境 | 可采用；复核通过 | Workflow validator 入口明确；新 PM validator 留待 Task 核验；宿主隔离测试边界明确 |

审查结论：架构、迁移/文件范围、验证和工具链视角均已完成只读复核；初审意见已纳入本版并复核通过。无已知阻塞；Plan 仍待用户批准。

## 11. 回滚与失败处理

1. P-00 记录目标路径现状与 marker/hash；禁止广域 reset、checkout 或清理。
2. P-01 失败只撤回本次新增且确认无预存内容的骨架文件。
3. P-02 任一 owner/runtime/manifest/projection 不一致，停止并按 P-00 逐文件恢复本次改动；不触碰其他既有差异。
4. 测试失败保留日志和产物；若修复需要变更 Spec 范围/数据契约，回 Review Gate。
5. 无法复现某宿主时记录 unverified；不改写静态条件以伪造通过。

## 12. 下游交接与状态

- Spec：C:/Users/shuaitan2/Downloads/mcu-workbench-host_ai/mcu-workbench-host_ai/codex/plugin-split/spec.md
- Plan：C:/Users/shuaitan2/Downloads/mcu-workbench-host_ai/mcu-workbench-host_ai/codex/plugin-split/artifacts/project-management/plan.md
- Task：仅在用户批准此 Plan 后交 workflow-task-breakdown；Task 需核实所有文件、命令、Agent/Skill 分配。
- 实施：Task 获交付后由 workflow-task-execution 按依赖逐项完成；所有任务后统一最终 Verify，再交 workflow-final-review。
- 当前状态：approved / execution-authorized（H-03）。
- 下一步：基于本地 Git 初始化后的 origin/host_ai 基线逐路径冻结，生成 task.md，再按依赖执行。
- 当前未执行：尚未生成本阶段 Task；没有迁移、代码修改、测试、同步、安装或真实宿主验收。
