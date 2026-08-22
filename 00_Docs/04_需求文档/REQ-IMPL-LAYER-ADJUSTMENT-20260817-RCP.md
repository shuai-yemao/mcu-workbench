# 需求约束包（RCP）

## 1. 元数据

| 字段 | 内容 |
|---|---|
| request_id | `REQ-IMPL-LAYER-ADJUSTMENT-20260817` |
| 生成时间 | `2026-08-17T18:08:56+08:00` |
| RCP 版本 | `v0.1` |
| RCP 状态 | `preliminary` |
| 工作流状态 | `待补证` |
| 项目路径 | `C:\\Users\\zhang\\Documents\\mcu-workbench` |
| 分支/提交 | `host_ai @ 562c03c` |
| 目标交付物 | Impl 层 canonical Skill、参考资料、路由与质量契约的可审查调整；后续按门禁决定是否提交/推送 |

## 2. Agent 分析

| Agent | 分析范围 | 结论 | 证据 | 阻塞项 |
|---|---|---|---|---|
| `embedded-lead` | Vendor 发布后进入 Impl 的范围协调 | Vendor 闭包已推送；当前工作区存在独立的 Impl/Platform 文档变更，但尚未形成实施边界 | `git show --stat 562c03c`; `git diff --name-status -- skills/impl skills/platform` | Impl 第一版覆盖域仍需用户确认 |
| `system-architect` | App → Service → Platform ← Impl → Vendor 边界 | 当前 canonical Impl 分为 `impl_os`、`impl_board`、`impl_bsp`、`impl_middleware`；Vendor 由目标工程 `05_Vendor/` 管理，Impl 是适配/装配边界 | `skills/catalog.js:78`; `skills/impl/impl_board/SKILL.md:11-28`; `skills/workflow/workflow-review-gate/references/software-layer-contract.md:9-22` | 是否把 `platform_mcu` 后端边界作为本轮 Impl 范围的一部分 |
| `firmware-engineer` | Impl 文件职责、资源和并发约束 | 现有规则已声明 Driver/Handle/Port、`impl_os_*`、Middleware Adapter/Port 的职责，但没有目标工程源码可验证具体 API | `skills/impl/impl_bsp/SKILL.md:62`; `skills/impl/impl_os/SKILL.md:15-22`; `skills/impl/impl_middleware/SKILL.md:30-49` | 无目标工程 Platform/OSAL/构建入口证据 |
| `verification-engineer` | 验收与证据等级 | 可立即执行插件结构、链接、架构图和主机定向测试；不能据此宣称目标固件构建、烧录或板上运行 | `npm run validate:plugin`; `npm run validate:links`; `npm test -- --runInBand tests/software-architecture-graph.test.js` | 目标工程验证入口未确认 |

## 3. 可信等级约定

- `confirmed`：由当前仓库文件、Git 状态或可复现命令确认。
- `user-confirmed`：用户明确回答或选择确认。
- `inferred`：根据当前证据推断，尚未直接确认。
- `unverified`：尚未验证，不能作为实现前提。

## 4. 项目背景与目标

- 当前问题：Vendor 已完成重命名、物理布局和内容契约调整并已推送；需要继续调整 Impl 层，使其能够清晰承接 `05_Vendor/` 的 MCU、RTOS、中间件和算法底座。`confirmed`
- 受影响对象：插件中的 Impl canonical Skill、Platform/Impl/Vendor 路由、参考资料、架构契约和相关测试。`confirmed`
- 工程影响：若 Impl 规则仍与 Vendor 路径、依赖方向或资源所有权不一致，后续生成/审查可能产生错误目录、越层 include、错误的 OSAL 假设或无法验证的构建声明。`inferred`
- 目标：在不修改目标工程 Vendor 源码、不绕过 App → Service → Platform ← Impl → Vendor 边界的前提下，完成 Impl 层第一版可审查调整。`user-confirmed`（用户已要求开始 Impl 调整；具体范围待补证）
- 初步成功标准：四类 Impl Skill 的职责、目录、接口、所有权、并发/ISR/DMA、错误恢复、Vendor 接入和验证边界可由仓库测试/链接/架构检查验证；未确认的目标工程 API 保留明确 unresolved 标记。`inferred`
- 目标交付物：RCP、Review Gate 所需审查清单/Review-Package，后续放行后的 `spec.md`、`plan.md`、`task.md`，以及经最终审查的 Impl Skill 变更。`confirmed`
- 直接范围（初步）：`skills/impl/impl_os/**`、`skills/impl/impl_board/**`、`skills/impl/impl_bsp/**`、`skills/impl/impl_middleware/**`，及为保持路由/契约一致而必要的 Platform/测试文件。`inferred`
- 明确不包含：目标工程 `04_Impl/**` 业务代码、`05_Vendor/**` 实际源码、CubeMX/FreeRTOS 配置、板级引脚绑定、烧录、硬件调试、无关历史文档删除和生成器重写。`inferred`

## 5. 工程环境与约束

### 5.1 硬件与目标工程

本请求针对插件仓库的架构知识和生成/审查规则，不提供一个可直接构建的目标固件工程。

| 项目 | 内容 | 证据 | 可信等级 | 影响 |
|---|---|---|---|---|
| MCU/板卡 | 未提供目标工程型号和板卡 | 当前仓库仅有 Skill/reference；无目标 `04_Impl`、`.ioc` 或板级配置 | `unverified` | 不得生成具体 HAL、GPIO、DMA 或构建 API |
| OS/RTOS | 规则以 FreeRTOS/裸机为案例，具体版本仅属于 reference 证据 | `skills/impl/impl_os/SKILL.md:15-22`; `references/freertos-source-map.md:2-14` | `confirmed`（规则存在）；`unverified`（目标工程） | 只能调整契约，不能宣称目标 API 可编译 |
| Vendor | Vendor 闭包已推送；目标工程实际 `05_Vendor/` 源码不在插件仓库 | `skills/vendor/vendor_mcu/SKILL.md:10-12`; `skills/vendor/vendor_rtos/SKILL.md:10-18` | `confirmed` | Impl 只定义接入边界，不携带底座源码 |
| 测量条件 | 未提供目标串口、RTT、逻辑分析仪或 DWT 条件 | 当前仓库验证脚本与 Jest 仅支持静态/主机层 | `unverified` | 目标运行和实物验收暂阻塞 |

### 5.2 软件与工具链

| 项目 | 内容 | 证据 | 可信等级 | 影响 |
|---|---|---|---|---|
| 插件运行时 | Node.js/npm/Jest；脚本入口在 `package.json` | `package.json:scripts` | `confirmed` | 可执行插件结构、链接和主机测试 |
| 构建/质量 | `npm run validate:plugin`、`npm run validate:links`、`npm test`、`git diff --check` | 当前命令结果 | `confirmed` | 作为本轮静态/主机验收入口 |
| 固件构建 | 未确认目标工程构建命令和产物 | 当前仓库无目标工程 | `unverified` | 不得宣称交叉编译或固件验证 |

### 5.3 RTOS、实时性与资源

- Impl 规则要求声明任务栈、优先级、阻塞上限、队列/通知/锁、ISR/FromISR、DMA 缓冲区所有权、内存分配和线程安全；具体数值和 API 必须来自目标工程。`confirmed`
- 当前没有目标工程资源表、OSAL 头、FreeRTOSConfig、链接脚本或 Map 文件。`confirmed`
- 本轮不新增运行时任务、队列、锁、堆分配或硬件缓冲区。`inferred`

## 6. 分层与依赖约束

```text
App → Service → Platform 接口 ← Impl → Vendor
```

- Platform 只提供稳定能力接口、统一类型/错误码、对象协议和公共 Model；不得 include Impl、HAL、RTOS 或 Vendor。`confirmed`
- `impl_os` 将具体 RTOS/裸机 API 落到 `platform_os`；`impl_board` 负责板级组合和注册；`impl_bsp` 负责 Driver/Handle/Port 机制；`impl_middleware` 负责 Platform Middleware Adapter 与 Vendor Port。`confirmed`
- Impl 可以在受控后端边界使用 Vendor，但不得复制/修改 Vendor 源码，且 Vendor 原生类型不得泄漏到 Platform 公共头、Service 或 App。`confirmed`
- BSP Wrapper 仍属于 Platform，BSP Port 才能绑定 Driver/Handle/平台对象；不得把 APP Facade/Task Adapter 误标为 BSP Port。`confirmed`
- 资源所有权、初始化/释放顺序、阻塞属性、ISR 上下文、线程安全、可重入性和失败状态必须在具体目标工程证据可得后才能标记 `confirmed`。`confirmed`

## 7. 初步功能需求

| ID | 需求 | 优先级 | 输入/触发 | 输出/结果 | 错误与恢复 | 可信等级 |
|---|---|---|---|---|---|---|
| F-01 | 统一四类 Impl Skill 的职责、目录和交接边界 | 必须 | Vendor 基线和当前 Impl 规则 | 可审查的职责/依赖/文件契约 | 冲突时回到 Review Gate，不猜写 API | `inferred` |
| F-02 | 保留 Impl → Vendor 的受控接入并隔离原生类型 | 必须 | Vendor 内容契约 | Adapter/Port/OS/Board/BSP 规则一致 | 禁止复制 Vendor、绕过 Platform 或静默失败 | `confirmed` |
| F-03 | 为生成/审查规则补齐资源、并发、生命周期和验证边界 | 必须 | 目标工程证据或明确 unresolved 标记 | 可执行检查表和失败条件 | 缺证据时阻塞或输出预览标记 | `inferred` |
| F-04 | 不把插件静态/主机验证表述为目标板验证 | 必须 | 验收分级规则 | 分层测试记录 | 目标工程缺失则保持未验证 | `confirmed` |

## 8. 非功能约束

| 类别 | 约束 | 验收方式 | 可信等级 | 未决项 |
|---|---|---|---|---|
| 架构 | 依赖方向固定为 App → Service → Platform ← Impl → Vendor | 架构图/Skill 内容/插件校验 | `confirmed` | 是否需要新增 Impl canonical Skill |
| 可维护性 | 只修改 Impl 及必要引用，保留无关工作区变更 | Git staged path review | `user-confirmed`（协作约束） | 无 |
| 资源与并发 | 任何具体任务/锁/队列/DMA/内存策略必须有目标证据 | Review 清单和目标工程检查 | `confirmed` | 目标工程路径/版本 |
| 可验证性 | 区分静态、主机、构建、目标运行、实物证据 | 命令记录与验收表 | `confirmed` | 固件构建入口 |

## 9. 优先级、依赖与阻塞

| ID | 项目 | 类型 | 前置条件 | 状态 |
|---|---|---|---|---|
| D-01 | Vendor 基线已发布 | 必须 | `562c03c` 已推送 | closed |
| D-02 | 明确 Impl 第一版覆盖范围和非目标 | 阻塞 | 用户补证 | open |
| D-03 | 确认是否仅调整插件 Skill/契约，还是要同步某个目标固件工程 | 阻塞 | 用户补证 | open |
| D-04 | 确认目标工程构建/测试入口（若包含固件） | 阻塞 | 目标工程路径和工具链证据 | open |

## 10. 人工补证记录

| ID | 类别 | 问题 | 为什么需要 | 推荐 | 用户回答 | 可信等级 | 状态 |
|---|---|---|---|---|---|---|---|
| Q-01 | `scope` | 本轮 Impl 调整是否限定为当前插件仓库的 `skills/impl/**` 及必要路由/测试引用，不同步修改某个具体固件工程？ | 这决定 RCP 的项目根、文件施工清单、是否需要读取 MCU/板卡/OSAL/构建证据，以及后续实现 Skill 是规则/生成器调整还是固件落地。 | 推荐先限定为插件 Skill/契约调整；Vendor 已按此仓库完成发布，目标固件落地另开 RCP。 | `<待回答>` | `unverified` | `已提问` |

## 11. 验收标准与验证边界

| ID | 证据等级 | 验收项 | 命令/条件 | 预期结果 | 状态 |
|---|---|---|---|---|---|
| V-01 | 静态 | Impl/Vendor/Platform 路由无悬空引用，canonical ID 与目录一致 | `npm run validate:plugin`，cwd=`C:\\Users\\zhang\\Documents\\mcu-workbench` | 退出码 0 | pass（当前工作树） |
| V-02 | 静态 | Markdown 链接有效 | `npm run validate:links`，同上 | 退出码 0 | pass（当前工作树） |
| V-03 | 主机 | 架构图节点/边与 Vendor/Impl 边界测试通过 | `npm test -- --runInBand tests/software-architecture-graph.test.js`，同上 | 测试通过 | pass（当前工作树） |
| V-04 | 主机 | Impl 相关技能契约测试通过 | `npm test -- --runInBand tests/skills.test.js`，同上 | 全部相关断言通过 | blocked：当前 Workflow 文案与断言存在既有不一致 |
| V-05 | 构建 | 插件 Node 包构建/兼容产物可复现 | `npm run build` / `npm run build:codex-compat` | 退出码 0，记录产物 | not-run |
| V-06 | 目标运行/实物 | 目标固件构建、烧录、串口/RTT、波形 | 需目标工程路径、工具链和板卡 | 不适用或待补证 | blocked |

## 12. 目的质疑（初步）

- 需求描述的是“在 Vendor 发布后继续调整 Impl 层”的工程阶段，不是某一个具体运行时故障。`user-confirmed`
- 当前可确认的价值是统一插件对 Impl 的生成/审查边界，减少 Vendor 路径、Platform 依赖和资源契约不一致。`inferred`
- 若直接修改 Impl 规则而不先固定范围，可能把插件契约调整和具体固件移植混在一起，造成不可回滚的跨仓库施工。`inferred`
- 更小范围替代是先只修订 `skills/impl/**` 的职责/引用/验证契约，再另行进行目标固件落地。`inferred`
- 目的结论：`inferred`，等待 Q-01。

## 13. 可行性质疑（初步）

- 已确认：Vendor 发布提交存在；四类 Impl canonical Skill 存在；Platform/Impl/Vendor 依赖和 unresolved 标记规则存在。`confirmed`
- 风险：没有目标固件源码、OSAL 公共头、板级绑定、构建入口，无法确认任何具体 HAL/RTOS API、资源数量、引脚、DMA 或编译结果。`confirmed`
- 当前可行路径：先做插件 Skill/契约和主机验证；若用户要求同步固件，必须补充目标工程路径后重新建立 RCP 证据。`inferred`
- 可行性结论：`有条件可行`。

## 14. 质疑结论与交接判定

```text
purpose_conclusion: inferred
feasibility_conclusion: 有条件可行
scope_conclusion: 初步范围已列出，但是否限定插件仓库待 Q-01
acceptance_gaps: Impl 相关全量技能测试当前有 Workflow 断言不一致；无目标固件构建/运行证据
unresolved_risks: Q-01、目标工程边界、Impl 是否新增 canonical Skill、测试基线修复归属
required_review_gate_checks: 文件施工范围、Impl 四域职责、Platform/Impl/Vendor 依赖、生成边界、资源/并发/ISR/DMA 声明、测试与回滚
handoff_status: 阻塞（待 Q-01）
```

## 15. 下游交接

- 必经下游：`workflow-review-gate`（RCP 完成补证后）
- 集成规划：`workflow-integration-plan`（Review Gate 放行后）
- 实现 Skill：暂空；由集成计划只分发一个 canonical Impl Skill
- 必须遵守：只修改明确范围；保留用户其他工作区变更；不复制 Vendor 源码；不猜写目标 API；区分证据等级
- 禁止事项：直接进入代码阶段、修改目标工程 Vendor、把静态/主机测试描述为板上验证、跨层 include 或引入第二套 Adapter/Wrapper
- 交接状态：`待补证`

## 16. 当前下一步

- 当前唯一问题：请回答 Q-01：本轮是否只调整当前插件仓库的 `skills/impl/**` 及必要路由/测试引用，不同步修改具体固件工程？
- 当前唯一动作：等待用户确认范围后，由 Challenge 完成 RCP 澄清，再交 Review Gate。
- 阻塞项：Q-01；若包含固件，则还需目标工程绝对路径、MCU/板卡、OS/工具链和构建入口。
