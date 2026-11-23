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
| `debug` | 生成 OpenOCD/GDB 会话计划 | 只生成计划 |
| `monitor` | 生成串口监控参数 | 只生成计划 |
| `platforms` | 查看平台配置 | 只读 |
| `skills` | 查看 active/canonical Skills | 只读；`--all` 包含归档入口 |

示例：

```powershell
mcu-workbench new --name demo --platform stm32f4 --rtos freertos
mcu-workbench driver --peripheral oled --platform stm32f4 --write --output .
mcu-workbench build --platform stm32f4
mcu-workbench build --platform stm32f4 --clean --execute
mcu-workbench flash --platform stm32f4 --device stlink --execute
mcu-workbench skills --category tools
```

`--json` 可用于脚本集成。错误写入 stderr，成功返回 0；命令失败返回 1。
`build --target` 仍作为兼容别名可用，新脚本请使用 `build --platform`。

## 设计边界

- 默认 dry-run，避免误烧录；只有 `build` 和 `flash` 接受 `--execute`。
- `debug` 与 `monitor` 当前输出可复制的会话计划，不自动占用终端或连接硬件。
- CLI 复用 `skills/catalog.js` 的 canonical registry，不维护第二份 Skill 元数据。
- 旧的 `index.js`、`commands/` 和 `lib/` 导出继续保留，作为 Node API 兼容层。

## 校验

```powershell
npm test -- --runInBand
npm run validate:plugin
git diff --check
```
