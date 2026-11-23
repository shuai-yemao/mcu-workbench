# embedded-team-sync 使用说明

## 用途

`embedded-team-sync` 用于维护嵌入式团队的轻量协作状态，包括团队规则、当前项目状态、共享 skill/工具登记和任务日志。它不是完整项目管理系统，而是让工程师和 LLM 在同一个项目中快速同步上下文。

## 安装到 Codex

个人安装路径：

```text
%USERPROFILE%\.codex\skills\embedded-team-sync
~/.codex/skills/embedded-team-sync
```

PowerShell 安装示例：

```powershell
$src = 'N:\AI\embedded_skill\embedded-team-sync'
$dst = "$env:USERPROFILE\.codex\skills\embedded-team-sync"
New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
Copy-Item -LiteralPath $src -Destination $dst -Recurse -Force
```

Codex 调用：

```text
$embedded-team-sync
```

## 安装到 Claude Code

个人安装路径：

```text
%USERPROFILE%\.claude\skills\embedded-team-sync
~/.claude/skills/embedded-team-sync
```

项目本地安装路径：

```text
.claude/skills/embedded-team-sync
```

PowerShell 安装示例：

```powershell
$src = 'N:\AI\embedded_skill\embedded-team-sync'
$dst = "$env:USERPROFILE\.claude\skills\embedded-team-sync"
New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
Copy-Item -LiteralPath $src -Destination $dst -Recurse -Force
```

Claude Code 调用：

```text
/embedded-team-sync
```

## 典型输入

- 项目根目录。
- 团队编码规则、提交规则、验证规则和 AI 使用边界。
- 当前任务目标、允许修改文件、禁止区域、验证计划和完成结果。

## 典型输出

- `.ai/TEAM_RULES.md`
- `.ai/PROJECT_STATUS.md`
- `.ai/SKILL_REGISTRY.md`
- `.ai/TASK_LOG.md`
- 任务开始说明、完成记录和交接快照。

## 推荐使用流程

- 先阅读 `SKILL.md`。
- 初始化 `.ai/` 协作文件。
- 开始任务前读取 `TEAM_RULES.md` 和 `PROJECT_STATUS.md`。
- 完成任务时追加 `TASK_LOG.md`，必要时更新 `PROJECT_STATUS.md`。
- 需要交接时生成 snapshot。

## 常用命令

```bash
python <skill-dir>/scripts/init_team_sync.py --project-root .
python <skill-dir>/scripts/start_task_note.py --project-root . --goal "修复 CAN RX 溢出" --allowed-files "Src/can_app.c,Inc/can_app.h" --validation-plan "Keil build, CAN RX smoke test"
python <skill-dir>/scripts/summarize_team_sync.py --project-root .
```

## 安全与证据边界

- `TASK_LOG.md` 默认 append-only。
- 不编造构建、测试、烧录、硬件验证或评审结果。
- 涉及生产代码或硬件行为修改时，先遵守项目边界和 guardrails。

## 故障排查

- 如果 Codex 没有发现 skill，确认 `%USERPROFILE%\.codex\skills\embedded-team-sync\SKILL.md` 存在，然后重启会话。
- 如果 Claude Code 没有发现 skill，确认 `%USERPROFILE%\.claude\skills\embedded-team-sync\SKILL.md` 或 `.claude\skills\embedded-team-sync\SKILL.md` 存在，然后重启会话。
- 如果 `.ai/` 文件没有生成，确认脚本从项目根目录运行，并检查是否已有同名文件被保留。
