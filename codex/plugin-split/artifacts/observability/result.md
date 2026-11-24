# Observability 插件拆分执行记录

- request_id: REQ-PLUGIN-SPLIT-20261123
- cwd: C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai
- branch: host_ai
- evidence_level: static/host
- status: pass-with-limitations

## 已完成

| Task | 结果 | 证据 |
|---|---|---|
| T-001 | pass | observability descriptor、Codex/Cursor manifest、显式 dispose 生命周期 |
| T-002 | pass | tools-debug、tools-observability 已复制到独立插件目录；validate-skill-links 740 files pass |
| T-003 | pass | 7 个归属明确的外部候选已迁移；来源未知字段保留 unverified |
| T-004 | pass | catalog pluginSkills、Agent pluginDomainSkills、alias projection、direct host assertions |
| T-005 | pass | observability validator、JSON 解析、Node 语法、版本字段检查；Codex installed/enabled，Cursor 插件加载日志确认 |
| T-006 | pass-with-limitations | 静态校验、目标 Jest 2 suites / 5 tests、全量 Jest 57 suites / 338 tests 通过；Codex/Cursor MVP 已加载 |
| T-007 | pass-with-limitations | 最终 Spec 追踪、全量验证及质量复核完成；来源审计和明确延期项仍未验证 |

## 命令证据

| 命令 | 退出码 | 结果 |
|---|---:|---|
| node scripts/validate-observability-plugin.js | 0 | pass |
| node scripts/validate-plugin.js | 0 | 105 skills / 7 agents |
| node scripts/validate-skill-links.js | 0 | 740 Markdown files |
| node scripts/sync-plugin-versions.js --check | 0 | pass |
| node direct host assertions | 0 | pass |
| npm test -- --runInBand | 1 | package script 指向缺失的 node_modules/jest/bin/jest.js |
| node MCU_WORKBENCH_JEST_BIN --runInBand targeted | 0 | 2 suites / 5 tests |
| npm test -- --runInBand --json --outputFile=codex/plugin-split/artifacts/observability/jest-full.json | 0 | 57 suites / 57 passed；338 tests / 338 passed；Jest 29.7.0，npm 11.20.0 |
| git diff --check | 0 | pass |
| npm run cursor:check | 0 | Cursor adapter 52 skills / 30 alias projection matches current aggregate manifest |
| npm run build | 0 | package build script completed (`Build complete`) |
| codex plugin marketplace add `<workspace>` | 0 | registered `mcu-workbench-observability-local` |
| codex plugin add `mcu-workbench-observability@mcu-workbench-observability-local` --json | 0 | installed version 1.0.0, enabled; cache path under `~/.codex/plugins/cache/` |

Full Jest report SHA-256: `080ABBA6CA74225AF226B97F8F1B5E584680A531E3557177D2B6313F574860F7` (`codex/plugin-split/artifacts/observability/jest-full.json`).

## 未验证与阻塞

- B-04 已解决：package.json 的 test 脚本改用已安装的 `jest-cli/bin/jest.js`，全量回归 57/57 suites、338/338 tests 通过。报告：`codex/plugin-split/artifacts/observability/jest-full.json`。
- Codex CLI `plugin list` 确认新插件 `installed, enabled`，source 指向当前工作区的 `plugins/mcu-workbench-observability`；缓存中包含独立 manifest 和 9 个 Skills。
- Cursor 扩展日志 `C:\Users\shuaitan2\AppData\Roaming\Cursor\logs\20261122T130740\window8\exthost\anysphere.cursor-agent-host\Cursor Plugins.log` 记录 `loadUserLocalPlugin mcu-workbench-observability loaded`（2026-11-24 10:19）。Cursor 当前 UI workspace 是 `LDM_control`，因此加载证据来自宿主扩展日志，不是该 workspace 的 Skill 调用演示。
- 最终质量复核：新增 JS 仅包含 catalog 投影、Agent plugin ID 投影、descriptor 生命周期与验证器；对应 5 个 Jest 用例覆盖物理目录投影、Agent 派生、幂等 dispose 和宿主 manifest。没有新增 C/C++ 源码，因此 clang-format/Cppcheck/MISRA 不适用；package 无独立 typecheck 脚本，`npm run build` 是现有等效脚本入口。`git diff --check` 通过。
- SOLID：SRP—插件 catalog 映射、Agent 投影和 descriptor 分别单责；OCP—通过新增 plugin ID 列表扩展，未改既有域逻辑；LSP—无继承/替代契约；ISP—descriptor 暴露最小能力和显式生命周期；DIP—descriptor 校验依赖共享 `packages/contracts` 契约。证据：`skills/catalog.js`、`lib/agent-domains.js`、`plugins/mcu-workbench-observability/index.js`、两组 Jest 测试。
- Spec 追踪：F-06/07/08/14/15、G-01～G-05、V-01～V-04、V-08、V-12～V-15 在本轮范围内由迁移目录、catalog/Agent 断言、静态校验、57/338 Jest、Codex CLI 和 Cursor 日志覆盖。旧聚合插件仍 installed/enabled，Cursor 原有插件文件未覆盖，迁移为增量添加且有单独卸载路径。
- 外部 Skill 来源、版本、许可证和依赖仍按 inventory 保留未验证状态。
- Claude、OpenCode、热加载、动态卸载和真实硬件/上位机连接不属于本轮验收。

## 下一步

T-007 已完成，结论为 `pass-with-limitations`。未验证项仅包括外部 Skill 来源等未提供的上游元数据，以及 Spec 明确延期/非目标能力。Codex/Cursor MVP 加载证据已取得。
