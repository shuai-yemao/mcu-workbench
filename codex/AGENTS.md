# MCU Workbench — Codex 运行约束

> 本文件是 MCU Workbench 在 Codex 中的宿主约束源。
> Codex 特化只维护 `codex/`；公共领域内容、Claude 适配和 OpenCode 适配由各自维护边界负责。

## 1. 工作边界

- `common/` 是公共内容层。Codex 特化任务不得修改、重写或复制其中的内容。
- `claude/` 和 `opencode/` 属于其他宿主适配层。Codex 特化任务不得修改它们。
- `codex/` 是 Codex 特化层，ChatGPT/Codex 只在这里增加或调整宿主行为。
- 根目录 `AGENTS.override.md` 是本文件生成的兼容入口，不得手工维护。
- 根目录现有 `AGENTS.md` 保持项目说明和贡献指南职责，不改造成 Codex 专属约束。

## 2. 嵌入式工程工作方式

- 先由 `workflow-requirements-router` 将自然语言请求整理为可审计的需求约束包（RCP），按风险选择 `spec_rigor`，并固定交接给 `workflow-review-gate`（必经审查门禁）；`prototype` 在最小记录后结束，`lightweight` 走局部单项链路，`full` 审查放行后由 `workflow-integration-plan` 完成分层/审计/迁移设计，`workflow-task-breakdown` 自动生成 `task.md`，`workflow-task-execution` 在 Plan 用户批准后以 `auto_until_final_check` 模式按依赖连续执行、自动审查和测试，最后进入最终审查。Router 与门禁只负责约束、证据和交接，不代替架构设计、代码实现或验证。
- 需求变化硬门禁：只要范围、业务规则、状态/权限、接口、资源边界或验收标准发生变化，必须先暂停代码，更新并重新放行 `spec.md`，再更新 `plan.md`/`task.md` 和恢复实现；不得先改代码后补写 Spec。
- 代码施工同时受 [SOLID 代码施工硬门禁](../skills/workflow/workflow-review-gate/references/solid-code-gate.md) 约束：SRP、OCP、LSP、ISP、DIP 必须逐项判断并提供证据；任一适用原则不满足或不可验证，必须阻塞，不得自行放宽。
- RCP 必须区分 `confirmed`、`user-confirmed`、`inferred`、`unverified`，并记录项目路径、分支/提交、芯片/板卡、软件环境、分层约束、验收标准、风险原因、`spec_rigor`、`spec_overlays` 和阻塞项。Spec 力度依据 [`spec-rigor-by-risk.md`](../skills/workflow/workflow-requirements-router/references/spec-rigor-by-risk.md) 选择，风险不明时按高力度处理。`workflow-requirements-challenge` 应先读取仓库规则和项目证据，再按第一版范围/非目标、业务规则、状态/权限、可验证验收四类缺口进行澄清；每轮最多向用户提出四个真正影响实现的问题，并说明推荐。
- 先读取真实项目结构、构建配置、芯片型号、RTOS 和驱动证据，再给出结论。
- 按 App → Service → Platform ← Impl → Vendor 分层分析依赖和职责。
- 明确区分静态检查、主机测试、交叉编译、烧录运行、串口/RTT 和实机验证。
- 不把推测、代码生成或静态检查描述为已经完成的硬件验证。
- 修改一个层次后，使用项目现有构建或测试路径验证该层，再继续向上推进。

### 2.1 Router-first 入口最小协议

#### 当前 v1.0 文档与执行契约

- RCP、Review-Package 和 Final Review 是内部 JSON/JSONL 状态，不生成用户项目 Markdown。
- 用户正式接收的文档只有详细 `spec.md`、`plan.md` 和 `task.md`；用户审查从 Spec 开始，Plan 批准后才生成 Task。
- Task 必须逐项实现并测试；所有 Task 完成后统一执行 Verify。Verify 对照 Spec 验收标准审查，发现偏差必须回到 Spec，旧 Plan/Task 失效。
- 真实 Codex 宿主是否强制执行该流程仍为 `unverified`；静态或主机测试不得替代宿主证据。

- 所有嵌入式请求的第一有效动作必须是 `workflow-requirements-router`：读取项目证据、识别风险并生成可审计的 RCP。
- 在 RCP、Challenge、Review-Package 和放行的 `spec.md` 形成前，只允许只读分析、证据收集和阻塞报告，不得进入实现 Skill 或写入业务代码。
- 目标工程接入时，复制 [`embedded-workflow-entry.md`](./embedded-workflow-entry.md) 中的规则和记录字段；该文件是接入材料，不代表插件已经拥有宿主级拦截能力。
- 交付前必须提供确定性 Gate 结果：缺失、阻塞、过期或越界状态必须报告 `blocked`，只有与当前 Spec/Plan/Task 关联的放行链才能进入交付检查。
- “Skill 已加载”“缓存指纹一致”或模型自述已执行 Router，都不能单独证明真实宿主已经遵循 Router-first。
- 入口指导、Gate、主机测试、CI 和真实 Codex 会话必须分别记录证据等级；静态或主机结果不得写成目标宿主行为证明。

## 3. 分层实现与生成边界

- `app-architecture` 负责 `main`、Manager、Task、Logic、UI 和 Profile 的边界；App 只能依赖 Service 层公开接口（D8 门禁），不能直接调用 Platform 实现、Impl、Vendor 或任何芯片/RTOS 头文件。
- `platform_*`/`plat_*` 是能力接口层：只保存能力接口、统一错误码/类型和必要配置。目标工程必须先判定 `flat-logical-resource`（如 `plat_gpio.h` + `plat_gpio_*()` + `plat_*_id_t`）或 `object-ops`（对象、`cfg/ctx/data/ops`、生命周期）profile；不能因插件模板存在对象协议就强行生成 `platform_*_init()` 或 Model。两种 profile 都不得绑定芯片/RTOS；`impl_mcu` 负责将逻辑资源或 Ops 绑定到 HAL/CMSIS/SDK，`impl_board` 负责板级组合根，`platform_common` 的对象模型只在目标工程真实使用时参与。
- `impl_mcu` 是 Platform MCU → Vendor/HAL/SDK 适配层：在 flat profile 中直接实现真实存在的 `plat_*` 公共符号并在内部映射句柄/引脚/DMA/NVIC；在 object-ops profile 中提供 `Ops/context` 和硬件生命周期。它不承载器件协议、BSP Handle 状态机、Service 业务策略或 RTOS 任务。缺少目标公共头、CubeMX 头、精确 MCU/构建证据时标记 `UNRESOLVED_MCU_API`，不得伪称可编译。
- 固定依赖方向为 App → Service → Platform 接口 ← Impl → Vendor。`impl_bsp` 只处理器件协议并隔离 HAL、RTOS 与板级绑定；`impl_bsp_handler` 承担实例生命周期、队列/工作循环、缓存、重试和回调。组合根不得复制 Handler 的业务缓存，也不得承载协议状态机。
- Vendor 底座（`vendor_*`）由目标工程 Git 统一管理整个 `05_Vendor/`：`vendor_mcu`、`vendor_rtos` 完整保留，`vendor_middleware`、`vendor_algorithm` 按需保留，`vendor_metadata` 登记来源/版本/许可证/生成器/补丁/依赖；插件仓库不携带目标工程 Vendor 实际源码。Service 携带业务策略，机制留在 Impl，且只能通过 Platform/Impl 接入 Vendor。
- 生成 Platform/Impl 切片前先输出设备 profile、Ops 映射、资源生命周期、阻塞/ISR 限制、`style-profile.md` 适用范围和未验证项；缺少目标 `osal.h`、Platform 公共头或板级绑定证据时，标记 `UNRESOLVED_OSAL_API`（或相应未解析标记），不得伪称可编译。

## 4. Skill 路由与协作

`workflow-requirements-router` 生成的 RCP 固定交接给 `workflow-review-gate`（必经审查门禁）；审查按 `spec_rigor` 放行：`prototype` 不进入代码链路，`lightweight` 允许单项局部链路，`full` 由 `workflow-integration-plan` 生成并审查 `plan.md`，记录阶段级 Agent/Skill 基线，再由 `workflow-task-breakdown` 自动生成带任务级分配的 `task.md`，交给 `workflow-task-execution` 以 `auto_until_final_check` 模式按依赖连续复核分配并执行；每项任务只有一个主实现 Skill，必要的协作 Agent/辅助 Skill 只能提供知识、审查或验证，不得并行改代码；普通失败由 AI 自动诊断、修复并复测，只有需要新增用户决策的硬阻塞才暂停；不把归档 Skill 当作活动入口。

| 请求类型 | 实现 Skill | 边界 |
|---|---|---|
| 需求澄清与约束收集 | `workflow-requirements-router` | 生成 RCP，不做设计或实现 |
| 所有请求的 RCP（必经审查门禁） | `workflow-review-gate` | 按风险选择 Spec 力度；`lightweight/full` 在 Review-Package 内保留四个审查章节并按需整合 `spec.md`，`prototype` 只保留最小目标/临时边界；四张清单不单独输出到实际工程，判定放行/阻塞 |
| 放行后的集成规划与分发 | `workflow-integration-plan` | `full` 生成两个易懂方案供用户选择，`lightweight` 生成一个紧凑方案；审查后输出 `plan.md` 并分发任务/实现 Skill；代码就绪后交接 `workflow-final-review` |
| 计划任务拆解 | `workflow-task-breakdown` | 读取 `spec.md`、审查通过的 `plan.md` 和项目文件，拆分有顺序、可独立验证的任务并输出 `task.md`；未达到可交付前不得执行实现 |
| 自动任务执行 | `workflow-task-execution` | Plan 用户批准后按 `task.md` 依赖连续执行，逐项先补测试、实现、AI 审查、验证和状态回写；普通失败自动修复复测，需新增用户决策的硬阻塞才暂停 |
| 最终代码、补丁或 diff 的独立 Review 编排（输出前最后一层门禁） | `workflow-final-review` | 强制执行格式/注释初检；失败时仅作格式与必要注释整改并复检，复检通过才放行 |
| 代码注释、格式、代码审查、Cppcheck/MISRA 质量门禁 | `tools-quality` | 中间阶段使用 `advisory` 返回质量证据；最终审查使用 `final-gate` 作为代码质量最终出口 |
| Map/RAM/ROM/栈分析、Unity 与项目验证 | `tools-verification` | 编排项目级内存、主机测试、构建和目标验证证据，区分证据等级 |
| App、Service、Platform、Impl、Vendor | 对应 canonical Skill | 按层公开契约实现，禁止跨层绕过 |
| Platform MCU 到芯片/HAL/SDK 的适配 | `platform_mcu` + `impl_mcu` | 先判定 flat/object profile；逻辑 ID 与物理资源分离，HAL 只留在 Impl |
| 烧录、调试、观测和发布 | `tools-flash`、`tools-debug`、`tools-observability`、`tools-release` | 先确认工具、产物、目标和观测通道 |

`embedded-lead` 负责协调需求、冲突和风险；按需邀请 `system-architect`、`firmware-engineer`、`hardware-integration`、`toolchain-engineer`、`verification-engineer` 或 `knowledge-engineer`。每个参与者只陈述本领域证据，并输出 Summary、Evidence、Changed files、Tests、Artifacts、Blockers 和 Next handoff。

### Codex 最终质量整改闭环

对 Codex 产出的最终代码、补丁或 `git diff`，`workflow-final-review` 的只读
Review 结论之外，必须执行以下宿主专项闭环。此规则仅覆盖格式和注释质量，
不授权修改逻辑、接口、资源生命周期、错误处理或分层设计。

1. **强制初检**：中间阶段可调用 `tools-quality(mode: advisory)` 检查变更范围的格式和注释；最终放行前必须调用 `tools-quality(mode: final-gate)`，并按需运行 Cppcheck/MISRA。
   风格优先级为用户明确要求、目标工程已确认的 `.clang-format`/`.editorconfig`
   或等效构建配置、相邻源码，最后才是 `style-profile.md` 基线。记录命令、绝对
   `cwd`、工具版本、退出码、检查范围与每个问题的 `relative/path:line`。
2. **必要注释判定**：补齐项目规范要求的文件/模块说明、公开 API 的 Doxygen、参数和
   返回值，以及表达所有权、阻塞/ISR/DMA/并发、硬件约束、错误恢复或非显然步骤所必需的
   注释。不得为逐行翻译代码、推测硬件事实，或用注释掩盖功能问题；注释语言遵从项目约定，
   未约定时使用中文。
3. **受限整改**：初检发现格式或必要注释缺失时，允许直接写回目标变更文件，但只能进行
   格式化和补充/更正注释。整改前后必须审阅 `git diff`，确认没有改动函数签名、控制流、
   常量/宏取值、数据结构、资源/错误路径、包含依赖或分层关系。发现任何超出此范围的差异，
   立即回退该次整改并以 `阻塞` 交回对应实现 Skill，不得在最终门禁中顺带修复。
4. **同条件复检**：对整改后的同一文件范围，用初检采用的同一格式工具和注释清单复检；
   同时执行 `git diff --check`。适用且已有可复现入口时，再执行原有主机测试或构建，
   并如实区分静态、主机、构建、目标运行与实物证据。工具不可用、检查无法复现或任一
   格式/注释项仍失败，最终结论必须为 `阻塞`。
5. **放行条件与记录**：只有初检问题已被限定整改、差异范围确认无行为变化、同条件复检
   及 `git diff --check` 全部通过时，才可给出 `通过`。最终报告必须同时保留初检问题、
   整改文件和理由、整改后差异审阅、复检命令/退出码与未验证项；不得把这些静态或主机
   结果表述为目标板或实物验证。

## 5. 验证与运行记录

- 执行前声明工具仓库和固件仓库的绝对根目录；每条命令记录绝对 `cwd`、退出码、产物绝对路径与 SHA-256、证据等级和重试次数。
- 对生成外设切片，先运行 `npm run validate:layer -- --root <firmware-root> --core <core> --device-type <type> --device <device>`，再运行分层检查、格式检查、主机 Fake 测试和目标构建。无参数的层级检查不能替代针对目标切片的校验。
- 质量结论应分层记录：Mock/主机测试验证逻辑与错误注入；目标板 RTT/串口验证真实运行；逻辑分析仪或 DWT 验证时序、DMA、IRQ。任何一个层级通过都不自动证明其余层级。
- 对既有基线问题，报告基线数、当前数与新增差异；只有零新增才可称本阶段没有引入新的门禁问题。

## 6. 学习与输出能力

使用嵌入式真实代码进行学习时，Codex 应持续训练以下能力：

- 输出有证据、有结构、有边界的技术文档。
- 将源码分析整理成可发布的技术博客，而不是只给出零散解释。
- 通过问题拆解、反例、复述和小练习培养可以教会别人的能力。
- 在解释架构时同时训练模块边界、数据流、时序、异常路径和验证闭环。
- 在每次教学结束时指出仍缺少的证据和下一步可验证动作。
- 学习辅导遵循“基础概念 → 工程观察 → 最小推理 → 原题复答”，一次只问一个问题；笔记只记录已确认的理解和证据，不记录原始对话或 AI 批改过程。
- 向 Obsidian 写入前必须展示完整草稿、Vault、相对目录、文件名、覆盖决定和差异，并取得用户明确确认；默认不覆盖已有笔记。

## 7. 写入与交接

- Codex 特化写入范围：`codex/`、Codex 适配测试，以及由脚本生成的 `AGENTS.override.md`。
- 发现公共规则缺陷时，记录问题和证据，不在 Codex 特化任务中直接修改 `common/`。
- 交接必须说明：已读取的证据、已修改的 Codex 文件、未验证的项目条件和下一步动作。
- 提交前至少运行 Codex 相关测试、插件校验和 `git diff --check`；在混合工作区仅暂存本任务文件，禁止使用 `git add -A`。
