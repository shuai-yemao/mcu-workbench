# 工作流

将本 skill 作为轻量同步层使用，不要把它变成项目管理工具。

## 初始化

每个项目运行一次 `init_team_sync.py`。它会在 `.ai/` 下创建缺失文件，并默认保留现有文件不变。

## 启动任务

读取：

- `.ai/TEAM_RULES.md`
- `.ai/PROJECT_STATUS.md`

然后输出：

- 目标
- 允许文件
- 禁止区域
- 验证计划
- 待确认项

使用 `scripts/start_task_note.py` 让该步骤可重复。

对于高风险嵌入式变更，交给 `embedded-llm-guardrails` 处理边界。

## 完成任务

向 `.ai/TASK_LOG.md` 追加一条简洁记录；如果状态变化，同步更新 `.ai/PROJECT_STATUS.md`。

当最新任务应成为项目状态时，使用 `scripts/update_task_log.py --update-status`。

把验证记录为证据：

- 构建命令和结果
- 测试命令和结果
- 烧录命令和结果
- 硬件观察结果或用户确认

如果某项结果不可用，写 `未验证`。

## 快照

在交接、上下文压缩后，或新工程师/agent 加入项目时，使用 `summarize_team_sync.py`。
