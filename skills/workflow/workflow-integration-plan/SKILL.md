---
name: workflow-integration-plan
description: 放行后的集成规划与分发：分层审计、迁移路线、文件级改造顺序与唯一实现层 Skill 分发，携带 RCP/审查包/验收信息交接 workflow-final-review。
---

# 集成规划与分发

## 适用范围

本 Skill 是 `workflow-review-gate` 审查放行后的规划者：消费放行后的审查包（四张清单 + BRD/PRD/SRSys），完成分层审计、迁移路线、文件级改造顺序与分阶段集成计划，并只分发一个实现层 Skill。代码产物就绪后，把最终代码/变更集与验收清单交接给 `workflow-final-review`。本 Skill 不审查既有方案的可行性（门禁已由 `workflow-review-gate` 判定）、不生成实现代码；审查包门禁状态非放行不得分发。

## 工作流

1. 确认审查包门禁状态为放行（存在 `inferred`/`unverified` 关键事实或未关闭阻塞项时停止，回传 `workflow-review-gate`）。
2. 读取工程文件、构建日志、启动流程和现有笔记，记录可复现证据。
3. 画出调用链，确认上层只依赖下层公开契约，识别 APP、Middleware、OS、BSP、Core、Driver 归属。
4. 输出文件级改造顺序、分阶段集成计划、验收点和未决风险。
5. 只分发一个实现层 Skill；执行 agent 在执行中如需其他 Skill 的领域知识（分层约束、验收依据等），按需自行查阅，不预分配参考清单、不设数量上限。
6. 代码产物就绪后，把最终代码/变更集、RCP、`workflow-review-gate` 放行结论、文件施工表、验收清单、格式 profile/命令和目标文件范围交接给 `workflow-final-review`；该门禁必须执行格式与必要注释整改闭环，复检通过前不得放行。

## 分层审计与迁移设计

按 APP → Middleware → OS → BSP → Core → Driver → Tools 的顺序审计，核对调用链与公开契约；分层证据图（软件层契约与知识图谱）见 [`workflow-review-gate`](../workflow-review-gate/SKILL.md) 的 `references/`。迁移设计覆盖：跨层架构调整、目录映射、依赖方向修正和分阶段集成计划。每个结论写入来源（`relative/path:line`、配置键或可复现命令）与可信等级，不把推测写成已确认事实。

### Platform MCU Model 迁移专项

当需求是把 MCU 公共构造函数从 Impl 归位到 Platform 时，文件级计划必须明确区分两类初始化：

1. Platform Model：按 `platform_<capability>.h` 配套同名 `platform_<capability>.c`，只保留参数校验、公共对象初始化、配置/Ops/生命周期绑定和默认状态；
2. Impl 生命周期：保留 `impl_mcu_*_init(void *)`、HAL/CMSIS、后端 Ops、资源申请、IRQ/DMA/总线动作和硬件错误恢复。

施工顺序固定为：先记录原构造函数与生命周期调用链 → 新增 Platform 同名 `.c` → 删除 Impl 中重复构造定义 → 更新所有构建入口源文件清单 → 扫描依赖和重复符号 → 交叉编译/链接 → 交接最终审查。Impl 只能包含 Platform 公共头，不能包含 Platform `.c`；每个构造函数必须只有一个定义。若构造函数、生命周期或构建入口范围发生变化，必须回到 Review Gate 更新审查包。

### Middleware 专项施工顺序

涉及 Elog/RTT、文件系统或其他第三方中间件时，文件级计划至少按以下顺序展开：

```text
Vendor 登记/编译单元
  → Platform Middleware API
  → Impl direct Adapter + Vendor Port
  → Service object/lifecycle
  → App/Manager 启动接线
  → workflow-final-review
```

Middleware Vendor Port 是独立的第三方移植边界，不等同于 BSP Adapter；它可以在 Impl 边界
使用经审查的 OS/HAL 资源，但不得把原生类型或后端状态泄漏到 Platform/Service。

## 交付计划最低产物

每个阶段的交接必须包含四张表：现状表、边界表、文件修改表、验收表（区别于审查包的四张清单——后者由 `workflow-review-gate` 必选重组为 BRD/PRD/SRSys 产品文档）；验收表区分静态、主机、构建、目标运行和实物证据。执行交给下游 skill 后，由运行记录关联命令、绝对工作目录、产物哈希、重试和阻塞项；本 skill 只编排阶段与分发，不代替下游实现。

交接 `workflow-final-review` 时还必须列出：格式与注释规则来源、可复现格式检查命令、初始代码范围、允许整改的文件范围和预期验证层级。这样最终门禁能在格式或必要注释缺失时实施受限整改、审阅差异并同条件复检，而不会重开功能或架构设计。

固件分层交付作为本 Skill 的模式 C：基线、Tools 观测通道、最小系统、OS Adapter、Core、BSP Driver/Handle、Port、Wrapper、集成回归。它扩展模式 A 的审计证据并可映射模式 B 的路线图，但不将 UART 日志定义为软件层，也不在本 Skill 中实现任何一层代码。

## 分发目标

- APP 结构交给 [`app-architecture`](../../app/app-architecture/SKILL.md)。
- OSAL/OS Port 交给 [`platform_os`](../../platform/platform_os/SKILL.md) 或 [`impl_os`](../../impl/impl_os/SKILL.md)。
- 器件链路交给 [`platform_bsp`](../../platform/platform_bsp/SKILL.md)、[`impl_board`](../../impl/impl_board/SKILL.md) 或 [`impl_bsp`](../../impl/impl_bsp/SKILL.md)（含 Handler 机制子层）。
- MCU/厂商库交给 [`platform_mcu`](../../platform/platform_mcu/SKILL.md) 或 [`vendor_stm32`](../../vendor/vendor_stm32/SKILL.md)。

分发表（请求事实 → 实现层 Skill）与 Router 的分发依据一致；本 Skill 只按表分发**一个**实现层 Skill，不预分配参考清单。

## 硬边界

- 本 skill 不审查既有实现方案的可行性：门禁判定收敛在 `workflow-review-gate`，本 Skill 只消费放行结果。
- 本 skill 不生成实现代码、不承担最终代码审查（`workflow-final-review`）与代码生成阶段。
- 审查包门禁状态非放行时不得分发实现层 Skill；发现新事实必须回传 `workflow-review-gate` 更新审查包。
- OS/BSP Adapter 仍由各自 Wrapper/Port 组成；Middleware Vendor Port 是另一类 Impl 适配边界，不能被归并为 BSP Adapter。
  通用层调用链仍是 `App → Service → Platform ← Impl → Vendor`；固定后端 Middleware 允许经需求与 Review Gate 明确的
  专用例外：`App → Service → Platform Middleware API → Impl Adapter → Vendor`。Service 调用 Platform 公共 API，Board
  只负责 BSP/Device 和板级资源，不集中注册 Middleware。

## 参考

- [集成、移植与 AI 协作能力](references/capability-index.md)
- [分层证据图与软件层契约](../workflow-review-gate/references/software-architecture-knowledge-graph.md)
- [软件层契约](../workflow-review-gate/references/software-layer-contract.md)
