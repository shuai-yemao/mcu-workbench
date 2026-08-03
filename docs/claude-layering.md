# Claude 分层管理

`workflow-claude-layering` 为目标固件工程维护根 `CLAUDE.md` 的受管区块和
`.claude/rules/mcu-workbench/` 中的路径规则。它不接管项目自定义规则，也不会
在未使用 `--write` 时修改目标工程。

```powershell
mcu-workbench claude-layer scan --root D:\firmware
mcu-workbench claude-layer init --root D:\firmware
mcu-workbench claude-layer init --root D:\firmware --write
mcu-workbench claude-layer sync --root D:\firmware --write
mcu-workbench claude-layer validate --root D:\firmware --strict
```

扫描默认识别 APP、Middleware、OS、BSP、Core 与 Driver，并使用 CMake、CubeMX、
FreeRTOS 配置以及 C/C++ include 作为静态证据。无法确认的路径保留为 `unverified`；
默认只告警，`--strict` 时校验失败。

CI 应只运行 `validate`，不能调用带 `--write` 的命令。静态规则校验与固件构建、
烧录和实机验证是不同证据等级。
