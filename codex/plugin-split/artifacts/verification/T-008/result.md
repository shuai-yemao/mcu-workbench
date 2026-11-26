# T-008 Verification Record

## Scope and environment

- Repository: `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai`
- Command CWD for repository checks: same absolute repository path.
- Evidence is limited to static checks, host tests/pilots, local Codex discovery, the user-provided Cursor UI screenshot, and a disposable rollback fixture. No target firmware or board validation applies.

## Results

| Check | Command / evidence | Result |
|---|---|---|
| Plugin package validation | `node plugins/mcu-workbench-verification/scripts/validate.js` | exit 0; 8 Skills validated |
| Plugin manifests | `node plugins/mcu-workbench-verification/scripts/validate-manifests.js` | exit 0 |
| Root Skill links | `node scripts/validate-skill-links.js` | exit 0; 740 Markdown files |
| Plugin pilot | `node plugins/mcu-workbench-verification/scripts/pilot.js` | exit 0; 2/2 cases; artifact `codex/plugin-split/artifacts/verification/T-008/plugin-pilot/` |
| Root compatibility pilot | `node scripts/verification-pilot.js` | exit 0; 2/2 cases; artifact `codex/plugin-split/artifacts/verification/T-008/root-pilot/` |
| Cursor sync projection | `node scripts/sync-cursor-plugin.js --check` | exit 0; aggregate projection only, not standalone UI proof |
| Root plugin validation | `node scripts/validate-plugin.js` | exit 0; 105 Skills, 7 agents, 9 architecture layers |
| Codex local discovery | `codex plugin list --marketplace mcu-workbench-observability-local --available --json` | exit 0; verification plugin installed/enabled from local plugin directory |
| Cursor UI | User-provided screenshot of Customize → Plugins | `Mcu Workbench Verification · Local` is visible. Screenshot does not show per-Skill names; `.cursor-plugin` manifest points to `./skills/`, with 8 package Skill directories present. T-007 is pass-with-limitations. |
| Rollback safety | Disposable fixture: clean projection sync, then tamper projection and rerun sync | pass; sync refused overwrite and preserved tampered fixture value; temporary fixture removed after containment check |
| External Skill boundary links | `node scripts/validate-skill-links.js --root plugins/mcu-workbench-verification/skills --boundary-root .` | exit 1; 22 inherited references to sibling resources are unresolved. Root-wide link validation passes; retain as inherited limitation, do not claim external content completeness. |
| Focused Jest regression | `node node_modules/jest-cli/bin/jest.js --runInBand tests/verification-pilot.test.js tests/verification-plugin.test.js tests/verification-catalog.test.js tests/verification-external-skills.test.js tests/verification-skill-projection.test.js tests/plugin-contracts.test.js` | exit 0 after ordering compatibility fix; 6 suites / 27 tests passed |
| Full Jest suite (sandbox attempt) | `node node_modules/jest-cli/bin/jest.js --runInBand` | exit 1; sandbox prevented `git`, `clang-format.exe`, and child processes (`EPERM`); see historical environment failure. |
| Full Jest suite (authorized outside sandbox) | `node node_modules/jest-cli/bin/jest.js --runInBand` | exit 0; 59/59 suites and 353/353 tests passed in 175.025 s. Previously failing `codex-plugin`, `workflow-dashboard`, `codegen`, `layer-contract`, `workflow-gate`, and `generator` suites passed. |
| Quality final gate | Manual review following `skills/tools/tools-quality/SKILL.md` and `references/quality-mode-contract.md` | Review completed; status `blocked` solely by 21 missing imported reference targets in `academic-paper`/`academic-pipeline` (A09 link-validity acceptance). Plugin code review: descriptor validated, reporting XML escaping present, test case exceptions are captured, lifecycle disposal is idempotent; SRP/OCP/LSP/ISP/DIP reviewed for the JS plugin boundary. C/C++-specific Cppcheck/MISRA and `clang-format` are not applicable to the plugin JS change; no project JS formatter or lint script is declared. |
| Build/typecheck | Package scripts reviewed | Not applicable: this change is JS/plugin metadata and package scripts provide no relevant build/typecheck entry. |

## Final status

T-007: `pass-with-limitations` based on the user-provided Cursor plugin-list screenshot and package configuration evidence.

T-008: `blocked` only on VFY-A09 link validity for imported Skill cross-references. The sandbox-free full Jest run passed 59/59 suites and 353/353 tests; validators, manifests, root Skill links, rollback rehearsal, and `git diff --check` pass. The package-scoped boundary checker initially reported 22 links. The `bibliography_agent.md` dependency was found in the repository-owned `skills/deep-research/` and its imported reference was corrected to the real repository path, leaving 21 findings. The user-provided `C:\Users\shuaitan2\Desktop\嵌入式工作台额外skills` folder contains 21 skill ZIPs; their archive entries do not include any of the 11 remaining unique target basenames. Searches of repository skills and Codex plugin cache also did not find them. Inventing or deleting their semantics would be unsafe. Resolve by supplying the original academic-paper/academic-pipeline shared assets or approving an explicit unavailable-reference treatment, then rerun the plugin-boundary link check and final review.

No commit or staging was performed. Existing unrelated worktree changes were preserved.
