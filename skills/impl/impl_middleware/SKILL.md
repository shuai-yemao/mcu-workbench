---
name: impl_middleware
description: Impl 中间件接入：默认使用单一 impl_xxx_port.c/.h；经 RCP 审查可拆为 Platform 契约适配与 Vendor Port 两个私有单元，并通过 Port 隔离 EasyLogger、RTT、FatFs、Crypto、LVGL 或通信 Vendor；不复制或修改第三方源码。
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

## 默认单一 Port 与受控拆分

一个中间件接入默认只创建或使用一组 Impl Port 文件：

```text
04_Impl/impl_middleware/<domain>/impl_<domain>_port.c
04_Impl/impl_middleware/<domain>/impl_<domain>_port.h
```

默认由同一个 `impl_<domain>_port.c` 同时承载：

1. `platform_<domain>_*` 契约符号、状态、参数检查、能力判断和错误映射；
2. 第三方库要求的 `*_port_*` 回调、IO、时间/线程信息、锁、缓冲区和输出绑定。

`impl_<domain>_port.h` 是 Impl 内部 Port 边界，不是 App、Service 或 Platform 公共 API。
只有当实现规模、编译隔离或工具链冲突有明确证据时，才允许增加额外的 Impl 私有 `.c/.h`；
新增文件必须在实施计划中说明职责，且不得重新形成第二个 Platform 契约入口。

当契约适配和 Vendor Port 需要编译隔离、资源边界或工具链隔离时，经 RCP/Review Gate
明确放行后可拆为两个 Impl 私有单元：

```text
impl_<vendor>_<domain>.c/.h   Platform Ops/context 适配、状态和错误映射
impl_<vendor>_port.c/.h       Vendor 回调、IO、时间、锁和具体资源绑定
```

拆分后仍只能有一个 Platform 契约实现/注册入口，不得因拆分产生第二套
`platform_<domain>_*` 符号或重复初始化路径。

当前 Elog + SEGGER RTT 基线：

```text
platform_log.h/.c             Platform 契约 + 窄职责 Ops/context registry
        ↑
impl_elog_log.c/.h            Platform Ops/context 适配与唯一注册入口
        ↓
impl_elog_port.c               EasyLogger Port → SEGGER RTT/FreeRTOS/HAL
        ↓
05_Vendor/easylogger + 05_Vendor/segger_rtt
```

`platform_log.c` 仅保存借用的 Ops/context、做状态校验和稳定转发，不含 Vendor/RTOS/HAL。
`impl_elog_log.c` 不直接暴露给 App/Service；Board 组合根只调用唯一的
`impl_elog_log_register()`/`unregister()`。

## Port 规则

- Port 文件统一使用 `impl_` 前缀承载层归属。默认命名为 `impl_<domain>_port.c/.h`；
  受控拆分时，契约适配按 `impl_<vendor>_<domain>.c/.h`，Vendor 适配按
  `impl_<vendor>_port.c/.h` 命名，并在实施计划登记职责；
- Port 公共头以板级公共基础类型和必要标准 C 类型为主；Elog 示例使用 `board_types.h` 与 `va_list`；
- Vendor 头只进入 Port `.c`，不进入 Platform 公共头、Service 或 App；
- Vendor 原生函数名只保留在 Port 或 Vendor 要求的移植点；
- Port 不能承载业务策略、业务缓存、产品状态机或上层编排；
- 默认将 Platform 契约实现、Vendor 回调和后端绑定集中在同一个 Port `.c`；受控拆分时，
  契约适配与 Vendor Port 必须保持单向调用，且只保留一个 Platform 契约入口；
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
- 当前日志采用 `platform_log.c` 窄 registry + `impl_elog_log.c` Ops 适配 +
  `impl_elog_port.c` Vendor Port；该模式只适用于已有 RCP/工程证据的 Middleware。

## Vendor 源码与供应链

第三方源码只在对应 `vendor_*` Skill 和目标工程 Vendor 目录中登记，接入时保持源码不动：

- 不复制源码到 Impl；
- 不在 Impl Skill 中重写第三方实现；
- 本规范范围内不修改 Vendor 源码；若上游 patch 确属必要，必须另立 Vendor 变更需求，不能隐含在 Port 接入中；
- 记录版本、许可证、配置、编译单元和必要 patch；
- Platform/Service/App 不直接 include Vendor。

## OS 和并发边界

Middleware Port 默认不引入 OS 任务模型；若 Vendor Port 确实需要 FreeRTOS/HAL 的 mutex、scheduler
状态或 tick，可作为 Impl/Board 边界的受审查例外直接使用，但不得把原生类型泄漏到 Platform/Service。
例外必须记录阻塞上限、线程安全、ISR 限制、资源所有权、时基和迁移路径；不得据此增加隐含的
Task/Queue/异步线程或改变公共契约。

同步格式化输出默认不允许 ISR。时间戳必须绑定到 Impl Port 的已确认时间源（例如目标 SysTick、OS tick 或板级时钟），不得在 Platform 公共头中绑定 HAL/RTOS；若其他 Middleware 需要 OS/异步能力，必须另立需求，明确阻塞时间、线程安全、ISR API、所有权和失败恢复后再接入。

## 生成前检查

- [ ] Platform 契约真实存在且 Vendor-neutral；
- [ ] 默认只有 `impl_<domain>_port.c/.h` 一个 Impl Port 文件对；若拆分，已记录
  `impl_<vendor>_<domain>.c/.h` 与 `impl_<vendor>_port.c/.h` 的职责，且没有重复契约入口；
- [ ] Port 头没有泄漏 Vendor/OS/Platform 私有实现类型；
- [ ] Vendor `.c/.h` 源码未修改、未复制进 Impl，仅修改 Port 和明确的工程/移植配置；
- [ ] 初始化、反初始化、状态和错误映射完整；
- [ ] 格式化、缓存、输出和资源释放路径有边界；
- [ ] ISR、阻塞、线程安全、可重入性和内存所有权已声明；
- [ ] 当前需求没有越界扩展到 OS、其他 Backend 或其他中间件；
- [ ] 时间戳、锁、RTT/UART 等后端资源均有真实目标或工具链证据；
- [ ] 所有中间件由唯一的 `impl_board_<board>_middleware.c` 在启动期注册，失败按逆序回滚；
- [ ] 静态、主机、交叉构建、目标运行和实物观测验收层级已分开。

## 交接

接入完成后交给 `workflow-final-review` 做独立 Review；静态检查、主机测试、交叉编译、烧录、目标运行和 RTT/串口观测必须分别记录，分别交给对应 `tools-*` Skill。RTT Viewer 连接成功只证明观测通道可用；必须捕获实际日志内容和时间戳递增，才能宣称日志运行验证通过。当前日志 + RTT 的实践证据不能替代其他 Middleware 的独立验收。
