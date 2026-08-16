---
name: workflow-review-gate
description: 代码前审查与门禁：依据项目证据反猜测审查既有实现方案，必选产出四张审查清单并重组为 BRD/PRD/SRSys，判定放行/阻塞。
---

# 代码前审查门禁

## 适用范围

本 Skill 是用户完成方案选择后的更新 RCP 与质疑决策包的唯一接收方（必经门禁）：对所有请求完成选定方案的反猜测审查与代码前门禁判定。审查放行后固定交接给 `workflow-integration-plan` 完成分层/迁移设计与实现层 Skill 分发；门禁阻塞则回传 Router 或 `workflow-requirements-challenge` 补证。本 Skill 不生成实现代码、不分层迁移设计、不分发实现层 Skill。

## 项目文档输出边界

所有本流程生成的交付文档（RCP、Review-Package、BRD、PRD、SRSys，以及后续集成计划）必须落盘到用户目标项目的文档目录：

```text
<project_root>/00_Docs/04_需求文档/
```

其中 `<project_root>` 只能取自用户明确提供或 Router 已确认的目标项目绝对路径。插件仓库、Skill 目录、`process.cwd()`、当前会话工作目录都不是项目根目录，禁止作为文档输出根。

执行前必须完成以下检查：

1. RCP 的“项目路径”字段存在且为绝对路径；
2. 输出目录解析为 `<project_root>/00_Docs/04_需求文档/`；
3. 输出根不等于插件仓库或其子目录；
4. 项目路径缺失、存在歧义或无法访问时，先向用户询问项目绝对路径，不得回退到插件内部保存。

Skill 内部的 `skills/**` 和插件仓库的 `docs/**` 只能保存维护者编写的规则、模板和设计资料，不能保存当前用户项目的运行产物或审查交付物。

## 工作流

1. 固定输入为 Router 更新后的 RCP、`workflow-requirements-challenge` 的质疑与方案决策包、既有需求实现方案（无既有方案时以 RCP 与项目证据为审查对象）与项目源码、配置、构建日志和现有运行记录。
2. 整理工程事实：每个事实、施工建议和验收结论写入来源（`relative/path:line`、配置键或可复现命令）及可信等级（`confirmed` / `user-confirmed` / `inferred` / `unverified`）。
3. 反猜测审查既有方案，逐项分类为"可采用 / 需修订 / 阻塞风险"。
4. 必选产出四张审查清单，并重组为 BRD/PRD/SRSys 三份产品文档，按“项目文档输出边界”写入 `<project_root>/00_Docs/04_需求文档/` 交付用户审查。
5. 门禁判定：全部实施相关事实为 `confirmed` 或 `user-confirmed` 且四张表无未关闭阻塞项 → 放行并交接 `workflow-integration-plan`；否则保持阻塞、记录补证问题并回传 Router。

## 实现方案审查与代码前门禁

Router 和 `workflow-requirements-challenge` 固定交付带用户选择记录的需求约束包（RCP），本 Skill 是其唯一接收方。若已产出既有需求实现方案，必须先审查方案，再决定是否可以交给代码阶段。固定输入为：

- 需求约束包（RCP）；
- 质疑结果、方案 A/B、用户选择和选择理由；
- 既有需求实现方案；
- 项目源码、配置、构建日志和现有运行记录。

如果 RCP 没有 `selected_option`、`decision_owner` 和 `decision_rationale`，门禁必须保持阻塞并回传 `workflow-requirements-challenge`，不得替用户选择或直接进入集成规划。

### 审查 Agent 团队

`embedded-lead` 负责汇总结论。基础审查团队固定包含 `system-architect`（层边界和接口）、`firmware-engineer`（代码入口、数据流和可修改范围）及 `verification-engineer`（验收证据和回归路径）。

- RCP 涉及芯片、板卡、引脚、外设或 CubeMX 时，加入 `hardware-integration` 审查配置、生成边界与板级证据；
- RCP 涉及构建、链接、烧录、调试或观测入口时，加入 `toolchain-engineer` 审查命令、工具链和产物路径；
- `knowledge-engineer` 负责把已确认事实、冲突、风险和交接材料整理为稳定审查包，不得补写未获证实的结论。

每个 Agent 只审查本领域的证据。输出必须含 Summary、Evidence、Changed files、Tests、Artifacts、Blockers 和 Next handoff；`embedded-lead` 保留冲突，不能以汇总名义把推测改写为事实。

### 工程事实与反猜测审查

先从 RCP 和项目中整理工程事实；每个事实、施工建议和验收结论必须写入来源（`relative/path:line`、配置键或可复现命令）及以下可信等级之一：`confirmed`、`user-confirmed`、`inferred` 或 `unverified`。`inferred` 与 `unverified` 绝不可表述为已确认事实。

然后将既有方案逐项分类为"可采用""需修订"或"阻塞风险"，重点寻找看似合理但没有工程证据的内容：

- 不存在、未读取或无源码依据的 HAL、RTOS、OSAL API、目录、符号和调用关系；
- 未由 `.ioc`、生成配置或生成代码证明的 CubeMX 外设、引脚、时钟、DMA、IRQ 与 USER CODE 边界；
- 不存在、工作目录错误或未由配置证明的构建、链接、烧录、调试命令及产物；
- 将静态检查、主机测试或日志推断写成目标运行或实物验证结论。

### 固定审查包与代码阶段门禁

审查结果必须按 [`implementation-plan-review-package.md`](references/implementation-plan-review-package.md) 输出，作为下一轮唯一正式输入。审查包**必选**包含工程现状表、文件施工清单、代码生成约束清单和验收测试清单，并在结尾列出可采用部分、需修订项、阻塞风险和下一轮交接；四张清单必须同时重组为 BRD/PRD/SRSys 三份产品文档（见下节）。

只要任一会影响施工范围、代码生成约束或验收结论的事实仍是 `inferred` 或 `unverified`，就必须记录补证问题、保持阻塞状态，**不得进入代码阶段**。仅当这些实施相关事实全部为 `confirmed` 或 `user-confirmed`，且四张表不存在未关闭阻塞项时，才能放行并交接 `workflow-integration-plan` 规划与分发。代码产物就绪后，由 `workflow-integration-plan` 把最终代码/变更集与验收清单交接给 [`workflow-final-review`](../workflow-final-review/SKILL.md) 做最终代码审查；`workflow-final-review` 不承担代码生成阶段。下游只能在施工清单、生成约束和验收测试清单的范围内工作；发现新事实必须回传本 Skill 更新审查包。

### 必选产品文档输出（BRD / PRD / SRSys）

四张审查清单是每次审查的**必选产出**，与是否存在既有实现方案无关；它们保留在审查包内，作为**插件后续流程**（实现层 Skill 的施工边界、`workflow-final-review` 的验收依据）的唯一正式输入，不直接作为对外交付物。审查完成后必须将四张清单的**内容重新组织为三份正式产品文档**，输出到已确认目标项目的 `<project_root>/00_Docs/04_需求文档/`，**交付用户审查**，可直接作为产品管理正式文档。若目标项目路径未确认，流程保持阻塞，不得在插件仓库内生成占位文档：

| 产品文档 | 内容来源 | 定位 |
|---|---|---|
| BRD（商业需求文档 Business Requirements Document） | 工程现状表 + RCP 项目背景/目标/价值 | 为什么做：项目背景、工程现状、价值与非功能约束高层视图 |
| PRD（产品需求文档 Product Requirements Document） | 文件施工清单 + 代码生成约束清单 | 做什么：产品范围与优先级、文件施工计划、需求约束与禁止事项 |
| SRSys（系统需求规格说明书 System Requirements Specification） | 工程现状表 + 代码生成约束清单 + 验收测试清单（系统需求视角） | 系统需求：系统级功能/非功能/接口需求规格，验收标准为最后一章 |

命名规范：`<request_id>-BRD.md`、`<request_id>-PRD.md`、`<request_id>-SRSys.md`；三份文档的章节骨架见 [`implementation-plan-review-package.md`](references/implementation-plan-review-package.md) 第 5 节。三份文档与四张清单同步更新；发现新事实必须回传本 Skill 更新审查包并重新生成文档。

## 分层证据图

先读取 [`software-layer-contract.md`](references/software-layer-contract.md) 作为当前顶层架构唯一依据，再读取 [`software-architecture-knowledge-graph.md`](references/software-architecture-knowledge-graph.md) 和对应 JSON 作为项目证据，按 App → Service → Platform → Impl → Vendor 核对分层边界。必要时再检查 Impl 内的 OS/BSP/MCU/Driver/Handler/Port 角色；Tools 是横切质量与验证能力，不是第六个软件层。图谱中的源码仓库只作为版本化证据，不把上游实现复制进插件。分层审计、迁移设计与文件级改造顺序由 `workflow-integration-plan` 承担。

## 硬边界

- Adapter 只属于 OS 和 BSP，且每个 Adapter 由 Wrapper 与 Port 组成。
- Core、Middleware、Driver 不创建 Adapter；它们分别提供 MCU 能力、通用能力和厂商底层实现。
- 通用规范调用链是 `App → Service → Platform ← Impl → Vendor`；固定后端 Middleware 经 RCP/Review Gate 明确放行后，
  可采用专用调用链 `App → Service → Platform Middleware API → Impl Adapter → Vendor`。Service 仍只能调用 Platform
  公共 API；Platform Middleware `.c` 不得 include Vendor/HAL/RTOS；Wrapper/Port 只在 OS/BSP 内部承担适配职责，
  Middleware Vendor Port 仍属于 Impl 边界。
- 本 skill 只输出工程事实、反猜测审查结论、必选的 BRD/PRD/SRSys 产品文档和放行/阻塞判定，不直接执行代码移植、分层迁移设计、实现层 Skill 分发或最终代码审查。
- 最终代码/变更集的独立 Review 编排交给 [`workflow-final-review`](../workflow-final-review/SKILL.md)；项目风格、静态质量门禁与审查规则来源是 [`tools-quality`](../../tools/tools-quality/SKILL.md)。
- 分层审计、迁移路线、文件级改造顺序与实现层分发交给 [`workflow-integration-plan`](../workflow-integration-plan/SKILL.md)。

## 参考

- [软件层契约](references/software-layer-contract.md)
- [GR5526 LVGL 验收映射](references/gr5526-lvgl-mapping.md)
- [实现方案审查包模板](references/implementation-plan-review-package.md)
- [内化能力索引](references/capability-index.md)
