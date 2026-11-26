# T-002 Verification Record

- Allocation: `T-002-20261124T030952Z`
- CWD: `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai`
- Baseline commit: `969398e6f5aea785da143ca4535d76ebf6b86188`
- Evidence level: static/host

| Command | Result |
|---|---|
| `node scripts/validate-skill-links.js` (before migration) | exit 0; 740 Markdown files valid |
| `node node_modules/jest-cli/bin/jest.js --runInBand tests/verification-skill-projection.test.js` (before migration) | exit 1; expected 3 failures because plugin canonical Skills and projection marker were absent |
| `node plugins/mcu-workbench-verification/scripts/sync-skills.js` | exit 0; regenerated both root compatibility projections twice, second run verified marker/hash ownership |
| `node scripts/validate-skill-links.js --root plugins/mcu-workbench-verification/skills --boundary-root .` | exit 0; 18 Markdown files valid |
| `node scripts/validate-skill-links.js` | exit 0; 740 Markdown files valid |
| `node node_modules/jest-cli/bin/jest.js --runInBand tests/skills.test.js tests/ai-collab-skills.test.js tests/plugin-contracts.test.js tests/verification-plugin.test.js tests/verification-skill-projection.test.js` | exit 0; 5 suites / 32 tests passed |
| `node --check plugins/mcu-workbench-verification/scripts/sync-skills.js` and `node --check plugins/mcu-workbench-verification/index.js` | exit 0 |

Changed content: the two canonical Skill directories now live under `plugins/mcu-workbench-verification/skills/`; root catalog paths are generated compatibility projections. Plugin links were corrected to resolve from their new location. Cross-plugin relative links are rewritten when projecting to the root catalog layout.

Known issue handled: first plugin/root link validation found 7 broken paths after relocation. Canonical links were corrected and the projection regenerated; both validators then passed. No Skill business wording was changed beyond link targets.
