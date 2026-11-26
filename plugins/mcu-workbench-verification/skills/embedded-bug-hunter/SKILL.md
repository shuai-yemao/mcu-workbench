---
name: embedded-bug-hunter
description: >-
  用于在已有嵌入式固件工程中发现深层缺陷、可疑模式和不合理设计风险。适用于用户要求检查或审计 C/C++ 固件、STM32/ESP-IDF/RTOS/BSP/驱动/协议/存储代码，排查隐藏
  bug，评审高风险模块，识别竞态、状态机缺陷、ISR/RTOS/DMA/Flash/协议问题，或在修改代码前输出聚焦的 bug 排查报告。该 skill
  设计为轻量流程：收集候选证据，深入阅读高风险热点，并在不直接改代码的前提下报告发现。
---

# Embedded Bug Hunter

## 概览

在已有嵌入式固件工程中排查深层 bug 和设计风险。先用轻量扫描收集候选热点，再深入阅读最可能出问题的源码，最后给出有证据边界的发现。

这个 skill 不证明工程“没有 bug”。它的目标是缩小注意力范围，并区分已确认问题、可疑模式和设计异味。

## 工作流

1. 确定范围：
   - 判断用户要做的是全工程初筛、模块评审、特定 bug 类型评审，还是变更风险评审。
   - 尽量获取或推断工程根目录、目标模块、疑似症状、日志、构建输出、测试输出、map/ELF 报告或近期 diff。
   - 排查 bug 时不要编辑代码，除非用户明确要求进入后续修复步骤。

2. 收集候选证据：
   - 优先运行 `scripts/collect_bug_hunt_context.py --project-root <project>`。
   - 用 `--focus` 做定向扫描，例如 `rtos`、`isr`、`protocol`、`flash`、`dma`、`memory`、`timeout` 或 `state`。
   - 用 `--include` 和 `--exclude` 聚焦应用代码，减少第三方 SDK 噪声。
   - 用 `--danger-api` 标记项目特有的高风险封装，例如 `LOG_Printf`、`Flash_Save`、`Protocol_Copy` 或自定义锁 API。
   - 把脚本输出当作候选证据。正则或关键词命中本身不是 bug。
   - 如果存在 `.ai/LLM_RULES.md`、`.ai/LLM_BOUNDARY.md`、`.ai/TEAM_RULES.md` 或 `.ai/PROJECT_STATUS.md`，在建议修复或高风险后续动作前先阅读。

3. 深入阅读热点：
   - 在写发现前，阅读高优先级命中点周围的源码。
   - 跟踪“外部输入 -> 校验 -> 状态更新 -> 内存/Flash/驱动/RTOS 操作”的路径。
   - 阅读 `references/bug-patterns.md`，按嵌入式 bug 模式核查。
   - 阅读 `references/review-rubric.md`，再判断严重度和置信度。

4. 输出聚焦报告：
   - 使用 `assets/bug-hunt-report-template.md` 作为报告结构。
   - 包含高风险区域、发现、设计异味、证据限制和建议验证。
   - 每项归类为 `confirmed_issue`、`suspicious_pattern`、`design_smell`、`needs_runtime_evidence` 或 `false_positive_risk`。
   - 列出已经深入阅读的文件。未深入阅读的命中不要归为 `confirmed_issue`。
   - 没有证据时，不声称已经完成硬件验证、时序验证、根因确认或回归闭环。

5. 必要时转交其他 skill：
   - 用 `static-analysis` 运行 cppcheck、clang-tidy、GCC analyzer 或 MISRA 检查。
   - 用 `rtos-debug` 获取任务、栈、水位或死锁等运行时证据。
   - 用 `memory-analysis` 分析 map/ELF 的内存压力或符号大小证据。
   - 修复生产代码前先用 `embedded-llm-guardrails`。
   - 发现问题后用 `embedded-unit-test-generator` 生成回归测试。
   - 需要正式变更报告时用 `embedded-change-report`。

## 命令

全工程扫描：

```bash
python <skill-dir>/scripts/collect_bug_hunt_context.py --project-root .
```

定向扫描：

```bash
python <skill-dir>/scripts/collect_bug_hunt_context.py --project-root . --focus rtos,protocol,timeout
```

聚焦应用代码扫描：

```bash
python <skill-dir>/scripts/collect_bug_hunt_context.py --project-root . --include "Core/Src,App" --exclude "Drivers,Middlewares" --context-lines 3
```

项目特定高风险 API 扫描：

```bash
python <skill-dir>/scripts/collect_bug_hunt_context.py --project-root . --danger-api "LOG_Printf,Flash_Save,Protocol_Copy"
```

写出 JSON 结果：

```bash
python <skill-dir>/scripts/collect_bug_hunt_context.py --project-root . --focus flash,dma --output bug-hunt-context.json
```

## 输出规则

- 使用用户要求的语言；中文请求默认用简体中文。
- 报告保持紧凑，并以证据为中心。
- 未阅读周边源码时，绝不能把扫描命中当作已确认 bug。
- 至少直接阅读过相关源码文件后，才可以输出 `confirmed_issue`。
- 每个发现都要包含位置、风险原因、置信度、误报风险和验证建议。
- 使用稳定标签：`confirmed_issue`、`suspicious_pattern`、`design_smell`、`needs_runtime_evidence`、`false_positive_risk`。
- 首要动作不要建议大范围重构。优先给出能确认或排除风险的最小验证步骤。
- 排查 bug 阶段不要改代码，除非用户明确要求单独进入修复步骤。

## Agent 兼容性

- Codex 调用方式：`$embedded-bug-hunter`
- Claude Code 调用方式：`/embedded-bug-hunter`
- Codex 安装路径：`%USERPROFILE%\.codex\skills\embedded-bug-hunter`
- Claude Code 个人安装路径：`%USERPROFILE%\.claude\skills\embedded-bug-hunter`
- Claude Code 项目内安装路径：`<project-root>\.claude\skills\embedded-bug-hunter`
- 在安装、分享或复制到其他 agent 前阅读 `README.md`。

## 资源

- 使用和安装指南：`README.md`
- Bug 模式清单：`references/bug-patterns.md`
- 严重度与置信度评分准则：`references/review-rubric.md`
- 报告模板：`assets/bug-hunt-report-template.md`
- 候选扫描器：`scripts/collect_bug_hunt_context.py`
