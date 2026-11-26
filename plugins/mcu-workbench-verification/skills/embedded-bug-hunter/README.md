# Embedded Bug Hunter 使用指南

本文说明如何在 Codex 和 Claude Code 中安装并使用 `embedded-bug-hunter` skill。文档保存在 skill 目录内，方便后续 LLM agent 不依赖聊天记录也能发现工作流。

## 用途

使用本 skill 检查已有嵌入式固件工程中的深层 bug、可疑模式和不合理设计风险。

它可以帮助：

- 在改代码前发现高风险固件热点。
- 围绕内存、超时、ISR、RTOS、DMA、Flash、协议解析、看门狗和状态机逻辑扫描候选模式。
- 区分 `confirmed_issue`、`suspicious_pattern`、`design_smell`、`needs_runtime_evidence` 和 `false_positive_risk`。
- 输出紧凑的 bug 排查报告，包含证据、置信度、误报风险和验证建议。

本 skill 不证明项目没有 bug，也不会直接编辑代码。扫描命中在深入阅读周边源码前都只是 `candidate_impact`。

## 目录结构

```text
embedded-bug-hunter/
  SKILL.md
  README.md
  agents/openai.yaml
  scripts/
    collect_bug_hunt_context.py
  references/
    bug-patterns.md
    review-rubric.md
  assets/
    bug-hunt-report-template.md
```

## 安装到 Codex

Codex 会从 Codex skills 目录发现个人 skill。在这台 Windows 机器上，预期个人安装路径为：

```text
%USERPROFILE%\.codex\skills\embedded-bug-hunter
```

从当前开发副本用 PowerShell 安装：

```powershell
$src = 'N:\AI\embedded_skill\embedded-bug-hunter'
$dst = "$env:USERPROFILE\.codex\skills\embedded-bug-hunter"
New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
Copy-Item -LiteralPath $src -Destination $dst -Recurse -Force
```

重启 Codex 或开启新的 Codex 会话，让 skill 列表刷新。显式调用示例：

```text
$embedded-bug-hunter 检查这个固件工程的深层 bug 和不合理设计风险。不要修改代码，先输出带证据和置信度的 bug-hunt 报告。
```

## 安装到 Claude Code

Claude Code 支持个人 skill 和项目内 skill。

Windows 上的个人安装路径：

```text
%USERPROFILE%\.claude\skills\embedded-bug-hunter
```

项目内安装路径：

```text
<project-root>\.claude\skills\embedded-bug-hunter
```

PowerShell 个人安装：

```powershell
$src = 'N:\AI\embedded_skill\embedded-bug-hunter'
$dst = "$env:USERPROFILE\.claude\skills\embedded-bug-hunter"
New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
Copy-Item -LiteralPath $src -Destination $dst -Recurse -Force
```

PowerShell 项目内安装：

```powershell
$src = 'N:\AI\embedded_skill\embedded-bug-hunter'
$project = 'E:\your\firmware\project'
$dst = Join-Path $project '.claude\skills\embedded-bug-hunter'
New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
Copy-Item -LiteralPath $src -Destination $dst -Recurse -Force
```

Claude Code 通过 slash command 调用 skill。安装后使用：

```text
/embedded-bug-hunter 检查这个固件工程的深层 bug 和设计风险。在深入阅读源码前，将扫描命中保持为 suspicious_pattern。
```

Claude Code 通常会监听已有 skill 目录的变化。如果会话启动时顶层 skills 目录还不存在，请重启 Claude Code。

## 推荐使用流程

以下命令在目标嵌入式工程根目录运行。将 `<skill-dir>` 替换为已安装 skill 的路径。

### 1. 收集 bug 排查上下文

全工程扫描：

```powershell
python <skill-dir>\scripts\collect_bug_hunt_context.py `
  --project-root . `
  --output bug-hunt-context.json
```

定向扫描 bug 类别：

```powershell
python <skill-dir>\scripts\collect_bug_hunt_context.py `
  --project-root . `
  --focus memory,timeout,isr,rtos,dma,flash,protocol,state `
  --output bug-hunt-context.json
```

降低第三方代码噪声，并保留应用代码范围：

```powershell
python <skill-dir>\scripts\collect_bug_hunt_context.py `
  --project-root . `
  --include "Core/Src,App,Bsp,User" `
  --exclude "Drivers,Middlewares,CMSIS,lwIP,FreeRTOS/Source" `
  --context-lines 3 `
  --output bug-hunt-context.json
```

加入项目特定高风险封装：

```powershell
python <skill-dir>\scripts\collect_bug_hunt_context.py `
  --project-root . `
  --danger-api "LOG_Printf,Flash_Save,Protocol_Copy,OsLock" `
  --context-lines 3 `
  --output bug-hunt-context.json
```

提出结论前先检查这些字段：

- `ok`
- `warnings`
- `build_systems`
- `entry_points`
- `hints`
- `ai_boundary_files`
- `class_summary`
- `hotspots`
- `candidate_hits`
- `evidence_note`

所有扫描命中都是 `candidate_impact`。只有深入阅读周边源码后，才报告 `confirmed_issue`。

### 2. 深入阅读热点

阅读 `hotspots` 中排名靠前的文件。对每个候选命中检查：

- 调用方和被调方路径
- 外部输入来源
- 长度、超时和状态校验
- ISR/task 所有权
- 错误路径和恢复行为
- 证明问题所需的硬件或运行时证据

### 3. 输出 bug 排查报告

推荐 Codex prompt：

```text
$embedded-bug-hunter
Project root: E:\your\firmware\project
Context file: bug-hunt-context.json
Please deep-read the top hotspots, then produce a compact bug-hunt report.
Do not edit code.
Do not report confirmed_issue unless the source path was directly read and a plausible reachable path exists.
```

推荐 Claude Code prompt：

```text
/embedded-bug-hunter Project root: E:\your\firmware\project. Run the context collector, deep-read the top hotspots, and produce a bug-hunt report. Do not edit code.
```

## Prompt 示例

全工程初筛：

```text
$embedded-bug-hunter 检查这个 STM32 工程的深层 bug。重点关注内存、协议解析、ISR 安全、超时、Flash 持久化和 RTOS 风险。除非厂商 SDK 代码被项目修改，否则排除它。
```

模块评审：

```text
$embedded-bug-hunter Review App/protocol.c and related callers for hidden bugs. Treat length handling and state recovery as the main focus. Mark all scanner-only results as suspicious_pattern.
```

按症状排查：

```text
/embedded-bug-hunter 设备在 CAN 流量突增后偶尔无响应。排查可能的死锁、队列溢出、ISR 误用、超时和解析器状态风险。提出修复前先输出证据和验证步骤。
```

变更风险评审：

```text
$embedded-bug-hunter Review the current diff for deep embedded risks before merge. Focus on flash writes, watchdog behavior, RTOS synchronization, and protocol compatibility. Do not modify files.
```

## 发现标签

使用稳定标签：

- `confirmed_issue`：源码阅读显示存在具体缺陷路径或被违反的不变量。
- `suspicious_pattern`：存在风险模式，但缺少上下文，暂不能确认。
- `design_smell`：设计容易引入后续 bug，即便当前未证明直接缺陷路径。
- `needs_runtime_evidence`：静态阅读不足，需要日志、调试器、硬件或压力测试。
- `false_positive_risk`：扫描命中很可能是良性情况，或已在其他位置有意处理。

不要仅凭扫描输出把条目标为 `confirmed_issue`。

## 典型输入

最低信息：

- 嵌入式工程根目录
- 期望范围：全工程、模块、bug 类别、症状或 diff

强烈建议提供：

- 最近的 bug 症状或现场报告
- 构建日志或编译告警
- 串口/CAN/Modbus 日志
- 测试日志
- Map/ELF 报告
- 近期 diff 或 commit 范围
- 已知的项目特定高风险 API
- 应排除的厂商或生成代码目录

## AI 通常能发现什么

本 skill 通常能发现：

- 常见嵌入式构建系统标记
- main 文件、startup 文件、链接脚本
- ISR/callback、RTOS、协议、存储、DMA 和测试文件名线索
- 项目内 `.ai` 边界和状态文件
- 来自正则和自定义 API 扫描的候选高风险行
- 按命中类型和严重度线索排序的热点

本 skill 不能可靠发现：

- 每个候选命中是否都是真 bug
- 复杂调用链中的跨模块数据流
- 运行时调度、时序或硬件行为
- 宏展开行为和条件编译真实分支
- 厂商代码是否被有意打补丁
- 发布就绪度或客户影响

## 安全与证据边界

- 把扫描输出当作初筛，不当作证明。
- 报告 `confirmed_issue` 前必须深入阅读源码。
- 首轮扫描优先排除第三方或生成目录。
- 每个发现都包含误报风险。
- 没有证据时，不声称已经完成构建、测试、硬件验证、时序验证或根因确认。
- 修复交给 `embedded-llm-guardrails`。
- 静态工具检查交给 `static-analysis`。
- RTOS 运行时证据交给 `rtos-debug`。
- 内存/map 证据交给 `memory-analysis`。
- 回归测试交给 `embedded-unit-test-generator`。

## 校验

校验 skill 目录本身：

```powershell
$env:PYTHONUTF8='1'
python C:\Users\kemp\.codex\skills\.system\skill-creator\scripts\quick_validate.py `
  N:\AI\embedded_skill\embedded-bug-hunter
```

预期结果：

```text
Skill is valid!
```

编译检查内置脚本：

```powershell
python -m py_compile `
  <skill-dir>\scripts\collect_bug_hunt_context.py
```

冒烟测试上下文收集器：

```powershell
python <skill-dir>\scripts\collect_bug_hunt_context.py `
  --project-root . `
  --focus memory,timeout,isr,rtos,dma,flash,protocol,state `
  --context-lines 3
```

## 打包说明

发布或复制到其他机器前，如果存在本地校验或缓存目录，可移除：

```text
.tmp_validation/
scripts/__pycache__/
```

这些目录不是运行所需内容。

## 参考

- Agent Skills overview: https://agentskills.io/
- Claude Code skills documentation: https://docs.anthropic.com/en/docs/claude-code/skills

## 典型输出

- bug-hunt 报告。
- 已深读文件列表、风险分类、证据、置信度和验证建议。

## 常用命令

```bash
python <skill-dir>/scripts/collect_bug_hunt_context.py --project-root .
```

## 故障排查

- 如果 skill 未被发现，确认安装路径下存在 `SKILL.md` 并重启会话。
- 如果扫描结果过多，使用 `--include`、`--exclude` 和 `--focus` 缩小范围。
