# Skills 迁移与归档能力表

本文件同时记录旧调用名、历史归档目录与当前 canonical 入口。目录与 frontmatter `name` 完全一致；当前解析规则以 `skills/catalog.js` 的 `MIGRATION_MAP` 为唯一事实来源。

Claude Code 的 plugin skill 没有原生别名：请把 `/mcu-workbench:<旧名>` 改为 `/mcu-workbench:<当前 canonical 名>`。仓库内部 Node 查询接口仍能识别旧名，便于外部工具逐步升级。

## 归档能力物化

归档不是运行时依赖。每一份归档 `SKILL.md`、其 `references/`、`scripts/` 和 `assets/` 已被转移为目标 canonical Skill 的 active `references/capabilities/<能力主题>/`，并由目标 Skill 的 `references/capability-index.md` 选择性加载。主入口保持简短，只承担边界、路由和验收；命中具体技术时再读取完整能力资料。

```powershell
npm run migrate:capabilities       # 检查 80 份已转移能力及索引是否完整
node scripts/materialize-skill-capabilities.js --write # 首次转移或补齐缺失资料
```

目前 80 份归档来源迁入 18 个 canonical Skill。没有归档前身的 `workflow-requirements-router`、`app-architecture`、`os-adapter`、`os-runtime`、`middleware-lvgl` 和硬件 Skills 保持各自的原生 references；旧 `workflow-router` 仅作为兼容别名解析到新的需求约束入口。其中 `app-architecture` 属于 APP 软件架构层，不属于 Workflow 层；它们不应凭空创建“旧版迁移资料”。

`os-abstraction` 与 `rtos-freertos` 仅在兼容映射中解析到这两个当前 OS 入口。

原先未登记的工作流资料也已指定目标：`workflow-devlog` → `tools-learning-tutor`。

| 旧名 | 历史归档目录 | 原架构层 |
|---|---|---|
| `embedded` | `workflow-requirements-router` | workflow |
| `devlog` | `workflow-devlog` | workflow |
| `embedded-architect` | `workflow-architecture` | workflow |
| `code-porting` | `workflow-code-porting` | workflow |
| `arm-core-registers` | `platform-cortex-registers` | platform |
| `arm-interrupt-exception` | `platform-cortex-interrupts` | platform |
| `arm-memory-architecture` | `platform-cortex-memory` | platform |
| `chip-architecture` | `platform-mcu-architecture` | platform |
| `mcu-peripheral-registers` | `platform-peripheral-registers` | platform |
| `option-bytes` | `platform-option-bytes` | platform |
| `sram-module` | `platform-sram` | platform |
| `flash-module` | `platform-internal-flash` | platform |
| `stm32-hal-development` | `platform-stm32-hal` | platform |
| `stm32-spl-development` | `platform-stm32-spl` | platform |
| `i2c-bus` | `bus-i2c` | interface |
| `spi-bus` | `bus-spi` | interface |
| `uart-module` | `bus-uart` | interface |
| `adc-module` | `peripheral-adc` | interface |
| `dma-module` | `peripheral-dma` | interface |
| `motor-control` | `peripheral-motor-control` | interface |
| `timer-module` | `peripheral-timer` | interface |
| `ble-module` | `protocol-ble` | interface |
| `can-debug` | `protocol-can` | interface |
| `cellular-module` | `protocol-cellular` | interface |
| `gps-module` | `protocol-gps` | interface |
| `lora-module` | `protocol-lora` | interface |
| `modbus-debug` | `protocol-modbus` | interface |
| `mqtt-module` | `protocol-mqtt` | interface |
| `usb-module` | `protocol-usb` | interface |
| `wifi-module` | `protocol-wifi` | interface |
| `ymodem-module` | `protocol-ymodem` | interface |
| `peripheral-driver` | `bsp-device-adaptation` | bsp |
| `bsp-peripheral-driver` | `bsp-device-driver` | bsp |
| `bsp-peripheral-handler` | `bsp-device-service` | bsp |
| `embedded-adapter` | `bsp-platform-adapter` | bsp |
| `freertos-module` | `rtos-freertos` | rtos |
| `dsp-module` | `middleware-dsp` | middleware |
| `fatfs-module` | `middleware-fatfs` | middleware |
| `fft-module` | `middleware-fft` | middleware |
| `lvgl-module` | `middleware-lvgl` | middleware |
| `sfud-module` | `middleware-sfud` | middleware |
| `bootloader-design` | `system-bootloader` | system |
| `lowpower-design` | `system-low-power` | system |
| `watchdog-module` | `system-watchdog` | system |
| `build-cmake` | `tool-build-cmake` | operations |
| `build-idf` | `tool-build-esp-idf` | operations |
| `build-iar` | `tool-build-iar` | operations |
| `build-keil` | `tool-build-keil` | operations |
| `build-platformio` | `tool-build-platformio` | operations |
| `flash-idf` | `tool-flash-esp-idf` | operations |
| `gang-flash` | `tool-flash-gang` | operations |
| `flash-jlink` | `tool-flash-jlink` | operations |
| `flash-keil` | `tool-flash-keil` | operations |
| `flash-openocd` | `tool-flash-openocd` | operations |
| `flash-platformio` | `tool-flash-platformio` | operations |
| `linker-scatter` | `tool-linker-scatter` | operations |
| `cmbacktrace-debug` | `debug-crash-backtrace` | operations |
| `embedded-debugger-framework` | `debug-diagnostic-framework` | operations |
| `debug-gdb-openocd` | `debug-gdb-openocd` | operations |
| `ozone-module` | `debug-ozone` | operations |
| `debug-platformio` | `debug-platformio` | operations |
| `rtos-debug` | `debug-rtos` | operations |
| `elog-module` | `observability-elog` | operations |
| `rtt-monitor` | `observability-rtt-monitor` | operations |
| `segger-rtt-module` | `observability-rtt-porting` | operations |
| `serial-monitor` | `observability-serial-monitor` | operations |
| `systemview-module` | `observability-systemview` | operations |
| `embedded-reviewer` | `quality-code-review` | operations |
| `map-analyzer` | `quality-map-analysis` | operations |
| `static-analysis` | `quality-static-analysis` | operations |
| `embedded-unity-testing` | `quality-unity-testing` | operations |
| `ota-package` | `release-ota-package` | operations |
| `ota-update-system` | `release-ota-update` | operations |
| `aes-module` | `security-aes` | security |
| `crc-module` | `security-crc` | security |
| `firmware-sign` | `security-firmware-signing` | security |
| `rsa-module` | `security-rsa` | security |
| `pcb-analysis` | `hardware-pcb-analysis` | hardware |
| `visa-debug` | `hardware-visa-debug` | hardware |

## 软件方向重分类（兼容入口）

当前状态为 **109 catalog / 31 canonical**；OS/BSP/Core/MCU 当前入口固定为 `os-adapter`、`os-runtime`、`bsp-wrapper`、`bsp-port`、`core-mcu`、`mcu-platform`。旧目录仍保留并登记在 catalog 中，只供 `resolveSkillId()` 的兼容映射使用，迁移期间不删除旧目录。

| Canonical skill | 合并/交接的旧入口 |
|---|---|
| `workflow-requirements-router` | `embedded`、`workflow-router` |
| `workflow-review-gate` | `project-integration`（兼容映射 `workflow-project-integration`） |
| `workflow-integration-plan` | `workflow-architecture`、`code-porting` |
| `app-architecture` | APP 新入口，无旧目录 |
| `os-adapter` | `os-abstraction`（兼容映射） |
| `os-runtime` | `rtos-freertos`、`freertos-module`（兼容映射） |
| `bsp-wrapper` | 无旧入口；提供函数表与稳定转发 |
| `bsp-port` | `bsp-adapter`、`bsp-device-adaptation`、`bsp-platform-adapter`（兼容映射） |
| `bsp-hal-driver` | `bsp-device-driver` |
| `bsp-handler` | `bsp-device-service` |
| `core-mcu` | `platform-*`（厂商 HAL/SPL 除外）、`bus-*`、`peripheral-*` |
| `mcu-platform` | `driver-vendor`、`platform-stm32-hal`、`platform-stm32-spl`（兼容映射） |
| `middleware-lvgl` | `middleware-lvgl` |
| `middleware-communication` | `protocol-*` |
| `middleware-storage` | `middleware-fatfs`、`middleware-sfud` |
| `middleware-fal` | 新入口（FAL 分区抽象，无旧目录） |
| `middleware-flashdb` | 新入口（KV/TS 数据库，无旧目录） |
| `middleware-letter-shell` | 新入口（串口命令行，无旧目录） |
| `middleware-algorithms` | `middleware-dsp`、`middleware-fft` |
| `software-system` | `system-*`、`security-*` |

工具方向已从旧 `operations/` 目录独立为 `skills/tools/`；硬件方向本轮不重构，继续使用 `skills/hardware/`。

## 硬件与工具提取

当前已将硬件和工具从软件架构重分类中独立出来：

| 来源 | 当前路径 | 数量 | 状态 |
|---|---|---:|---|
| 原 `hardware/` | `skills/hardware/` | 2 | active，待重构 |
| 原 `operations/` | `archive/tools-legacy/` | 29 | archived，保留兼容解析 |
| 旧软件层（workflow/platform/interface/bsp/middleware/system/security） | `archive/software-legacy/` | 51 | archived，不由 manifest 加载 |

工具 29 个入口包含 `tool-*` 构建/烧录/链接、`debug-*`、`observability-*`、`quality-*` 和 `release-*`。原调用名保留，catalog 路径切换到 `skills/tools/`。

> 说明：旧工具目录已归档；当前 active 工具入口位于 `skills/tools/`，硬件目录保持不变。

## 工具方向重分类

| Canonical skill | 旧入口范围 | 数量 |
|---|---|---:|
| `tools-build` | `tool-build-*`、`build-*` | 5 |
| `tools-flash` | `tool-flash-*`、`flash-*`、`gang-flash` | 6 |
| `tools-linker` | `tool-linker-scatter`、`linker-scatter` | 1 |
| `tools-debug` | `debug-*`、CmBacktrace、RTOS 调试别名 | 6 |
| `tools-observability` | `observability-*`、ELOG/RTT/SystemView 别名 | 5 |
| `tools-quality` | `quality-*`、审查/Map/MISRA/Unity 别名 | 4 |
| `tools-git` | 项目 Git 分支、提交、同步和受控恢复 | 0 |
| `tools-release` | `release-*`、OTA 别名 | 2 |
| `tools-learning-tutor` | `workflow-learning-tutor`、`learning-tutor` | 2 |

29 个旧工具目录位于 `archive/tools-legacy/`；9 个主入口位于 `skills/tools/` 并纳入 canonical catalog。旧名称通过 `resolveSkillId()` 解析到新的 `tools-*` skill。
