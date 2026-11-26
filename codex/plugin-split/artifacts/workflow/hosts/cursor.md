# Cursor Host Verification — Workflow

Date: 2026-11-24. Plugin: `mcu-workbench-workflow@1.0.0`.

## Findings

- Cursor distinguishes marketplace discovery from local development. A repository `.cursor-plugin/marketplace.json` describes the marketplace, but does not install its plugins into a user's Cursor profile. Local development discovery uses `%USERPROFILE%\.cursor\plugins\local\<plugin>` and requires Cursor restart or `Developer: Reload Window`.
- Existing local directories were present for the aggregate plugin and the four prior independent plugins. Cursor extension logs at `C:\Users\shuaitan2\AppData\Roaming\Cursor\logs\20261122T130740\window12\exthost\anysphere.cursor-agent-host\Cursor Plugins.log` show `loadUserLocalPlugins completed ... (5 plugins loaded)` on 2026-11-24 16:49 and subsequent 17:xx/18:xx reloads. Those entries indicate host loading; they do not prove the plugins were visible in Customize or callable in a specific workspace.
- The same log records a failure to fetch effective user plugins because the marketplace TLS connection disconnected. This affects marketplace listing/search, while local plugin loading continued.

## Workflow install

- Source: `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai\plugins\mcu-workbench-workflow`.
- Local development copy: `C:\Users\shuaitan2\.cursor\plugins\local\mcu-workbench-workflow`.
- Installation completed with exit code 0 after sandbox escalation.
- `skills/workflow-requirements-router/SKILL.md` source and local copy both have SHA-256 `CA6F726391F8657132AC23EEBF087BCED45200DAD017E00B9DFE87A816FB27`.
- `.cursor-plugin/plugin.json` is present in the local copy and declares `skills: ["./skills/"]`, consistent with the existing independent plugins.

## Verification status

- Static local package layout and manifest: pass.
- Existing aggregate + four independent plugins: Cursor extension logs report five plugins loaded; UI visibility and representative Skill invocation are unverified.
- Workflow plugin: Cursor's current extension logs record `loadUserLocalPlugin mcu-workbench-workflow loaded` and `loadUserLocalPlugins completed ... (6 plugins loaded)` on 2026-11-24 at 18:59. The user confirmed it is discoverable and can be used normally. This is recorded as `user-confirmed` host usability evidence. CUA desktop observation is blocked by Windows `GetCursorPos` access denied (`0x80070005`), so an exact prompt/output transcript is not recorded.
- Cursor Marketplace search and local filesystem discovery are separate paths. Current marketplace TLS failure is a plausible reason marketplace search shows none; local folder copy requires reload.

## Next handoff

Discovery, load and normal use are confirmed. The exact representative prompt/output is not captured because CUA desktop observation is blocked by Windows `GetCursorPos` access denied (`0x80070005`); this limitation does not override the user's confirmation of normal use.
