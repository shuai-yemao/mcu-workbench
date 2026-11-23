# Git 生命周期工作流

## 分支模型与命名

先识别项目实际使用 Git Flow、GitHub Flow、主干开发或自定义模型；不自动迁移，也不假设存在 `main`、`develop` 或某个远端。需要创建任务分支时使用：

```text
<type>/<JIRA-KEY>-<scope>-<topic>
```

`type` 仅可使用 `feature`、`fix`、`hotfix`、`release`、`refactor`、`docs`、`test`、`chore`、`perf`、`ci`、`build`。`scope` 优先使用项目既有模块名；`topic` 使用 2 至 5 个小写 kebab-case 关键词描述结果，不重复 type、Jira 编号或 scope。

示例：`feature/MCUWB-123-tools-git`、`fix/MCUWB-124-bsp-i2c-timeout`。如果项目明确规定不兼容的格式，先报告差异并让用户决定采用哪项规则。

## 功能切片与提交

在单一目标、范围可说明、可独立回滚的切片完成时提示提交，即使验证待补也可在用户确认后提交。拆分包含不同 Jira、无关格式化、行为变更和重构的混合差异；每个提交只包含其自身的明确路径。

默认提交标题为：

```text
type(scope): 中文摘要
```

普通切片只需要标题和 Jira 页脚：

```text
feat(tools): 新增 Git 生命周期管理技能

Jira: MCUWB-123
```

跨层、高风险、行为变化或验证待补的切片还必须包含：

```text
Why:
- 为什么需要本次变更

Impact:
- 受影响模块、兼容性或行为边界

Verify:
- 实际验证结果，或“验证待补”

Jira: MCUWB-123
```

不得编造验证结果，也不得仅凭标题推断用户已经授权提交。

## 分支、worktree、同步与标签

创建 worktree 前确认目标路径、分支和基础提交；已有 worktree 不可被覆盖。合并和变基前报告共同祖先、提交范围、冲突风险与目标分支；在受保护分支或策略不明时只给出建议。

创建标签前确认目标提交、标签名和发布语义。同步远端前区分 `fetch`、`pull`、`push` 和强推；每次远端写入均需独立确认。冲突、回退和历史改写的具体保护规则遵循 [`安全操作契约`](git-safety-contract.md)。
