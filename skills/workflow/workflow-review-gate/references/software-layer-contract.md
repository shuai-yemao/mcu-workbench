# 软件层契约（五层 + Port 注入）

> v2.0（2026-08-09）：从旧角色契约（APP/OS Wrapper/BSP 十一类）对齐为五层契约 + Port 注入模型。
> 对齐 ADR-001（platform_common 四子域）与依赖纪律门禁（Platform 默认零反向；Middleware 仅允许受控实现级例外）。

## 依赖铁律

```text
App → Service → Platform ← Impl → Vendor
```

- **App 只调 Service**；Service 依赖 Platform 接口与其他 Service；Platform 只定义能力（统一接口/错误码/数据结构/ops/ctx）；Impl 依赖 Platform 抽象并**注入**具体能力；Vendor 是第三方底座，只经 Impl 的 port 接入，不被上层直调。

## 层职责

| 层 | 单一职责 | 允许依赖 | 禁止事项 |
|---|---|---|---|
| **App** | 产品业务流程、编排、状态机（app_init 组合根） | Service 接口 + 错误码类型出口（`platform_error.h`） | HAL、RTOS、Platform 能力接口、Impl、Vendor 符号 |
| **Service** | 业务抽象（带策略）：日志/系统/电池/OTA… | Platform 接口 + 其他 Service | Vendor 头、寄存器/HAL、Impl 细节、Platform 实现 |
| **Platform** | 统一接口/错误码/数据结构/ops 函数指针/ctx，以及无底层依赖的公共 Model/registry 实现 | 自身头 + `platform_common` + 标准库 | 芯片头、HAL 调用、Impl 符号（反向）、厂商类型 |
| **Impl** | Platform→Vendor 适配落地：port 文件注入具体实例 | Platform **接口头** + Vendor 底座 | 反向定义接口、被 App 直调、含业务策略、include Platform 实现 |
| **Vendor** | 目标工程 `05_Vendor/` 的能力底座：`vendor_mcu`/`vendor_rtos` 完整保留，`vendor_middleware`/`vendor_algorithm` 按需保留，`vendor_metadata` 记录来源与版本 | 无（底座） | 被上层直调；Service、App、Platform 公共头不得 include Vendor，实际源码由目标工程 Git 统一管理 |

## Port 注入模型（核心）

Impl 通过 **port 文件**把 Vendor 的具体实例注入 Platform 抽象，上层（Service/App）只使用抽象：

```text
Vendor（elog/RTT/HAL/FreeRTOS）→ 调用 → Impl port 文件 → 实现/注入 → Platform 抽象 → 使用 → Service/App
```

**机制注入（ops 表 / 符号实现）**：Impl 的 port 可直接实现 Platform 接口，也可通过经审查的
Platform registry 保存借用的 Ops/context，再由 `impl_<vendor>_<domain>.c` 注入。Vendor 能力经
`backend_context`/`void *` 隔离后注入抽象；实例化细节藏 Impl。两种方式都只能有一个契约入口，
不得重复初始化或暴露 Vendor 类型。中间件和算法的物理路径分别固定为 `05_Vendor/vendor_middleware/<selected-library>` 与 `05_Vendor/vendor_algorithm/<selected-library>`；MCU/RTOS 底座分别固定为 `05_Vendor/vendor_mcu/<family>` 与 `05_Vendor/vendor_rtos/`。

**策略注入（编排钩子）**：顺序/时序等产品策略由 Service 层注入（如 `board_manager_set_hooks` 的 on_device_ready/on_service_ready/on_loop_begin），Platform 管理器只提供驱动机制，不持有业务先后（ADR-001 P3）。

**两类 port 方向**（都在 Impl，文件名一律 `impl_` 前缀承载层归属，对齐命名规范 §2.1；函数符号名跟随所实现契约/底座，不改）：
- **平台面向**：实现 Platform 接口的 port（如 `impl_elog_log.c` 提供 `platform_log_ops_t`、`impl_assert_output.c` 实现 `platform_assert_output`）——对外是"Platform 的实现者"，命名 `impl_<vendor>_<契约>` 或项目已确认的同义命名。
- **Vendor 面向**：满足 Vendor 移植点的 port（如 `impl_elog_port.c` 提供 elog 的 IO/lock 回调）——对外是"Vendor 的适配者"，命名 `impl_<底座>_port`（如 `impl_elog_port.c`），函数符号保留底座要求名（`elog_port_*`）。

**backend_context 约定**：Platform 抽象只用 `void *` 持有上下文；HAL/RTOS 句柄（`I2C_HandleTypeDef`/`TaskHandle_t`）只出现在 Impl，不泄漏进抽象。

**Platform Model 与生命周期边界**：Platform Model `.c` 可以实现公共对象构造、注册或稳定转发，但必须保持芯片/RTOS/Vendor 无关。对于 `platform_mcu`，公共头与 Model 源文件按同名规则配对（如 `platform_gpio.h` → `platform_gpio.c`）；Model 只完成对象身份、配置/Ops/生命周期绑定和默认状态设置。硬件初始化、HAL/CMSIS 调用、后端 Ops、资源申请和生命周期动作仍由 Impl/Board Port 提供。对象构造完成不表示硬件已可用。

## 依赖纪律（门禁守护）

- ✅ **Impl → Platform 接口头**：合法且必要（注入的前提，实现契约必须见签名）。
- ❌ **Platform → Impl**：默认反向依赖禁止（已验证器 + baseline 测试双重守护）。
- ⚠️ **Middleware 受限例外**：仅允许中间件实现级的稳定符号、注册或转发边界；不得出现在 Platform 公共头的 include、类型或宏中，不得把 Vendor 调用、格式化、缓存、锁、重试或业务策略放回 Platform。该例外不适用于 OS、BSP、MCU 或其他 Platform 子域。

- **Vendor 内容策略**：MCU/RTOS 官方底座和生成工程完整保留；中间件/算法只保留实际使用内容；所有内容、许可证、生成器、补丁和依赖由目标工程 Git 管理，插件不携带目标工程 Vendor 实际源码。
- ❌ **Impl → Platform 实现**（include 平台 `.c`）：越权，禁止。
- ✅ **Impl → Platform Model 符号**：通过真实存在的 Platform 公共头调用构造函数并链接 Model；不得复制构造逻辑、重复定义符号或包含 `.c` 文件。
- ⚠️ **基础类型例外**：`platform_type.h` ← `impl_board/board_types.h`（类型出口，基础类型从板级引出）。除上述 Middleware 实现级例外和该基础类型出口外，其余 Platform→Impl 一律禁止。
- Impl include 的 `platform_*` 头必须真实存在于 03_Platform（防幽灵依赖/漂移）。
- Board 组合根必须通过唯一的 `impl_board_<board>_middleware.c` 集中注册/注销中间件；MCU 文件不得持有中间件注册职责，失败按逆序回滚。

## 注入点实例（实践工程）

| Platform 抽象 | Impl port | Vendor 底座 |
|---|---|---|
| `platform_log`（diag） | `platform_log.c` registry + `impl_middleware/elog/impl_elog_log.c` + `impl_elog_port.c` | easylogger + SEGGER RTT |
| `platform_assert_output`（diag） | `impl_middleware/impl_assert_output.c` | SEGGER RTT |
| elog 底层移植 | `impl_middleware/impl_elog_port.c`（Vendor 面向） | easylogger |
| `platform_reset_reason` / `platform_hardfault` | Impl 芯片 Port（当前未设独立 MCU 子域，留待后续） | CMSIS/寄存器 |
| `platform_board_manager` 钩子（策略） | `service_system` 注入 | — |

## OS 契约

`platform_os_*` 是 Service/Impl 可见的 OS 抽象（`platform_os`）；`impl_os_*()` 是 Impl（impl_os）的 port 实现；原生 RTOS 头/API 不得越过 impl_os 的 port。`platform_os_internal_*.h` 仅是 Wrapper/Port 内部边界，不形成层。

## 验收边界

静态门禁只证明依赖边界。构建、烧录、RTT/串口运行和板上现象分别独立记录，不能互相替代（review-gate 五级证据）。
