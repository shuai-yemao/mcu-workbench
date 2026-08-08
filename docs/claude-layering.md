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

扫描默认识别 App、Service、Platform、Impl、Vendor（兼容旧式 App/BSP/Core/Driver/Middlewares/OS 目录），
并使用 CMake、CubeMX、FreeRTOS 配置以及 C/C++ include 作为静态证据。Vendor 底座（HAL/CMSIS/FreeRTOS/LVGL 等）
归入 vendor 层、不生成受管规则；旧 `claude-layer.json` 的 layout 旧键（middleware/os/bsp/core/driver）
读取时自动归一化到五层键。无法确认的路径保留为 `unverified`；默认只告警，`--strict` 时校验失败。

CI 应只运行 `validate`，不能调用带 `--write` 的命令。静态规则校验与固件构建、
烧录和实机验证是不同证据等级。
