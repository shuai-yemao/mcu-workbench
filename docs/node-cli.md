# Node CLI

`mcu-workbench` 是仓库 Node 原型的正式命令行入口。它与 Claude Code 的 Skills 加载链路分离：Skills 负责知识与工作流，CLI 负责可重复的项目生成、命令计划和显式工具执行。

## 安装与调用

```powershell
npm install
npm run cli -- --help
npm link
mcu-workbench platforms
```

## 命令

| 命令 | 用途 | 是否修改文件/执行外部工具 |
|---|---|---|
| `new` | 创建 App/BSP/System/Core/CMake 项目骨架 | 写入项目文件 |
| `driver` | 生成 BSP 驱动与 System Adapter 模板 | 默认返回内容；`--write` 才写入 `--output` |
| `build` | 生成构建命令 | 默认只预览；`--execute` 才执行 |
| `flash` | 生成烧录命令 | 默认只预览；`--execute` 才执行 |
| `debug` | 生成 OpenOCD/J-Link GDB 调试计划 | 默认只生成计划；`--execute` 启动真实会话（交互 GDB） |
| `monitor` | 生成串口/RTT/SWO 监控计划 | 默认只生成计划；`--execute` 启动真实监控（复用已装 CLI 工具） |
| `platforms` | 查看平台配置 | 只读 |
| `skills` | 查看 active/canonical Skills | 只读；`--all` 包含归档入口 |

示例：

```powershell
mcu-workbench new --name demo --platform stm32f4 --rtos freertos
mcu-workbench driver --device-type display --device SSD1306 --core i2c --platform stm32f4 --write --output .
mcu-workbench build --platform stm32f4
mcu-workbench build --platform stm32f4 --clean --execute
mcu-workbench flash --platform stm32f4 --device stlink --execute
mcu-workbench debug --platform stm32f4 --probe jlink --elf build/firmware.elf
mcu-workbench debug --platform stm32f4 --probe jlink --elf build/firmware.elf --execute
mcu-workbench monitor --port COM3 --baud-rate 115200 --channel serial
mcu-workbench monitor --port COM3 --baud-rate 115200 --channel serial --execute
mcu-workbench monitor --channel rtt --rtt-channel 0 --execute
mcu-workbench skills --category tools
```

`--json` 可用于脚本集成。错误写入 stderr，成功返回 0；命令失败返回 1。

## 调试与监控会话

`debug` 与 `monitor` 遵循与 `build`/`flash` 一致的 plan/execute 约定：

- `debug --probe openocd|jlink`：默认打印 OpenOCD / J-Link GDB Server 启动命令与 GDB 连接命令；`--execute` 时启动 GDB Server（detached）并接管交互 GDB 会话。
- `monitor --channel serial|rtt|swo`：默认打印监控命令；`--execute` 时启动真实监控，复用已安装工具：
  - serial → `pio device monitor` / `pyserial-miniterm`（按可用性选择，`--tool` 可强制指定）
  - rtt → `JLinkRTTClient.exe`（J-Link 软件包自带，headless 流式输出）
  - swo → `JLinkSWOViewer.exe`
  - 没有可用工具时报错并给出安装提示。

`mcu-debug` 与 `mcu-monitor` 的 `--execute` 由 `lib/session-runner.js` 管理长驻/交互进程（流式输出 + 可停止）。

## SSD1306 分层输出

`driver --device-type display --device SSD1306 --core i2c` 生成九个 BSP
文件：器件级 Driver、显示类 Handle、BSP Port 与 BSP Wrapper。命令结果额外带有
manifest，列明 Core 依赖、OSAL mutex、完整注释 profile、公开 API 映射、阻塞限制和
待确认项。

SSD1306 的 Port 依赖目标工程已有的公开 `osal.h` 与 Core I2C 事务 API；生成时会标记
`UNRESOLVED_OSAL_API`，直到目标工程实际确认 mutex 类型、创建/销毁、lock/unlock
接口和状态码。该标记表示预览，不是编译或板级验证结论。

## 设计边界

- 默认 dry-run，避免误烧录/误连接硬件；`build`/`flash`/`debug`/`monitor` 均接受 `--execute` 才真正执行。
- `debug` 与 `monitor` 默认只输出可复制的会话计划，不自动占用终端或连接硬件。
- CLI 复用 `skills/registry.js`（在 `skills/catalog.js` 事实源之上派生的查询视图），不维护第二份 Skill 元数据。
- 旧的 `index.js`、`commands/` 和 `lib/` 导出继续保留，作为 Node API 兼容层。

## 校验

```powershell
npm test -- --runInBand
npm run validate:plugin
git diff --check
```
