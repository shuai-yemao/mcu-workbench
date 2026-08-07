<!-- GENERATED FILE: do not edit directly. -->
<!-- Source: codex/AGENTS.md -->
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

- 先由 `workflow-requirements-router` 将自然语言请求整理为可审计的需求约束包（RCP），并固定交接给 `workflow-review-gate`（必经审查门禁）；审查放行后由 `workflow-integration-plan` 完成分层/审计/迁移设计与实现层分发。Router 与门禁只负责约束、证据和交接，不代替架构设计、代码实现或验证。
- RCP 必须区分 `confirmed`、`user-confirmed`、`inferred`、`unverified`，并记录项目路径、分支/提交、芯片/板卡、软件环境、分层约束、验收标准和阻塞项。会影响实现或验收而无法从项目证实的问题，一次只向用户询问一个。
- 先读取真实项目结构、构建配置、芯片型号、RTOS 和驱动证据，再给出结论。
- 按 APP → Middleware → OS → BSP → Core → Driver 分层分析依赖和职责。
- 明确区分静态检查、主机测试、交叉编译、烧录运行、串口/RTT 和实机验证。
- 不把推测、代码生成或静态检查描述为已经完成的硬件验证。
- 修改一个层次后，使用项目现有构建或测试路径验证该层，再继续向上推进。

## 3. 分层实现与生成边界

- `app-architecture` 负责 `main`、Manager、Task、Logic、UI 和 Profile 的边界；APP 只能调用 OS Wrapper、BSP Wrapper 和 Middleware 公共 API，不能直接调用原生 RTOS、HAL、BSP Port 或 Driver。
- `drv_adapter_*.c/.h` 是 BSP Wrapper：只保存带 `void *context` 的抽象函数表、注册入口和稳定转发 API，不绑定平台对象。`drv_adapter_port_*.c/.h` 是 BSP Port：装配具体 Driver/Handler/Core 后端与已确认的 OSAL 资源，并在启动期注册到 Wrapper。
- 固定调用链为 APP → APP Facade（可选）→ Wrapper → Port 回调 → Handler → Driver → Core Bus。`User_Task/*/Platform/*_port/` 属于 APP Facade/Task Adapter，只能转发 Wrapper API。
- Driver 只处理器件协议并隔离 HAL、RTOS 与板级绑定；Handler 承担实例生命周期、队列/工作循环、缓存、重试和回调。Port 不得复制 Handler 的业务缓存，也不得承载协议状态机。
- 生成 BSP 切片前先输出设备 profile、Ops 映射、资源生命周期、阻塞/ISR 限制、注释 profile 和未验证项；缺少目标 `osal.h`、Core 公共头或板级绑定证据时，标记 `UNRESOLVED_OSAL_API`（或相应未解析标记），不得伪称可编译。

## 4. Skill 路由与协作

`workflow-requirements-router` 生成的 RCP 固定交接给 `workflow-review-gate`（必经审查门禁）；审查放行后由 `workflow-integration-plan` 完成分层/审计/迁移设计并只分发一个实现层 Skill；执行 agent 在执行中如需其他 Skill 的领域知识（分层约束、验收依据等），按需自行查阅，不预分配参考清单、不设数量上限；不把归档 Skill 当作活动入口。

| 请求类型 | 实现 Skill | 边界 |
|---|---|---|
| 需求澄清与约束收集 | `workflow-requirements-router` | 生成 RCP，不做设计或实现 |
| 所有请求的 RCP（必经审查门禁） | `workflow-review-gate` | 必选产出四张审查清单并重组为 BRD/PRD/SRSys 产品文档（`docs/requirements/`）供用户审查，判定放行/阻塞 |
| 放行后的集成规划与分发 | `workflow-integration-plan` | 分层/审计/迁移设计、文件级改造顺序，只分发一个实现层 Skill；代码就绪后交接 `workflow-final-review` |
| 最终代码、补丁或 diff 的独立 Review 编排（输出前最后一层门禁） | `workflow-final-review` | 按 profile 与门禁输出审查报告，不生成实现或自动修复 |
| 风格规则、静态检查和质量门禁 | `tools-quality` | 区分风格、功能和安全问题，是审查规则与工具来源 |
| APP、OS、BSP、Core、Middleware | 对应 canonical Skill | 按层公开契约实现，禁止跨层绕过 |
| 烧录、调试、观测和发布 | `tools-flash`、`tools-debug`、`tools-observability`、`tools-release` | 先确认工具、产物、目标和观测通道 |

`embedded-lead` 负责协调需求、冲突和风险；按需邀请 `system-architect`、`firmware-engineer`、`hardware-integration`、`toolchain-engineer`、`verification-engineer` 或 `knowledge-engineer`。每个参与者只陈述本领域证据，并输出 Summary、Evidence、Changed files、Tests、Artifacts、Blockers 和 Next handoff。

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
