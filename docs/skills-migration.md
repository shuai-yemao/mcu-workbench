# Skills 迁移与归档能力表

本文件同时记录旧调用名、历史归档目录与当前 canonical 入口。目录与 frontmatter `name` 完全一致；当前解析规则以 `skills/catalog.js` 的 `MIGRATION_MAP` 为唯一事实来源。

Claude Code 的 plugin skill 没有原生别名：请把 `/mcu-workbench:<旧名>` 改为 `/mcu-workbench:<当前 canonical 名>`。仓库内部 Node 查询接口仍能识别旧名，便于外部工具逐步升级。

## 归档能力物化

归档不是运行时依赖。每一份归档 `SKILL.md`、其 `references/`、`scripts/` 和 `assets/` 已被转移为目标 canonical Skill 的 active `references/capabilities/<能力主题>/`，并由目标 Skill 的 `references/capability-index.md` 选择性加载。主入口保持简短，只承担边界、路由和验收；命中具体技术时再读取完整能力资料。

```powershell
npm run migrate:capabilities       # 检查 80 份已转移能力及索引是否完整
node scripts/materialize-skill-capabilities.js --write # 首次转移或补齐缺失资料
```

目前 80 份归档来源迁入 18 个 canonical Skill。没有归档前身的 `workflow-router`、`app-architecture`、`os-abstraction`、`rtos-freertos`、`middleware-lvgl` 和硬件 Skills 保持各自的原生 references；它们不应凭空创建“旧版迁移资料”。

原先未登记的工作流资料也已指定目标：`workflow-devlog` → `tools-learning-tutor`；`embedded-ai-collab` 和 `embedded-ai-prompt-templates` → `workflow-project-integration`；`embedded-ai-coding-standard` 和 `embedded-ai-code-review` → `tools-quality`。

| 旧名 | 历史归档目录 | 原架构层 |
|---|---|---|
| `embedded` | `workflow-router` | workflow |
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

下面的 15 个名称是当前软件架构的 canonical skill；工具方向另有 8 个 canonical skill，合计 23 个。旧目录仍保留并登记在 catalog 中；`resolveSkillId()` 和 Codex 同步脚本优先使用 canonical 入口，迁移期间不删除旧目录。

| Canonical skill | 合并/交接的旧入口 |
|---|---|
| `workflow-router` | `embedded` |
| `workflow-project-integration` | `workflow-architecture`、`project-integration`、`code-porting` |
| `app-architecture` | APP 新入口，无旧目录 |
| `os-abstraction` | OSAL 新入口；`rtos-freertos` 保留为 FreeRTOS 专用实现 |
| `bsp-adapter` | `bsp-device-adaptation`、`bsp-platform-adapter` |
| `bsp-hal-driver` | `bsp-device-driver` |
| `bsp-handler` | `bsp-device-service` |
| `core-mcu` | `platform-*`（厂商 HAL/SPL 除外）、`bus-*`、`peripheral-*` |
| `driver-vendor` | `platform-stm32-hal`、`platform-stm32-spl` |
| `middleware-lvgl` | `middleware-lvgl` |
| `middleware-communication` | `protocol-*` |
| `middleware-storage` | `middleware-fatfs`、`middleware-sfud` |
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
| `tools-release` | `release-*`、OTA 别名 | 2 |
| `tools-learning-tutor` | `workflow-learning-tutor`、`learning-tutor` | 2 |

29 个旧工具目录位于 `archive/tools-legacy/`；8 个主入口位于 `skills/tools/` 并纳入 canonical catalog。旧名称通过 `resolveSkillId()` 解析到新的 `tools-*` skill。
