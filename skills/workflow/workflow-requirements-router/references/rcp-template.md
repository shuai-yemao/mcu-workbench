# 需求约束包（RCP）模板

> 用途：将自然语言需求整理为可审计、可补证、可交接的 Requirement Constraint Package。
>
> 使用方式：复制本模板到目标项目的 `<project_root>/00_Docs/04_需求文档/`，替换所有 `<...>` 占位符。Router 和 Challenge 完成补证前，状态为 `preliminary`；补证和质疑结论完成后，才形成可交给 `workflow-review-gate` 的正式 RCP。本模板不包含方案选择字段。

## 1. 元数据

| 字段 | 内容 |
|---|---|
| request_id | `<REQ-...>` |
| 生成时间 | `<YYYY-MM-DDTHH:mm:ss+08:00>` |
| RCP 版本 | `<v0.1>` |
| RCP 状态 | `preliminary` / `challenged` / `blocked` |
| 工作流状态 | `分析中` / `待补证` / `可交接` / `阻塞` |
| 项目路径 | `<目标项目绝对路径>` |
| 分支/提交 | `<branch or commit>` |
| 目标交付物 | `<代码/文档/审查/构建产物等>` |

## 1.1 Spec 力度与风险

| 字段 | 内容 |
|---|---|
| `spec_rigor` | `prototype` / `lightweight` / `full` |
| `spec_overlays` | `[]` / `[human_review]` / `[versioned]` / `[human_review, versioned]` |
| 风险原因 | `<影响范围、敏感性、不可逆性、协作复杂度、验证难度、嵌入式资源风险及证据>` |
| 最低交付物 | `<提示词 / spec.md / spec.md + plan.md + task.md + 测试等>` |
| 用户闸门 | `H-01 rcp-review: awaiting_user_review / approved / rejected` |
| 执行模式 | `auto_until_final_check`（H-03 通过后生效） |
| 升级触发条件 | `<跨模块、公共接口、生产化、敏感数据、关键资源等>` |
| 审批要求 | `none` / `review-gate` / `human-review` |

## 2. Agent 分析

| Agent | 分析范围 | 结论 | 证据 | 阻塞项 |
|---|---|---|---|---|
| `embedded-lead` | `<协调与冲突汇总>` | `<结论>` | `<证据位置>` | `<none or blocker>` |
| `<specialist-agent>` | `<领域>` | `<结论>` | `<证据位置>` | `<none or blocker>` |

每个 Agent 的交接摘要必须包含：`Summary`、`Evidence`、`Changed files`、`Tests`、`Artifacts`、`Blockers`、`Next handoff`。

## 3. 可信等级约定

每条事实、约束、方案依据和验收结论必须标记一个可信等级：

| 等级 | 含义 |
|---|---|
| `confirmed` | 已由项目文件、配置、日志或可复现命令确认 |
| `user-confirmed` | 用户明确回答或选择确认 |
| `inferred` | 根据已有证据推断，尚未直接确认 |
| `unverified` | 尚未验证，不能作为实现前提 |

`inferred` 和 `unverified` 不得伪装为已确认事实。影响施工范围或验收的此类项必须进入补证问题和阻塞项。

## 4. 项目背景与目标

- 当前问题：`<问题现象，不写预设实现>`
- 受影响对象：`<用户/任务/模块/硬件场景>`
- 工程影响：`<风险、成本、故障或验收损失>`
- 目标：`<希望解决的问题>`
- 成功标准：`<可观察、可测量、可复现的结果>`
- 目标交付物：`<交付物>`
- 直接范围：`<必须覆盖>`
- 明确不包含：`<明确排除>`

## 5. 工程环境与约束

### 5.1 硬件资源

| 项目 | 内容 | 证据 | 可信等级 | 影响 |
|---|---|---|---|---|
| MCU | `<型号/系列>` | `<relative/path:line or user answer>` | `<level>` | `<scope>` |
| 板卡 | `<板卡/版本>` | `<evidence>` | `<level>` | `<scope>` |
| Flash/RAM | `<容量与布局>` | `<evidence>` | `<level>` | `<scope>` |
| 时钟/供电 | `<约束>` | `<evidence>` | `<level>` | `<scope>` |
| 引脚/复用 | `<资源>` | `<evidence>` | `<level>` | `<scope>` |
| 总线/外设 | `<资源>` | `<evidence>` | `<level>` | `<scope>` |
| 测量条件 | `<串口/RTT/逻辑分析仪等>` | `<evidence>` | `<level>` | `<scope>` |

### 5.2 软件与工具链

| 项目 | 内容 | 证据 | 可信等级 | 影响 |
|---|---|---|---|---|
| OS/RTOS | `<名称与版本>` | `<evidence>` | `<level>` | `<scope>` |
| 编译器/SDK/HAL | `<名称与版本>` | `<evidence>` | `<level>` | `<scope>` |
| 构建系统 | `<命令/预设/工程文件>` | `<evidence>` | `<level>` | `<scope>` |
| 烧录/调试 | `<工具与配置>` | `<evidence>` | `<level>` | `<scope>` |
| 观测通道 | `<UART/RTT/SystemView等>` | `<evidence>` | `<level>` | `<scope>` |

### 5.3 RTOS、实时性与资源

- 任务与优先级：`<约束>`
- 任务栈：`<约束>`
- 周期与最大响应时间：`<约束>`
- 队列/通知/信号量/互斥量：`<约束>`
- ISR 边界：`<允许与禁止>`
- DMA 与缓冲区所有权：`<约束>`
- 内存分配策略：`<静态/池/堆及限制>`
- 并发与线程安全：`<约束>`

## 6. 分层与依赖约束

```text
App → Service → Platform ← Impl → Vendor
```

- App 归属：`<职责与允许依赖>`
- Service 归属：`<职责与允许依赖>`
- Platform 归属：`<能力接口、类型、错误码、对象协议>`
- Impl 归属：`<OS/BSP/MCU/Board/Driver/Handler 等具体角色>`
- Vendor 归属：`<HAL/SDK/第三方底座>`
- 允许依赖：`<依赖方向>`
- 禁止依赖：`<越层调用、原生类型泄漏等>`
- Wrapper/Port 边界：`<适用时填写>`
- 状态与资源所有权：`<创建者、使用者、释放者、生命周期>`

## 7. 功能需求

| ID | 需求 | 优先级 | 输入/触发 | 输出/结果 | 错误与恢复 | 可信等级 | 证据 |
|---|---|---|---|---|---|---|---|
| F-01 | `<需求>` | `必须/应该/可以` | `<condition>` | `<observable result>` | `<retry/degrade/report>` | `<level>` | `<evidence>` |

## 8. 非功能约束

| 类别 | 约束 | 验收方式 | 可信等级 | 未决项 |
|---|---|---|---|---|
| 实时性 | `<上限/周期>` | `<test>` | `<level>` | `<question or none>` |
| 资源 | `<CPU/RAM/Flash/栈>` | `<map/runtime check>` | `<level>` | `<question or none>` |
| 可靠性 | `<故障恢复/重试/降级>` | `<test>` | `<level>` | `<question or none>` |
| 功耗 | `<约束>` | `<measurement>` | `<level>` | `<question or none>` |
| 可观测性 | `<日志/指标/故障码>` | `<test>` | `<level>` | `<question or none>` |
| 安全/兼容性 | `<约束>` | `<test>` | `<level>` | `<question or none>` |

## 9. 优先级、依赖与阻塞

| ID | 项目 | 类型 | 前置条件 | 外部依赖 | 并行关系 | 状态 |
|---|---|---|---|---|---|---|
| D-01 | `<item>` | `必须/应该/可以/阻塞` | `<condition>` | `<dependency>` | `<parallel or serial>` | `<open/closed>` |

## 10. 人工补证记录

Challenge 阶段先读取仓库规则和项目证据，再按范围/非目标、业务规则、状态/权限、验收标准四类缺口进行分轮澄清。每轮最多提出 4 个真正影响实现的问题；每个问题必须给出推荐、说明影响，并在回答后回填本节和对应约束域。

| ID | 类别 | 问题 | 为什么需要 | 推荐 | 用户回答 | 可信等级 | 回填字段 | 状态 |
|---|---|---|---|---|---|---|---|---|
| Q-01 | `scope/business-rule/state-permission/acceptance` | `<question>` | `<scope/acceptance impact>` | `<recommended answer or stance>` | `<answer>` | `user-confirmed` | `<RCP field>` | `待提问/已提问/已回答/已回填` |

## 11. 验收标准与验证边界

| ID | 证据等级 | 验收项 | 命令/条件 | 预期结果 | 责任 Agent | 状态 | 产物/阻塞 |
|---|---|---|---|---|---|---|---|
| V-01 | `静态/主机/构建/目标运行/实物` | `<criterion>` | `<absolute cwd + command or hardware condition>` | `<pass condition>` | `<agent>` | `<not-run/pass/fail/blocked>` | `<artifact or blocker>` |

静态、主机、构建、目标运行和实物证据必须分开记录，较低等级证据不能替代较高等级结论。

## 12. 目的质疑

- 需求描述的是问题还是预设手段：`<结论>`
- 真实问题与价值：`<结论>`
- 不实施的风险：`<结论>`
- 成功标准是否可测量：`<结论>`
- 更小范围替代方案：`<结论>`
- 目的结论：`<confirmed/user-confirmed/inferred/unverified>`

## 13. 可行性质疑

- 已确认前提：`<facts>`
- 架构与依赖风险：`<risks>`
- 硬件/OS/工具链风险：`<risks>`
- 资源、并发、ISR、DMA 风险：`<risks>`
- 验收缺口：`<gaps>`
- 可行性结论：`<可行/有条件可行/阻塞>`

## 14. 质疑结论与交接判定

Challenge 只输出基于证据的目的、可行性、范围和验收结论，不生成方案 A/B、不提供方案推荐、不要求用户选择。

H-01 通过后才能进入正式 Review Gate；H-02 Spec 审查和 H-03 Plan/方案选择通过后，Task 生成、任务执行、AI 审查、测试和最终检查自动连续推进。只有需要新增用户决策的硬阻塞才暂停。

```text
purpose_conclusion: confirmed | user-confirmed | inferred | unverified
feasibility_conclusion: 可行 | 有条件可行 | 阻塞
scope_conclusion: <第一版范围与非目标是否清晰>
acceptance_gaps: <尚不能验证的验收项>
unresolved_risks: <未关闭风险>
required_review_gate_checks: <交给 Review Gate 的审查重点>
handoff_status: 可交接 | 阻塞
```

## 15. 下游交接

- 必经下游：`workflow-review-gate`
- 集成规划：`workflow-integration-plan`
- 实现 Skill：`<由 workflow-integration-plan 分发；RCP 完成前为空>`
- 输入证据：`<absolute paths, commands, logs>`
- 必须遵守：`<constraints>`
- 禁止事项：`<forbidden changes/calls>`
- 输出要求：`<artifacts>`
- 验收要求：`<verification levels>`
- 交接状态：`<待补证/可交接/阻塞>`

## 16. 当前下一步

- 当前唯一问题：`<one question or none>`
- 当前唯一动作：`<补证/交给 Review Gate>`
- 阻塞项：`<none or blockers>`
