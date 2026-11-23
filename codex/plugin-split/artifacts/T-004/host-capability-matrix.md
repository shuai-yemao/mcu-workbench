# T-004 Host Capability Matrix

| Host | Manifest static check | App/window observed | Plugin load smoke test | Cross-plugin dependency | Lifecycle / unload | Evidence |
|---|---|---|---|---|---|---|
| Codex | pass; `.codex-plugin/plugin.json` parses and declares `mcu-workbench` | Current Codex session executing Workflow Skill in this workspace | pass for host surface/routing observation | unverified | deferred | static + current-session evidence |
| Cursor | pass; `.cursor-plugin/plugin.json` parses and declares `mcu-workbench` | Cursor Agents shows `mcu-workbench-host_ai` and completed `Cursor plugin integration` session | pass for host surface/project observation | unverified | deferred | static + Cursor observation |
| Claude | pass; `.claude-plugin/plugin.json` parses and declares `mcu-workbench` | no Claude window observed | deferred | deferred | deferred | static only |

## Conclusion

- All three manifest files are syntactically readable and describe a single legacy plugin entry.
- The manifests contain no evidence of cross-plugin dependency ranges, profile/bundle loading, registration handles, event revocation, or unload semantics.
- The repository has no executable three-host smoke-test entry; this MVP records only local Codex/Cursor surface observations.
- Dynamic dependency, hot unload, event revocation and Claude loading remain deferred and are not claimed as verified.
- T-004 is `pass` for the user-approved MVP boundary; T-005 may start.
