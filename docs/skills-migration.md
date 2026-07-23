# Skills 名称迁移表

本表记录从旧目录和旧调用名迁移到统一命名体系的完整映射。新命名为 `层级-领域[-具体对象]`，目录与 frontmatter `name` 完全一致。

Claude Code 的 plugin skill 没有原生别名：请把 `/mcu-workbench:<旧名>` 改为 `/mcu-workbench:<新名>`。仓库内部 Node 查询接口仍能识别旧名，便于外部工具逐步升级。

| 旧名 | 新名 | 架构层 |
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

下面的 15 个名称是当前软件架构的 canonical skill。旧目录仍保留并登记在 catalog 中；`resolveSkillId()` 和 Codex 同步脚本优先使用 canonical 入口，迁移期间不删除旧目录。

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

`operations`、`hardware` 及其旧入口不属于本轮软件架构重分类，保持原目录和调用方式。
