# SRSys：独立需求质疑与双方案选择 Skill

## 系统需求

- 新增 canonical Skill：`workflow-requirements-challenge`。
- 路由顺序固定为 Router → Challenge → 用户选择 → Review Gate → Integration Plan。
- Challenge 必须读取 RCP 和证据，区分四态可信等级。
- Challenge 必须输出两个方案，并等待用户选择。
- 未选择时不得交给 Review Gate 或实现层 Skill。
- 选择后必须更新 RCP 并保留决策审计字段。

## 接口与产物

输入：初步 RCP、证据位置、既有方案（可选）。

输出：质疑报告、方案 A/B、对比表、用户选择状态、RCP 回填字段和 Review Gate 交接提示。

## 验收边界

静态检查 Skill 边界和文档；主机测试 catalog、loader、路由和文本断言；`git diff --check` 检查变更格式。目标板和实物验证不适用。
