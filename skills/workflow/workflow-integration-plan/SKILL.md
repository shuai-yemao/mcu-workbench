---
name: workflow-integration-plan
description: 放行后的集成规划与分发：分层审计、迁移路线、文件级改造顺序与唯一实现层 Skill 分发，交接 workflow-final-review。
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
6. 代码产物就绪后，把最终代码/变更集与验收清单交接给 `workflow-final-review`。

## 分层审计与迁移设计

按 APP → Middleware → OS → BSP → Core → Driver → Tools 的顺序审计，核对调用链与公开契约；分层证据图（软件层契约与知识图谱）见 [`workflow-review-gate`](../workflow-review-gate/SKILL.md) 的 `references/`。迁移设计覆盖：跨层架构调整、目录映射、依赖方向修正和分阶段集成计划。每个结论写入来源（`relative/path:line`、配置键或可复现命令）与可信等级，不把推测写成已确认事实。

## 交付计划最低产物

每个阶段的交接必须包含四张表：现状表、边界表、文件修改表、验收表（区别于审查包的四张清单——后者由 `workflow-review-gate` 必选重组为 BRD/PRD/SRSys 产品文档）；验收表区分静态、主机、构建、目标运行和实物证据。执行交给下游 skill 后，由运行记录关联命令、绝对工作目录、产物哈希、重试和阻塞项；本 skill 只编排阶段与分发，不代替下游实现。

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
- Adapter 只属于 OS 和 BSP，且每个 Adapter 由 Wrapper 与 Port 组成；上层调用下层时调用下层 Adapter 的 Wrapper。

## 参考

- [集成、移植与 AI 协作能力](references/capability-index.md)
- [分层证据图与软件层契约](../workflow-review-gate/references/software-architecture-knowledge-graph.md)
- [软件层契约](../workflow-review-gate/references/software-layer-contract.md)
