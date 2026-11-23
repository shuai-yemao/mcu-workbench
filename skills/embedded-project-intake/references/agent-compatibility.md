# Agent Compatibility

Use this reference when installing or sharing this skill for Codex and Claude Code.

For user-facing installation, packaging, first validation, and troubleshooting steps, read `references/install-and-usage.md`.

## Identity

- Skill directory name: `embedded-project-intake`
- Entry file: `SKILL.md`
- Codex invocation: `$embedded-project-intake`
- Claude Code invocation: `/embedded-project-intake`

Keep `SKILL.md` frontmatter limited to `name` and `description`.

## Install Locations

Codex personal install:

```text
%USERPROFILE%\.codex\skills\embedded-project-intake
~/.codex/skills/embedded-project-intake
```

Claude Code personal install:

```text
%USERPROFILE%\.claude\skills\embedded-project-intake
~/.claude/skills/embedded-project-intake
```

Claude Code project-local install:

```text
.claude/skills/embedded-project-intake
```

## Install Scripts

Run from the skill directory:

```text
node scripts/install_for_agent.mjs codex --force
node scripts/install_for_agent.mjs claude --force
node scripts/install_for_agent.mjs claude-project <project-dir> --force
```

The script copies the entire skill directory and excludes `node_modules` and `.zip` files.

## Working With Other Skills

- Use `chip-driver-manual` when a datasheet or reference manual must be read to confirm chip facts.
- Use `embedded-project-scaffold` when the user wants to generate a new minimal project.
- Use `embedded-build-flash-debug` when the user wants build/flash/debug scripts after intake.
