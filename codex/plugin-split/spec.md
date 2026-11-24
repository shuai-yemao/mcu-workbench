# MCU Workbench 插件拆分需求规格

## 元数据与状态

| 字段 | 内容 |
|---|---|
| request_id | `REQ-PLUGIN-SPLIT-20261123` |
| 生成时间 | `2026-11-24T14:28:43+08:00` |
| 项目路径 | `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai` |
| 分支/提交 | `host_ai`；`969398e6f5aea785da143ca4535d76ebf6b86188` |
| Spec 力度 | `full` |
| Spec 叠加门禁 | `[versioned]` |
| Spec 版本 | `v0.7-devops-third-plugin` |
| 审查状态 | `review-gate-approved / pending-user-approval` |
| 用户审查状态 | `pending`（等待 v0.7 审阅） |
| 当前判定 | `pending-user-approval`：本阶段目标为第三个 `mcu-workbench-devops` 插件；本 Spec 获用户批准前不得更新实施 Plan/Task 或开始拆分 |
| 2026-11-23 变更 | 用户确认修复既有 catalog/link 基线；正式 Skill 必须可登记，链接必须指向仓库内真实目标或显式记录为外部依赖，Jest/插件/链接校验目标为零失败 |
| 2026-11-24 变更 | 用户确认沿用上一轮边界，按拆分难度选择第二个插件；选定 `mcu-workbench-observability`，并允许已登记外部 Skill 作为该插件的迁移对象；宿主验收范围固定为 Codex + Cursor MVP |
| 2026-11-24 变更 | 用户明确要求清理插件中的 OpenCode 部分；移除旧聚合插件活动 OpenCode 宿主入口、运行时、配置、专属依赖/脚本/Hook、命令生成器和派生产物；保留历史审计记录中的 OpenCode 事实性文字 |
| 2026-11-24 变更 | 用户确认 observability 是第二个插件且 MVP 已完成；本阶段目标为用于单元测试的 `mcu-workbench-verification`，按完整插件边界进行物理目录拆分，并保留旧聚合入口和兼容 aliases；Spec 重新进入 Review Gate，旧 observability Plan/Task 不适用于本阶段 |
| 2026-11-24 变更 | 用户追加要求迁移外部导入的 Skills；依据本轮目标插件归属矩阵，按默认窄范围纳入全部 6 个 verification 归属项；其他插件归属和 `unknown` 项不迁移。Spec v0.5 放行并已执行 |
| 2026-11-24 变更 | 用户确认将 `academic-paper`、`academic-paper-reviewer`、`academic-pipeline`、`sr-screener` 从 verification 插件移出，转为 Codex Agent Skills；`embedded-unit-test-generator`、`static-analysis` 留在 verification 插件。Codex 现有同步器的安装目标为 `~/.agents/skills`。Spec 升至 v0.6，并经 Review Gate 及用户批准；v0.5 Plan/Task 不再适用于新范围 |
| 2026-11-24 变更 | 用户确认第三阶段拆分 `mcu-workbench-devops`：纳入五项 canonical Skills 与归属矩阵内全部 DevOps 外部 Skills；建立完整独立包，Codex + Cursor MVP 验收。Spec 升至 v0.7；v0.6 verification Plan/Task 不适用于本阶段，等待本 Spec 用户审阅后再重制 |

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
