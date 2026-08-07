# vendor_mapping.md — Vendor 底座登记表

> 原则（D7）：**Vendor 源码不复制进仓库**。本文件登记每个底座库的来源、版本、路径与补丁；改动只允许进 `patch/` 目录。
> 目标工程结构参照：`05_Vendor/`（README + vendor_mapping.md + patch/）。

## 登记格式

每行一个底座库：

```text
| 库 | 来源（URL/原厂） | 版本/commit | 路径（工程外） | 登记于技能 | 补丁 |
|---|---|---|---|---|---|
| <名称> | <来源> | <版本或 commit> | <绝对/相对路径或下载方式> | vendor_* | patch/<名称>/*.patch |
```

## 登记表

| 库 | 来源 | 版本/commit | 路径（工程外） | 登记于技能 | 补丁 |
|---|---|---|---|---|---|
| STM32F4 HAL | [stm32f4xx-hal-driver](https://github.com/STMicroelectronics/stm32f4xx-hal-driver) | `1f6451c3e07728b4c830744de380e56bf5bc0026` | CubeMX 生成目录 / `Drivers/STM32F4xx_HAL_Driver/` | vendor_stm32 | patch/stm32f4-hal/ |
| ESP-IDF | [esp-idf](https://github.com/espressif/esp-idf) | `055ba9d3f9c6fd9a0efacd4993a2a942972dd65d` | `$IDF_PATH` | vendor_stm32 | patch/esp-idf/ |
| CMSIS | [CMSIS_6](https://github.com/ARM-software/CMSIS_6) | `7f62ddc8ab8e9af22039912b8f9f46a9290f49ba` | CubeMX 生成目录 / `Drivers/CMSIS/` | vendor_stm32 | patch/cmsis/ |
| LVGL | [lvgl/lvgl](https://github.com/lvgl/lvgl) | 项目锁定版本 | `Vendor/lvgl/`（工程外引用） | vendor_lvgl | patch/lvgl/ |
| MQTT | [eclipse/paho.mqtt.embedded-c](https://github.com/eclipse/paho.mqtt.embedded-c) 等 | 项目锁定版本 | `Vendor/comm/` | vendor_stack | patch/stack/ |
| FatFs | [elm-chan/fatfs](http://elm-chan.org/fsw/ff/) | 项目锁定版本 | `Vendor/fatfs/` | vendor_fatfs | patch/fatfs/ |
| SFUD | [armink/SFUD](https://github.com/armink/SFUD) | 项目锁定版本 | `Vendor/sfud/` | vendor_fatfs | patch/sfud/ |
| FAL | [armink/FAL](https://github.com/armink/FAL) | 项目锁定版本 | `Vendor/fal/` | vendor_fal | patch/fal/ |
| FlashDB | [armink/FlashDB](https://github.com/armink/FlashDB) | 项目锁定版本 | `Vendor/flashdb/` | vendor_flashdb | patch/flashdb/ |
| letter_shell | [NevermindZZT/letter-shell](https://github.com/NevermindZZT/letter-shell) | 项目锁定版本 | `Vendor/letter_shell/` | vendor_letter_shell | patch/letter_shell/ |
| CMSIS-DSP | ARM CMSIS-DSP（随 CMSIS） | 随 CMSIS 版本 | `Vendor/cmsis-dsp/` | vendor_dsp | patch/cmsis-dsp/ |

## 补丁规范

- 只允许在 `patch/<底座名>/` 下放补丁文件（`.patch`/`.diff`），**不得直接修改 Vendor 源码**；
- 每个补丁头部必须注明：目的、适用版本、应用方式（`git apply` / `patch -p1`）；
- 登记原则：源码位置可复现（下载地址或原厂路径），工程构建/CI 不依赖仓库内 Vendor 源码。

## 使用方式

- 构建/移植时按本表在工程外取得源码 → 应用 `patch/` 补丁 → 编译；
- 换版本 = 更新本表版本列 + 校验补丁，不复制新源码入库。
