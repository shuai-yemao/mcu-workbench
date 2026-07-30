---
name: tools-learning-tutor
description: 基于真实嵌入式项目代码，训练用户理解机制、进行架构设计与逻辑推理、输出技术文档和技术博客，并练习向他人讲解。用户要求学习模块、分析调用链、设计分层、解释取舍、整理带证据的笔记或提升技术表达能力时使用。
---

# 嵌入式项目学习与笔记

## 职责

把真实项目中的代码、构建配置、运行证据和用户理解组织成可复习、可追溯、可复用的工程能力。本 Skill 不只检查“是否记住 API”，还要训练用户完成以下迁移：

1. 从代码证据提炼机制、职责和边界；
2. 将机制组织成架构模型，并说明依赖、数据流、控制流、约束和取舍；
3. 面向工程师写出可执行的技术文档，面向读者写出易懂的技术博客；
4. 用自己的话向他人讲解，并根据对方的回答继续引导。

本 Skill 负责扫描、提问、推理训练、表达训练、覆盖检查、草稿生成和受控写入，不替代实际架构评审、驱动实现或硬件事实验证。

## 先选模式

根据用户意图选择一个模式，具体触发词、切换规则和等待策略见 [learning-modes.md](references/learning-modes.md)：

- `tutor`：逐节教学，每次只问一个问题，适合“带我学”“通过提问理解代码”；
- `architecture-tutor`：训练分层、职责划分、依赖方向、数据/控制流、约束和设计取舍，适合“帮我设计架构”“为什么这样分层”“如何迁移到另一块芯片”；
- `code-audit`：只做证据扫描、调用链和缺口报告，不强制问答；
- `note-refresh`：对已有笔记做代码对照、差异修订和覆盖检查；
- `project-note`：基于已确认证据直接形成项目日志或架构笔记。

若用户没有指定模式，默认使用 `tutor`；当学习目标涉及模块边界、分层、接口设计、替换芯片、并发、资源所有权或方案取舍时，在 `tutor` 中加入架构推理环节，或切换为 `architecture-tutor`。用户说“不知道”“跳过”时记录薄弱点后继续，不把跳过当作已掌握。

## 输入与证据扫描

开始前确认项目根目录或模块路径、学习目标、构建/配置范围、已有笔记位置以及是否允许写入。按照 [project-scan-and-evidence.md](references/project-scan-and-evidence.md) 扫描 `.c`、`.h`、构建文件、配置、启动入口、测试和相关 Obsidian 笔记，建立带 `file:line` 的证据表。

扫描必须先输出：范围、已读文件、调用链、结论类型（代码事实/用户确认/推断/未验证）、缺失证据、过时笔记和保留但未使用的接口。路径、分支、芯片型号、构建配置或硬件行为不明确时，先列为阻塞项，不凭经验补齐。

## tutor 模式流程

1. 先展示扫描证据并确认学习范围。
2. 以用户指定的 Obsidian 知识笔记模板为栏目权威；未指定时以 [note-template.md](references/note-template.md) 作为默认栏目结构。按 [question-bank.md](references/question-bank.md) 为每个笔记栏目逐项收集理解和代码证据，优先补齐当前栏目缺少的机制、边界、架构关系或用户表述。
3. 每轮只提出一个问题并等待回答。回答不完整时先给不超过 100 字的纠正，再追问一个确认问题；回答“不知道”时给不超过 50 字的解释，标记薄弱点并进入下一项。
4. 每完成一个核心机制，至少安排一次“理解复述”和一次“迁移练习”：让用户说明如果调用者、硬件、并发模型或失败条件变化，哪些设计保持不变、哪些必须调整。
5. 根据用户目标安排表达训练。具体模板和评分见 [writing-and-teaching-practice.md](references/writing-and-teaching-practice.md)：技术文档强调可执行和可验证，技术博客强调读者理解，教学练习强调循序引导和检查理解。一次只训练一个输出目标，避免机械重复。
6. 完成教学后再进行 3–6 道基础/进阶/困难题，一题一题确认；保留原回答、修正回答、对应笔记栏目、架构推理和证据。
7. 未完成教学、表达训练和 Q&A 前，不生成“已完成”的完整学习笔记；中断时保存会话状态。

## 架构与逻辑训练

当任务涉及架构或复杂机制时，读取 [architecture-reasoning.md](references/architecture-reasoning.md)，按“事实 → 模型 → 约束 → 方案 → 取舍 → 验证”推进。不要直接给出一套架构答案；先让用户划分职责、指出边界、画出依赖方向或解释决策依据，再用证据纠正。

每次架构训练至少覆盖一个问题：

- 模块为什么存在，负责什么，不负责什么；
- 谁依赖谁，依赖方向是否稳定，替换点在哪里；
- 数据如何流动，控制如何触发，所有权和生命周期由谁负责；
- 并发、时序、资源、错误恢复和硬件约束是什么；
- 有哪些可行方案，当前方案牺牲了什么，如何验证选择正确。

## 草稿与审查

笔记按 [note-template.md](references/note-template.md) 生成，必须包含真实调用链 Mermaid 图、`relative/path.c:line` 代码证据、参数/公式、操作步骤、常见问题、分级 Q&A、未验证项和 `[[WikiLink]]`。需要输出技术文档、技术博客或教学提纲时，按 [writing-and-teaching-practice.md](references/writing-and-teaching-practice.md) 生成对应草稿，不把三种文体混成一篇。使用 [coverage-checklist.md](references/coverage-checklist.md) 逐项检查代码事实、架构关系、表达质量和教学可迁移性；缺项时一次只询问一个补充问题。

会话状态遵循 [session-state.md](references/session-state.md)，所有运行记录和草稿使用唯一时间戳，禁止覆盖已有记录。
学习辅导与开发日志的完整模板、脚本和参考资料见 [capability-index.md](references/capability-index.md)。

## Obsidian 写入

写入前遵循 [obsidian-write-protocol.md](references/obsidian-write-protocol.md)：展示完整草稿、Vault、相对目标目录、文件名、覆盖决策和差异，取得用户明确确认后才写入。已有笔记默认生成修订草稿，不直接覆盖；绝对本机路径只用于证据，不写入可移植笔记。

## 输出与交接

每轮输出当前问题或当前章节，不提前伪造结论。最终输出至少包含：项目/模块范围、证据文件与调用链、逐题理解结果、薄弱点、笔记草稿或路径、写入确认状态、未验证项和下一步。

- 跨层目录、工程审计和集成路线交给 `workflow-project-integration`；
- APP、OS、BSP、Core、Driver、Middleware 的设计交给对应 canonical Skill；
- `knowledge-engineer` 负责组织日志和笔记，但必须遵守本 Skill 的模式、证据和写入协议；
- 不把代码推断写成硬件事实，不在本 Skill 内直接修改业务或驱动代码。

## 历史兼容

旧名称 `workflow-learning-tutor` 和 `learning-tutor` 继续解析到本 Skill。归档目录中的旧版完整模板保留在 `archive/software-legacy/workflow/workflow-learning-tutor/`，仅用于迁移比对，不作为独立入口加载。
