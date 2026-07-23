# MCU-Workbench

面向 STM32、GR5526、ESP32 和 Cortex-M 的嵌入式开发插件。软件方向采用 15 个 canonical skills，旧目录在迁移期间保留并提供兼容解析。

## 软件 Skills

| 方向 | Canonical skills |
|---|---|
| 工作流 | `workflow-router`、`workflow-project-integration`、`app-architecture` |
| OS | `os-abstraction`、`rtos-freertos` |
| BSP | `bsp-adapter`、`bsp-hal-driver`、`bsp-handler` |
| MCU/厂商 | `core-mcu`、`driver-vendor` |
| Middleware | `middleware-lvgl`、`middleware-communication`、`middleware-storage`、`middleware-algorithms` |
| 系统 | `software-system` |

架构契约是：Adapter 只存在于 OS 和 BSP；Adapter 由 Wrapper 与 Port 组成；Core、Middleware、Driver 不设置 Adapter。完整迁移关系见 [docs/skills-migration.md](docs/skills-migration.md)。

## 验证

```powershell
npm install --no-package-lock
npm test -- --runInBand
npm run validate:plugin
```

## Codex 同步

```powershell
node scripts/sync-codex-skills.js --dry-run
node scripts/sync-codex-skills.js
```

同步脚本只安装 15 个 canonical 入口，并在替换前创建备份；旧目录不会从仓库删除。
