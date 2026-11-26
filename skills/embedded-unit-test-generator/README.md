# Embedded Unit Test Generator 使用指南

本文说明如何在 Codex 和 Claude Code 中安装并使用 `embedded-unit-test-generator` skill。文档保存在 skill 目录内，方便后续 LLM agent 不依赖聊天记录也能发现预期工作流。

## 用途

使用本 skill 为嵌入式 C/C++ 项目生成可追溯的单元测试工件：

- 项目和目标模块证据收集
- 函数与依赖分析
- 测试用例矩阵生成
- Unity/Ceedling/CppUTest/GoogleTest skeleton 生成
- 测试 runner 日志摘要
- 清晰区分 `自动发现`、`工程推断`、`用户确认` 和 `待用户确认`

本 skill 默认保守。除非有真实日志或用户提供证据支持，否则不声称测试已通过、覆盖率已达成或硬件行为已验证。

## 目录结构

```text
embedded-unit-test-generator/
  SKILL.md
  README.md
  agents/openai.yaml
  scripts/
    collect_unit_test_context.py
    analyze_c_module.py
    generate_test_matrix.py
    generate_test_skeleton.py
    summarize_test_results.py
  references/
  assets/
```

## 安装到 Codex

Codex 会从 Codex skills 目录发现个人 skill。在这台 Windows 机器上，预期个人安装路径为：

```text
%USERPROFILE%\.codex\skills\embedded-unit-test-generator
```

从当前开发副本用 PowerShell 安装：

```powershell
$src = 'N:\AI\embedded_skill\embedded-unit-test-generator'
$dst = "$env:USERPROFILE\.codex\skills\embedded-unit-test-generator"
New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
Copy-Item -LiteralPath $src -Destination $dst -Recurse -Force
```

安装后，重启 Codex 或开启新的 Codex 会话，让 skill 列表刷新。显式调用示例：

```text
$embedded-unit-test-generator 帮我为 Src/foo.c 生成单元测试矩阵和 Unity 测试骨架
```

## 安装到 Claude Code

Claude Code 可以使用个人 skill 目录或项目内 skill 目录。

Windows 上的个人安装路径：

```text
%USERPROFILE%\.claude\skills\embedded-unit-test-generator
```

项目内安装路径：

```text
<project-root>\.claude\skills\embedded-unit-test-generator
```

PowerShell 个人安装：

```powershell
$src = 'N:\AI\embedded_skill\embedded-unit-test-generator'
$dst = "$env:USERPROFILE\.claude\skills\embedded-unit-test-generator"
New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
Copy-Item -LiteralPath $src -Destination $dst -Recurse -Force
```

PowerShell 项目内安装：

```powershell
$src = 'N:\AI\embedded_skill\embedded-unit-test-generator'
$project = 'E:\your\firmware\project'
$dst = Join-Path $project '.claude\skills\embedded-unit-test-generator'
New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
Copy-Item -LiteralPath $src -Destination $dst -Recurse -Force
```

安装后，重启 Claude Code 或打开新会话。显式调用示例：

```text
/embedded-unit-test-generator Generate a test plan and test skeleton for Core/Src/foo.c.
```

## 推荐使用流程

以下命令在目标嵌入式工程根目录运行。将 `<skill-dir>` 替换为已安装 skill 的路径。

### 1. 收集项目上下文

```powershell
python <skill-dir>\scripts\collect_unit_test_context.py `
  --project-root . `
  --target Src\foo.c `
  --output unit-test-context.json
```

基于 branch 或 commit range 做回归测试：

```powershell
python <skill-dir>\scripts\collect_unit_test_context.py `
  --project-root . `
  --target Src\foo.c `
  --base main `
  --head HEAD `
  --output unit-test-context.json
```

提出结论前检查 `ok`、`status`、`warnings`、`evidence_gaps`、`git.diff_files`、`git.diff_stat` 和 `git.diff_hunks_preview`。

### 2. 分析目标模块

```powershell
python <skill-dir>\scripts\analyze_c_module.py `
  --source Src\foo.c `
  --include Inc\foo.h `
  --output foo-analysis.json
```

检查：

- `functions`
- `header.recommended_include`
- `testability.dependency_summary`
- `testability.hardware_findings`
- `warnings`
- `evidence_gaps`

### 3. 生成测试矩阵

```powershell
python <skill-dir>\scripts\generate_test_matrix.py `
  --analysis foo-analysis.json `
  --output foo-test-matrix.md
```

只把 `ready` 行转换成断言。把 `pending` 行视为用户确认或需求查证项。把 `not-unit-testable` 行视为集成或硬件验证候选项。

### 4. 生成 Skeleton 测试文件

Unity 示例：

```powershell
python <skill-dir>\scripts\generate_test_skeleton.py `
  --analysis foo-analysis.json `
  --framework unity `
  --placeholder skip `
  --output test_foo.c
```

CppUTest 示例：

```powershell
python <skill-dir>\scripts\generate_test_skeleton.py `
  --analysis foo-analysis.json `
  --framework cpputest `
  --placeholder skip `
  --output FooTest.cpp
```

GoogleTest 示例：

```powershell
python <skill-dir>\scripts\generate_test_skeleton.py `
  --analysis foo-analysis.json `
  --framework googletest `
  --placeholder skip `
  --output foo_test.cpp
```

默认 skeleton 是 `skeleton-only`：已生成、未执行，断言仍待确认。只有团队明确希望 CI 在断言完成前失败时，才使用 `--placeholder fail`。

### 5. 汇总测试结果

运行项目特定测试命令后，汇总日志：

```powershell
python <skill-dir>\scripts\summarize_test_results.py `
  --log build\test.log `
  --framework unity `
  --output test-summary.json
```

支持的 `--framework` 值：

- `auto`
- `unity`
- `ceedling`
- `cpputest`
- `googletest`

使用返回的 `status`、`counts`、`warnings` 和 `evidence_gaps` 字段。若状态为 `unknown`、`ambiguous`、`build-or-compile-failed` 或 `log-missing`，不要声称测试成功。

## Prompt 示例

Codex 中文 prompt：

```text
$embedded-unit-test-generator 帮我分析 Core/Src/protocol.c，生成单元测试矩阵和 Unity 测试骨架。先标注哪些是自动发现、哪些需要我确认，不要直接声称测试通过。
```

Codex 英文 prompt：

```text
Use $embedded-unit-test-generator to generate a traceable test matrix and Unity skeleton for Src/protocol.c. Mark inferred behavior and pending confirmations.
```

Claude Code prompt：

```text
/embedded-unit-test-generator Core/Src/protocol.c: generate the context JSON, module analysis, test matrix, and a skeleton-only Unity test file. Do not modify production code.
```

回归测试 prompt：

```text
$embedded-unit-test-generator 基于 main..HEAD 的修改，为通信协议 bugfix 生成回归测试矩阵。只把有证据支持的行为写成断言，其他标为待确认。
```

## 典型输入

最低信息：

- 项目根目录
- 目标 source/header 文件或 Git 范围
- 如果项目没有既有框架，说明期望框架

强烈建议提供：

- 需求或 bug 描述
- 合法输入范围
- 既有测试命令
- 既有测试日志
- 是否允许为可测试性重构生产代码
- mock 是否可作为本次评审目标的可接受证据

## AI 通常能发现什么

本 skill 通常能发现：

- Source/header 文件
- 看起来公开的函数定义
- Includes、macros、structs、enums
- 既有测试框架线索
- Git status、diff files、diff stat 和 diff hunk preview
- 硬件/RTOS 依赖模式
- 证据是否不完整

本 skill 不能可靠发现：

- 业务意图
- 代码含糊或代码本身有错时的正确行为
- 未写在代码或需求里的合法范围
- 硬件时序正确性
- 真实外设行为
- 安全或法规接受结论
- 发布就绪度

## 安全与证据边界

- 非平凡模块先生成测试矩阵，再生成代码。
- 未经确认，不要把 `工程推断` 转换成断言。
- 不要声称通过 mock 单元测试验证了硬件行为。
- 除非用户明确要求并确认编辑范围，不要修改生产代码。
- 没有真实测试日志解析为 `passed` 时，不要报告测试通过。
- 断言完成并执行前，将生成的 skeleton 报告为 `skeleton-only`。

## 校验

校验 skill 目录本身：

```powershell
$env:PYTHONUTF8='1'
python C:\Users\kemp\.codex\skills\.system\skill-creator\scripts\quick_validate.py `
  N:\AI\embedded_skill\embedded-unit-test-generator
```

预期结果：

```text
Skill is valid!
```

编译检查内置脚本：

```powershell
python -m py_compile `
  <skill-dir>\scripts\collect_unit_test_context.py `
  <skill-dir>\scripts\analyze_c_module.py `
  <skill-dir>\scripts\generate_test_matrix.py `
  <skill-dir>\scripts\generate_test_skeleton.py `
  <skill-dir>\scripts\summarize_test_results.py
```

## 打包说明

发布或复制到其他机器前，如果存在本地校验或缓存目录，可移除：

```text
.tmp_validation/
scripts/__pycache__/
```

这些目录不是运行所需内容。

## 参考

- Agent Skills standard and examples: https://agentskills.io/
- Unity framework: https://github.com/ThrowTheSwitch/Unity
- Ceedling framework: https://github.com/ThrowTheSwitch/Ceedling
- CppUTest: https://github.com/cpputest/cpputest
- GoogleTest primer: https://google.github.io/googletest/primer.html

## 典型输出

- 单元测试计划。
- 测试项矩阵、mock/stub 策略和测试骨架。

## 常用命令

```bash
python <skill-dir>/scripts/collect_unit_test_context.py --project-root .
```

## 故障排查

- 如果 skill 未被发现，确认安装路径下存在 `SKILL.md` 并重启会话。
- 如果函数签名提取失败，直接提供目标源文件和头文件。
