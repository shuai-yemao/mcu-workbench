---
name: workflow-review-gate
description: 代码前审查与门禁：依据项目证据反猜测审查既有实现方案，按风险选择 Spec 力度，将四张审查清单保留在 Review-Package 内部并按需整合生成下游 spec.md；四张清单不单独落盘到实际工程，判定放行/阻塞。
---

# 代码前审查门禁

## 适用范围

本 Skill 是 Router 和 `workflow-requirements-challenge` 完成 RCP 补证与目的/可行性质疑后的唯一接收方（必经门禁）：对所有请求完成需求约束和既有实现方案的反猜测审查与代码前门禁判定。审查放行后固定交接给 `workflow-integration-plan` 完成分层/迁移设计与实现层 Skill 分发；门禁阻塞则回传 Router 或 `workflow-requirements-challenge` 补证。本 Skill 不生成实现代码、不分层迁移设计、不分发实现层 Skill。

## 项目文档输出边界

对 `lightweight` 和 `full` 请求，本流程的正式项目 Spec 交付文件是 `spec.md`，落盘到用户目标项目的文档目录：

```text
<project_root>/00_Docs/04_需求文档/
```

其中 `<project_root>` 只能取自用户明确提供或 Router 已确认的目标项目绝对路径。四张清单只作为 `Review-Package` 内的审计章节，不生成四个独立 Markdown 文件；插件仓库、Skill 目录、`process.cwd()`、当前会话工作目录都不是项目根目录，禁止作为文档输出根。

执行前必须完成以下检查：

1. RCP 的“项目路径”字段存在且为绝对路径；
2. 输出目录解析为 `<project_root>/00_Docs/04_需求文档/`；
3. 输出根不等于插件仓库或其子目录；
4. 项目路径缺失、存在歧义或无法访问时，先向用户询问项目绝对路径，不得回退到插件内部保存。

Skill 内部的 `skills/**` 只能保存维护者编写的规则、模板和设计资料；当前用户项目的运行产物或审查交付物不得写入插件仓库。

## 工作流

1. 固定输入为 Router/`workflow-requirements-challenge` 更新后的 RCP、目的与可行性质疑结论、既有需求实现方案（无既有方案时以 RCP 与项目证据为审查对象）与项目源码、配置、构建日志和现有运行记录。
2. 整理工程事实：每个事实、施工建议和验收结论写入来源（`relative/path:line`、配置键或可复现命令）及可信等级（`confirmed` / `user-confirmed` / `inferred` / `unverified`）。
3. 反猜测审查既有方案，逐项分类为"可采用 / 需修订 / 阻塞风险"。
4. 必须在 `Review-Package` 内形成四个审查章节；不得将它们分别写成项目 Markdown 文件。`lightweight` 和 `full` 请求审查完成后，将四个章节按对应力度整合为 `spec.md`；`prototype` 只保留目标、临时边界、有效期和不承诺项，不生成正式 `spec.md`。
5. 门禁判定：全部实施相关事实为 `confirmed` 或 `user-confirmed` 且四张表无未关闭阻塞项，并且 Spec 力度不低于风险要求 → 放行。`prototype` 放行后结束，不得交接代码施工；`lightweight` 只能交接局部、单项施工；`full` 交接 `workflow-integration-plan`。否则保持阻塞并回传 Router。

## 需求变化门禁

需求变化优先于代码变化。只要变化影响范围、非目标、业务规则、状态/权限、接口、资源/并发/ISR/DMA 边界或验收标准，必须停止下游实现，先回传 `workflow-requirements-router`/`workflow-requirements-challenge` 更新 RCP，再由本 Skill 更新四个审查章节、Review-Package 和 `spec.md`，重新完成放行判定。

在最新 `spec.md` 放行前：

- 不得修改实现代码、`plan.md` 或 `task.md` 的施工范围；
- 不得用任务状态、方案说明、注释或临时测试替代 Spec 变更；
- 已存在的未提交代码改动必须保留并重新评估，不得未经授权丢弃；
- 只有 Spec 放行后，才允许由 `workflow-integration-plan` 更新方案，再由 `workflow-task-breakdown` 更新任务。

如果只是实现偏差而需求未变，允许按现有 Spec 进入测试先行修复，不得借此扩大范围。

## SOLID 代码硬门禁

代码施工必须遵守 [SOLID 代码施工硬门禁](references/solid-code-gate.md)。本 Skill
在 `spec.md` 放行前记录五项原则的适用性、设计约束和证据要求；任何原则无法满足或
缺少可验证证据时，判定为 `阻塞`，不得把问题下放给实现 Skill 自行解释。

## Spec 力度门禁

必须按 [`spec-rigor-by-risk.md`](../workflow-requirements-router/references/spec-rigor-by-risk.md) 复核 RCP 的
`spec_rigor`、`spec_overlays`、风险原因、最低交付物和升级触发条件。Review Gate 只允许
降低重复文档，不允许降低风险控制：跨模块/跨层、公共接口、持久化状态、硬件/RTOS
资源、ISR/DMA、内存/实时性、生产化或长期维护至少为 `full`；支付、权限、隐私、
不可逆变更和安全边界还必须追加 `human_review`；多人或多 Agent 还必须追加 `versioned`。
风险未确认时按较高力度处理并阻塞补证。

## 实现方案审查与代码前门禁

Router 和 `workflow-requirements-challenge` 固定交付带补证记录和质疑结论的需求约束包（RCP），本 Skill 是其唯一接收方。若已产出既有需求实现方案，必须先审查方案，再决定是否可以交给代码阶段。固定输入为：

- 需求约束包（RCP）；
- 目的质疑、可行性质疑、范围结论、验收缺口和未决风险；
- 既有需求实现方案；
- 项目源码、配置、构建日志和现有运行记录。

如果 RCP 缺少完成的 RCP 补证记录、目的质疑、可行性质疑、范围/验收结论或证据等级，门禁必须保持阻塞并回传 `workflow-requirements-challenge`，不得用方案选择或推测替代缺失事实。

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

审查结果必须按 [`implementation-plan-review-package.md`](references/implementation-plan-review-package.md) 输出。审查包**必选**包含工程现状表、文件施工清单、代码生成约束清单和验收测试清单四个章节，并在结尾列出可采用部分、需修订项、阻塞风险和下一轮交接；四个章节只在 `Review-Package` 内维护，不生成四个独立 Markdown 文件，审查完成后整合为 `spec.md`。`Review-Package` 是审计记录，`spec.md` 是下游 Skill 的正式需求/约束输入；放行后的 `workflow-integration-plan` 另行生成经过用户选择和方案审查的 `plan.md` 作为实施计划输入。

只要任一会影响施工范围、代码生成约束或验收结论的事实仍是 `inferred` 或 `unverified`，就必须记录补证问题、保持阻塞状态，**不得进入代码阶段**。仅当这些实施相关事实全部为 `confirmed` 或 `user-confirmed`，四张表不存在未关闭阻塞项，且力度满足风险要求时，才能放行：`prototype` 结束于最小记录；`lightweight` 生成精简 `spec.md` 并仅允许局部施工；`full` 生成可交接的 `spec.md`，再交接 `workflow-integration-plan` 规划与分发。代码产物就绪后，由 `workflow-integration-plan` 把最终代码/变更集、适用的 Spec 与验收清单交接给 [`workflow-final-review`](../workflow-final-review/SKILL.md) 做最终代码审查；`workflow-final-review` 不承担代码生成阶段。下游只能在已放行 Spec 的施工边界、生成约束和验收测试范围内工作；发现新事实必须回传本 Skill 更新四张清单、Review-Package 和 Spec。

### 必选四份清单审计章节

四张审查清单是 `lightweight` 和 `full` 审查的**必选审计内容**，与是否存在既有实现方案无关。`prototype` 仍需在 RCP 中记录最小目标和临时边界，但不生成四张正式清单。它们必须同时：

1. 保留在 `Review-Package` 中，作为审计记录和证据追溯源；
2. 作为四个章节整合进 `spec.md`，交给用户完成 H-02 审查和下游 Skill；
3. 不生成、不更新、不删除对应的四个独立 Markdown 文件。

命名规范固定为：

| 审计章节 | 章节名称 |
|---|---|
| 工程现状表 | `## 1. 工程现状表` |
| 文件施工清单 | `## 2. 文件施工清单` |
| 代码生成约束清单 | `## 3. 代码生成约束清单` |
| 验收测试清单 | `## 4. 验收测试清单` |

四个章节必须保留 `request_id`、项目路径与提交、审查状态、可信等级、证据来源和当前阻塞项。发现新事实或事实等级变化时，只同步更新 `Review-Package` 对应章节和 `spec.md`；不得在目标工程或插件仓库生成四个独立文件。若目标项目路径未确认，流程保持阻塞，不生成 `spec.md` 占位文件。

### 下游 spec.md 输出

对 `lightweight` 和 `full` 请求，四张清单审查完成后，必须将其整合为目标项目文档目录下的固定文件：

```text
<project_root>/00_Docs/04_需求文档/spec.md
```

`spec.md` 必须按以下顺序整合，并保留原清单 ID、证据位置和可信等级：

1. 元数据、RCP 状态、澄清回填和质疑结论；
2. 工程现状与已确认事实；
3. 文件施工范围、所属层和责任 Agent；
4. 代码生成约束、禁止事项和资源/并发/ISR/DMA 边界；
5. 验收测试清单、证据等级、命令/条件和预期结果；
6. 可采用项、需修订项、阻塞风险和代码阶段判定；
7. 下游交接契约、未验证项和回传规则。

`spec.md` 只能由四张清单整合生成，不得引入清单之外的新需求或未标记的推测。`lightweight` 只保留范围、非目标、3–5 条验收标准、风险和回滚；`full` 还必须保留完整约束、计划交接和验证证据。门禁阻塞时可以生成状态为 `阻塞` 的审查草稿，但不得将其交给下游 Skill；只有门禁放行后，`spec.md` 才能作为正式施工输入。`prototype` 不生成占位 `spec.md`。

## 分层证据图

先读取 [`software-layer-contract.md`](references/software-layer-contract.md) 作为当前顶层架构唯一依据，再读取 [`software-architecture-knowledge-graph.md`](references/software-architecture-knowledge-graph.md) 和对应 JSON 作为项目证据，按 App → Service → Platform → Impl → Vendor 核对分层边界。必要时再检查 Impl 内的 OS/BSP/MCU/Driver/Handler/Port 角色；Tools 是横切质量与验证能力，不是第六个软件层。图谱中的源码仓库只作为版本化证据，不把上游实现复制进插件。分层审计、迁移设计与文件级改造顺序由 `workflow-integration-plan` 承担。

## 硬边界

- Adapter 只属于 OS 和 BSP，且每个 Adapter 由 Wrapper 与 Port 组成。
- Core、Middleware、Driver 不创建 Adapter；它们分别提供 MCU 能力、通用能力和厂商底层实现。
- 通用规范调用链是 `App → Service → Platform ← Impl → Vendor`；固定后端 Middleware 经 RCP/Review Gate 明确放行后，
  可采用专用调用链 `App → Service → Platform Middleware API → Impl Adapter → Vendor`。Service 仍只能调用 Platform
  公共 API；Platform Middleware `.c` 不得 include Vendor/HAL/RTOS；Wrapper/Port 只在 OS/BSP 内部承担适配职责，
  Middleware Vendor Port 仍属于 Impl 边界。
- 本 skill 只输出工程事实、反猜测审查结论、含四个清单章节的 Review-Package、spec.md 和放行/阻塞判定，不直接执行代码移植、分层迁移设计、实现层 Skill 分发或最终代码审查。
- 最终代码/变更集的独立 Review 编排交给 [`workflow-final-review`](../workflow-final-review/SKILL.md)；代码注释、格式、Cppcheck/MISRA 和代码审查质量门禁交给 [`tools-quality`](../../tools/tools-quality/SKILL.md)，Map/内存/Unity 与项目验证交给 [`tools-verification`](../../tools/tools-verification/SKILL.md)。
- 分层审计、迁移路线、文件级改造顺序与实现层分发交给 [`workflow-integration-plan`](../workflow-integration-plan/SKILL.md)。
- H-02 是 Spec 级用户审查闸门；Spec 未记录 `用户审查状态: approved` 前不得进入 Plan。
- Plan 之后不设置例行用户审查；Task、执行、AI 审查、测试和最终检查由下游自动完成。

## 参考

- [软件层契约](references/software-layer-contract.md)
- [GR5526 LVGL 验收映射](references/gr5526-lvgl-mapping.md)
- [实现方案审查包模板](references/implementation-plan-review-package.md)
- [Spec 开发力度与风险分级](../workflow-requirements-router/references/spec-rigor-by-risk.md)
- [SOLID 代码施工硬门禁](references/solid-code-gate.md)
- [内化能力索引](references/capability-index.md)
