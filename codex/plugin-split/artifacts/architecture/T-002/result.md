# T-002 插件包契约

- 工具仓库绝对 cwd：`C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai`
- HEAD：`6cd4fadc93ddaff5b03efbf7b32fa6a72b97883b`
- 测试先行：`tests/architecture-manifest.test.js` 先于实现运行；exit 1，原因是 descriptor/package/manifest/validator 当前缺失；没有语法或依赖加载错误。
- 新增文件：`plugins/mcu-workbench-architecture/descriptor.json`、`package.json`、`plugin.json`、`index.js`、`.codex-plugin/plugin.json`、`.cursor-plugin/plugin.json`、`scripts/validate-manifests.js`、`scripts/validate.js`。
- 测试：`node node_modules/jest-cli/bin/jest.js --runInBand --forceExit tests/architecture-plugin.test.js tests/architecture-manifest.test.js`；exit 0；2 suites/4 tests pass。
- 校验：`node plugins/mcu-workbench-architecture/scripts/validate-manifests.js`；exit 0；Codex/Cursor/package/descriptor metadata 一致。
- 限制：总 Skill validator 现阶段仍会报告 39 项 Skills 尚未迁移/注册；这是后续 T-003/T-006 的未完成状态，不写成全包通过。
- 证据等级：static/host；没有 Codex/Cursor UI 加载或固件验证。
