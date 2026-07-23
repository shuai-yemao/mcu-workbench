# Repository Guidelines

## Project Structure & Module Organization

- `skills/` contains active Claude Code Skills, grouped by layer (`workflow`, `rtos`, `bsp`, `platform`, `middleware`, `system`, `tools`, and `hardware`).
- `archive/` preserves legacy Skills and compatibility material; it is not loaded by the plugin manifest.
- `skills/catalog.js` is the single source of truth for canonical IDs, aliases, layers, and archive paths. `skills/registry.js` is a compatibility facade; `skills/loader.js` loads active Skill content.
- `commands/` and `lib/` implement the Node API and CLI; `bin/mcu-workbench.js` is the npm CLI entry point.
- `templates/` contains generated C/H templates, `tests/` contains Jest tests, `scripts/` contains validation and Codex sync tools, and `docs/` contains architecture and migration documentation.

## Build, Test, and Development Commands

```powershell
npm test -- --runInBand       # Run the Jest suite
npm run cli -- --help         # Inspect CLI commands
npm run validate:plugin       # Validate manifest, catalog, and Skill files
claude plugin validate .      # Validate the Claude plugin manifest
npm run report:skills         # Print catalog statistics
git diff --check              # Check whitespace errors
```

`build` is currently a placeholder package script. CLI `build` and `flash` commands are dry-run by default; use `--execute` only after reviewing the generated command.

## Coding Style & Naming Conventions

Use CommonJS JavaScript, two-space indentation, semicolons, and focused functions. Use `camelCase` for variables/functions and kebab-case for Skill IDs and directories (for example, `tools-learning-tutor`). Skill `SKILL.md` files require YAML frontmatter whose `name` matches the catalog ID. Keep architecture-specific details in `references/` rather than duplicating canonical entry points.

## Testing Guidelines

Tests use Jest and are named `*.test.js`. Add or update tests with every catalog, loader, CLI, or command change. Run the full suite with `npm test -- --runInBand`; tests may create temporary `integration-test/` and `test-project/` directories, which should be removed before committing.

## Commit & Pull Request Guidelines

Use short, imperative Conventional Commit-style subjects such as `feat: ...`, `fix: ...`, `docs: ...`, or `refactor: ...`. Keep commits focused. Pull requests should describe the affected Skills or CLI behavior, list validation commands and results, call out catalog/manifest changes, and include example CLI output when user-facing behavior changes.

## Security & Configuration Tips

Do not commit credentials, tokens, generated firmware, or local Vault paths. Keep external build/flash execution opt-in, validate user-provided platform/device values, and review generated files before using `--write` or `--execute`.
