# T-009 Result: Codex Native Skills

- Status: **pass**
- Evidence level: static, host filesystem, Jest
- Registry: `codex/native-skills.json` registers `academic-paper`, `academic-paper-reviewer`, `academic-pipeline`, and `sr-screener`.
- Sync behavior: `scripts/sync-codex-skills.js --include ...` only plans/copies the selected IDs and skips `_shared` updates.
- Target: `C:\Users\shuaitan2\.agents\skills`.
- Installed source file counts match exactly: academic-paper 63, academic-paper-reviewer 29, academic-pipeline 30, sr-screener 25.
- Targeted sync/Jest coverage: 4 suites, 18 tests passed.
- Known content limitation: source Markdown retains 21 unavailable research resource references and one reference to the `deep-research` sibling Skill, which was outside the approved four-Skill installation scope.
- Provenance, version, license, and dependency metadata remain unverified as recorded in the inventory.
