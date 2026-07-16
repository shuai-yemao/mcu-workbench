# MCU-Workbench

面向 STM32、ESP32 与 Cortex-M 的 Claude Code 嵌入式开发插件。它提供 79 个按任务分工的 skills，覆盖架构、构建、烧录、调试、外设总线、BSP、RTOS、中间件、安全与发布。

## 安装与本地验证

在 Claude Code 中以本地目录加载：

```powershell
claude --plugin-dir .
```

插件名称为 `mcu-workbench`；skill 以命名空间调用，例如：

```text
/mcu-workbench:stm32-hal-development
/mcu-workbench:bsp-peripheral-driver
/mcu-workbench:build-keil
```

修改 skill 后，在 Claude Code 中运行 `/reload-plugins`。本仓库可使用以下检查：

```powershell
npm install --no-package-lock
npm test -- --runInBand
npm run validate:plugin
claude plugin validate .
```

## 如何选择 skill

不要从 79 个 skill 中随意挑选。先看 [skills 导航与边界](skills/README.md)：它为每类请求定义一个主 skill、必要输入和相邻 skill 的边界。

常见入口：

| 请求 | 主 skill |
|---|---|
| CubeMX/HAL 工程、MCU 内置外设 | `stm32-hal-development` |
| 外部传感器/显示器/存储器的选型或适配 | `peripheral-driver` |
| 平台无关的单设备 BSP Driver | `bsp-peripheral-driver` |
| 多设备实例、队列、线程或事件服务 | `bsp-peripheral-handler` |
| 把 BSP 依赖接到 HAL/RTOS/时间基准 | `embedded-adapter` |
| Unity Fake/Mock、RTT/elog 测试输出 | `embedded-unity-testing` |
| Keil、IAR、CMake、PlatformIO 或 ESP-IDF 构建 | 相应的 `build-*` skill |
| 烧录、调试、日志或故障定位 | 相应的 `flash-*`、`debug-*` 或监视 skill |

## 插件边界

Claude Code 的正式入口是 [.claude-plugin/plugin.json](.claude-plugin/plugin.json)。skills 位于 `skills/<架构层>/<skill>/SKILL.md`，并通过 manifest 的 `skills` 字段显式加载。完整的命名规则、架构分类与旧名称迁移见 [skills/README.md](skills/README.md) 和 [docs/skills-migration.md](docs/skills-migration.md)。

根目录的 `index.js`、`commands/`、`lib/` 与 `templates/` 是早期 Node.js 原型，不会被 Claude Code 作为插件命令加载。详情见 [legacy/README.md](legacy/README.md)。

## 贡献原则

- 一个 skill 只解决一个明确问题，并写清楚“适用”“不适用”和交接 skill。
- 前置元数据必须包含唯一 `name` 与可路由的 `description`。
- 支撑材料只在 `references/`、`scripts/`、`assets/` 等子目录中提供，并从 `SKILL.md` 显式引用。
- 不加入用户机器绝对路径、不可复现的私有流水线或未验证的工具依赖。
- 修改后必须运行 `npm run validate:plugin`；改变 JS 行为时还必须运行测试。

## 许可

MIT
