---
name: embedded-team-sync
description: >-
  用于嵌入式团队协作开发时维护轻量级项目共享状态。适用于用户想初始化或更新 `.ai/` 协作文件、统一嵌入式团队开发规则、带明确编辑边界启动任务、在任务完成时记录变更文件和验证状态、维护共享 skill
  registry，或为嵌入式固件项目创建简洁交接快照。重点维护 TEAM_RULES.md、PROJECT_STATUS.md、SKILL_REGISTRY.md 和 TASK_LOG.md，不要发展成完整项目管理系统。
---

# Embedded Team Sync

为嵌入式固件项目维护轻量级团队协作状态。保持流程小而明确：共享规则、当前状态、共享 skills 和任务历史。

## 核心文件

本 skill 管理项目内 `.ai/` 目录下的四个文件：

```text
.ai/
  TEAM_RULES.md
  PROJECT_STATUS.md
  SKILL_REGISTRY.md
  TASK_LOG.md
```

- `TEAM_RULES.md`：团队编码格式、提交风格、编辑边界、验证规则和 AI 使用规则。
- `PROJECT_STATUS.md`：当前阶段、构建/测试/烧录状态、风险、阻塞项和下一步。
- `SKILL_REGISTRY.md`：项目可用的共享 skills、工具和脚本。
- `TASK_LOG.md`：用于交接和进度同步的 append-only 任务记录。

## 工作流

1. 初始化工作区：
   - 运行 `scripts/init_team_sync.py --project-root <project>`。
   - 从 `assets/` 生成缺失的 `.ai/` 文件。
   - 除非用户明确要求，不要覆盖现有文件。

2. 启动任务：
   - 读取 `.ai/TEAM_RULES.md` 和 `.ai/PROJECT_STATUS.md`。
   - 总结当前状态。
   - 优先运行 `scripts/start_task_note.py`，生成包含目标、允许文件、禁止区域、验证计划和待确认项的任务确认说明。
   - 如果任务会编辑生产代码或硬件行为，在可用时使用 `embedded-llm-guardrails`。

3. 完成任务：
   - 记录变更文件、验证证据、结果、风险和下一步。
   - 运行 `scripts/update_task_log.py` 追加任务条目。
   - 当同一份证据也应刷新 `.ai/PROJECT_STATUS.md` 时，使用 `--update-status`。
   - 只有当新的共享 skill/tool 成为项目工作流的一部分时，才更新 `.ai/SKILL_REGISTRY.md`。

4. 创建快照：
   - 运行 `scripts/summarize_team_sync.py --project-root <project>`。
   - 将快照用于交接、新会话或切换任务前的上下文整理。

## 命令

初始化：

```bash
python <skill-dir>/scripts/init_team_sync.py --project-root .
```

追加任务启动说明：

```bash
python <skill-dir>/scripts/start_task_note.py --project-root . --goal "Fix CAN RX overflow" --allowed-files "Src/can_app.c,Inc/can_app.h" --validation-plan "Keil build, CAN RX smoke test"
```

完成任务并同步状态：

```bash
python <skill-dir>/scripts/update_task_log.py --project-root . --goal "修复 CAN RX 溢出" --changed-files "Src/can_app.c,Inc/can_app.h" --validation "Keil build 已通过；硬件测试未执行" --result "implemented" --risks "CAN 总线长时间稳定性测试待执行" --next "执行 2 小时总线压力测试" --update-status
```

快照：

```bash
python <skill-dir>/scripts/summarize_team_sync.py --project-root .
```

## 输出规则

- 使用用户请求的语言；中文请求默认使用中文。
- 保持工作流轻量；除非用户要求，不要创建额外状态文件。
- 区分 `已验证`、`未验证`、`用户确认` 和 `待确认`。
- 不要编造构建、测试、烧录、硬件或评审结果。
- 除非用户明确要求编辑旧条目，否则将 `.ai/TASK_LOG.md` 视为 append-only。
- 不要替代 `embedded-change-report`；当用户需要正式变更报告时使用它。
- 不要替代 `embedded-unit-test-generator`；当用户需要测试计划或单元测试骨架时使用它。

## Agent 兼容性

- Codex 调用方式：`$embedded-team-sync`
- Claude Code 调用方式：`/embedded-team-sync`
- Codex 安装路径：`%USERPROFILE%\.codex\skills\embedded-team-sync`
- Claude Code 个人安装路径：`%USERPROFILE%\.claude\skills\embedded-team-sync`
- Claude Code 项目内安装路径：`<project-root>\.claude\skills\embedded-team-sync`
- 安装、分享或在 agent 之间复制本 skill 前，读取 `README.md`。

## 资源

- 安装和使用指南：`README.md`
- 工作流说明：`references/workflow.md`
- 状态措辞规则：`references/status-rules.md`
- 项目模板：`assets/TEAM_RULES.md`、`assets/PROJECT_STATUS.md`、`assets/SKILL_REGISTRY.md`、`assets/TASK_LOG.md`
