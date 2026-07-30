# 学习会话状态与交接

每轮结束输出以下状态，便于继续学习或交给 `knowledge-engineer`：

```json
{
  "mode": "tutor|code-audit|note-refresh|project-note",
  "project_scope": [],
  "evidence_files": [],
  "completed_sections": [],
  "current_section": "",
  "template_source": "user-vault-template|skill-default",
  "confirmed_answers": [],
  "weak_points": [],
  "misconceptions": [],
  "mechanism_map": {
    "trigger_source": "",
    "participants": [],
    "selection_conditions": [],
    "data_or_context": [],
    "result_consumers": [],
    "boundaries": []
  },
  "architecture_reasoning": {
    "problem_and_scope": "",
    "responsibilities": [],
    "dependency_direction": [],
    "data_and_control_flow": [],
    "constraints": [],
    "alternatives_and_tradeoffs": [],
    "validation_plan": []
  },
  "expression_practice": {
    "target": "technical-document|technical-blog|teaching",
    "audience": "",
    "user_draft": "",
    "corrected_draft": "",
    "feedback": [],
    "transfer_exercise": ""
  },
  "skipped_sections": [],
  "draft_path": null,
  "obsidian_confirmation": "pending|approved|rejected",
  "unverified_items": [],
  "next_question": "",
  "next_question_section": "",
  "next_question_reason": "",
  "question_trace": []
}
```

`question_trace` 的每项至少记录：对应笔记栏目、问题、用户原答、判断、修正后理解、证据和未验证项。架构题还要记录用户的决策依据、替代方案和取舍。表达训练要保留用户原稿、面向读者、反馈和修正版。`next_question_reason` 说明下一题要补的机制环节、架构推理环节或笔记栏目，避免中断后退化为从头泛问。

不要覆盖已有学习会话或笔记。开发日志和交接产物遵循 Agent 的时间戳协议；Obsidian 写入仍必须经过用户确认。
