---
name: platform_middleware
description: Platform 纯定义：中间件能力接口（log/fs/kv/crypto/gui/comm），零实现不绑芯片/RTOS。
---

# Platform Middleware（平台抽象 · 中间件能力接口）

## 边界

只定义中间件**能力接口**（ops + 配置 + 错误码），零实现。具体中间件源码底座归 Vendor，移植/适配归 Impl。Service 通过 Platform 接口使用中间件能力，不直接依赖 Vendor 源码。

## 子域接口

- **log**：分级日志输出接口（如 `platform_log_write`）；
- **fs**：文件系统接口（open/read/write/close，如 `platform_fs_open`）；
- **kv**：键值存储接口（get/set/delete，掉电安全）；
- **crypto**：对称/摘要/随机数等加密原语接口；
- **gui**：显示/输入/屏幕缓冲等 GUI 抽象接口；
- **comm**：MQTT/BLE/CAN/WiFi/蜂窝/LoRa/GPS/USB 等通信能力抽象接口。

## 依赖

只能 include [`platform_common`](../platform_common/SKILL.md) 公共定义与标准 C 类型；禁止 include Vendor 头文件、HAL 或 RTOS 原生类型。

## 生成契约

`03_Platform/platform_middleware/` 只含头文件（零 `.c`）。接口以 `platform_*_t` + `platform_*_ops_t` 声明，Impl 在 `04_Impl/impl_middleware/` 或 Vendor patch 中落地。

## 禁止

禁止包含任何中间件源码、具体协议栈实现、业务策略或原生 RTOS 调用。

## 交接

源码底座登记交给 [`vendor_lvgl`](../../vendor/vendor_lvgl/SKILL.md)、[`vendor_fatfs`](../../vendor/vendor_fatfs/SKILL.md)、[`vendor_stack`](../../vendor/vendor_stack/SKILL.md)、[`vendor_flashdb`](../../vendor/vendor_flashdb/SKILL.md)、[`vendor_fal`](../../vendor/vendor_fal/SKILL.md)、[`vendor_letter_shell`](../../vendor/vendor_letter_shell/SKILL.md)、[`vendor_dsp`](../../vendor/vendor_dsp/SKILL.md)。

共享层契约见 [`software-layer-contract.md`](../../workflow/workflow-review-gate/references/software-layer-contract.md)。
