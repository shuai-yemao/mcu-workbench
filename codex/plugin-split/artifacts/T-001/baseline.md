# T-001 基线执行记录

- task_id: `T-001`
- allocation_id: `T-001-20261123T`
- primary_agent: `embedded-lead`
- support_agents: `system-architect`
- primary_implementation_skill: `workflow-integration-plan`
- supporting_skills: `tools-git`
- cwd: `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai`
- evidence_level: `static`
- repository_state: 工作区未能通过 Git 命令确认提交；未发现可用 `.git` 仓库

## 检查结果

| 检查 | 命令 | 退出码 | 结果 |
|---|---|---:|---|
| 插件结构 | `node scripts/validate-plugin.js` | 1 | 基线失败：85 项既有结构/链接问题，含未登记 Skill 目录与链接错误 |
| Skill 链接 | `node scripts/validate-skill-links.js` | 1 | 基线失败：既有 `LINK_NOT_FOUND`/`LINK_OUTSIDE_ROOT` 问题 |
| 版本一致性 | `node scripts/sync-plugin-versions.js --check` | 0 | 通过；package/Claude/Codex 版本已记录为 `1.0.0`/`1.0.0`/`1.0.0+codex.20261123082552` |
| npm 入口 | `npm run validate:plugin`, `npm run validate:links`, `npm run check:versions` | 1 | 当前执行环境未提供 `npm` 命令；使用等价 Node 入口复现 |

## 边界确认

- 本任务只读，未修改现有 Skill、Agent、Rule、Script 或宿主文件。
- 失败结果作为拆分前基线，不宣称为本轮新增回归。
- 下一步：执行 T-002、T-003、T-004 前置补证任务。
