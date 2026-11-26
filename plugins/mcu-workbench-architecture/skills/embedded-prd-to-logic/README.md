# Embedded PRD To Application Logic 使用指南

把客户需求 / PRD / issue 转换成嵌入式产品的**应用逻辑交接文档**。完整工作流、来源标签、范围边界见 [SKILL.md](SKILL.md) 与 `references/`。

**不在范围**（路由给其他 skill，详见 `references/embedded-risk-rules.md`）：硬件 / 驱动 / 寄存器 / 协议 → `hardware-solution`；代码边界保护 → `embedded-llm-guardrails`；单元测试 → `embedded-unit-test-generator`；变更报告 → `embedded-change-report`。

本 skill 不直接改代码，除非用户审阅完文档后明确要求实现。

## 目录结构

```text
embedded-prd-to-logic/
  SKILL.md                            # 入口：用途 / 触发 / 硬边界 / 来源标签 / 资源
  README.md                           # 本文件：安装与调用
  agents/openai.yaml                  # Codex agent 清单
  references/
    core-workflow.md                  # 唯一流程真相源（七步详细流程）
    clarification-patterns.md         # 模糊点种子选项库（A–I 类，含 Agent Dev Mode 选项源）
    embedded-risk-rules.md            # 范围边界 + 高风险应用逻辑清单
  assets/
    implementation-logic-template.md  # 输出模板（11 节）
  scripts/
    collect_project_context.py        # 项目上下文收集器
```

## 安装

### Codex（个人）

路径：`%USERPROFILE%\.codex\skills\embedded-prd-to-logic`

```powershell
$src = 'N:\AI\embedded_skill\embedded-prd-to-logic'
$dst = "$env:USERPROFILE\.codex\skills\embedded-prd-to-logic"
New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
Copy-Item -LiteralPath $src -Destination $dst -Recurse -Force
```

重启 Codex 或开新会话。调用：`$embedded-prd-to-logic <需求>`

### Claude Code（个人）

路径：`%USERPROFILE%\.claude\skills\embedded-prd-to-logic`

```powershell
$src = 'N:\AI\embedded_skill\embedded-prd-to-logic'
$dst = "$env:USERPROFILE\.claude\skills\embedded-prd-to-logic"
New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
Copy-Item -LiteralPath $src -Destination $dst -Recurse -Force
```

### Claude Code（项目内）

路径：`<project-root>\.claude\skills\embedded-prd-to-logic`

```powershell
$src = 'N:\AI\embedded_skill\embedded-prd-to-logic'
$project = 'E:\your\firmware\project'
$dst = Join-Path $project '.claude\skills\embedded-prd-to-logic'
New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
Copy-Item -LiteralPath $src -Destination $dst -Recurse -Force
```

调用：`/embedded-prd-to-logic`

## 最小调用

先扫描项目上下文（详细流程见 `references/core-workflow.md`）：

```powershell
python <skill-dir>\scripts\collect_project_context.py `
  --project-root . --keywords "menu,scene,led,state" --content-search `
  --output req-project-context.json
```

再触发 skill：

```text
$embedded-prd-to-logic
Project root: E:\your\firmware\project
需求：<粘贴需求>
请解析、列出模糊点，每个给 2-4 个选项让我选型（不要替我决定），选完再扫描项目并输出 docs/logic/<slug>-application-logic.md。不要改代码；硬件参数标 deferred。
```

## 校验

```powershell
$env:PYTHONUTF8='1'
python C:\Users\kemp\.codex\skills\.system\skill-creator\scripts\quick_validate.py `
  N:\AI\embedded_skill\embedded-prd-to-logic
# 期望：Skill is valid!

python -m py_compile <skill-dir>\scripts\collect_project_context.py
```

打包前可移除非运行时目录：`scripts/__pycache__/`、`.tmp_validation/`（`__pycache__` 已被 `.gitignore` 忽略）。

## 排障

- **skill 未被发现**：确认安装路径下存在 `SKILL.md` 并重启会话。
- **LLM 直接给出开放式问题长列表**：提示加"每个模糊点给 2-4 个选项让我选型"，指向 `references/clarification-patterns.md`。
- **LLM 替我决定了默认值**：提示加"不要替我决定默认值；模糊点必须给选项"。
- **LLM 越界写硬件细节**：提示加"硬件 / 协议 / 寄存器细节标 deferred，不要编造"。
- **项目影响不明确**：增加 `--keywords` 或 `--content-search`，或检查 `App/` 等应用层目录。
