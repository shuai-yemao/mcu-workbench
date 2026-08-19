---
name: impl_middleware
description: Impl 中间件接入：默认提供 Platform 直接调用的 impl_xxx.c/.h Adapter；必要时拆出 Vendor Port，隔离 EasyLogger、RTT、FatFs、Crypto、LVGL 或通信 Vendor；绑定目标工程 05_Vendor 中按需保留的中间件/算法内容。
---

# Impl Middleware（Platform API 适配与 Vendor Port）

## 边界

`impl_middleware` 为 `platform_middleware` API 提供固定后端适配。标准链路为：

```text
App → Service → platform_middleware API → impl_middleware Adapter → Vendor
```

Impl 负责：

- 提供 Platform 所需的 `impl_<domain>_*()` 函数；
- 维护 Vendor 状态和生命周期；
- 参数检查、能力判断和 Platform 错误码映射；
- 格式化、固定缓冲区、IO、时间戳和输出通道；
- Vendor 要求的初始化、回调、锁、内存和资源 Port；
- 失败、降级、重试和资源释放路径。

`impl_middleware` 是固定后端适配层，不是第三方中间件本体。第三方算法、协议栈、对象模型和通用实现仍然属于目标工程
`05_Vendor/vendor_middleware/` 或 `05_Vendor/vendor_algorithm/`。Impl 可以直接 include Vendor 头并调用 Vendor API，但不得复制、重写或修改 Vendor 源码。

## 默认文件与受控拆分

一个中间件接入默认使用一组 Adapter 文件和**默认单一 Port**边界：

```text
04_Impl/impl_middleware/<domain>/impl_<domain>.c
04_Impl/impl_middleware/<domain>/impl_<domain>.h
```

`impl_<domain>.h` 是 Platform→Impl 的内部 Adapter 边界，不是 App、Service 或 Platform 公共 API。Adapter `.c`
默认同时承载 Platform 所需函数、状态、参数检查、错误映射和小规模 Vendor 调用。

当编译隔离、资源边界或工具链冲突有真实证据时，经 RCP/Review Gate 放行后可拆为：

```text
impl_<vendor>_<domain>.c/.h   Platform API 适配、状态和错误映射
impl_<vendor>_port.c/.h       Vendor 回调、IO、时间、锁和具体资源绑定
```

拆分后仍只能有一组 Platform API 适配入口，不得因拆分产生第二套 `platform_<domain>_*` 符号或重复初始化路径。

Vendor Port 的边界摘要：不复制、不格式化、不直接修改 Vendor 源码；时间戳必须绑定到 Impl Port，不能由 Platform
公共头或 Service 伪造。`FreeRTOS/HAL` 资源只允许停留在 Impl/Board 边界以内，不能泄漏到 Platform 或 Service。

当前 Elog + SEGGER RTT 基线：

```text
platform_log.h/.c             Platform API + 固定直接转发
        ↓
impl_elog_log.c/.h            Platform API 适配
        ↓
impl_elog_port.c              EasyLogger Port → SEGGER RTT/FreeRTOS/HAL
        ↓
05_Vendor/vendor_middleware/easylogger + 05_Vendor/vendor_middleware/segger_rtt
```

`platform_log.c` 直接调用 `impl_elog_log_*()`；`impl_elog_log.c` 不直接暴露给 App/Service，也不提供注册/注销函数。

## Port 规则

- Adapter/Port 文件统一使用 `impl_` 前缀；默认命名为 `impl_<domain>.c/.h`；
- 受控拆分时，Adapter 按 `impl_<vendor>_<domain>.c/.h` 命名，Vendor Port 按 `impl_<vendor>_port.c/.h` 命名；
- Vendor 头只进入 Impl Adapter/Port `.c`，不进入 Platform 公共头、Service 或 App；
- Vendor 原生函数名只保留在 Adapter/Port 或 Vendor 要求的移植点；
- Adapter/Port 不能承载业务策略、业务缓存、产品状态机或上层编排；
- `05_Vendor/vendor_middleware`/`vendor_algorithm` 中选定的第三方 `.c/.h`、通用实现和许可证文件保持原样；
- 只允许修改 Adapter/Port、工程编译注册、明确的板级/工具链配置和移植配置文件；
- 必须说明资源所有权、初始化顺序、阻塞属性、ISR 限制、线程安全和可重入性；
- 失败不得静默，必须返回可映射的 `platform_err_t`。

## 固定链接边界

构建系统将唯一的 Impl Adapter 与 Platform Middleware 一起链接，Platform `.c` 直接调用 Adapter 函数；Impl 不提供
运行时注册、注销或 Backend 切换接口：

```text
Service  → platform_<domain>_*()
Platform → impl_<vendor>_<domain>_*()
Impl     → Vendor
```

该 Platform→Impl 直接依赖只适用于 Middleware 固定后端，不扩展到 OS、BSP、MCU 或其他 Platform 子域。Board 只
负责 BSP/Device 和板级资源，不负责 Middleware 注册；Service 或系统生命周期负责调用 Platform API。

## Vendor、OS 与并发边界

- 不复制或修改 Vendor 源码；版本、许可证、配置和编译单元由目标工程 `05_Vendor/` 管理；
- Vendor Port 必要时可以使用 FreeRTOS/HAL 资源，但原生类型不得泄漏到 Platform/Service；
- 必须记录阻塞上限、线程安全、ISR 限制、资源所有权、时基和失败恢复；
- 不得借 Middleware Port 隐式增加 Task、Queue、异步线程或改变公共 API；
- 同步格式化输出默认不允许 ISR；GUI Vendor API 只能在受控 Owner Task 调用。

## 生成前检查

- [ ] Platform API 真实存在且 Vendor-neutral；
- [ ] 当前文件被识别为固定后端 Adapter，Vendor 本体仍位于目标工程 `05_Vendor/vendor_middleware` 或 `vendor_algorithm`；
- [ ] 默认只有一组 `impl_<domain>.c/.h` Adapter 文件；拆分职责已登记；
- [ ] Adapter/Port 头没有泄漏 Vendor/OS/Platform 私有实现类型；
- [ ] Vendor 源码未修改、未复制进 Impl，且 Service/App/Platform 公共头没有直接 include Vendor；
- [ ] 初始化、反初始化、状态和错误映射完整；
- [ ] 格式化、缓存、输出和资源释放路径有边界；
- [ ] ISR、阻塞、线程安全、可重入性和内存所有权已声明；
- [ ] Middleware 后端由构建系统固定链接，Board 不提供注册/注销入口；
- [ ] 静态、主机、交叉构建、目标运行和实物观测验收层级已分开。

## 交接

接入完成后交给 `workflow-final-review` 做独立 Review；静态检查、主机测试、交叉编译、烧录、目标运行和 RTT/串口
观测必须分别记录。RTT Viewer 连接成功只证明观测通道可用，不能替代实际日志和 Middleware 运行证据。
