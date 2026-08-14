# Review-Package：独立需求质疑与双方案选择 Skill

| 字段 | 内容 |
|---|---|
| request_id | `REQ-WORKFLOW-REQUIREMENTS-CHALLENGE-20260814` |
| 输入 RCP | `00_Docs/04_需求文档/REQ-WORKFLOW-REQUIREMENTS-CHALLENGE-20260814-RCP.md` |
| 审查状态 | `放行` |
| 审查范围 | 独立 Skill、路由交接、catalog/loader、宿主提示词、文档和自动化断言 |

## 1. 工程现状表

| 项目 | 现状 | 证据 | 结论 |
|---|---|---|---|
| 需求入口 | Router 生成 RCP | `skills/workflow/workflow-requirements-router/SKILL.md` | 可采用 |
| 方案审查 | Review Gate 接收方案并判定门禁 | `skills/workflow/workflow-review-gate/SKILL.md` | 可采用 |
| 集成规划 | Integration Plan 只处理放行结果 | `skills/workflow/workflow-integration-plan/SKILL.md` | 可采用 |
| 技能目录 | catalog/metadata/loader 为事实与加载链 | `skills/catalog.js`、`skills/catalog-metadata.js` | 可采用 |
| 测试入口 | Jest `tests/skills.test.js` 等 | `package.json`、`tests/` | 可验证 |

## 2. 文件施工清单

| 文件 | 动作 | 施工边界 |
|---|---|---|
| `skills/workflow/workflow-requirements-challenge/SKILL.md` | 新增 | 只写质疑、双方案、选择和交接规则 |
| Router/Review Gate Skill | 修改 | 仅同步前后交接和选择门禁 |
| `skills/catalog-metadata.js`、`skills/catalog.js` | 修改 | 注册一个 canonical workflow Skill，不改旧映射 |
| `opencode.mjs` | 修改 | 更新 RCP 提示词中的路由链 |
| README/docs | 修改 | 同步数量和工作流流程说明 |
| `tests/skills.test.js`、`tests/embedded-architecture-skills.test.js` | 修改 | 增加目录、边界和文档一致性断言 |

## 3. 代码生成约束清单

| 编号 | 约束 | 判定 |
|---|---|---|
| G-01 | 新 Skill 必须为 `workflow-requirements-challenge`，位于 Router 与 Review Gate 之间 | 可采用 |
| G-02 | 未选择方案前不得进入 Review Gate、Integration Plan 或实现层 | 可采用 |
| G-03 | 每次只输出两个真实可行方案，并保留优缺点、成本、风险、验收和回滚 | 可采用 |
| G-04 | Challenge 不生成代码、不构建、不烧录、不修改固件 | 可采用 |
| G-05 | 所有证据标记四态可信等级；未知事实保持未验证 | 可采用 |
| G-06 | 不修改用户已有无关文件，不手工修改 `AGENTS.override.md` | 可采用 |

## 4. 验收测试清单

| 编号 | 测试 | 通过条件 | 证据等级 |
|---|---|---|---|
| T-01 | `npm test -- --runInBand` | 相关 Jest 测试通过 | 主机 |
| T-02 | `npm run validate:plugin` | 插件结构、frontmatter、目录和链接校验通过 | 主机 |
| T-03 | `npm run validate:links` | 新 Skill 引用无断链 | 主机 |
| T-04 | `git diff --check` | 无空白错误 | 静态 |
| T-05 | 文本门禁 | Challenge 含目的质疑、可行性质疑、方案 A/B、用户选择和下游交接 | 静态 |
| T-06 | 变更范围 | 无越权文件，无恢复/清理既有工作区变更 | 静态 |

## 5. 产品文档映射

- BRD：说明需求质疑机制的价值、当前流程缺口和边界。
- PRD：定义独立 Skill 的触发、双方案输出、用户选择门禁和交接行为。
- SRSys：定义 Skill 文本、catalog、宿主提示词、测试和文档同步要求。

## 6. 判定与交接

- 可采用部分：独立 Challenge Skill、用户选择门禁、RCP 回填和 Review Gate 前置关系。
- 需修订项：无实施范围内未关闭项。
- 阻塞风险：真实模型在复杂需求下的方案质量尚未做行为评测，但不阻塞本次静态/主机交付。
- 门禁结论：`放行`。
- 下一步：按文件施工清单完成实现，执行 T-01 至 T-06。
