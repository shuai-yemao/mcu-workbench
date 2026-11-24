# External Skill ownership matrix

| Skill | Target plugin | Evidence | Status |
|---|---|---|---|
| `academic-paper` | Codex Agent Skills (`~/.agents/skills`) | user-confirmed scope; registry entry `codex/native-skills.json` | registered; provenance metadata remains unknown |
| `academic-paper-reviewer` | Codex Agent Skills (`~/.agents/skills`) | user-confirmed scope; registry entry `codex/native-skills.json` | registered; provenance metadata remains unknown |
| `academic-pipeline` | Codex Agent Skills (`~/.agents/skills`) | user-confirmed scope; registry entry `codex/native-skills.json` | registered; provenance metadata remains unknown |
| `build-cmake` | `mcu-workbench-devops` | directory/name semantics only | blocked: provenance metadata missing |
| `build-iar` | `mcu-workbench-devops` | directory/name semantics only | blocked: provenance metadata missing |
| `build-idf` | `mcu-workbench-devops` | directory/name semantics only | blocked: provenance metadata missing |
| `build-keil` | `mcu-workbench-devops` | directory/name semantics only | blocked: provenance metadata missing |
| `build-makefile` | `mcu-workbench-devops` | directory/name semantics only | blocked: provenance metadata missing |
| `build-platformio` | `mcu-workbench-devops` | directory/name semantics only | blocked: provenance metadata missing |
| `can-debug` | `mcu-workbench-workflow` | directory/name semantics only | blocked: provenance metadata missing |
| `chip-driver-manual` | `mcu-workbench-architecture` | directory/name semantics only | blocked: provenance metadata missing |
| `chip-resource-finder` | `mcu-workbench-architecture` | directory/name semantics only | blocked: provenance metadata missing |
| `debug-gdb-openocd` | `mcu-workbench-observability` | directory/name semantics only | blocked: provenance metadata missing |
| `debug-jlink` | `mcu-workbench-observability` | directory/name semantics only | blocked: provenance metadata missing |
| `debug-platformio` | `mcu-workbench-observability` | directory/name semantics only | blocked: provenance metadata missing |
| `deep-research` | `mcu-workbench-workflow` | directory/name semantics only | blocked: provenance metadata missing |
| `embed-ai-tool` | `mcu-workbench-workflow` | directory/name semantics only | blocked: provenance metadata missing |
| `embedded-architecture-planner` | `mcu-workbench-architecture` | directory/name semantics only | blocked: provenance metadata missing |
| `embedded-bug-hunter` | `mcu-workbench-workflow` | directory/name semantics only | blocked: provenance metadata missing |
| `embedded-build-flash-debug` | `mcu-workbench-workflow` | directory/name semantics only | blocked: provenance metadata missing |
| `embedded-change-report` | `mcu-workbench-workflow` | directory/name semantics only | blocked: provenance metadata missing |
| `embedded-coding-standard` | `mcu-workbench-architecture` | directory/name semantics only | blocked: provenance metadata missing |
| `embedded-llm-guardrails` | `unknown` | no safe ownership evidence | blocked: provenance metadata missing |
| `embedded-minimal-project-builder` | `mcu-workbench-architecture` | directory/name semantics only | blocked: provenance metadata missing |
| `embedded-prd-to-logic` | `mcu-workbench-architecture` | directory/name semantics only | blocked: provenance metadata missing |
| `embedded-production-test-tool` | `unknown` | no safe ownership evidence | blocked: provenance metadata missing |
| `embedded-project-intake` | `mcu-workbench-workflow` | directory/name semantics only | blocked: provenance metadata missing |
| `embedded-project-scaffold` | `mcu-workbench-workflow` | directory/name semantics only | blocked: provenance metadata missing |
| `embedded-team-sync` | `mcu-workbench-workflow` | directory/name semantics only | blocked: provenance metadata missing |
| `embedded-unit-test-generator` | `mcu-workbench-verification` | directory/name semantics only | blocked: provenance metadata missing |
| `flash-idf` | `mcu-workbench-devops` | directory/name semantics only | blocked: provenance metadata missing |
| `flash-jlink` | `mcu-workbench-devops` | directory/name semantics only | blocked: provenance metadata missing |
| `flash-keil` | `mcu-workbench-devops` | directory/name semantics only | blocked: provenance metadata missing |
| `flash-openocd` | `mcu-workbench-devops` | directory/name semantics only | blocked: provenance metadata missing |
| `flash-platformio` | `mcu-workbench-devops` | directory/name semantics only | blocked: provenance metadata missing |
| `logic-analyzer` | `mcu-workbench-observability` | directory/name semantics only | blocked: provenance metadata missing |
| `market-mrd-analyst` | `mcu-workbench-workflow` | directory/name semantics only | blocked: provenance metadata missing |
| `memory-analysis` | `mcu-workbench-workflow` | directory/name semantics only | blocked: provenance metadata missing |
| `modbus-debug` | `mcu-workbench-workflow` | directory/name semantics only | blocked: provenance metadata missing |
| `mrd-to-prd` | `mcu-workbench-workflow` | directory/name semantics only | blocked: provenance metadata missing |
| `parsed-chip-datasheet` | `mcu-workbench-workflow` | directory/name semantics only | blocked: provenance metadata missing |
| `patent-disclosure-skill` | `mcu-workbench-workflow` | directory/name semantics only | blocked: provenance metadata missing |
| `prd-to-hardware-solution` | `mcu-workbench-architecture` | directory/name semantics only | blocked: provenance metadata missing |
| `rtos-debug` | `mcu-workbench-observability` | directory/name semantics only | blocked: provenance metadata missing |
| `schematic-pinmap-analyzer` | `mcu-workbench-architecture` | directory/name semantics only | blocked: provenance metadata missing |
| `serial-monitor` | `mcu-workbench-observability` | directory/name semantics only | blocked: provenance metadata missing |
| `serial-shell` | `mcu-workbench-observability` | directory/name semantics only | blocked: provenance metadata missing |
| `skill-template` | `mcu-workbench-workflow` | directory/name semantics only | blocked: provenance metadata missing |
| `sr-screener` | Codex Agent Skills (`~/.agents/skills`) | user-confirmed scope; registry entry `codex/native-skills.json` | registered; provenance metadata remains unknown |
| `static-analysis` | `mcu-workbench-verification` | directory/name semantics only | blocked: provenance metadata missing |
| `vendor-minimal-firmware` | `mcu-workbench-workflow` | directory/name semantics only | blocked: provenance metadata missing |
| `visa-debug` | `unknown` | no safe ownership evidence | blocked: provenance metadata missing |

## Result

- Entries scanned: 52.
- Source attribution: 23 inventory entries have the public `https://github.com/LeoKemp223/embed-ai-tool` repository as source evidence; the remaining 29 entries are marked `LeoKemp223 (user-confirmed; unpublished/private source)` without inventing a repository URL.
- Each scanned directory has at most one target plugin assignment; `unknown` is retained where ownership is not safe to infer.
- The four academic/research Skills have a user-confirmed Codex Agent Skills target; source version, license, and dependencies remain unknown.
- This matrix records ownership and does not assert that unknown provenance metadata has been resolved.
