---
name: workflow-requirements-router
description: 作为插件首个需求处理入口，编排 Agent 分析、补齐项目约束并生成可审计的需求约束包，交给下游 Skill。
---

# 嵌入式需求约束路由

## 职责与边界

`workflow-requirements-router` 是插件处理用户请求的第一个 Skill。它负责把自然语言请求变成可执行、可追溯、可交接的需求约束包；不在本 Skill 内进行架构设计、代码生成、驱动实现、构建、烧录或代码审查。

以下职责必须分流，不可由需求约束 Router 代办：

- 跨层审计、分层设计、迁移顺序和验收路线：`workflow-project-integration`。
- 最终代码/变更集的独立 Review 编排：`workflow-ai-collab`。
- 风格规则、静态质量门禁和质量检查工具来源：`tools-quality`。

## 阶段一：分配 Agent 分析需求

先由 `embedded-lead` 作为协调 Agent 建立分析任务；根据请求中已暴露的领域和缺失证据，分配一个或多个专用 Agent：

| 需求信号 | 分析 Agent | 需要回答的问题 |
|---|---|---|
| 分层、接口、模块依赖、迁移影响 | `system-architect` | APP → Middleware → OS → BSP → Core → Driver 的边界和调用关系是什么？ |
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
5. 分层架构约束：APP、Middleware、OS、BSP、Core、Driver 的归属、允许依赖、Wrapper/Port 边界和禁止跨层调用；
6. 功能需求：触发、输入、输出、时序、错误处理、重试、回调和状态保持；
7. 非功能约束：实时性、资源、可靠性、功耗、可维护性、安全、兼容性和可观测性；
8. 优先级与依赖关系：必须/应该/可以、前置条件、外部依赖、并行关系和阻塞项；
9. 验收标准：静态、主机测试、交叉构建、目标运行、串口/RTT 和实物证据分别如何判定；
10. 人工确认项：任何无法由文件或工具证明、且会改变实现或验收的选择。

证据优先级为：项目文件/配置与可复现命令 > Agent 读取结果 > 用户明确回答 > 推测。缺少关键事实时，一次只提出当前最影响路由或验收的问题，并将等待状态写入约束包；不得猜测 HAL、RTOS、板级接口或把静态证据写成硬件结论。

## 阶段三：生成需求约束包

需求约束包（Requirement Constraint Package，RCP）是交给下一个 Skill 的唯一正式输入。它必须区分 `confirmed`、`user-confirmed`、`inferred` 和 `unverified`，并包含证据位置。

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
├─ 人工确认：问题、影响、候选项、当前答案、截止时机
└─ 下游提示词：目标 Skill、范围、输入证据、必须遵守、禁止事项、输出和验收
```

下游提示词必须明确：主 Skill 只能在 RCP 的范围和证据内工作；若发现新约束，先回传 Router 更新 RCP，不得静默扩大范围。

## 主 Skill 选择与交接

1. 跨层规划、工程审计、迁移顺序和验收路线：主 Skill 为 `workflow-project-integration`。
2. 最终代码/变更集的独立 Review 编排：主 Skill 为 `workflow-ai-collab`。
3. 风格规则、静态质量门禁和质量检查工具来源：主 Skill 为 `tools-quality`。
4. 其他请求按下表选择直接责任 Skill；仅在 RCP 中存在明确输入依赖时追加交接。
5. 路由结论与验证结论分离：Router 只声明需要何种验证，不宣称验证已通过。

| 请求事实 | 主 Skill | 可选直接交接 |
|---|---|---|
| APP 启动、Task、Manager、UI 结构 | `app-architecture` | `os-adapter`、`middleware-lvgl` |
| OSAL、任务、队列、同步原语接口 | `os-adapter` | `os-runtime` |
| FreeRTOS/裸机运行时、调度和 Port | `os-runtime` | `os-adapter` |
| BSP 抽象表、注册和平台无关转发 | `bsp-wrapper` | `bsp-port` |
| 外设实例绑定、平台对象和注册 | `bsp-port` | `bsp-wrapper`、`bsp-hal-driver` |
| 器件协议、寄存器序列和 HAL Driver | `bsp-hal-driver` | `core-mcu`、`mcu-platform` |
| 多实例、缓存、重试、回调和工作循环 | `bsp-handler` | `bsp-port`、`os-adapter` |
| CMSIS、寄存器、总线或 MCU 外设能力 | `core-mcu` | `mcu-platform`、`tools-build` |
| STM32 HAL、ESP-IDF 或厂商 SDK | `mcu-platform` | `core-mcu`、`tools-build` |
| LVGL | `middleware-lvgl` | `bsp-port`、`os-adapter` |
| MQTT、BLE、CAN、USB 或网络协议 | `middleware-communication` | `bsp-port` |
| Flash、文件系统、KV 或存储中间件 | `middleware-storage` | `bsp-port` |
| DSP、FFT 或通用算法中间件 | `middleware-algorithms` | `core-mcu` |
| Bootloader、低功耗、看门狗或密码系统 | `software-system` | `tools-release`、`mcu-platform` |
| 构建、链接、烧录、调试或观测 | 对应 `tools-*` Skill | 仅列出直接工具依赖 |
| 学习、源码讲解或经用户授权的笔记 | `tools-learning-tutor` | 对应层 Skill |

## 路由单（固定输出）

每次分诊都输出以下字段：

```text
状态：分析中 | 待用户确认 | 可交接 | 阻塞
主 Skill：<唯一 canonical ID；未完成 RCP 时为空>
交接 Skill：<0 至 2 个 canonical ID>
参与 Agent：<embedded-lead + 一个或多个专用 Agent>
需求约束包：<完整包或稳定产物绝对路径>
已读证据：<绝对路径、命令或日志位置>
责任边界：<主 Skill 负责什么；明确不负责什么>
交接契约：<每个交接的输入、输出、资源所有权>
验证边界：<需要的静态/主机/构建/目标/实物证据；当前尚未通过的项>
下一步：<补证问题，或下游 Skill 执行的一项最小动作>
```

## 硬约束

- Adapter 只存在于 OS 和 BSP，且由 Wrapper 与 Port 组成；Core、Middleware、Driver 不创建 Adapter。
- BSP Wrapper 是平台无关的函数表注册与转发层；BSP Port 才可绑定具体 Driver、Handler 和平台对象。
- 不使用 Router 实现具体 HAL、器件协议、RTOS、UI 或业务代码。
- 不引用归档 Skill 作为 active 路由目标；只输出 catalog 中的 canonical ID。
- 需求约束包不等同于实现方案；未确认项不得伪装为约束。

跨层边界和源码证据见 [`workflow-project-integration`](../workflow-project-integration/SKILL.md) 及其 [`software-architecture-knowledge-graph.md`](../workflow-project-integration/references/software-architecture-knowledge-graph.md)。
