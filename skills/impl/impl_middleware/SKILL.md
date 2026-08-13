---
name: impl_middleware
description: Impl 中间件接入：默认使用单一 impl_xxx_port.c/.h 实现 platform_middleware 契约，并通过 Port 隔离 EasyLogger、RTT、FatFs、Crypto、LVGL 或通信 Vendor；不复制或修改第三方源码。
---

# Impl Middleware（契约实现与 Vendor Port）

## 边界

`impl_middleware` 把具体第三方中间件接入 `platform_middleware` 契约。它负责具体平台绑定和机制实现，包括：

- Platform 契约的函数实现、状态和生命周期；
- 参数检查、能力判断和 Platform 错误码映射；
- 格式化、固定缓冲区、IO、时间戳和输出通道；
- Vendor 要求的初始化、回调、锁、内存和资源 Port；
- 失败、降级、重试和资源释放路径。

标准链路为：

```text
App → Service → platform_middleware contract ← impl_middleware → Vendor
```

App/Service 不直接调用 Vendor；Platform 公共头不暴露 Impl/Vendor 类型。

## 单一 Port 文件职责

一个中间件接入默认只创建或使用一组 Impl Port 文件：

```text
04_Impl/impl_middleware/<domain>/impl_<domain>_port.c
04_Impl/impl_middleware/<domain>/impl_<domain>_port.h
```

同一个 `impl_<domain>_port.c` 同时承载：

1. `platform_<domain>_*` 契约符号、状态、参数检查、能力判断和错误映射；
2. 第三方库要求的 `*_port_*` 回调、IO、时间/线程信息、锁、缓冲区和输出绑定。

`impl_<domain>_port.h` 是 Impl 内部 Port 边界，不是 App、Service 或 Platform 公共 API。
只有当实现规模、编译隔离或工具链冲突有明确证据时，才允许增加额外的 Impl 私有 `.c/.h`；
新增文件必须在实施计划中说明职责，且不得重新形成第二个 Platform 契约入口。

当前 Elog + SEGGER RTT 基线：

```text
platform_log.h               Platform 唯一公共契约头
        ↑
impl_log_port.c/.h           契约实现 + EasyLogger/SEGGER RTT Port
        ↓
05_Vendor/easylogger + 05_Vendor/segger_rtt
```

当前基线不需要 `platform_log.c`、`impl_log.c` 或独立配置公共头；Platform 目录只保留
`platform_log.h`，具体逻辑全部收敛到 `impl_log_port.c`。

## Port 规则

- Port 文件统一使用 `impl_` 前缀承载层归属：`impl_<domain>_port.c/.h`；文件名优先按
  Platform 能力域命名，而不是按第三方库命名；例如 `impl_log_port.c/.h`；
- Port 公共头以板级公共基础类型和必要标准 C 类型为主；Elog 示例使用 `board_types.h` 与 `va_list`；
- Vendor 头只进入 Port `.c`，不进入 Platform 公共头、Service 或 App；
- Vendor 原生函数名只保留在 Port 或 Vendor 要求的移植点；
- Port 不能承载业务策略、业务缓存、产品状态机或上层编排；
- Platform 契约实现、Vendor 回调和后端绑定集中在同一个 Port `.c`，避免出现第二个日志/中间件实现单元；
- Vendor 目录中的第三方 `.c/.h`、通用实现和许可证文件保持原样，不复制、不格式化、不直接修改；
- 只允许修改 `impl_<domain>_port.c/.h`、工程编译注册、板级/工具链配置和明确的移植配置文件；
- Port 必须说明资源所有权、初始化顺序、阻塞属性、ISR 限制、线程安全和可重入性；
- 失败不得静默，必须向契约实现层返回可映射的错误状态。

## Platform→Impl 受限例外

Middleware 可以允许 Platform→Impl 的实现级反向依赖，但这不是通用层规则，也不是公共头依赖许可：

- 只允许稳定的实现符号、注册入口或转发边界；
- 不允许 Platform include `impl_middleware` 私有头、Vendor 头或 Vendor 句柄；
- 不允许借例外把 Vendor 调用、格式化、缓存、锁、重试或业务策略放回 Platform；
- OS、BSP、MCU 和其他 Platform 子域仍遵守各自的依赖门禁；
- 当前日志直接采用“单一 Impl Port 定义 Platform 契约符号”的方式，不要求 Platform `.c`。

## Vendor 源码与供应链

第三方源码只在对应 `vendor_*` Skill 和目标工程 Vendor 目录中登记，接入时保持源码不动：

- 不复制源码到 Impl；
- 不在 Impl Skill 中重写第三方实现；
- 本规范范围内不修改 Vendor 源码；若上游 patch 确属必要，必须另立 Vendor 变更需求，不能隐含在 Port 接入中；
- 记录版本、许可证、配置、编译单元和必要 patch；
- Platform/Service/App 不直接 include Vendor。

## OS 和并发边界

当前日志 + SEGGER RTT 接入不引入 OS/FreeRTOS、`platform_os` 或 `impl_os`。没有独立 OS 需求和目标证据时，不得在 Middleware Port 中增加 Task、Queue、Mutex、异步线程或原生 RTOS 类型。

同步格式化输出默认不允许 ISR。时间戳必须绑定到 Impl Port 的已确认时间源（例如目标 SysTick、OS tick 或板级时钟），不得在 Platform 公共头中绑定 HAL/RTOS；若其他 Middleware 需要 OS/异步能力，必须另立需求，明确阻塞时间、线程安全、ISR API、所有权和失败恢复后再接入。

## 生成前检查

- [ ] Platform 契约真实存在且 Vendor-neutral；
- [ ] 默认只有 `impl_<domain>_port.c/.h` 一个 Impl Port 文件对；没有重复的
  `impl_<domain>.c` 契约实现入口；
- [ ] Port 头没有泄漏 Vendor/OS/Platform 私有实现类型；
- [ ] Vendor `.c/.h` 源码未修改、未复制进 Impl，仅修改 Port 和明确的工程/移植配置；
- [ ] 初始化、反初始化、状态和错误映射完整；
- [ ] 格式化、缓存、输出和资源释放路径有边界；
- [ ] ISR、阻塞、线程安全、可重入性和内存所有权已声明；
- [ ] 当前需求没有越界扩展到 OS、其他 Backend 或其他中间件；
- [ ] 时间戳、锁、RTT/UART 等后端资源均有真实目标或工具链证据；
- [ ] 静态、主机、交叉构建、目标运行和实物观测验收层级已分开。

## 交接

接入完成后交给 `workflow-final-review` 做独立 Review；静态检查、主机测试、交叉编译、烧录、目标运行和 RTT/串口观测必须分别记录，分别交给对应 `tools-*` Skill。RTT Viewer 连接成功只证明观测通道可用；必须捕获实际日志内容和时间戳递增，才能宣称日志运行验证通过。当前日志 + RTT 的实践证据不能替代其他 Middleware 的独立验收。
