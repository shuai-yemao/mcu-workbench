---
name: workflow-integration-plan
description: 放行后的集成规划与分发：读取按风险放行的 spec.md 和真实项目文件；full 请求生成两个易懂方案供用户选择，lightweight 请求生成一个紧凑方案，审查后生成 plan.md，再交给 workflow-task-breakdown 生成 task.md，由 workflow-task-execution 按依赖逐项执行后进入唯一实现层 Skill。
---

# 集成规划与分发

## 适用范围

本 Skill 是 `workflow-review-gate` 审查放行后的规划者：消费按风险放行的 `spec.md`（需求与约束正式输入）、`Review-Package` 审计证据以及真实项目文件、配置、构建日志和现有运行记录。它根据 `spec_rigor` 选择规划力度：`prototype` 不进入本 Skill；`lightweight` 生成一个紧凑、单局部目标的方案，不强制方案 A/B 选择；`full` 生成两个面向用户、易于比较的实施方案并等待选择。方案审查通过后生成 `plan.md`，交给 `workflow-task-breakdown` 拆解为 `task.md`，再交给 `workflow-task-execution` 按依赖顺序逐项执行，最终进入一个实现层 Skill。代码产物就绪后，把适用的 Spec、`plan.md`、`task.md`、逐项执行记录、最终代码/变更集与验收清单交接给 `workflow-final-review`。本 Skill 不生成实现代码；门禁状态非放行不得继续。

## 工作流

1. 确认 Review Gate 已放行，且读取 `spec.md`（`lightweight`/`full`）及 RCP 中的 `spec_rigor`、`spec_overlays`、风险原因和最低交付物；`prototype` 在此停止，不分发代码施工。存在 `inferred`/`unverified` 关键事实或未关闭阻塞项时停止，回传 `workflow-review-gate`。
2. 读取 `spec.md` 中的范围、约束、文件施工清单和验收清单，再读取真实项目文件、配置、构建日志、启动流程和现有笔记，记录可复现证据。
3. 画出调用链，确认上层只依赖下层公开契约，识别 APP、Middleware、OS、BSP、Core、Driver 归属。
4. 按力度生成方案：`lightweight` 只生成一个紧凑方案，说明局部范围、文件、验收、风险和回滚；`full` 基于同一目标和同一 `spec.md` 约束生成两个真实可行、取舍明确的实施方案，然后暂停等待用户选择。此处是 H-03 用户审查闸门。任何模式都不能超出 Spec。
5. `lightweight` 记录默认方案依据后进入 H-03 计划审查；`full` 在用户选择后记录选择理由和放弃方案。随后对方案执行分层、接口、文件范围、资源并发、生成边界和验收路径审查；发现事实缺口或越出 `spec.md` 时阻塞并回传对应 Skill。
6. 审查通过后，按 [`plan-template.md`](references/plan-template.md) 生成 `<project_root>/00_Docs/04_需求文档/plan.md`，将 `spec.md` 作为需求约束来源，将 `plan.md` 作为实施顺序、阶段级 Agent/Skill 基线和交接依据。
7. 将 `spec.md` 和已审查通过的 `plan.md` 交给 `workflow-task-breakdown` 自动生成有序、可独立验证的 `task.md`；不再等待用户审查 `task.md`。
8. 将 `task.md` 交给 `workflow-task-execution`，采用 `auto_until_final_check`：每项任务先测试/检查、再实现、再 AI 审查和验证，通过后自动进入下一个依赖任务。只有硬阻塞或需求变化才暂停。
9. 全部任务完成且代码产物就绪后，自动交给 `workflow-final-review`；最终格式、注释、质量、差异和验收检查完成后再通知用户。需要格式或必要注释整改时，遵循最终的格式与必要注释整改闭环。通知不等于提交、推送、烧录或发布授权。

## 需求变化门禁

如果用户在方案或施工阶段改变需求，或项目新事实改变 `spec.md` 的范围、业务规则、权限/状态、接口、资源边界或验收标准，立即停止方案和代码推进，回传 `workflow-review-gate` 更新 RCP、Review-Package 和 `spec.md`。最新 Spec 未重新放行前，不得更新 `plan.md`、`task.md` 或分发实现 Skill。

如果变化只涉及同一 Spec 内的实现细节，才可以在方案审查范围内修订 `plan.md`；如果变化影响用户目标、层归属、文件范围或验收标准，必须先更新并重新放行 Spec。

方案必须显式映射 [SOLID 代码施工硬门禁](../workflow-review-gate/references/solid-code-gate.md)：说明每个
方案如何满足 SRP、OCP、LSP、ISP、DIP，列出可验证证据和无法满足时的阻塞条件。若方案
依赖违反某项原则才能成立，不得将其作为可选方案继续分发。

`prototype` 不生成 `plan.md`；`lightweight` 在审查通过后可生成一个紧凑 `plan.md`，不生成方案 A/B，也不要求用户选择；`full` 在用户选择前只输出两个方案的比较结果，不生成正式 `plan.md`，不分发实现层 Skill。若用户要求重新设计，保留原方案和原因，重新生成一轮方案；`full` 连续无法形成两个真实可行方案时，状态为 `阻塞` 并回传 `workflow-review-gate` 补证。

### 方案输出要求

两个方案必须服务于同一个 `spec.md` 目标，区别只能来自有意识的工程取舍，例如改动范围、迁移风险、运行时成本、兼容性、验证成本或回滚难度。不得把“做/不做”、明显不可行方案或同一方案的文字改写伪装成两个方案。

每个方案必须用易懂语言说明：

- 一句话概括和适用场景；
- 要解决的问题和不解决的内容；
- 预计修改的层、目录和文件类型；
- 调用链、接口和资源生命周期影响；
- FreeRTOS/并发/ISR/DMA/内存影响；
- 验收路径和所需证据等级；
- 优点、缺点、风险、成本、回滚方式；
- 尚未确认的事实和选择后需要重点审查的内容。

随后输出一张对比表，至少包含：理解成本、改动范围、实现复杂度、运行时资源、架构风险、可验证性、回滚难度、后续扩展性和推荐适用场景。可以指出倾向，但不得替用户做选择。

`full` 方案输出末尾只提出一个问题：请选择 `方案 A`、`方案 B`，或要求重新生成方案。`lightweight` 不提出方案选择问题，而是在审查结论中说明采用紧凑方案的依据。

## 固定输出

### 阶段一：方案比较与用户选择

```text
状态：待用户选择 | 阻塞
输入 spec.md：<absolute path>
已读项目证据：<absolute paths, commands, logs>
共同目标：<plain-language goal>

方案 A：<做什么、改哪里、优点、缺点、成本、风险、验收、回滚>
方案 B：<做什么、改哪里、优点、缺点、成本、风险、验收、回滚>
方案对比：<table>
倾向性建议：<依据；不得替用户选择>
下一步：<请选择方案 A/B，或要求重新生成>
```

### 阶段二：选定方案审查

```text
状态：审查中 | 需修订 | 阻塞 | 通过
选定方案：<A or B>
用户理由：<reason>
审查 Agent：<agents>
审查结论：<可采用/需修订/阻塞及证据>
是否改变 spec.md：<否 / 是，已回传 Review Gate>
下一步：<生成 plan.md / 回传补证或修订>
```

### 阶段三：plan.md 交接

```text
状态：approved | blocked
plan.md：<absolute path>
spec.md：<absolute path>
下一步：<交给 workflow-task-breakdown / 回传 workflow-review-gate>
```

### 阶段四：task.md 交接

```text
状态：可交付 | 阻塞
task.md：<absolute path>
来源 plan.md：<absolute path>
来源 spec.md：<absolute path>
任务总数：<number>
关键串行链：<task IDs>
可并行组：<groups or none>
阶段级 Agent/Skill 基线：<plan.md 第 8A 节>
唯一主实现 Skill：<canonical skill id>
下一步：<自动交给 workflow-task-execution 或回传 workflow-integration-plan>
```

### 选定方案审查

用户选择后，`embedded-lead` 汇总以下审查：

- `system-architect`：分层边界、调用链、接口和迁移影响；
- `firmware-engineer`：真实代码入口、文件范围、数据流、并发和生命周期；
- `verification-engineer`：验收条件、测试顺序和证据等级；
- 涉及硬件时加入 `hardware-integration`；涉及构建、工具链或观测时加入 `toolchain-engineer`。

审查结果逐项标记为 `可采用`、`需修订` 或 `阻塞`，保留文件/配置/命令证据。只有不存在未关闭阻塞项、且修订不改变用户已选目标和 `spec.md` 范围时，才能生成 `plan.md`。如果修订会扩大范围、改变层归属、增加新的硬件/OS 前提或改变验收标准，必须回传 `workflow-review-gate` 更新 `spec.md`，不得在本 Skill 内静默改写。

## 分层审计与迁移设计

按 App → Service → Platform → Impl → Vendor 审计，核对调用链与公开契约；必要时把 OS/BSP/MCU/Driver/Handler/Port 作为 Impl 内部角色检查，不把它们提升为新的顶层架构。分层证据图（软件层契约与知识图谱）见 [`workflow-review-gate`](../workflow-review-gate/SKILL.md) 的 `references/`。迁移设计覆盖：跨层架构调整、目录映射、依赖方向修正和分阶段集成计划。每个结论写入来源（`relative/path:line`、配置键或可复现命令）与可信等级，不把推测写成已确认事实。

### Platform MCU Model 迁移专项

当需求是把 MCU 公共构造函数从 Impl 归位到 Platform 时，文件级计划必须明确区分两类初始化：

1. Platform Model：按 `platform_<capability>.h` 配套同名 `platform_<capability>.c`，只保留参数校验、公共对象初始化、配置/Ops/生命周期绑定和默认状态；
2. Impl 生命周期：保留 `impl_mcu_*_init(void *)`、HAL/CMSIS、后端 Ops、资源申请、IRQ/DMA/总线动作和硬件错误恢复。

施工顺序固定为：先记录原构造函数与生命周期调用链 → 新增 Platform 同名 `.c` → 删除 Impl 中重复构造定义 → 更新所有构建入口源文件清单 → 扫描依赖和重复符号 → 交叉编译/链接 → 交接最终审查。Impl 只能包含 Platform 公共头，不能包含 Platform `.c`；每个构造函数必须只有一个定义。若构造函数、生命周期或构建入口范围发生变化，必须回到 Review Gate 更新审查包。

### Middleware 专项施工顺序

涉及 Elog/RTT、文件系统或其他第三方中间件时，文件级计划至少按以下顺序展开：

```text
Vendor 登记/编译单元（目标工程 05_Vendor）
  → Platform Middleware API
  → Impl direct Adapter + Vendor Port
  → Service object/lifecycle
  → App/Manager 启动接线
  → workflow-final-review
```

Middleware Vendor Port 是独立的第三方移植边界，不等同于 BSP Adapter；它可以在 Impl 边界
使用经审查的 OS/HAL 资源，但不得把原生类型或后端状态泄漏到 Platform/Service。

## plan.md 与交付计划最低产物

`spec.md` 定义需求、工程约束、施工边界和验收要求；`plan.md` 记录用户选择并通过审查的实施路线及阶段级 Agent/Skill 基线；`task.md` 记录由 `plan.md` 拆出的有序、单一责任、可独立验证任务及任务级 Agent/Skill 分配。三者不得互相新增范围。`plan.md` 的固定路径为 `<project_root>/00_Docs/04_需求文档/plan.md`，模板见 [`plan-template.md`](references/plan-template.md)；`task.md` 由 [`workflow-task-breakdown`](../workflow-task-breakdown/SKILL.md) 生成，执行控制由 [`workflow-task-execution`](../workflow-task-execution/SKILL.md) 负责。

每个阶段的交接必须以 `spec.md` 为约束边界、以 `plan.md` 为实施路线、以 `task.md` 为执行顺序，并能回溯到 Review Gate 的四张清单和 Review-Package；阶段计划仍需明确现状表、边界表、文件修改表和验收表的对应关系，验收内容区分静态、主机、构建、目标运行和实物证据。执行交给下游 skill 后，由运行记录关联命令、绝对工作目录、产物哈希、重试和阻塞项；本 skill 只编排阶段与分发，不代替下游实现。

交接 `workflow-final-review` 时还必须列出：格式与注释规则来源、可复现格式检查命令、初始代码范围、允许整改的文件范围和预期验证层级。这样最终门禁能在格式或必要注释缺失时实施受限整改、审阅差异并同条件复检，而不会重开功能或架构设计。

固件分层交付作为本 Skill 的模式 C：基线、Tools 观测通道、最小系统、OS Adapter、Core、BSP Driver/Handle、Port、Wrapper、集成回归。它扩展模式 A 的审计证据并可映射模式 B 的路线图，但不将 UART 日志定义为软件层，也不在本 Skill 中实现任何一层代码。

## 分发目标

- APP 结构交给 [`app-architecture`](../../app/app-architecture/SKILL.md)。
- OSAL/OS Port 交给 [`platform_os`](../../platform/platform_os/SKILL.md) 或 [`impl_os`](../../impl/impl_os/SKILL.md)。
- 器件链路交给 [`platform_bsp`](../../platform/platform_bsp/SKILL.md)、[`impl_board`](../../impl/impl_board/SKILL.md) 或 [`impl_bsp`](../../impl/impl_bsp/SKILL.md)（含 Handler 机制子层）。
- MCU/厂商库交给 [`platform_mcu`](../../platform/platform_mcu/SKILL.md) 或 [`vendor_mcu`](../../vendor/vendor_mcu/SKILL.md)；目标工程完整保留在 `05_Vendor/vendor_mcu/{stm32,at32,esp32}/`。
- RTOS 底座交给 [`vendor_rtos`](../../vendor/vendor_rtos/SKILL.md)，目标工程完整保留在 `05_Vendor/vendor_rtos/`；中间件和算法分别交给对应 `vendor_*` Skill，物理路径统一为 `05_Vendor/vendor_middleware/<selected-library>/` 与 `05_Vendor/vendor_algorithm/<selected-library>/`。

分发表（请求事实 → 实现层 Skill）与 Router 的分发依据一致；本 Skill 为每个阶段记录一个主实现 Skill 和必要的 Agent/辅助 Skill 基线，但不执行代码；实际单项分配由 `workflow-task-execution` 依据当前 `task.md` 复核并回写。

## 硬边界

- 本 skill 不审查需求约束本身的正确性：该门禁由 `workflow-review-gate` 负责；本 Skill 只基于放行后的 `spec.md` 和项目证据审查用户选定的实施方案。
- 本 skill 不生成实现代码、不承担最终代码审查（`workflow-final-review`）与代码生成阶段。
- 审查包门禁状态非放行、`spec.md` 缺失/过期、`plan.md` 尚未审查通过、阶段级 Agent/Skill 基线缺失或 `task.md` 尚未达到 `可交付` 时不得进入执行；实现层 Skill 只能由 `workflow-task-execution` 按当前单项任务调用。发现新事实必须回传 `workflow-review-gate` 或 `workflow-task-breakdown` 同步更新相关文档。
- OS/BSP Adapter 仍由各自 Wrapper/Port 组成；Middleware Vendor Port 是另一类 Impl 适配边界，不能被归并为 BSP Adapter。
  通用层调用链仍是 `App → Service → Platform ← Impl → Vendor`；固定后端 Middleware 允许经需求与 Review Gate 明确的
  专用例外：`App → Service → Platform Middleware API → Impl Adapter → Vendor`。Service 调用 Platform 公共 API，Board
  只负责 BSP/Device 和板级资源，不集中注册 Middleware。

## 参考

- [集成、移植与 AI 协作能力](references/capability-index.md)
- [分层证据图与软件层契约](../workflow-review-gate/references/software-architecture-knowledge-graph.md)
- [软件层契约](../workflow-review-gate/references/software-layer-contract.md)
