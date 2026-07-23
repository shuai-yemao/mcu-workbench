# MCU-Workbench

面向 STM32、GR5526、ESP32 和 Cortex-M 的嵌入式开发插件。

## 插件结构

```text
skills/
├─ workflow/       # 路由、项目集成、APP 架构
├─ rtos/           # OS 抽象与 FreeRTOS
├─ bsp/            # BSP Adapter、hal_driver、Handler
├─ platform/       # MCU Core 与厂商 Driver
├─ middleware/     # LVGL、通信、存储、算法
├─ system/         # 跨层系统能力
├─ hardware/       # PCB、仪器和硬件分析
└─ tools/          # 构建、烧录、链接、调试、观测、质量、发布

archive/
├─ software-legacy/ # 旧软件架构入口
└─ tools-legacy/    # 旧工具入口
```

## Canonical skills

软件方向 15 个主入口，加上工具方向 7 个主入口，共 22 个 canonical skills：

```text
workflow-router workflow-project-integration app-architecture
os-abstraction rtos-freertos
bsp-adapter bsp-hal-driver bsp-handler
core-mcu driver-vendor
middleware-lvgl middleware-communication middleware-storage middleware-algorithms
software-system
tools-build tools-flash tools-linker tools-debug
tools-observability tools-quality tools-release
```

Adapter 只存在于 OS 和 BSP；Core、Middleware、Driver 不设置 Adapter。

## 工具方向

`skills/tools/` 按用途保留 7 个主入口。原 29 个工具目录及全部 references、scripts、assets 已归档到 `archive/tools-legacy/`，旧调用名仍可解析到新的 `tools-*` 入口。

硬件方向本轮不重构，仍保留在 `skills/hardware/`。

完整迁移关系见 [docs/skills-migration.md](docs/skills-migration.md)。

## 验证

```powershell
npm test -- --runInBand
npm run validate:plugin
claude plugin validate .
```

## Node CLI

仓库同时提供正式的 `mcu-workbench` CLI，用于项目骨架、BSP 模板、平台查询和构建/烧录命令计划：

```powershell
npm run cli -- --help
npm run cli -- platforms
npm run cli -- build --target stm32f4
```

构建和烧录默认只生成命令；确认路径和工具链后显式追加 `--execute` 才会运行外部命令。完整用法见 [docs/node-cli.md](docs/node-cli.md)。
