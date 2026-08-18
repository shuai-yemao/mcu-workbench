# tools-quality 调用模式契约

## 模式枚举

| mode | 调用方 | 作用 | 允许的结论 |
| --- | --- | --- | --- |
| `advisory` | 实现 Skill、`workflow-task-execution`、`tools-verification` 或其他中间阶段 | 检查当前范围并返回可复用质量证据 | 阶段检查通过、失败、待补 |
| `final-gate` | `workflow-final-review` 或用户直接要求最终质量审查 | 复核最终质量证据并形成代码质量最终出口 | 最终通过、阻塞 |

## `advisory` 输入

- 当前任务或阶段 ID；
- 目标项目绝对路径、分支/提交和变更文件；
- 每个变更文件的代码来源标记：插件生成、插件要求修改或既有无关基线；
- 当前 diff、相邻源码、格式配置、Cppcheck/MISRA 配置；
- 已有质量基线和适用验证命令。

## `advisory` 输出

```text
mode: advisory
status: passed | failed | pending
scope: <absolute project root and files>
commands: <command, absolute cwd, tool version, exit code>
findings: <severity, relative/path:line, impact, recommendation>
baseline: <existing/current/new delta>
repair: <allowed format/comment repair or handoff>
next handoff: <caller or implementation Skill>
```

`advisory` 不得输出整个需求、方案、任务或最终交付的通过结论；调用方必须继续自己的流程。

## `final-gate` 输入

- 最终代码、补丁或 `git diff`；
- 放行后的 `spec.md` 和 Spec 逐条追踪矩阵；
- `workflow-final-review` 的测试、类型检查、构建和 `git diff --check` 结果；
- `tools-verification` 的适用 Map、Unity、架构、目标运行或硬件证据；
- 最终 `.clang-format`/`.editorconfig`、Cppcheck/MISRA 配置和所有质量报告。
- 插件硬门禁范围内的命名、函数、注释和格式检查结果。

## `final-gate` 输出

```text
mode: final-gate
status: passed | blocked
quality evidence: <comments, format, code review, Cppcheck, MISRA>
scope trace: <final files and Spec IDs covered>
verification evidence: <test/typecheck/build/tools-verification references>
findings: <severity, relative/path:line, impact, repair or blocker>
plugin hard gate: passed | blocked | not-applicable
unverified: <missing or non-board-level evidence>
next handoff: <final user output or upstream Skill>
```

只有以下条件同时满足时才能 `passed`：质量检查覆盖最终范围、插件硬门禁范围内的命名/函数/注释/格式全部通过、
所有阻塞问题关闭、同条件复检通过、`git diff --check` 通过，且最终审查已提供每条 Spec 的代码/测试证据和适用验证证据。
否则必须 `blocked`。

## 调用纪律

- 中间 Skill 调用时必须显式使用 `mode: advisory`；
- `workflow-final-review` 调用时必须显式使用 `mode: final-gate`；
- 不能把 `advisory` 的阶段结果升级为最终交付结论；
- `final-gate` 不能替代 `workflow-final-review` 的 Spec 追踪，也不能把静态或主机证据改写成目标板/实物验证；
- 发现 Spec 矛盾、证据缺失或需要扩大范围时，保持 `blocked` 并回传上游。
