---
name: platform_middleware
description: Platform 中间件能力契约：每个中间件默认只提供一个 Vendor-neutral 公共头（例如 platform_log.h），统一类型与错误语义；具体逻辑由 Impl 的 impl_xxx_port.c/.h 接入，零实现不绑芯片/RTOS。
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
03_Platform/platform_middleware/<domain>/platform_<domain>.h
```

例如日志使用 `platform_log.h`。不要为同一能力再拆出 `platform_<domain>_config.h`、
`platform_<vendor>.h` 或 Platform `.c`，除非独立需求明确要求并经过门禁审查。公开配置
语义可以并入唯一公共头；Vendor、板级、工具链和后端私有配置必须下沉到 Impl/工程配置。

标准调用链为：

```text
App → Service → Platform Middleware contract ← Impl Middleware → Vendor
```

Service/App 只使用 Platform Middleware 公共契约，不直接依赖第三方中间件。

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

## Middleware Platform→Impl 受限例外

总体依赖纪律仍然是 `App → Service → Platform ← Impl → Vendor`。本 Skill 允许 Middleware 存在受控的 Platform→Impl 实现级例外，但必须同时满足：

1. 例外只发生在实现文件或链接/注册边界，不出现在 Platform 公共头的 include、类型或宏中；
2. Impl 只提供稳定的契约实现/转发入口，不能把 Vendor 头、私有句柄或业务策略泄漏到 Platform；
3. Platform 仍只描述能力，不承载第三方库逻辑；
4. 该例外只适用于已确认的 Middleware 接入，不得放宽 OS、BSP、MCU 或其他 Platform 子域规则；
5. 若 Middleware 不需要 Platform 实现文件，则直接由 Impl 定义 Platform 契约符号，Platform 目录保持零 `.c`。

当前日志基线采用第 5 种方式：`platform_log.h` 是 Platform Middleware 唯一公共头，
Platform 目录不保留日志 `.c` 实现；Platform 契约符号由
`04_Impl/impl_middleware/log/impl_log_port.c` 定义，Port 头只作为 Impl 内部边界。

## 生成和对象契约

`03_Platform/platform_middleware/` 默认只生成每个能力域的一个公共头，保持零 `.c`。
接口可使用 `platform_*_t`、`platform_*_ops_t` 和 `void *context`；不要在公共头中暴露
Vendor、HAL、RTOS 或 Impl Port 的类型。

若接口定义了承载平台身份和生命周期的对象，必须按 `base + cfg + ctx + data + ops` 四元组组织；若只是纯行为函数表且不承载对象身份，必须在头注释中明确“纯转发、不承载对象身份”。

## 必须读取（生成前 MUST）

- [`platform_common` 四元组模板](../platform_common/references/object-four-tuple-template.md)；
- [`style-profile.md`](../../tools/tools-quality/references/style-profile.md)；
- [`review-gates.md`](../../tools/tools-quality/references/review-gates.md)；
- [`software-layer-contract.md`](../../workflow/workflow-review-gate/references/software-layer-contract.md)。

## 生成自检门禁

- [ ] 公共头只包含 Platform Common 和必要标准类型；
- [ ] 每个中间件能力默认只有一个 Platform 公共头，配置语义没有形成第二个历史入口；
- [ ] 没有 Vendor、HAL、RTOS、Impl 私有类型或 `stdio.h` 泄漏；
- [ ] 错误全部使用 `platform_err_t`/`PLATFORM_ERR_*`；
- [ ] 生命周期、输入输出所有权、阻塞/ISR/线程安全约束已写明；
- [ ] 对象类型按四元组规则判定，豁免项有显式声明；
- [ ] 具体格式化、缓存、输出和 Vendor 生命周期没有放入 Platform；
- [ ] Middleware 反向依赖例外没有扩大到其他 Platform 子域。

## 禁止

禁止包含第三方源码、具体协议栈实现、业务策略、Vendor 句柄、HAL/寄存器或原生 RTOS 调用；禁止因为“零实现”规则而在 Platform 目录复制 Vendor 或 Impl 逻辑。

## 交接

第三方源码、版本、许可证和编译单元交给对应 `vendor_*` Skill 登记；具体适配交给 [`impl_middleware`](../../impl/impl_middleware/SKILL.md)。当前日志 + RTT 的实践范围不自动扩展到其他 Middleware。
