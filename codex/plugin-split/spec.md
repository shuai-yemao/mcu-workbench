# MCU Workbench 插件拆分需求规格

## 元数据与状态

| 字段 | 内容 |
|---|---|
| request_id | `REQ-PLUGIN-SPLIT-20261123` |
| 生成时间 | `2026-11-23T00:00:00+08:00` |
| 项目路径 | `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai` |
| 分支/提交 | `host_ai`；当前工作区未能通过 Git 命令确认提交 |
| Spec 力度 | `full` |
| Spec 叠加门禁 | `[versioned]` |
| 审查状态 | `user-confirmed / review-gate-pending` |
| 用户审查状态 | `approved` |
| 当前判定 | `approved-for-mvp-execution`：Codex/Cursor 本地宿主观察范围已确认；Claude 和动态卸载能力延期验证 |
| 2026-11-23 变更 | 用户确认修复既有 catalog/link 基线；正式 Skill 必须可登记，链接必须指向仓库内真实目标或显式记录为外部依赖，Jest/插件/链接校验目标为零失败 |

## 需求与范围

### 目标

将当前单一 `mcu-workbench` 插件拆分为五个职责清晰、可独立发布又能协同工作的插件：

1. `mcu-workbench-workflow`：需求路由、审查门禁、计划执行和交接。
2. `mcu-workbench-architecture`：嵌入式软件架构与 App / Service / Platform / Impl / Vendor 分层。
3. `mcu-workbench-verification`：单元测试、主机 Fake/Unity、质量检查和代码审查。
4. `mcu-workbench-devops`：构建、链接、烧录、Git、CI/CD 和发布。
5. `mcu-workbench-observability`：日志、调试、串口/RTT、故障观测和上位机工具接入。

拆分后的插件体系必须为持续迭代预留扩展空间：插件是可替换、可组合、可卸载的能力单元，不把未来能力继续堆回一个新的中心插件。插件内部对象与能力装配优先复用当前软件架构的 `base + cfg / ctx / data / ops` 四元组模型；纯函数表或纯声明型契约只有在明确声明“不承载对象身份与生命周期”时才豁免。

Harness 设计借鉴 DeepSeek Harness 的可组合插件思想：模型适配、工具注册、会话/日志、执行循环等能力不应被视为不可替换的特权核心；插件通过注册表/事件总线提供能力，生命周期结束时撤销注册，配置通过 profile/bundle 组合。这里仅采纳架构思想，不假定当前 Claude/Codex/Cursor/OpenCode 已具备完整的动态卸载能力；宿主能力必须单独验证。

### 非目标

- 本阶段不修改目标固件、HAL、RTOS、BSP 或 Vendor 源码。
- 不改变现有 canonical Skill 的业务语义和 App → Service → Platform ← Impl → Vendor 契约。
- 不在未确定宿主依赖机制前删除旧的单插件入口。
- 硬件分析不并入五个核心插件，后续作为独立的第六个 `mcu-workbench-hardware` 插件规划；本阶段只保留现有硬件能力和兼容入口，不迁移硬件 Skill。
- 外部导入的现有 Skill 必须先建立清单，依据实际功能归属到唯一插件；未完成归属、依赖或许可证确认的 Skill 不得直接迁移。
- 本阶段允许生成 `task.md` 草案；在所有阻塞项关闭前不得执行目录移动或代码迁移。
- 在能力与测试矩阵通过对齐前，不进入插件目录拆分；矩阵见 `capability-test-matrix.md`。
- MCP 作为外部工具/资源/服务适配层，不新增 Mods 层；MCP 不得绕过 Workflow、Rules 和证据门禁。
- 所有插件、Skill、Agent、Rule、Hook、脚本和 MCP descriptor 先遵循 MVP 统一格式；格式与最小 Runtime 测试通过前，不批量迁移现有能力。
- 基线修复允许修改现有 Skill 的登记元数据、链接目标和文档路径；不得通过静默排除、空占位文件或关闭校验器掩盖缺失。外部来源文件无法进入仓库时，必须保留来源标记并从本地完整性验收中显式隔离。
- 新增对象统一采用 kebab-case ID、统一命名空间和 SemVer；现有下划线/旧调用名只通过 aliases 兼容，不作为新代码标准。
- MVP 真实宿主验收顺序为 Codex、Cursor、Claude；OpenCode 适配不属于目标范围，现有 OpenCode 文件暂不删除。

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

## 2. 文件施工清单

| ID | 范围 | 主要文件/目录 | 归属 | 施工内容 | 状态 |
|---|---|---|---|---|---|
| F-01 | 新增 | `packages/contracts/` 或等价共享目录 | 共享契约 | 定义 Skill ID、插件能力、RCP/Spec/Plan/Task、证据等级和版本协议 | blocked：待方案选择 |
| F-02 | 重组 | `skills/workflow/` | workflow | 迁移并保留 Router-first、门禁、计划和任务执行语义 | blocked |
| F-03 | 重组 | `skills/app/`、`service/`、`platform/`、`impl/`、`vendor/` | architecture | 迁移五层架构 Skill 与分层引用 | blocked |
| F-04 | 重组 | `skills/tools/tools-quality`、`tools-verification` | verification | 迁移质量、单元测试、主机测试和代码审查能力 | blocked |
| F-05 | 重组 | `skills/tools/tools-build`、`tools-linker`、`tools-flash`、`tools-git`、`tools-release` | devops | 迁移构建、产物、版本和发布能力 | blocked |
| F-06 | 重组/新增 | `skills/tools/tools-debug`、`tools-observability`、新增 host skill | observability | 迁移日志调试并补充上位机边界 | blocked |
| F-07 | 修改 | `.claude-plugin/`、`.codex-plugin/`、`.cursor-plugin/` | 宿主适配 | 为五个核心插件生成 manifest、命令和兼容入口；不新增 OpenCode 适配 | blocked |
| F-08 | 修改 | `skills/catalog.js`、`catalog-metadata.js`、`lib/agent-domains.js` | 注册与路由 | 从单 catalog 改为插件级 catalog/聚合视图，保留旧调用名解析 | blocked |
| F-09 | 修改 | `scripts/`、`tests/` | 工具与测试 | 增加拆分后校验、依赖、版本、宿主表面和回滚测试 | blocked |
| F-10 | 后续 | `plugins/hardware/` | hardware | 作为第六个独立插件迁移 PCB、VISA 和硬件分析能力 | deferred |
| F-11 | 新增 | `packages/contracts/plugin-runtime/` 或等价目录 | 插件运行时契约 | 定义 plugin descriptor、profile/bundle、注册句柄、生命周期和事件契约 | blocked：待宿主能力探测 |
| F-12 | 修改 | `lib/`、新增 runtime/registry 模块 | 插件运行时 | 以对象四元组承载插件状态：`base + cfg + ctx + data + ops`；注册/撤销必须可测试 | blocked |
| F-13 | 新增 | `plugins/*/profiles/` 或等价目录 | 组合配置 | 允许按项目组合五个现有插件及未来插件 | blocked |
| F-14 | 新增 | `external-skill-inventory`、归属矩阵和许可证记录 | 迁移审计 | 登记外部 Skill 的来源、版本、许可证、功能、依赖、目标插件和迁移状态 | blocked：待外部清单 |
| F-15 | 新增 | `plugins/*/adapters/external/` 或等价目录 | 兼容适配 | 对暂未改写格式的外部 Skill 提供 descriptor/alias/adapter，不复制或静默修改原内容 | blocked |

## 3. 代码生成约束清单

| ID | 约束 | 必须遵守 | 禁止事项 | 状态 |
|---|---|---|---|---|
| G-01 | 兼容性 | 旧 `mcu-workbench` 入口至少保留一个过渡版本或聚合入口 | 直接删除旧入口 | ready |
| G-02 | 依赖方向 | workflow 编排其他插件；architecture 不依赖 devops/observability 实现 | 在 architecture 中复制工具实现 | ready |
| G-03 | 契约唯一性 | Skill ID、别名、schema、证据等级只保留一个事实源 | 每个插件维护一套互不一致的 catalog | ready |
| G-04 | 版本化 | 插件间依赖必须带版本范围、兼容矩阵和迁移说明 | 依赖 latest 或未锁定版本 | ready |
| G-05 | Host 能力 | Codex、Cursor、Claude 分别验证 manifest、命令和 Skill 加载 | 用一个宿主成功替代其他宿主验收 | ready |
| G-06 | 生成边界 | 脚本生成 manifest、catalog 和兼容映射时保留源文件归属 | 手工修改生成文件绕过源事实 | ready |
| G-07 | 回滚 | 迁移阶段支持恢复单插件入口和旧调用别名 | 在验证前进行不可逆删除 | ready |
| G-08 | 上位机边界 | 新增上位机能力必须明确协议、进程、串口/USB/TCP 权限和产物 | 将具体 PC 工具名称推测为已存在能力 | blocked：待补证 |
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
| V-04 | 宿主 | 按 Codex → Cursor → Claude 顺序加载五个插件 | manifest、Skill、命令和 Agent 表面可发现 | blocked：宿主能力未确认 |
| V-05 | 兼容性 | 以旧 `mcu-workbench` 入口执行代表性 workflow、architecture、quality、build、debug 请求 | 旧入口能路由到新插件或给出明确迁移提示 | not-run |
| V-06 | 版本化 | 构造插件版本不兼容场景 | 安装或路由明确阻止，并指出升级路径 | not-run |
| V-07 | 回滚 | 在迁移中途恢复旧聚合入口 | 无需丢弃用户文件即可恢复可用状态 | not-run |
| V-08 | 上位机 | 对新增 host skill 运行协议/进程/权限的主机测试 | 未连接硬件时也能区分 mock 与真实观测 | blocked：待补充 host 需求 |
| V-09 | 主机 | 构造插件 descriptor、注册、撤销和重复加载测试 | 注册无残留、撤销幂等、重复加载不重复执行 | blocked |
| V-10 | 主机 | 验证 `base + cfg/ctx/data/ops` 的生命周期和依赖注入 | 状态、配置、运行上下文、数据缓存和操作表边界清晰 | blocked |
| V-11 | 静态/主机 | 新增一个示例扩展插件，不修改既有五插件核心代码 | 仅增加 descriptor/profile/adapter 即可接入 | blocked |
| V-12 | 宿主 | 对四宿主做动态能力探测 | 明确支持静态组合、重启加载或热加载/卸载中的哪一种 | blocked |
| V-13 | 静态/主机 | 外部 Skill inventory 和归属矩阵校验 | 每个 Skill 只有一个目标插件；来源、版本、许可证和依赖完整 | blocked |
| V-14 | 主机 | 外部 Skill 兼容适配测试 | 旧 Skill 可通过 alias/adapter 被目标插件调用，且不改变原内容 | blocked |

## 方案审查结论

- 可采用：五插件职责聚合；Verification 聚合单元测试与代码审查；DevOps 聚合构建/发布；Observability 聚合日志/调试/上位机。
- 需修订：硬件 Skill 的归属、跨插件依赖机制、上位机能力的具体边界、动态卸载能力和 profile/bundle 语义。
- 阻塞风险：当前未确认宿主是否支持动态插件生命周期、跨插件依赖和版本约束；未确认上位机协议与工具范围。
- SOLID 约束：拆分后每个插件应保持单一职责；workflow 通过契约依赖能力而非复制实现；新增插件应可扩展而不修改其他插件核心；各宿主适配应遵守同一契约；依赖注入通过共享 descriptor/schema 和四元组对象完成。实现阶段必须用测试证明。
- 代码阶段判定：`blocked`。

## 用户闸门

`H-02 spec-review`: `approved`

已确认决策：

1. 已确认：采用这五个插件名称和职责边界。
2. 已确认：硬件分析后续另建第六个插件。
3. 已确认：旧单插件入口保留为兼容聚合入口。
4. 已确认：插件运行时统一采用 `base + cfg / ctx / data / ops`，并以 Harness 风格的 descriptor、profile、注册/撤销生命周期作为扩展机制。
5. 已确认：硬件分析后续作为独立第六插件，不进入本轮五插件拆分。

6. 已确认：本轮跳过并忽略 T-002 外部 Skill inventory 的完成门槛；现有 inventory 仅作为未验证记录保留，不作为本轮迁移阻塞条件。来源、版本、许可证和依赖审计延期到后续迁移审查。

7. 已确认：T-004 本轮只验证本地 Codex 与 Cursor 宿主表面；Claude 延期，不阻塞 MVP。MVP 只承诺静态组合、显式生命周期和重启加载；热加载、动态卸载、事件撤销保持 `unverified`。

8. 已确认：T-009 沿用同一 Codex/Cursor MVP 宿主范围；Claude 的真实加载验证延期，不阻塞本轮兼容交付。
