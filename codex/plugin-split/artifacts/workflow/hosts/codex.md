# Codex Host Verification — Workflow

Date: 2026-11-24. Plugin: `mcu-workbench-workflow@1.0.0`.

## Discovery/install

- Repository root: `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai`.
- Marketplace: `mcu-workbench-local`, configured root `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai`.
- Repository marketplace entry: `.agents/plugins/marketplace.json` points to `./plugins/mcu-workbench-workflow`; package manifest is valid.
- Install: `codex plugin add mcu-workbench-workflow@mcu-workbench-local`; exit code 0 after sandbox denied writing user-local cache and an approved elevated retry was used.
- Host result: `codex plugin list` reports `mcu-workbench-workflow@mcu-workbench-local installed, enabled 1.0.0`, source is the workspace plugin path.
- Installed root: `C:\Users\shuaitan2\.codex\plugins\cache\mcu-workbench-local\mcu-workbench-workflow\1.0.0`.
- Source/cache `workflow-requirements-router/SKILL.md` SHA-256 both equal `CA6F726391F8657132AC23EEBF087BCED45200DADAD017E00B9DFE87A816FB27`.

## Representative Skill invocation

- The user confirmed that Codex can use the plugin. This is recorded as `user-confirmed` evidence.
- Earlier CLI/UI smoke attempts were inconclusive: `codex exec --ephemeral` could not complete due app-server access denial in the normal sandbox, followed by model catalog timeout and Windows Core package-identity error in the approved elevated retry. CUA desktop observation also failed at `GetCursorPos` with Windows access denied `0x80070005`.
- No exact representative prompt/output or desktop observation is available in this run.

## Result

- Real Codex CLI marketplace discovery and local installation: **pass**.
- Installed source cache identity: **pass** (SHA-256 matched).
- User-confirmed Codex usability: **pass (`user-confirmed`)**.
- Exact representative call and Codex Desktop UI observation: **unverified**; this limits reproducibility of the recorded evidence.
