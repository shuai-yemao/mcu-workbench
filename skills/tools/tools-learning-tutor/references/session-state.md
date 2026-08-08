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
  "learning_depth": "L1|L2|L3",
  "learning_depth_reason": "",
  "project_completion": "0-100%",
  "knowledge_mastery": {
    "current_topic": "",
    "depth": "L1|L2|L3",
    "description": ""
  },
  "learning_backlog": [
    {
      "topic": "",
      "priority": "blocking|high-freq|future",
      "encounter_scene": "",
      "current_known": "",
      "gap": "",
      "encounter_count": 0,
      "first_seen": "",
      "status": "pending|learning|mastered"
    }
  ],
  "confirmed_understanding": [],
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
    "confirmed_points": [],
    "assessment": [],
    "next_reanswer_goal": "",
    "transfer_exercise": ""
  },
  "minimal_experiment": {
    "hypothesis": "",
    "setup": "",
    "expected_result": "",
    "actual_result": "",
    "integrated": false
  },
  "three_question_check": {
    "why_it_works": "",
    "key_parameter": "",
    "what_to_change": ""
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

`question_trace` 的每项至少记录：对应笔记栏目、问题、理解判断、已确认理解、判断依据、工程现场、证据和未验证项；不保存逐字用户原答或 AI 修正稿。架构题还要记录用户的决策依据、替代方案和取舍。表达训练记录面向读者、已确认要点、评估与下一次复答目标。`next_question_reason` 说明下一题要补的机制环节、架构推理环节或笔记栏目，避免中断后退化为从头泛问。

`learning_depth` 记录当前知识处于 L1/L2/L3 的哪一层，`learning_depth_reason` 说明进入该层的原因（首次接触/重复出现/能力瓶颈/需要优化）。`project_completion` 和 `knowledge_mastery` 分别独立跟踪项目完成度和知识掌握度，两者不互相阻塞。`learning_backlog` 按 [learning-backlog.md](learning-backlog.md) 的三层优先级记录所有非阻塞知识缺口。`minimal_experiment` 记录最小实验的假设、设置、预期和实际结果，以及是否已集成回项目。`three_question_check` 记录三问检查的答案，三个问题都为空时不能视为"真正形成知识"。

不要覆盖已有学习会话或笔记。开发日志和交接产物遵循 Agent 的时间戳协议；Obsidian 写入仍必须经过用户确认。
