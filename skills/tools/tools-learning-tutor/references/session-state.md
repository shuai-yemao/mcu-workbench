# 学习会话状态与交接

每轮结束输出以下状态，便于继续学习或交给 `knowledge-engineer`：

```json
{
  "mode": "tutor|code-audit|note-refresh|project-note",
  "project_scope": [],
  "evidence_files": [],
  "completed_sections": [],
  "current_section": "",
  "confirmed_answers": [],
  "weak_points": [],
  "skipped_sections": [],
  "draft_path": null,
  "obsidian_confirmation": "pending|approved|rejected",
  "unverified_items": [],
  "next_question": ""
}
```

不要覆盖已有学习会话或笔记。开发日志和交接产物遵循 Agent 的时间戳协议；Obsidian 写入仍必须经过用户确认。
