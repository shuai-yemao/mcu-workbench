# Workflow 生命周期与扩展规范

## 当前策略

工作流只保留两个 active Skills：

- `workflow-router`：请求分诊和最小 Skill 选择。
- `workflow-project-integration`：项目审计、分层设计、调用链和迁移路线。

`app-architecture` 是 APP 领域 Skill，不承担跨领域编排。实际团队协作由 `embedded-lead` Agent 负责，专业工作交给对应 Agent，执行记录写入 `.mcu-workbench/runs/`。

旧的 `embedded-ai-collab` 已归档到 `archive/workflows-legacy/embedded-ai-collab/`。它保留历史审查维度和脚本实现，但不再作为插件 active 入口，也不应直接引用旧的 `embedded-ai-*` Skill 名称。

## 标准执行流

```text
需求 → workflow-router → embedded-lead
     → workflow-project-integration
     → 专业 Agent 执行
     → verification-engineer 验证
     → knowledge-engineer 整理
     → embedded-lead 汇总
```

每个阶段必须具备输入、证据、变更文件、测试、产物、阻塞项和下一步交接。使用 `scripts/agent-artifacts.js` 记录，不覆盖已有运行记录。

## 扩展决策表

| 新需求 | 首选扩展位置 |
|---|---|
| 新增架构原则或边界 | 现有 Skill 的 `references/`；若职责独立再建 Skill |
| 新增 MCU、厂商或工具差异 | 对应 Skill 的 `references/` |
| 新增执行角色或写入权限 | 新建或调整 Agent，并更新 Agent 校验测试 |
| 新增可重复命令 | `scripts/` 或 Node CLI `commands/`、`lib/` |
| 新增多阶段协作流程 | 先编写文档流程；只有存在稳定运行时才建立独立 workflow extension |
| 历史兼容实现 | `archive/`，保留迁移说明，不加入 manifest |

## 扩展约束

1. 一个 workflow 只能拥有一个编排职责，不能复制 Skill 或 Agent 的领域知识。
2. 新增 active workflow 必须说明触发方式、输入输出、权限、失败恢复和产物协议。
3. 不通过 workflow 绕过 APP/OS/BSP/Core/Driver/Middleware 的依赖边界。
4. 不默认启用 hooks、MCP 或自动主 Agent；自动化需求先通过显式 CLI 或受控 Agent 交接实现。
5. 扩展完成后必须通过 `npm test -- --runInBand`、`npm run validate:plugin`、`claude plugin validate .` 和 `git diff --check`。
