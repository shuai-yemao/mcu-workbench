---
name: workflow-project-integration
description: 依据项目证据审查需求实现方案、设计软件分层，并给出代码前门禁与可验证的集成路线。
---

# 软件项目集成

## 适用范围

本 Skill 是 Router 需求约束包（RCP）的唯一接收方（必经门禁）：对所有请求先完成分层/工程审计/迁移设计，再分发实现层 Skill。处理跨层架构、既有工程审计、目录映射、依赖方向和分阶段集成计划。先识别 APP、Middleware、OS、BSP、Core、Driver，再把实现交接给唯一的下游 skill。

## 工作流

1. 读取工程文件、构建日志、启动流程和现有笔记，记录可复现证据。
2. 画出调用链，确认上层只依赖下层公开契约。
3. 输入固定为 Router 的 RCP；若已有既有需求实现方案，先执行“实现方案审查与代码前门禁”。
4. 根据职责选择一个实现层主 skill，最多追加两个交接 skill，再分发。
5. 输出文件级改造顺序、验收点和未决风险；不在本 skill 内实现具体驱动。

## 实现方案审查与代码前门禁

Router 固定交付需求约束包（RCP），本 Skill 是其唯一接收方。若已产出既有需求实现方案，必须先审查方案，再决定是否可以交给代码阶段。固定输入为：

- 需求约束包（RCP）；
- 既有需求实现方案；
- 项目源码、配置、构建日志和现有运行记录。

### 审查 Agent 团队

`embedded-lead` 负责汇总结论。基础审查团队固定包含 `system-architect`（层边界和接口）、`firmware-engineer`（代码入口、数据流和可修改范围）及 `verification-engineer`（验收证据和回归路径）。

- RCP 涉及芯片、板卡、引脚、外设或 CubeMX 时，加入 `hardware-integration` 审查配置、生成边界与板级证据；
- RCP 涉及构建、链接、烧录、调试或观测入口时，加入 `toolchain-engineer` 审查命令、工具链和产物路径；
- `knowledge-engineer` 负责把已确认事实、冲突、风险和交接材料整理为稳定审查包，不得补写未获证实的结论。

每个 Agent 只审查本领域的证据。输出必须含 Summary、Evidence、Changed files、Tests、Artifacts、Blockers 和 Next handoff；`embedded-lead` 保留冲突，不能以汇总名义把推测改写为事实。

### 工程事实与反猜测审查

先从 RCP 和项目中整理工程事实；每个事实、施工建议和验收结论必须写入来源（`relative/path:line`、配置键或可复现命令）及以下可信等级之一：`confirmed`、`user-confirmed`、`inferred` 或 `unverified`。`inferred` 与 `unverified` 绝不可表述为已确认事实。

然后将既有方案逐项分类为“可采用”“需修订”或“阻塞风险”，重点寻找看似合理但没有工程证据的内容：

- 不存在、未读取或无源码依据的 HAL、RTOS、OSAL API、目录、符号和调用关系；
- 未由 `.ioc`、生成配置或生成代码证明的 CubeMX 外设、引脚、时钟、DMA、IRQ 与 USER CODE 边界；
- 不存在、工作目录错误或未由配置证明的构建、链接、烧录、调试命令及产物；
- 将静态检查、主机测试或日志推断写成目标运行或实物验证结论。

### 固定审查包与代码阶段门禁

审查结果必须按 [`implementation-plan-review-package.md`](references/implementation-plan-review-package.md) 输出，作为下一轮唯一正式输入。审查包固定包含工程现状表、文件施工清单、代码生成约束清单和验收测试清单，并在结尾列出可采用部分、需修订项、阻塞风险和下一轮交接。

只要任一会影响施工范围、代码生成约束或验收结论的事实仍是 `inferred` 或 `unverified`，就必须记录补证问题、保持阻塞状态，**不得进入代码阶段**。仅当这些实施相关事实全部为 `confirmed` 或 `user-confirmed`，且四张表不存在未关闭阻塞项时，才能进入代码阶段并交给对应层的实现 Skill。代码产物就绪后，把最终代码/变更集与验收清单交接给 [`workflow-ai-collab`](../workflow-ai-collab/SKILL.md) 做最终代码审查；`workflow-ai-collab` 不承担代码生成阶段。下游只能在施工清单、生成约束和验收测试清单的范围内工作；发现新事实必须回传本 Skill 更新审查包。

## 交付计划最低产物

每个阶段的交接必须包含四张表：现状表、边界表、文件修改表、验收表；验收表区分静态、主机、构建、目标运行和实物证据。执行交给下游 skill 后，由运行记录关联命令、绝对工作目录、产物哈希、重试和阻塞项；本 skill 只编排阶段与门禁，不代替下游实现。

固件分层交付作为本 Skill 的模式 C：基线、Tools 观测通道、最小系统、OS Adapter、Core、BSP Driver/Handle、Port、Wrapper、集成回归。它扩展模式 A 的审计证据并可映射模式 B 的路线图，但不将 UART 日志定义为软件层，也不在本 Skill 中实现任何一层代码。

## 分层证据图

先读取 [`software-architecture-knowledge-graph.md`](references/software-architecture-knowledge-graph.md) 和对应 JSON，再按 APP → Middleware → OS → BSP → Core → Driver → Tools 的顺序审计。图谱中的源码仓库只作为版本化证据，不把上游实现复制进插件。

## 硬边界

- Adapter 只属于 OS 和 BSP，且每个 Adapter 由 Wrapper 与 Port 组成。
- Core、Middleware、Driver 不创建 Adapter；它们分别提供 MCU 能力、通用能力和厂商底层实现。
- 上层调用下层时，调用下层 Adapter 的 Wrapper；Middleware 仅通过公共 API 使用 OS/BSP 能力。
- 本 skill 只输出项目审计、分层设计、迁移路线和下游交接，不直接执行代码移植、最终代码审查、Prompt 模板生成或具体驱动实现。
- 最终代码/变更集的独立 Review 编排交给 [`workflow-ai-collab`](../workflow-ai-collab/SKILL.md)；项目风格、静态质量门禁与审查规则来源是 [`tools-quality`](../../tools/tools-quality/SKILL.md)。

## 交接

- APP 结构交给 [`app-architecture`](../../app/app-architecture/SKILL.md)。
- OSAL/OS Port 交给 [`os-adapter`](../../os/os-adapter/SKILL.md) 或 [`os-runtime`](../../os/os-runtime/SKILL.md)。
- 器件链路交给 [`bsp-wrapper`](../../bsp/bsp-wrapper/SKILL.md)、[`bsp-port`](../../bsp/bsp-port/SKILL.md)、[`bsp-hal-driver`](../../bsp/bsp-hal-driver/SKILL.md) 或 [`bsp-handler`](../../bsp/bsp-handler/SKILL.md)。
- MCU/厂商库交给 [`core-mcu`](../../core/core-mcu/SKILL.md) 或 [`mcu-platform`](../../mcu/mcu-platform/SKILL.md)。

## 参考

- [软件层契约](references/software-layer-contract.md)
- [GR5526 LVGL 验收映射](references/gr5526-lvgl-mapping.md)
- [实现方案审查包模板](references/implementation-plan-review-package.md)
- [集成、移植与 AI 协作能力](references/capability-index.md)
