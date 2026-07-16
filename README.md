# MCU-Workbench

面向 STM32、ESP32 与 Cortex-M 的 Claude Code 嵌入式开发插件。它提供 79 个按职责划分的 skills，覆盖平台、接口与协议、BSP、RTOS、中间件、构建烧录、调试观测、质量、安全与硬件分析。

## 安装与验证

在仓库根目录以本地插件方式启动 Claude Code：

```powershell
claude --plugin-dir .
```

插件名称为 `mcu-workbench`。skill 的实际名称已统一为规范化 kebab-case，例如：

```text
/mcu-workbench:platform-stm32-hal
/mcu-workbench:bsp-device-driver
/mcu-workbench:tool-build-keil
```

修改后，在 Claude Code 中运行 `/reload-plugins`。提交前执行：

```powershell
npm install --no-package-lock
npm test -- --runInBand
npm run validate:plugin
claude plugin validate .
```

## 分层架构

每个 skill 只承担一类任务，目录固定为 `skills/<layer>/<skill>/SKILL.md`。

| 层级 | 数量 | 适用范围 |
|---|---:|---|
| `workflow` | 4 | 请求路由、架构设计、移植与开发记录 |
| `platform` | 10 | Cortex-M、MCU、HAL/SPL、片内资源 |
| `interface` | 17 | 总线、外设、无线与通信协议 |
| `bsp` | 4 | 设备适配、驱动、服务与平台胶水层 |
| `rtos` | 1 | FreeRTOS |
| `middleware` | 5 | DSP、FatFs、FFT、LVGL、SFUD |
| `system` | 3 | Bootloader、低功耗、看门狗 |
| `operations` | 29 | 构建、烧录、调试、观测、质量与 OTA |
| `security` | 4 | 加密、校验、签名 |
| `hardware` | 2 | PCB 与仪器调试 |

完整的命名规则、选择入口和相邻边界见 [skills/README.md](skills/README.md)，旧名称与新名称的对应关系见 [docs/skills-migration.md](docs/skills-migration.md)。

常见入口：

| 请求 | 推荐 skill |
|---|---|
| CubeMX/HAL 工程、MCU 内置外设 | `platform-stm32-hal` |
| 外部器件选型或接入 | `bsp-device-adaptation` |
| 平台无关的单设备 BSP Driver | `bsp-device-driver` |
| 多实例、队列、线程或事件服务 | `bsp-device-service` |
| 对接 HAL、RTOS 与时间基准 | `bsp-platform-adapter` |
| Unity Fake/Mock 与嵌入式单测 | `quality-unity-testing` |
| 构建、烧录与调试 | `tool-build-*`、`tool-flash-*`、`debug-*` |

## 同步到 Codex

Claude Code 插件与 Codex 的本地 skills 是两套加载机制：插件 manifest 不会自动为 Codex 创建 slash command。此仓库提供同步脚本，将本地 Codex 目录中的旧名称迁移为当前 79 个规范名称，并在修改前备份既有目录。

```powershell
# 只查看将要执行的迁移
node scripts/sync-codex-skills.js --dry-run

# 同步到默认目录：C:\Users\<用户>\.agents\skills
node scripts/sync-codex-skills.js
```

可用 `--target <目录>` 指定其他 Codex skills 目录，或用 `--backup-root <目录>` 指定备份位置。同步后重启 Codex 或新建任务，使新的 skill 清单重新加载。

## 插件边界

Claude Code 的正式入口是 [.claude-plugin/plugin.json](.claude-plugin/plugin.json)，通过 manifest 的 `skills` 字段显式加载分层目录。根目录的 `index.js`、`commands/`、`lib/` 与 `templates/` 是早期 Node.js 原型，不会被 Claude Code 当作插件命令加载；详情见 [legacy/README.md](legacy/README.md)。

## 贡献原则

- 一个 skill 只解决一个明确问题，并写清楚适用范围、排除范围和交接 skill。
- 前置元数据只包含唯一 `name` 与可路由的 `description`。
- 支撑材料仅放在 `references/`、`scripts/`、`assets/` 等子目录，并由 `SKILL.md` 显式引用。
- 不加入机器绝对路径、私有流水线或未经验证的工具依赖。
- 修改后必须运行 `npm run validate:plugin`；改变 JS 行为时还必须运行测试。

## 许可

MIT
