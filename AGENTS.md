# Repository Guidelines

## Project Identity & Scope

- This repository is `mcu-workbench` (`shuai-yemao/mcu-workbench`), a Claude Code / OpenCode plugin for STM32 / ESP32 / Cortex-M embedded development.
- The workspace root is `C:\Users\zhang` (the user's home directory). Many files and folders here are personal and **not** part of the plugin. Treat `README.md`, `package.json`, and `.claude-plugin/plugin.json` as the project boundary.
- Because the root is a home directory, `git status` will show many untracked personal files. Stage only plugin-related files.

## Project Structure

- `skills/{workflow,rtos,bsp,platform,middleware,system,tools,hardware}/` — active plugin skills.
  - `skills/catalog.js` is the single source of truth for canonical IDs, aliases, layers, and archive paths.
  - `skills/registry.js` is a compatibility facade; `skills/loader.js` loads active skill content.
  - Other top-level directories under `skills/` (e.g., `lark-*`, `obsidian-to-feishu`, `frontend-design`) are unrelated personal projects, not plugin skills.
- `archive/` — legacy skills and compatibility material; not loaded by the plugin manifest.
- `commands/` and `lib/` — Node API and CLI implementation; `bin/mcu-workbench.js` is the npm CLI entry point.
- `agents/` — Claude Code custom agents (7 roles). See `docs/agents.md` for role boundaries and handoff rules.
- `templates/` — C/H templates for the CLI generator.
- `tests/` — Jest tests (`*.test.js`).
- `scripts/` — validation and Codex sync tools.
- `docs/` — architecture, migration, CLI, and plugin docs.
- `.claude-plugin/plugin.json` — Claude Code plugin manifest.
- `opencode.mjs` — OpenCode plugin entry.

## Build, Test, and Development Commands

Run from the repo root. Run `npm install` first if `node_modules/` is missing or tests fail with a Jest-not-found error.

```powershell
npm install                    # Install dependencies before first test/validation
npm test -- --runInBand        # Run the full Jest suite
npm run cli -- --help          # Inspect CLI commands
npm run validate:plugin        # Validate manifest, catalog, agents, skill files, and internal links
npm run validate:architecture  # Validate firmware architecture contract (requires --root <dir>)
npm run validate:links         # Validate skill internal links
npm run migrate:capabilities   # Check migrated capability references are complete
npm run report:skills          # Print catalog statistics
claude plugin validate .       # Validate the Claude plugin manifest
git diff --check               # Check whitespace errors
```

`npm run build` is currently a placeholder. The CLI `build` and `flash` commands are dry-run by default; append `--execute` only after reviewing the generated command.

## Coding Style & Naming Conventions

- CommonJS JavaScript, two-space indentation, semicolons, focused functions.
- `camelCase` for variables/functions; kebab-case for skill IDs and directories (e.g., `tools-learning-tutor`).
- Skill `SKILL.md` files require YAML frontmatter whose `name` matches the catalog ID.
- Keep architecture-specific details in a skill's `references/` rather than duplicating canonical entry points.

## Testing Guidelines

- Tests use Jest and are named `*.test.js`.
- Add or update tests for every catalog, loader, CLI, command, or agent change.
- Run the full suite with `npm test -- --runInBand`.
- Tests may create temporary `integration-test/` and `test-project/` directories; remove them before committing.

## Agent Team & Run Artifacts

- Custom agents live in `agents/` and are discovered by Claude Code. Invoke via `@mcu-workbench:<agent-name>`.
- Use `npm run agent:artifacts -- init ...` to initialize a project's `.mcu-workbench/` state, and `record ...` to append a run. See `docs/agents.md` for role write boundaries and required handoff fields.
- Agents must not overwrite existing run records; each run uses a unique timestamp.

## Commit & Pull Request Guidelines

- Use short, imperative Conventional Commit-style subjects: `feat:`, `fix:`, `docs:`, `refactor:`, etc.
- Keep commits focused.
- PRs should describe affected skills or CLI behavior, list validation commands and results, call out catalog/manifest changes, and include example CLI output when user-facing behavior changes.

## Security & Configuration Tips

- Do not commit credentials, tokens, generated firmware, or local Vault paths.
- Keep external build/flash execution opt-in (`--execute`).
- Validate user-provided platform/device values.
- Review generated files before using `--write` or `--execute`.
