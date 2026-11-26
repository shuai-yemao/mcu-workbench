---
name: embedded-change-report
description: >-
  用于为嵌入式固件、单片机、RTOS、BSP、外设驱动、通信协议、硬件验证或版本发布生成规范的工程变更报告。适用于用户要求编写或生成变更报告、发布报告、固件修改摘要、缺陷修复报告、验证报告、交付说明、commit
  影响分析、工程变更记录，或面向评审的嵌入式项目变更说明。该 skill 会从 Git diff、commit、构建日志、测试日志、串口/CAN/Modbus 日志、map/ELF
  内存报告和项目文件中收集证据，并生成可追溯报告，区分自动发现事实、工程推断、用户确认信息、验证证据、风险和待确认项。
---

# Embedded Change Report

为嵌入式项目生成工程级变更报告。把报告当作可追溯工件：每个结论都应来自自动发现的项目证据、明确标注的工程推断、用户确认的信息，或显式的“未提供 / 未验证”说明。

## 工作流

1. 从请求中识别报告类型：
   - 功能变更报告
   - 缺陷修复报告
   - 固件发布报告
   - 硬件验证报告
   - 评审 / 交付变更摘要
   - commit 或 branch 影响分析

2. 写报告前先收集证据：
   - 优先在工程根目录运行 `scripts/collect_change_context.py`。
   - 加入用户提供的构建日志、测试日志、串口日志、CAN/Modbus/VISA 日志、map 文件、ELF 报告、issue 文本或需求说明。
   - 如果证据不可用，继续使用已有材料，但必须明确标注缺口。
   - 信任收集结果前，先检查脚本字段 `ok`、`status`、`warnings` 和 `evidence_gaps`。
   - Git 或构建脚本错误会阻止强结论，不要把它们当作空 diff 或构建成功。

3. 按信息来源分类每个重要条目：
   - 判断什么能自动发现、什么只是工程推断、什么必须用户确认前，先读 `references/information-source-map.md`。
   - 报告中必要时使用三个标签：`自动发现`、`工程推断`、`用户确认 / 待用户确认`。
   - 永远不要把工程推断升级成已验证事实。

4. 分类嵌入式影响：
   - 当变更涉及 startup code、linker script、BSP、外设驱动、中断、DMA、RTOS 任务、电源、时钟、boot、Flash 布局、通信协议或硬件行为时，阅读 `references/embedded-risk-taxonomy.md`。
   - 判断验证证据是否充分时，阅读 `references/evidence-checklist.md`。

5. 选择输出结构：
   - 普通工程变更使用 `assets/change-report-template.md`。
   - 缺陷修复使用 `assets/fix-change-report-template.md`。
   - 发布或交付报告使用 `assets/release-change-report-template.md`。
   - 必填字段和措辞规则见 `references/report-schema.md`。

6. 起草报告：
   - 分离自动发现事实、工程分析、用户确认背景、验证证据、已知风险和待确认项。
   - 没有日志或用户证据时，不要声称硬件验证、时序验证、内存安全、通信兼容性、根因闭环、客户影响、发布批准或回归覆盖。
   - 证据冲突时直接呈现冲突，不要静默裁决。

7. 定稿前检查质量：
   - 高风险或面向发布的报告，阅读 `references/report-quality-rubric.md`。
   - 确保每个高风险嵌入式区域都有验证证据，或有明确的未解决风险说明。

## 证据收集

尽量在嵌入式工程根目录运行：

```bash
python <skill-dir>/scripts/collect_change_context.py --output change-context.json
```

常用选项：

```bash
python <skill-dir>/scripts/collect_change_context.py --base main --head HEAD --build-log build.log --test-log test.log --output change-context.json
python <skill-dir>/scripts/extract_build_summary.py --log build.log --output build-summary.json
python <skill-dir>/scripts/extract_git_evidence.py --base main --head HEAD --output git-evidence.json
```

如果项目没有 Git 历史，或 diff 范围不清楚，就改为收集文件列表、构建日志和用户提供的变更说明。只有当报告目的需要比当前证据更强的结论时，才要求补充缺失日志。

`collect_change_context.py` 会包含未跟踪 Git 文件，递归搜索常见嵌入式项目标记，并对日志预览中的明显 secret 做脱敏。对外分享报告前仍需复核原始日志；自动脱敏不是安全保证。

## 信息来源规则

- 自动发现信息可以来自项目文件、Git 元数据、构建日志、测试日志、通信日志、map/ELF 报告和仓库内已有文档。
- 工程推断可以来自文件路径、命名约定、代码结构、嵌入式常见模式和变更模块。必须标注为推断。
- 业务背景、需求意图、根因接受、硬件验证声明、客户影响、风险接受、发布批准和生产就绪度需要用户确认。
- 字段缺失但重要时，写 `未提供` 或 `待用户确认`；不要用看似合理的默认值补齐。

## 与其他嵌入式 Skill 集成

需要对应证据时使用这些 skill：

- `build-keil`、`build-iar`、`build-cmake`、`build-platformio` 或 `build-idf`：获取构建结果和产物。
- `memory-analysis`：分析 map/ELF 尺寸变化。
- `serial-monitor`、`can-debug`、`modbus-debug` 或 `visa-debug`：获取硬件和通信日志。
- `static-analysis`：提供 cppcheck、clang-tidy、GCC analyzer 或 MISRA 证据。
- `embedded-llm-guardrails`：当报告依赖项目 LLM 边界、受保护文件或安全规则时使用。

## 输出规则

- 使用用户要求的语言；中文请求默认用简体中文。
- 保留精确的文件路径、commit hash、告警数量、内存尺寸、协议 ID、寄存器地址和日志时间戳。
- 不受证据支持的声明标为 `未提供证据`、`未验证`、`基于 diff 的工程判断` 或等价表述。
- 与评审相关的未修改模块不能被隐藏。
- 发布、生产、bootloader、Flash 布局、通信或硬件相关变更要包含回滚指导。
- 除非用户要求其他格式，默认使用简洁 Markdown。

## Agent 兼容性

- Codex 调用方式：`$embedded-change-report`
- Claude Code 调用方式：`/embedded-change-report`
- Codex 安装路径：`%USERPROFILE%\.codex\skills\embedded-change-report`
- Claude Code 个人安装路径：`%USERPROFILE%\.claude\skills\embedded-change-report`
- Claude Code 项目内安装路径：`<project-root>\.claude\skills\embedded-change-report`
- 在安装、分享或复制到其他 agent 前阅读 `README.md`。

## 资源

- 安装和使用指南：`README.md`
- 工作流详情：`references/report-workflow.md`
- 信息来源地图：`references/information-source-map.md`
- 必填字段和措辞规则：`references/report-schema.md`
- 嵌入式风险类别：`references/embedded-risk-taxonomy.md`
- 证据充分性清单：`references/evidence-checklist.md`
- 最终质量准则：`references/report-quality-rubric.md`
- 通用模板：`assets/change-report-template.md`
- 缺陷修复模板：`assets/fix-change-report-template.md`
- 发布模板：`assets/release-change-report-template.md`
