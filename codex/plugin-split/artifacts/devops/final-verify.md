# DevOps plugin final Verify

Date: 2026-11-24 (Asia/Shanghai)
Working directory: `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai`
Spec: `codex/plugin-split/spec.md` v0.7-devops-third-plugin
Plan: `codex/plugin-split/plan.md` v0.1-devops-plugin-owned-sources

T-001 through T-007 have recorded pass results. Codex and Cursor plugin discovery are user-confirmed; actual Codex Skill invocation remains unverified and is recorded as a limitation.

| Spec criterion | Result | Evidence |
|---|---|---|
| DVO-A01 independent package and manifests | pass (static) | T-006 package and manifest validators; 16 Skills |
| DVO-A02 canonical + external Skills and ownership | pass with audit limitation | T-002/T-003; external metadata unknown states preserved |
| DVO-A03 validators, tests, compatibility | pass (focused host) | T-005/T-006; focused regression 6 suites/41 tests passed |
| DVO-A04 Codex + Cursor independent discovery | pass with limitation | User confirms DevOps is findable in both Codex and Cursor; Codex CLI reports `installed: true`, `enabled: true`; actual Skill invocation in Codex remains unverified |
| DVO-A05 compatibility and rollback | pass (host tests) | T-004/T-005 projection and alias checks; drift/rollback test passed |
| DVO-A06 external provenance audit | pass with limitation | 11 external entries retain unknown/blocked provenance per inventory; no metadata invented |
| DVO-A07 no real build/flash/release side effects | pass (scope) | No such command was run in this task |
| DVO-A08 validation evidence and baseline | pass | Final full Jest passed 64/64 suites and 376/376 tests using system Node outside the sandbox; commands, absolute cwd, exit code, logs and SHA-256 are recorded below. Final `git diff --check` exit 0. |

## Commands and outcomes

All commands ran from the absolute working directory above.

| Command | Exit | Evidence/output |
|---|---:|---|
| `node node_modules/jest-cli/bin/jest.js --runInBand --silent tests/devops-plugin.test.js tests/devops-catalog.test.js tests/devops-projection.test.js tests/devops-skills.test.js tests/devops-external-skills.test.js tests/skills.test.js` | 0 | 6 suites, 41 tests passed |
| `node plugins/mcu-workbench-devops/scripts/validate.js` | 0 | 16 Skills |
| `node plugins/mcu-workbench-devops/scripts/validate-manifests.js` | 0 | package/plugin/Codex/Cursor manifests validated |
| `node scripts/validate-plugin.js` | 0 | 105 Skills, 7 agents, 9 architecture layers |
| `node scripts/validate-skill-links.js --root plugins/mcu-workbench-devops/skills --boundary-root .` | 0 | 73 Markdown files valid |
| Full Jest, sandbox | 1 | 57/64 suites, 318/376 tests; `T-007/jest-full.log` |
| Full Jest, outside sandbox | 1 | 61/64 suites, 362/376 tests; `T-007/jest-full-elevated.log` |
| `C:\Program Files\nodejs\node.exe node_modules/jest-cli/bin/jest.js --runInBand --silent --testTimeout=30000` (outside sandbox, Node v26.13.1) | 0 | 64/64 suites, 376/376 tests; `T-007/jest-full-system-node.log` |
| Isolated `layer-contract` + `workflow-dashboard-manager` | 1 | Dashboard manager passed; layer-contract formatter spawn remains `EPERM`; `T-007/jest-isolated.log` |
| Codex marketplace discovery/install/list | 0 | DevOps listed, added, installed and enabled; `T-007/codex-cli-discovery.log` |
| Node syntax check | 0 | 10 JavaScript files passed `node --check` |
| Python syntax check | 0 | 25 plugin Python files passed `ast.parse` |
| `git diff --check` | 0 | Workspace-wide whitespace check passed after removing extra EOF blank lines in Plan and Task |

## Carried limitations

- Actual Skill invocation in a Codex desktop session was not exercised; plugin discovery is user-confirmed and Codex CLI reports installed/enabled.
- 11 external Skill provenance records remain blocked/unverified as required by the approved Spec; their status is explicitly preserved.

## Artifact SHA-256

- `T-007/jest-full.log`: `F683BD69F5DD97F32070FBAC3EF9C65193B97B5776722F9988178C0110EB727B`
- `T-007/jest-full-elevated.log`: `FDF8DBBCD2ABB11818BB3FFFDBB81F0392C8F997D9C551F1C4B2E83217911C59`
- `T-007/jest-isolated.log`: `70B268452C600789C854162BC9C20B2B9D5847522F193B365AE4D6746FC73757`
- `T-007/jest-full-system-node.log`: `684341D28AB6E4584380C21E11AD658A3D6C64E7459EB64E0273BA5134B8C351`
- `T-007/codex-cli-discovery.log`: `4540AF1D8ADCB0CFC83103603C7A39AD08C4B36BB4796899F429981EFC214632`
- `T-007/result.md`: `47EB75F70B1E9BDE2A13E2312CDFCB26A10E4FDB11D0A8DBAC42D6E0B19B1C61`

Final result: `passed with limitations`; the full repository suite and static/host checks pass, both plugin discoveries are user-confirmed, and the approved external provenance limitations remain explicit.
