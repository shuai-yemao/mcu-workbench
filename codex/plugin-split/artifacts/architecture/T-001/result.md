# T-001 基线与失败测试

- 工具仓库绝对 cwd：`C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai`
- 固件仓库：不适用；本阶段只改插件仓库。
- 分支/HEAD：`host_ai` / `6cd4fadc93ddaff5b03efbf7b32fa6a72b97883b`
- 预存工作区改动：见 `git-status-before.txt`；保留不动。
- 基线清单：`source-baseline.json`，记录 39 项源、249 个文件 SHA-256。
- 唯一事实源差异提示：`tools-quality/SKILL.md` 根路径 SHA-256 `80f4a6bd5d9f5edd8900fa3949a37bd78fb0301f3fa1ce9e184ab7d752474c0e`，verification 插件源 `d4c4a3225468b9966dceb0f9b925209e833bc434880bad93a3883ed60c2b4bb6`；`tools-verification/SKILL.md` 根路径 `073ab708da4b9fe46f5de2abf735dbbbc0e0fdc1b5ac5150eabba3f0b9eee3c6`，插件源 `70a554b38adfe072088593eaccb63faf3c735f6674f6638e9defe1d2a8ae399a`。这两项仅作为 snapshot 输入基线，不修改原路径。

## 测试先行

- 当前行为：尚无 `mcu-workbench-architecture` package、manifest、source Skill roots 或 sync script；catalog 返回空列表。
- 测试文件：`tests/architecture-plugin.test.js`、`tests/architecture-skills.test.js`、`tests/architecture-projection.test.js`。
- 命令：`node node_modules/jest-cli/bin/jest.js --runInBand --forceExit tests/architecture-plugin.test.js tests/architecture-skills.test.js tests/architecture-projection.test.js`
- 退出码：`1`（预期失败）。
- 结果：3 suites；4 failed、1 passed。失败点都是插件契约/manifest、39 项 Skill 注册或同步脚本当前缺失；全部测试均可加载，无语法/导入错误。
- 重试：1 次完整基线执行；另一次先行执行因超过工具等待窗口未获得完整摘要，后以 `--forceExit` 重跑确认完整结果，不影响文件。
- 证据等级：static/host；没有代码施工或固件验证。
