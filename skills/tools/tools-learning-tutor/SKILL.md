---
name: tools-learning-tutor
description: 基于真实嵌入式项目代码进行交互式学习、代码审计、理解检查和 Obsidian 笔记生成。用户要求通过提问掌握模块、分析项目调用链或整理带证据的学习笔记时使用。
---

# 嵌入式项目学习与笔记

## 职责

把真实项目中的代码、构建配置、运行证据和用户理解组织成可复习、可追溯的知识产物。本 Skill 负责扫描、提问、覆盖检查、草稿生成和受控写入，不替代架构设计、驱动实现或硬件事实验证。

## 先选模式

根据用户意图选择一个模式，具体触发词、切换规则和等待策略见 [learning-modes.md](references/learning-modes.md)：

- `tutor`：逐节教学，每次只问一个问题，适合“带我学”“通过提问理解代码”；
- `code-audit`：只做证据扫描、调用链和缺口报告，不强制问答；
- `note-refresh`：对已有笔记做代码对照、差异修订和覆盖检查；
- `project-note`：基于已确认证据直接形成项目日志或架构笔记。

若用户没有指定模式，默认使用 `tutor`；用户说“不知道”“跳过”时记录薄弱点后继续，不把跳过当作已掌握。

## 输入与证据扫描

开始前确认项目根目录或模块路径、学习目标、构建/配置范围、已有笔记位置以及是否允许写入。按照 [project-scan-and-evidence.md](references/project-scan-and-evidence.md) 扫描 `.c`、`.h`、构建文件、配置、启动入口、测试和相关 Obsidian 笔记，建立带 `file:line` 的证据表。

扫描必须先输出：范围、已读文件、调用链、结论类型（代码事实/用户确认/推断/未验证）、缺失证据、过时笔记和保留但未使用的接口。路径、分支、芯片型号、构建配置或硬件行为不明确时，先列为阻塞项，不凭经验补齐。

## tutor 模式流程

1. 先展示扫描证据并确认学习范围。
2. 按 [question-bank.md](references/question-bank.md) 依次覆盖定义、意义、场景、机制、参数/公式、操作、问题和分级 Q&A。
3. 每轮只提出一个问题并等待回答。回答不完整时先给不超过 100 字的纠正，再追问一个确认问题；回答“不知道”时给不超过 50 字的解释，标记薄弱点并进入下一项。
4. 完成教学后再进行 3–6 道基础/进阶/困难题，一题一题确认；保留原回答、修正回答和证据。
5. 未完成教学和 Q&A 前，不生成“已完成”的完整学习笔记；中断时保存会话状态。

## 草稿与审查

笔记按 [note-template.md](references/note-template.md) 生成，必须包含真实调用链 Mermaid 图、`relative/path.c:line` 代码证据、参数/公式、操作步骤、常见问题、分级 Q&A、未验证项和 `[[WikiLink]]`。使用 [coverage-checklist.md](references/coverage-checklist.md) 逐项检查结构体、公开 API、函数指针、配置宏、错误恢复、初始化/去初始化、上下文和模块关系；缺项时一次只询问一个补充问题。

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
