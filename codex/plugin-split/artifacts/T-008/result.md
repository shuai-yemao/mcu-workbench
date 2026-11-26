# T-008 执行记录

- task_id: `T-008`
- allocation_id: `T-008-20261123T`
- primary_agent: `toolchain-engineer`
- support_agents: `verification-engineer`
- primary_implementation_skill: `tools-build`
- supporting_skills: `tools-release`, `tools-quality`
- cwd: `C:\Users\shuaitan2\Downloads\mcu-workbench-host_ai\mcu-workbench-host_ai`
- evidence_level: `build`
- status: `pass`

## 测试先行

- 当前行为：没有 `verification:pilot` package script、Pilot CLI 或 CI Artifact job。
- 预期失败：标准 Verification 命令和 CI 报告入口不存在。
- 实际结果：package script precheck 退出码 1；`scripts/verification-pilot.js` 不存在；CI 中未发现 `verification-pilot`/`upload-artifact`。

## 实现变更

- 新增 `scripts/verification-pilot.js`，调用 Verification Pilot 并生成 JSON/JUnit/Markdown 报告。
- 新增 `verification:pilot` package script。
- `.github/workflows/ci.yml` 新增独立 `verification-pilot` job，失败阻断 CI，并上传 `verification-pilot-report` Artifact。
- DevOps 只编排命令和 Artifact，不依赖 Verification 内部实现细节。

## 验证

- `node --check scripts/verification-pilot.js`：退出码 0。
- package script 检查：退出码 0。
- `node scripts/verification-pilot.js --out codex/plugin-split/artifacts/T-008/report`：退出码 0，2/2 cases passed。
- 产物：`verification-report.json`、`verification-report.junit.xml`、`verification-report.md`。
- 未验证：远程 GitHub Actions 实际运行、Artifact 云端归档和 Release 发布。

下一步：T-009 宿主验证；Claude 范围按 Spec 延期。
