# 集成计划：独立需求质疑与双方案选择 Skill

| 阶段 | 文件范围 | 产物与验收 |
|---|---|---|
| 1. Skill | `skills/workflow/workflow-requirements-challenge/SKILL.md` | frontmatter、职责边界、双方案和选择门禁完整 |
| 2. 路由 | Router、Review Gate、`opencode.mjs` | 交接顺序和 RCP 决策字段一致 |
| 3. 目录 | `skills/catalog-metadata.js`、`skills/catalog.js` | canonical 数量、loader 和 registry 一致 |
| 4. 文档 | README、架构与流程文档 | 46 catalog / 44 canonical 和主链路一致 |
| 5. 测试 | `tests/skills.test.js`、`tests/embedded-architecture-skills.test.js` | Jest、插件校验、链接校验和 diff 检查通过 |

## 实现层分发

本需求的实现对象是 workflow Skill 文档和插件目录，不分发固件实现层 Skill。完成后交由 `workflow-final-review` 审阅本次变更集的格式、必要注释、范围和文档一致性。
