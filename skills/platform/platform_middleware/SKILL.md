---
name: platform_middleware
description: Platform 中间件 API：每个中间件默认只提供一个稳定公共头和转发实现；Platform .c 直接依赖固定的 Impl Adapter，统一错误语义，不绑定 Vendor/HAL/RTOS。
---

# Platform Middleware（中间件能力契约）

## 边界

`platform_middleware` 只定义中间件能力契约，不实现具体第三方库。它负责：

- 能力接口、Ops/Context 和必要的配置语义；
- `platform_common` 的统一类型、错误码和公共宏出口；
- 初始化/反初始化、状态、所有权、生命周期和失败语义；
- 阻塞属性、ISR 限制、线程安全、可重入性和缓冲区约束；
- 能力是否支持同步/异步的公开声明。

默认文件边界是“一个能力域，一个公共头”：

```text
03_Platform/platform_middleware/platform_<domain>.h
```

例如当前工程日志使用 `03_Platform/platform_middleware/platform_log.h` 与窄职责实现
`03_Platform/platform_middleware/platform_log.c`。不要为同一能力再拆出 `platform_<domain>_config.h`、
`platform_<vendor>.h` 或第二个公共契约头。Platform `.c` 默认不生成；若工程确实需要稳定的
注册槽、状态校验或转发，可在 RCP/Review Gate 明确放行一个窄职责 `.c`。公开配置
语义可以并入唯一公共头；Vendor、板级、工具链和后端私有配置必须下沉到 Impl/工程配置。

标准调用链为：

```text
App → Service → Platform Middleware API → Impl Middleware Adapter → Vendor
```

Service/App 只使用 Platform Middleware 公共契约，不直接依赖第三方中间件。

## 术语与实现归属

这里的“Platform Middleware”不是第三方中间件本体，而是面向上层的稳定 API 和转发层。三者必须区分：

- `platform_middleware`：定义 Vendor-neutral API、统一错误语义和生命周期，并直接调用固定 Impl Adapter；
- `impl_middleware`：适配层，提供 Platform 所需的具体函数，并把调用转换给 Vendor；
- `vendor`：第三方中间件本体，例如 LVGL、EasyLogger、FatFs 或其他协议栈，源码和原始实现归 Vendor 目录管理。

因此，`platform_middleware.c` 可以直接依赖对应的 `impl_middleware` Adapter 头，但不得依赖 Vendor、HAL、RTOS
或 Vendor 句柄；`impl_middleware` 才能依赖 Vendor。Impl 适配层不得复制第三方实现，也不得把 Vendor 类型、句柄
或配置泄漏到 Platform 公共头。

## 子域接口

- **log**：分级日志、raw、hexdump、过滤和输出能力；
- **fs**：文件 open/read/write/close 等能力；
- **kv**：键值 get/set/delete、掉电安全语义；
- **crypto**：摘要、对称加密、随机数等原语；
- **gui**：显示、输入和缓冲区能力；
- **comm**：MQTT、BLE、CAN、WiFi、蜂窝、LoRa、GPS、USB 等通信能力。

具体子域只有在目标工程证据和独立需求确认后才能增加；不能由 Elog 样例自动推导其他中间件的接口细节。

## 依赖和纯度

公共头只允许依赖：

- `platform_common/platform_type.h` 的统一类型；
- `platform_common/platform_error.h` 的 `platform_err_t`/`PLATFORM_ERR_*`；
- `platform_common/platform_def.h` 的公共宏；
- 必要的标准 C 类型。

禁止 Platform Middleware 公共头或实现文件依赖：

- EasyLogger、SEGGER RTT、FatFs、LVGL、Crypto 或其他 Vendor 头；
- HAL、CMSIS 设备头、寄存器或芯片类型；
- FreeRTOS、`platform_os` 或其他 RTOS 原生类型；
- `impl_middleware` 私有头、Port 句柄或 Vendor 配置结构；
- `stdio.h` 作为具体格式化/输出实现依赖。

Platform 不承载第三方库初始化、格式化、缓存、输出、锁、重试、业务策略或具体错误转换逻辑。

## 固定后端与直接转发

Middleware 默认采用单一固定后端。Platform 公共头只暴露 `platform_<domain>_*()` API；Platform `.c` 直接 include
对应的 Impl Adapter 头并调用稳定的 `impl_<vendor>_<domain>_*()` 函数：

```text
Service  → platform_<domain>_*()
Platform → impl_<vendor>_<domain>_*()
Impl     → Vendor
```

这是 Middleware 专用的 **Platform→Impl 受限例外**，不扩展到 Platform MCU、BSP、Device 或 Service。该例外只存在于
Platform `.c` 到固定 Impl Adapter 的已审查边界，**不出现在 Platform 公共头的 include、类型或宏中**。Platform `.c` 只能承担参数
检查、状态管理和稳定转发；不得包含 Vendor/HAL/RTOS、格式化、缓存、锁、重试或业务策略。运行时不提供 Backend
注册、注销或切换接口。

当前日志基线采用固定转发：`03_Platform/platform_middleware/platform_log.h/.c` 提供稳定日志 API，
`04_Impl/impl_middleware/elog/impl_elog_log.c/.h` 提供直接调用的 Adapter，`impl_elog_port.c` 负责
EasyLogger→SEGGER RTT 的 Vendor Port。Platform `.c` 不包含任何 Elog、RTT、HAL 或 FreeRTOS 依赖。

## 生成和对象契约

`03_Platform/platform_middleware/` 当前按扁平目录组织能力文件，默认每个能力域只有一个公共头和一个稳定转发 `.c`。
公共头只暴露 `platform_*_*()` API；Platform `.c` 可 include 对应 Impl Adapter 头，但不得暴露或保存 Vendor、HAL、
RTOS 或 Impl 私有类型。Middleware 不建立 Ops/context 注册对象。

Middleware API 不使用四元组对象；需要实例身份的能力改走 Platform Device/Driver 或独立需求。

## 必须读取（生成前 MUST）

- [`platform_common` 四元组模板](../platform_common/references/object-four-tuple-template.md)；
- [`style-profile.md`](../../tools/tools-quality/references/style-profile.md)；
- [`review-gates.md`](../../tools/tools-quality/references/review-gates.md)；
- [`software-layer-contract.md`](../../workflow/workflow-review-gate/references/software-layer-contract.md)。

## 生成自检门禁

- [ ] 公共头只包含 Platform Common 和必要标准类型；
- [ ] 每个中间件能力默认只有一个 Platform 公共头，配置语义没有形成第二个历史入口；
- [ ] 若存在 Platform `.c`，其职责仅为参数检查/状态/直接转发，且只 include 对应 Impl Adapter 头；
- [ ] Platform 公共头没有 Vendor、HAL、RTOS 或 Impl 私有类型泄漏；
- [ ] 错误全部使用 `platform_err_t`/`PLATFORM_ERR_*`；
- [ ] 生命周期、输入输出所有权、阻塞/ISR/线程安全约束已写明；
- [ ] Middleware 不使用四元组对象；需要实例身份的能力已转入 Device/Driver 约束；
- [ ] 具体格式化、缓存、输出和 Vendor 生命周期没有放入 Platform；
- [ ] Platform→Impl 只允许 Middleware 的固定 Adapter 直接调用，未扩大到其他 Platform 子域。
- [ ] Vendor 本体仍由 Vendor 目录管理，未复制到 Platform 或 Impl。

## 禁止

禁止包含第三方源码、具体协议栈实现、业务策略、Vendor 句柄、HAL/寄存器或原生 RTOS 调用；禁止因为“零实现”规则而在 Platform 目录复制 Vendor 或 Impl 逻辑。

## 交接

第三方源码、版本、许可证和编译单元交给对应 `vendor_*` Skill 登记；具体适配交给 [`impl_middleware`](../../impl/impl_middleware/SKILL.md)。当前日志 + RTT 的实践范围不自动扩展到其他 Middleware。
