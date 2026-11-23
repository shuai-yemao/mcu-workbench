# Codex 适配说明

本分支 `codex/codex-adaptation` 为 MCU-Workbench 增加 Codex 插件入口，同时保留原有 Claude Code 插件入口。

## 入口差异

| 宿主 | Manifest | 主要组件 | 调用方式 |
|---|---|---|---|
| Claude Code | `.claude-plugin/plugin.json` | `skills/`、根目录 `agents/` | `/skill`、`@mcu-workbench:<agent>` |
| Codex | `.codex-plugin/plugin.json` | `skills/` | Codex Skill 加载和本地同步 |

两个 manifest 共用 `skills/` 和 `skills/catalog.js`，因此不会维护两份 Skill 内容。Claude 专用的 `agents/` 不写入 Codex manifest；Codex 侧先使用 canonical Skills 和 Node CLI，避免引入未确认的 Agent 兼容字段。

## 同步到本地 Codex Skills

注册仓库本地 marketplace（插件统一管理入口）：

```powershell
npm run codex:register
codex plugin marketplace add "$env:USERPROFILE\Documents"
```

注册脚本将父目录 `Documents` 作为 marketplace 根，并把当前 `mcu-workbench` 目录登记为本地插件源；不会复制仓库内容。

先进行安全 dry-run：

```powershell
npm run sync:codex -- --dry-run --target "$env:USERPROFILE\.agents\skills"
```

确认迁移计划后再同步：

```powershell
npm run sync:codex -- --target "$env:USERPROFILE\.agents\skills"
```

同步脚本只安装 23 个 canonical Skills，旧名称会迁移到 canonical 目录；发生新旧目录并存或多个旧别名冲突时会停止覆盖，并在替换前创建备份。

安装插件：

```powershell
codex plugin add mcu-workbench@mcu-workbench-local
codex plugin list
```

安装并启用后，在 Codex Composer 中可使用插件快捷入口：

```text
@mcu-workbench
```

对应的插件资源标识为 [`@mcu-workbench`](plugin://mcu-workbench@mcu-workbench-local)。插件短名称来自 manifest 的 `name`，marketplace 名称只用于管理来源。

## 适配边界

- 不把 `.claude-plugin/plugin.json` 改造成 Codex manifest。
- 不把 `agents/`、hooks 或 MCP 配置加入 Codex manifest。
- 不复制 Skill 主文件；技术差异继续放在 `references/`。
- Codex 侧的运行记录仍使用 `scripts/agent-artifacts.js`，项目产物协议不变。

## 校验

```powershell
python C:\Users\zhang\.codex\skills\.system\plugin-creator\scripts\validate_plugin.py .
npm test -- --runInBand
npm run validate:plugin
claude plugin validate .
git diff --check
```
