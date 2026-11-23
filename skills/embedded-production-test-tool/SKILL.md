---
name: embedded-production-test-tool
description: >-
  Generate a generic Windows desktop application scaffold for embedded debug or
  internal engineering tools. Use when Codex/Claude should bootstrap a PySide6
  desktop starter that can be copied, run, packaged, and extended by the user.
  This skill does not produce development-solution reports, architecture plans,
  production-test plans, evidence summaries, or hardware-specific assumptions.
  For scaffold requests, use the bundled create_pyside6_scaffold.py script.
---

# Embedded Production Test Tool

## Purpose

Use this skill to **generate a generic PySide6 desktop scaffold** that users
can copy, run, package, and extend with product-specific logic.

Default stack: **Python + PySide6**.

The generated scaffold is intentionally generic. It does not include serial,
CAN, Modbus, VISA, DUT protocol, MES, database, firmware flashing, production
test logic, or development-solution/report generation by default.

## Agent Compatibility

Codex and Claude Code share this folder. Keep the folder name
`embedded-production-test-tool` and use this `SKILL.md` as the entry point.

- Codex invocation: `$embedded-production-test-tool`
- Claude Code invocation: `/embedded-production-test-tool`
- Codex personal path: `%USERPROFILE%\.codex\skills\embedded-production-test-tool`
- Claude Code personal path: `%USERPROFILE%\.claude\skills\embedded-production-test-tool`
- Claude Code project-local path: `.claude/skills/embedded-production-test-tool`

When installing, packaging, or explaining usage to another AI, read `README.md`
first.

## Workflow

### Generate a PySide6 Scaffold

Use this skill when the user asks to generate, create, bootstrap, scaffold,
start, or quickly build a desktop app template/starter.

1. Collect the minimum naming inputs:
   - output directory
   - `app-name`: ASCII id for Python/exe names, e.g. `MyTool`
   - display name, e.g. `My Tool`
   - version, default `0.1.0`
2. Run:

```bash
python <skill-dir>/scripts/create_pyside6_scaffold.py \
  --output <target-dir> \
  --app-name <AppName> \
  --display-name "<Display Name>" \
  --version 0.1.0
```

3. After generation, tell the user:

```bash
pip install -r requirements.txt
$env:PYTHONPYCACHEPREFIX = Join-Path (Resolve-Path .).Path ".pycache_root"
python src/app.py
powershell -ExecutionPolicy Bypass -File packaging\build.ps1 -SkipInstaller
```

The generated scaffold redirects Python bytecode caches to `.pycache_root/`.
Prefer setting `PYTHONPYCACHEPREFIX` before starting Python; the template also
sets `sys.pycache_prefix` as a fallback, but the environment variable prevents
early imports from creating `src/__pycache__/`.

4. Do not install dependencies, build, package, run the GUI, connect to
   hardware, or add hardware-specific logic unless the user explicitly asks. If
   building, do not claim clean-machine packaging success unless there is a real
   build log.

The scaffold template lives at `assets/pyside6-desktop-scaffold/`.

## Commands

Generate generic PySide6 scaffold:

```bash
python <skill-dir>/scripts/create_pyside6_scaffold.py \
  --output ./my_tool \
  --app-name MyTool \
  --display-name "My Tool" \
  --version 0.1.0
```

## Output Rules

- Match the user's language; Chinese requests default to Chinese.
- Use `scripts/create_pyside6_scaffold.py`; do not manually recreate the
  scaffold file by file.
- Report the generated path and next commands.
- Do not output development-solution reports, architecture plans,
  production-test plans, evidence summaries, test-item matrices, or
  hardware-specific assumptions as part of this skill.
- Do not install dependencies, build, package, run the GUI, connect to hardware,
  or execute persistent writes unless the user explicitly asks.
- Do not claim the tool builds/installs/works on a clean machine without a
  build log.

## Resources

- Usage and install: `README.md`
- Scaffold template: `assets/pyside6-desktop-scaffold/`
- Scaffold generator: `scripts/create_pyside6_scaffold.py`
