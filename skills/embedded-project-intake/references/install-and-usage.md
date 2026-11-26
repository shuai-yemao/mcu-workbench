# Installation And Usage Guide

This document explains how to install the `embedded-project-intake` skill into Codex or Claude Code and verify that AI can discover and invoke it correctly.

## Directory Structure Requirements

When installing or packaging, preserve the entire skill directory. The directory name must be:

```text
embedded-project-intake
```

The directory should contain at least:

```text
embedded-project-intake/
  SKILL.md
  agents/
  references/
  scripts/
```

Do not copy only `SKILL.md`. This skill's scan scripts, report templates, evidence rules, and compatibility notes live in subdirectories.

## Codex Installation

### Manual Install

Windows:

```text
%USERPROFILE%\.codex\skills\embedded-project-intake
```

macOS/Linux:

```text
~/.codex/skills/embedded-project-intake
```

Copy the entire `embedded-project-intake` directory to the path above, then restart Codex or refresh the current session so the skill is rediscovered.

### Script Install

Run from the skill directory:

```powershell
node scripts/install_for_agent.mjs codex --force
```

On success, JSON output should include `destination` pointing to:

```text
<home>/.codex/skills/embedded-project-intake
```

### Codex Invocation

Example:

```text
$embedded-project-intake analyze the app_sdk project in the current directory
```

You can also describe the task and let Codex trigger the skill from its description. For example:

```text
Analyze this embedded project and generate a project understanding report that is readable by engineers and reusable by future AI.
```

## Claude Code Installation

### Personal Install

Windows:

```text
%USERPROFILE%\.claude\skills\embedded-project-intake
```

macOS/Linux:

```text
~/.claude/skills/embedded-project-intake
```

Copy the entire `embedded-project-intake` directory to the path above, then restart Claude Code or refresh the session.

Or run from the skill directory:

```powershell
node scripts/install_for_agent.mjs claude --force
```

### Project-Local Install

If you want a project to carry this skill, install it into the project directory:

```text
<project>/.claude/skills/embedded-project-intake
```

Script form:

```powershell
node scripts/install_for_agent.mjs claude-project <project-dir> --force
```

Example:

```powershell
node scripts/install_for_agent.mjs claude-project E:\work\my_firmware --force
```

### Claude Code Invocation

If Claude Code supports slash skills, use:

```text
/embedded-project-intake analyze the current project
```

If the current interface does not show slash skills, explicitly reference the skill name in the prompt:

```text
Use the embedded-project-intake skill to analyze the current project. First list candidate business paths for me to choose, then generate a Markdown report.
```

## Packaging And Distribution

Package the entire `embedded-project-intake` folder, and make sure the extracted archive path is:

```text
embedded-project-intake/SKILL.md
```

Recommended contents:

```text
SKILL.md
agents/
references/
scripts/
```

Recommended exclusions:

```text
node_modules/
*.zip
generated project analysis reports
temporary logs
```

## First Validation

After installation, run in an embedded project directory:

```text
$embedded-project-intake analyze the current project
```

Or in Claude Code:

```text
/embedded-project-intake analyze the current project
```

Expected behavior:

1. First output a one-sentence project judgment.
2. Output 5-10 numbered candidate business/technical paths.
3. Ask the user to choose paths for deep dive with numbers such as `1,3,5`, reply `auto` for AI-selected priority paths, or reply `full` / `all` / `全量分析` for full analysis.
4. After the user chooses, generate a Markdown report with a whole-project overview and selected/auto/full path deep dives.
5. Save the Markdown report by default to `docs/embedded-project-intake-<topic>.md` inside the project.
6. Always save a standalone HTML report next to it, usually `docs/embedded-project-intake-<topic>.html`.
7. The report is **module-hierarchical, Chinese-titled, diagram-first, with a table of contents**: it contains a `## 📑 目录`, an overall architecture diagram, a per-module detail section where each core module has an architecture diagram + an implementation/call-relationship diagram (≥2 diagrams), end-to-end call-relationship diagrams for each selected/full path, evidence paths, unknowns, risks, and `AI Handoff Summary`.

## 典型输入

运行 skill 时，提供或让其收集：

- 固件项目根目录。
- 期望深度：`quick`、`normal`、`deep`（默认 `normal`）。
- 用户目标：接手、评审、调试准备、修改规划、交接或风险评估。
- 如已知，需要深挖的具体功能、模块、缺陷或工作流；否则 `normal`/`deep` 会在候选路径检查点暂停，让你回复编号、`auto` 或 `full/all/全量分析`。
- 如有：构建日志、烧录/调试说明、原理图片段、板卡文档或 datasheet。
- HTML 输出始终生成，无需单独请求。

## FAQ

### Skill Is Not Recognized

Check that the directory name is exactly:

```text
embedded-project-intake
```

Check that the entry file is located at:

```text
embedded-project-intake/SKILL.md
```

Confirm the install path is under the Codex or Claude Code skills directory, then restart or refresh the session.

### Install Script Cannot Run

The install script depends on Node.js. If Node.js is not installed locally, copy the directory manually; normal skill use does not depend on the install script.

### Report Was Not Saved Locally

Ask the AI to follow this skill's final report rules:

```text
Please use embedded-project-intake to generate the final Markdown and standalone HTML reports and save them under the current project's docs/ directory.
```

### No Diagrams or No Table of Contents

The final report should be diagram-first with a table of contents by default: overall architecture diagram, a per-module detail section (each core module with an architecture diagram + an implementation/call-relationship diagram), and an end-to-end call-relationship diagram for each selected path. If diagrams or the `## 📑 目录` are missing, ask:

```text
Please add the 目录 (table of contents), a layered architecture diagram, a module-architecture + implementation call-relationship diagram for each core module, and an end-to-end call-relationship diagram for each selected path (Mermaid).
```

### User Wants Multiple Deep-Dive Paths

The user can reply with numbers, `auto`, or full-analysis keywords. For example:

```text
1,3,5
auto
full
全量分析
```

When the environment supports subagents and allows parallel analysis, the AI should split deep analysis by core modules first, optionally add path-focused subagents for cross-module paths, then merge everything into one Markdown report and one HTML report.

### Files Fail to Parse on Windows (GBK Encoding)

All skill files are UTF-8 (they contain Chinese text and emoji such as 📑). If a tool reads them with the Windows default codepage (GBK/cp936), it may raise `UnicodeDecodeError`. Force UTF-8:

```powershell
$env:PYTHONUTF8='1'
```

or read files with `encoding="utf-8"`. This applies to any external skill validator you run against the skill directory — this skill ships no Python validator itself; its scan scripts are Node and read files as UTF-8 already.
