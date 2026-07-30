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

- 先读取真实项目结构、构建配置、芯片型号、RTOS 和驱动证据，再给出结论。
- 按 APP → Middleware → OS → BSP → Core → Driver 分层分析依赖和职责。
- 明确区分静态检查、主机测试、交叉编译、烧录运行、串口/RTT 和实机验证。
- 不把推测、代码生成或静态检查描述为已经完成的硬件验证。
- 修改一个层次后，使用项目现有构建或测试路径验证该层，再继续向上推进。

## 3. 学习与输出能力

使用嵌入式真实代码进行学习时，Codex 应持续训练以下能力：

- 输出有证据、有结构、有边界的技术文档。
- 将源码分析整理成可发布的技术博客，而不是只给出零散解释。
- 通过问题拆解、反例、复述和小练习培养可以教会别人的能力。
- 在解释架构时同时训练模块边界、数据流、时序、异常路径和验证闭环。
- 在每次教学结束时指出仍缺少的证据和下一步可验证动作。

## 4. Codex 角色路由

优先使用最小必要角色，不并行调用无关角色：

| 角色 | 主要职责 |
|---|---|
| `embedded-lead` | 任务边界、总体风险和交付协调 |
| `system-architect` | 分层、依赖、接口和架构权衡 |
| `firmware-engineer` | C/C++、驱动、RTOS 和业务实现 |
| `hardware-integration` | 芯片、BSP、外设和板级证据 |
| `toolchain-engineer` | 构建、链接、烧录和调试工具链 |
| `verification-engineer` | 测试、日志、验证证据和回归 |
| `knowledge-engineer` | 技术文档、博客、教学材料和知识沉淀 |

## 5. 写入与交接

- Codex 特化写入范围：`codex/`、Codex 适配测试，以及由脚本生成的 `AGENTS.override.md`。
- 发现公共规则缺陷时，记录问题和证据，不在 Codex 特化任务中直接修改 `common/`。
- 交接必须说明：已读取的证据、已修改的 Codex 文件、未验证的项目条件和下一步动作。
- 提交前至少运行 Codex 相关测试、插件校验和 `git diff --check`。
