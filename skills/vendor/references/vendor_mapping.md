# vendor_mapping.md — Vendor 底座登记表

> 本表描述目标工程 `05_Vendor/` 的来源、版本和接入映射。实际 Vendor 源码由目标工程 Git 管理；插件仓库只保存本表、Skill、参考资料和必要的补丁知识。

## 目标工程物理布局

```text
05_Vendor/
├─ vendor_mcu/{stm32,at32,esp32}/
├─ vendor_rtos/
├─ vendor_middleware/{lvgl,fatfs,flashdb,fal,communication,letter_shell}/
├─ vendor_algorithm/{ring_buffer,fft,dsp}/
└─ vendor_metadata/
```

## 登记格式

每行一个底座库或生成工程：

```text
| 库/工程 | 分类 | 来源（URL/原厂） | 版本/commit | 目标工程路径 | 生成器/工具链 | 登记 Skill | 补丁/备注 |
|---|---|---|---|---|---|---|---|
| <名称> | <mcu/rtos/middleware/algorithm> | <来源> | <版本或 commit> | <05_Vendor 相对路径> | <生成器或工具链> | vendor_* | <patch 或备注> |
```

## 登记表

| 库/工程 | 分类 | 来源 | 版本/commit | 目标工程路径 | 生成器/工具链 | 登记 Skill | 补丁/备注 |
|---|---|---|---|---|---|---|---|
| STM32 官方底座与 CubeMX 工程 | mcu | ST 官方 SDK/CubeMX | 项目锁定版本 | `05_Vendor/vendor_mcu/stm32/` | STM32CubeMX + 目标工具链 | vendor_mcu | `.ioc`、Startup、System、HAL/LL/CMSIS 和工程文件完整保留 |
| AT32 官方底座与 Workbench 工程 | mcu | Artery 官方 SDK/Workbench | 项目锁定版本 | `05_Vendor/vendor_mcu/at32/` | AT32 Workbench + 目标工具链 | vendor_mcu | Workbench 生成的工程文件夹完整保留 |
| ESP32 官方底座与初始工程 | mcu | Espressif ESP-IDF | 项目锁定版本 | `05_Vendor/vendor_mcu/esp32/` | ESP-IDF + CMake + `sdkconfig` | vendor_mcu | 初始工程、组件配置和 `sdkconfig` 完整保留 |
| FreeRTOS/RT-Thread | rtos | 官方仓库 | 项目锁定版本 | `05_Vendor/vendor_rtos/` | 目标工具链 | vendor_rtos | 内核、移植层、配置和许可证完整保留 |
| LVGL | middleware | `lvgl/lvgl` | 项目锁定版本 | `05_Vendor/vendor_middleware/lvgl/` | 目标工具链 | vendor_lvgl | 只保留本工程需要的内容 |
| FatFs/SFUD | middleware | 官方/项目选定来源 | 项目锁定版本 | `05_Vendor/vendor_middleware/fatfs/` | 目标工具链 | vendor_fatfs | 只保留实际使用的文件系统/存储支持 |
| FAL | middleware | `armink/FAL` | 项目锁定版本 | `05_Vendor/vendor_middleware/fal/` | 目标工具链 | vendor_fal | 分区、设备 ops 和移植配置 |
| FlashDB | middleware | `armink/FlashDB` | 项目锁定版本 | `05_Vendor/vendor_middleware/flashdb/` | 目标工具链 | vendor_flashdb | KV/TS 与必要 Port |
| 通信协议栈 | middleware | 项目选定来源 | 项目锁定版本 | `05_Vendor/vendor_middleware/communication/` | 目标工具链 | vendor_stack | 只保留实际使用协议栈 |
| letter_shell | middleware | `NevermindZZT/letter-shell` | 项目锁定版本 | `05_Vendor/vendor_middleware/letter_shell/` | 目标工具链 | vendor_letter_shell | 核心、配置和移植内容 |
| Ring Buffer/FFT/DSP | algorithm | 项目选定来源/CMSIS-DSP | 项目锁定版本 | `05_Vendor/vendor_algorithm/{ring_buffer,fft,dsp}/` | 目标工具链 | vendor_algorithm | 只保留实际使用算法实现 |

## 完整性与 Git 规则

- `vendor_mcu` 和 `vendor_rtos` 按上游/生成器边界完整保留，不删除用于重现工程的文件；
- `vendor_middleware` 和 `vendor_algorithm` 允许按项目需求裁剪，但必须记录裁剪范围、版本、许可证和编译单元；
- `vendor_metadata/` 登记来源、版本/commit、许可证、生成器版本、补丁、依赖和选用原因；
- 目标工程 Git 统一提交整个 `05_Vendor/`，不得再用外部路径、Submodule 或插件仓库存储实际 Vendor 源码替代该目录；
- Service、App 和 Platform 公共头不得直接 include `05_Vendor/` 中的头文件，唯一接入边界是 `Impl`。

## 补丁规范

补丁只描述目标工程适配所需的最小变更，放在目标工程 `vendor_metadata/patch/` 或项目约定的补丁位置，并注明目的、适用版本和应用方式。不得把补丁误写成新的 Vendor 实现，也不得在插件仓库携带目标工程 Vendor 源码。
