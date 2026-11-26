---
name: mcu-workflow
description: 从需求入口启动 MCU-Workbench，并按 spec.md、plan.md、task.md 交接
---

# MCU 工作流

从 `workflow-requirements-router` 处理当前嵌入式需求。

1. 确认目标项目绝对路径。路径缺失时先提问，不要把插件仓库当作项目根。
2. 形成内部 RCP，交给 `workflow-requirements-challenge`，再交给 `workflow-review-gate`。
3. 用户文档只写到 `<project_root>/00_Docs/04_需求文档/` 的 `spec.md`、`plan.md` 和 `task.md`。
4. `spec.md` 放行前不要修改业务代码，不要生成 `plan.md` 或 `task.md`。
