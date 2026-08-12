---
name: platform_middleware
description: Platform 纯定义：中间件能力接口（log/fs/kv/crypto/gui/comm），零实现不绑芯片/RTOS。
---

# Platform Middleware（平台抽象 · 中间件能力接口）

## 边界

只定义中间件**能力接口**（ops + 配置 + 错误码），零实现。错误码统一使用 [`platform_common`](../platform_common/SKILL.md) 的 `platform_error.h` 中 `platform_err_t` 枚举（`PLATFORM_ERR_*`）。具体中间件源码底座归 Vendor，移植/适配归 Impl。Service 通过 Platform 接口使用中间件能力，不直接依赖 Vendor 源码。

## 子域接口

- **log**：分级日志输出接口（如 `platform_log_write`）；
- **fs**：文件系统接口（open/read/write/close，如 `platform_fs_open`）；
- **kv**：键值存储接口（get/set/delete，掉电安全）；
- **crypto**：对称/摘要/随机数等加密原语接口；
- **gui**：显示/输入/屏幕缓冲等 GUI 抽象接口；
- **comm**：MQTT/BLE/CAN/WiFi/蜂窝/LoRa/GPS/USB 等通信能力抽象接口。

## 依赖

类型统一 include `platform_common/platform_type.h`（出口类型），错误码统一 include `platform_common/platform_error.h`（`platform_err_t`/`PLATFORM_ERR_*`），常用宏统一取自 `platform_common/platform_def.h`，再加上标准 C 类型；禁止 include Vendor 头文件、HAL 或 RTOS 原生类型，**禁止自行重定义等价类型、错误码或宏**。

## 生成契约

`03_Platform/platform_middleware/` 只含头文件（零 `.c`）。接口以 `platform_*_t` + `platform_*_ops_t` 声明，Impl 在 `04_Impl/impl_middleware/` 或 Vendor patch 中落地。中间件能力接口无公共实现需求，保持零 `.c`（门禁放开的是「允许」，非「必须」）；任何实现归 Impl/Vendor patch。

## 必须读取（生成前 MUST，缺失任一即不得开始输出）

- 对象四元组模板：`../platform_common/references/object-four-tuple-template.md`（base + cfg/ctx/data/ops 判定标准）
- 生成代码格式、命名和注释统一遵循：`../../tools/tools-quality/references/style-profile.md`
- 生成代码审查门禁：`../../tools/tools-quality/references/review-gates.md`
- 软件层契约：`../../workflow/workflow-review-gate/references/software-layer-contract.md`

## 四元组判定规则（MUST）

1. **必须套四元组**：若接口定义了「承载平台身份的对象」（首字段 `platform_device_t`/`platform_service_t`，或含对象身份/生命周期字段）→ `base` 首字段 + 补齐 `cfg`/`ctx`/`data`/`ops` 四槽。
2. **豁免（须显式声明）**：仅纯粹行为函数表（`platform_*_ops_t`，只含 `pf_*` + 上下文，无身份/生命周期字段）可豁免；豁免必须在头注释显式声明「纯转发、不承载对象身份」。
3. **禁止**用「纯接口」边界豁免一个已定义了对象 struct 的类型。

## 生成自检门禁（输出前 MUST）

输出代码前逐项核对，任一不满足不得交付：

- [ ] 四元组：按判定规则核对
- [ ] 错误码：全部使用 `platform_err_t`/`PLATFORM_ERR_*`，不压平为 -1
- [ ] 类型/宏：`platform_type.h` 出口类型、`platform_def.h` 宏，不自造、不 include Vendor 头
- [ ] 注释：按 `style-profile.md` 检查文件头、公开 API 和必要约束
- [ ] 代码质量：按 `review-gates.md` 自查

## 禁止

禁止包含任何中间件源码、具体协议栈实现、业务策略或原生 RTOS 调用。

## 交接

源码底座登记交给 [`vendor_lvgl`](../../vendor/vendor_lvgl/SKILL.md)、[`vendor_fatfs`](../../vendor/vendor_fatfs/SKILL.md)、[`vendor_stack`](../../vendor/vendor_stack/SKILL.md)、[`vendor_flashdb`](../../vendor/vendor_flashdb/SKILL.md)、[`vendor_fal`](../../vendor/vendor_fal/SKILL.md)、[`vendor_letter_shell`](../../vendor/vendor_letter_shell/SKILL.md)、[`vendor_dsp`](../../vendor/vendor_dsp/SKILL.md)。

共享层契约见 [`software-layer-contract.md`](../../workflow/workflow-review-gate/references/software-layer-contract.md)。
