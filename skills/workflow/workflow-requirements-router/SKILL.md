---
name: workflow-requirements-router
description: 作为插件首个需求处理入口，编排 Agent 分析、补齐项目约束并生成可审计的需求约束包，固定交接给 workflow-requirements-challenge 进行 RCP 澄清、目的与可行性质疑，再交给 workflow-review-gate（必经审查门禁），放行后由 workflow-integration-plan 规划与分发。
---

# 嵌入式需求约束路由

## 职责与边界

`workflow-requirements-router` 是插件处理用户请求的第一个 Skill。它负责把自然语言请求变成可执行、可追溯、可交接的需求约束包；不在本 Skill 内进行架构设计、代码生成、驱动实现、构建、烧录或代码审查。

以下职责必须分流，不可由需求约束 Router 代办：

- RCP 澄清、需求目的与可行性质疑：`workflow-requirements-challenge`；代码前审查与门禁判定：`workflow-review-gate`；放行后的跨层审计、分层设计、迁移顺序、文件级改造顺序与分发：`workflow-integration-plan`。
- 最终代码/变更集的独立 Review 编排（输出前最后一层门禁）：`workflow-final-review`。
- 风格规则、静态质量门禁和质量检查工具来源：`tools-quality`。

## 阶段一：分配 Agent 分析需求

先由 `embedded-lead` 作为协调 Agent 建立分析任务；根据请求中已暴露的领域和缺失证据，分配一个或多个专用 Agent：

| 需求信号 | 分析 Agent | 需要回答的问题 |
|---|---|---|
| 分层、接口、模块依赖、迁移影响 | `system-architect` | App → Service → Platform ← Impl → Vendor 的边界和调用关系是什么？必要时再核对 Impl 内的 OS/BSP/MCU/Driver/Handler/Port 角色。 |
| 芯片、板卡、引脚、供电、外设连接 | `hardware-integration` | MCU/板级资源、引脚复用、电气和测量条件是否满足？ |
| C/固件、Driver、Handler、任务实现 | `firmware-engineer` | 现有代码入口、数据流、并发访问和可修改范围是什么？ |
| 编译器、构建、烧录、调试、观测 | `toolchain-engineer` | 构建命令、工具链、目标配置和可复现验证入口是什么？ |
| 测试、质量门禁、回归和验收 | `verification-engineer` | 哪些条件可自动验证，哪些必须目标板或人工确认？ |
| 需求记录、决策和交接文档 | `knowledge-engineer` | 如何把已确认事实、未决项和决策写入稳定产物？ |

分配规则：

1. 单层、证据完整且验收单一的请求，可由 `embedded-lead` 加一个最相关 Agent 分析。
2. 同时涉及硬件、RTOS/固件和分层的请求，至少并行分配 `system-architect`、`hardware-integration` 和 `firmware-engineer`；需要构建或验收时再加入对应 Agent。
3. 每个 Agent 只分析自己的领域，不替其他 Agent 猜测缺失事实；`embedded-lead` 汇总冲突和证据，不直接抹平冲突。
4. Agent 分析阶段只读项目文件和配置，不修改业务代码；输出必须包含 Summary、Evidence、Changed files、Tests、Artifacts、Blockers、Next handoff。

## 阶段二：项目与约束补证

先读取真实项目树、构建配置、启动文件、现有日志和架构笔记，再向用户补问无法从项目中确认的内容。必须建立以下约束域：

1. 项目背景：项目路径、分支/提交、芯片、板卡、当前问题和目标交付物；
2. 硬件资源：MCU、时钟、Flash/RAM、引脚复用、总线、外设、供电、传感器/执行器和可用测量点；
3. 软件环境：OS/FreeRTOS 版本、编译器、SDK/HAL、构建系统、依赖库、烧录/调试/观测工具；
4. FreeRTOS 约束：任务优先级、栈、周期、队列长度/消息大小、互斥量、通知、ISR 边界和实时性要求；
5. 分层架构约束：App、Service、Platform、Impl、Vendor 的归属、允许依赖、Wrapper/Port 与 Driver/Handle 的内部边界和禁止跨层调用；
6. 功能需求：触发、输入、输出、时序、错误处理、重试、回调和状态保持；
7. 非功能约束：实时性、资源、可靠性、功耗、可维护性、安全、兼容性和可观测性；
8. 优先级与依赖关系：必须/应该/可以、前置条件、外部依赖、并行关系和阻塞项；
9. 验收标准：静态、主机测试、交叉构建、目标运行、串口/RTT 和实物证据分别如何判定；
10. 人工确认项：任何无法由文件或工具证明、且会改变实现或验收的选择。

证据优先级为：项目文件/配置与可复现命令 > Agent 读取结果 > 用户明确回答 > 推测。缺少关键事实时，必须通过**交互提问**一次只提出当前最影响路由或验收的问题——提问是补证动作，不得降级为文档字段；用户回答后回填约束包对应约束域并标记 `user-confirmed`，将人工确认项状态置为 `已回填` 后方可交接。不得猜测 HAL、RTOS、板级接口或把静态证据写成硬件结论。

## 阶段三：生成需求约束包

需求约束包（Requirement Constraint Package，RCP）先交给 `workflow-requirements-challenge` 完成补证、目的质疑和可行性质疑；完成后，带有质疑结论和证据的更新 RCP 才是交给 `workflow-review-gate` 的唯一正式输入。方案选择不属于本 Skill 链路。RCP 必须区分 `confirmed`、`user-confirmed`、`inferred` 和 `unverified`，并包含证据位置。

RCP 的 Markdown 字段骨架使用 [`references/rcp-template.md`](references/rcp-template.md)。Router 交付的是 `preliminary` RCP；`workflow-requirements-challenge` 必须先读取仓库规则和项目证据，按第一版范围/非目标、业务规则、状态/权限、可验证验收四类缺口进行澄清，每轮最多提出四个高影响问题并给出推荐，完成后输出质疑结论并交给 `workflow-review-gate`，不生成方案 A/B。

```text
需求约束包
├─ 元数据：request_id、生成时间、项目路径、分支/提交、状态
├─ Agent 分析：协调 Agent、参与 Agent、各自结论、冲突与阻塞
├─ 项目背景：芯片/板卡/目标、现状、目标交付物
├─ 硬件资源：MCU、存储、引脚、总线、外设、供电、测量条件
├─ 软件环境：OS/FreeRTOS、编译器、SDK/HAL、构建和调试工具
├─ RTOS 约束：任务、优先级、栈、周期、队列、同步、ISR、实时性
├─ 分层约束：层归属、允许依赖、Wrapper/Port、禁止调用
├─ 功能需求：输入、触发、处理、输出、时序、错误和状态
├─ 非功能约束：资源、实时性、功耗、可靠性、安全、兼容性、可观测性
├─ 优先级与依赖：优先级、前置条件、外部依赖、并行关系、阻塞项
├─ 验收标准：静态、主机、构建、目标、实物证据及判定条件
├─ 人工确认：问题、影响、候选项、当前答案、状态（待提问/已提问/已回答/已回填）、截止时机
├─ 质疑结论：目的质疑、可行性质疑、范围结论、验收缺口和未决风险
└─ 下游提示词：目标 Skill、范围、输入证据、必须遵守、禁止事项、输出和验收
```

下游提示词必须明确：`workflow-requirements-challenge` 只能在 RCP 的范围和证据内澄清、质疑，不得生成代码或方案选择；RCP 完成补证和质疑结论后交给 `workflow-review-gate`。`workflow-review-gate` 只能在 RCP 范围和证据内工作；若发现新约束，先回传 Router 更新 RCP，不得静默扩大范围。审查放行后由 workflow-integration-plan 完成分层/审计/迁移设计与分发。

## 必经交接与分发

1. 所有请求的 RCP 一律先交接给 `workflow-requirements-challenge`；RCP 完成补证和质疑结论后，再交给 `workflow-review-gate`（必经审查门禁）。Router 不直接交接实现层 Skill；审查放行后由 `workflow-integration-plan` 完成分层/审计/迁移设计。
2. `workflow-integration-plan` 在审查放行后生成阶段级 Agent/Skill 基线，`workflow-task-breakdown` 再生成任务级分配；`workflow-task-execution` 按当前任务复核一个主实现 Skill 和必要辅助 Skill。Router 不提前替下游决定任务级分配。
3. 最终代码/变更集的独立 Review 编排由 `workflow-integration-plan` 交接给 `workflow-final-review`；风格规则、静态质量门禁和质量检查工具来源是 `tools-quality`。
4. 路由结论与验证结论分离：Router 只声明需要何种验证，不宣称验证已通过。

| 请求事实 | 实现层 Skill（由 workflow-integration-plan 分发） |
|---|---|
| APP 启动、Task、Manager、UI 结构 | `app-architecture` |
| OSAL、任务、队列、同步原语接口 | `platform_os` |
| FreeRTOS/裸机运行时、调度和 Port | `impl_os` |
| BSP 抽象表、注册和平台无关转发 | `platform_bsp` |
| 外设实例绑定、平台对象和注册 | `impl_board` |
| 器件协议、寄存器序列和 HAL Driver | `impl_bsp` |
| 多实例、缓存、重试、回调和工作循环 | `impl_bsp`（Handler 机制子层） |
| CMSIS、寄存器、总线或 MCU 外设能力 | `platform_mcu` |
| STM32、AT32、ESP32 HAL、ESP-IDF 或厂商 SDK | `vendor_mcu` |
| LVGL | `middleware-lvgl` |
| MQTT、BLE、CAN、USB 或网络协议 | `middleware-communication` |
| Flash、文件系统、KV 或存储中间件 | `middleware-storage` |
| DSP、FFT 或通用算法中间件 | `middleware-algorithms` |
| Bootloader、低功耗、看门狗或密码系统 | `software-system` |
| 构建、链接、烧录、调试或观测 | 对应 `tools-*` Skill |
| 学习、源码讲解或经用户授权的笔记 | `tools-learning-tutor` |

上表仅声明实现层 Skill 的领域分发依据。阶段级和任务级 Agent/Skill 分配由 `workflow-integration-plan`、`workflow-task-breakdown` 和 `workflow-task-execution` 依据真实项目证据完成；辅助 Skill 不改变主实现职责，也不得并行修改同一任务代码。

## 路由单（固定输出）

每次分诊都输出以下字段：

```text
状态：分析中 | 待用户确认 | 待补证 | 可交接 | 阻塞
必经下游：workflow-review-gate
实现 Skill：<由 workflow-integration-plan 分发的唯一 canonical ID；未完成 RCP 时为空>
参与 Agent：<embedded-lead + 一个或多个专用 Agent>
需求约束包：<完整包或稳定产物绝对路径；RCP 完成前标记为 preliminary>
质疑交接：<workflow-requirements-challenge；完成补证和质疑结论后交 workflow-review-gate>
已读证据：<绝对路径、命令或日志位置>
责任边界：<workflow-review-gate 负责审查与门禁，workflow-integration-plan 负责分层/审计/迁移与分发；明确不负责什么>
交接契约：<每个交接的输入、输出、资源所有权>
验证边界：<需要的静态/主机/构建/目标/实物证据；当前尚未通过的项>
下一步：<补证问题，或 workflow-review-gate 执行的一项最小动作>
```

## 硬约束

- Adapter 只存在于 OS 和 BSP，且由 Wrapper 与 Port 组成；Core、Middleware、Driver 不创建 Adapter。
- BSP Wrapper 是平台无关的函数表注册与转发层；BSP Port 才可绑定具体 Driver、Handler 和平台对象。
- 不使用 Router 实现具体 HAL、器件协议、RTOS、UI 或业务代码。
- RCP 固定先交接给 workflow-requirements-challenge；完成补证和质疑结论后才交给 workflow-review-gate（必经审查门禁），不直接交接实现层 Skill。
- 质疑阶段只输出证据化的目的、可行性、范围和验收结论，不生成方案 A/B、不要求用户选择，不得用推测扩大 RCP。
- 不引用归档 Skill 作为 active 路由目标；只输出 catalog 中的 canonical ID。
- 需求约束包不等同于实现方案；未确认项不得伪装为约束。

跨层边界和源码证据见 [`workflow-review-gate`](../workflow-review-gate/SKILL.md) 及其 [`software-architecture-knowledge-graph.md`](../workflow-review-gate/references/software-architecture-knowledge-graph.md)；分层审计、迁移设计与分发见 [`workflow-integration-plan`](../workflow-integration-plan/SKILL.md)。
