# 软件层契约（五层 + Platform profile）

> v2.1（2026-08-20）：保留五层依赖方向，同时补充 Platform MCU 的 flat logical resource 与 object/Ops 两种实现 profile。

## 依赖铁律

```text
App → Service → Platform ← Impl → Vendor
```

- **App 只调 Service**；Service 依赖 Platform 接口与其他 Service；Platform 只定义能力、错误码和数据结构；Impl 依赖 Platform 抽象并按目标 profile 实现或注入具体能力；Vendor 是第三方底座，只经 Impl 接入，不被上层直调。

## 层职责

| 层 | 单一职责 | 允许依赖 | 禁止事项 |
|---|---|---|---|
| **App** | 产品业务流程、编排、状态机（app_init 组合根） | Service 接口 + 错误码类型出口（`platform_error.h`） | HAL、RTOS、Platform 能力接口、Impl、Vendor 符号 |
| **Service** | 业务抽象（带策略）：日志/系统/电池/OTA… | Platform 接口 + 其他 Service | Vendor 头、寄存器/HAL、Impl 细节、Platform 实现 |
| **Platform** | 统一能力接口、错误码、数据结构；可按 profile 使用扁平 `plat_*` 函数或对象/Ops/Model | 自身头 + `platform_common` + 标准库 | 芯片头、HAL 调用、Vendor 类型；不得把某个 MCU 物理资源写入公共契约 |
| **Impl** | Platform→Vendor 适配落地：可直接实现 flat `plat_*` 符号，或注入对象/Ops/context | Platform 公共头 + Vendor 底座 | 反向改写 Platform 契约、被 App 直调、含业务策略、include Platform 实现 |
| **Vendor** | 目标工程 `05_Vendor/` 的能力底座：`vendor_mcu`/`vendor_rtos` 完整保留，`vendor_middleware`/`vendor_algorithm` 按需保留，`vendor_metadata` 记录来源与版本 | 无（底座） | 被上层直调；Service、App、Platform 公共头不得 include Vendor，实际源码由目标工程 Git 统一管理 |

## Platform MCU profile（核心）

`platform_mcu` 必须先由目标工程证据选择 profile：

| profile | Platform 公共面 | Impl MCU 公共面 | 构造/注册要求 |
|---|---|---|---|
| `flat-logical-resource` | `plat_<capability>.h` + `plat_*_id_t`，函数直接消费逻辑资源 | `stm32f411_plat_*.c` 等同名函数实现；内部映射 HAL/SDK 句柄 | 不创建虚构的 `platform_*_device_t`、Ops 或 Model；以符号唯一性和构建清单为准 |
| `object-ops` | `platform_<capability>.h` + `cfg/ctx/data/ops` + 生命周期 | Impl/Board 提供 Ops/context 和硬件生命周期 | Model 只构造公共对象；Impl 不重复定义或 include Platform `.c` |

两个 profile 可以在迁移期按文件并存，但必须标记 `mixed`，分别审查 include、符号和构建入口。

## Port 注入模型（object/Ops 与受控实现边界）

Impl 通过 **port 文件**把 Vendor 的具体实例注入 Platform 抽象，上层（Service/App）只使用抽象：

```text
Vendor（elog/RTT/HAL/FreeRTOS）→ 调用 → Impl port 文件 → 实现/注入 → Platform 抽象 → 使用 → Service/App
```

**机制注入（ops 表 / 符号实现）**：在 `object-ops` 或其他明确允许的实现边界中，Impl 的 port 可直接实现 Platform 接口，也可通过经审查的
Platform registry 保存借用的 Ops/context，再由 `impl_<vendor>_<domain>.c` 注入。Vendor 能力经
`backend_context`/`void *` 隔离后注入抽象；实例化细节藏 Impl。两种方式都只能有一个契约入口，
不得重复初始化或暴露 Vendor 类型。中间件和算法的物理路径分别固定为 `05_Vendor/vendor_middleware/<selected-library>` 与 `05_Vendor/vendor_algorithm/<selected-library>`；MCU/RTOS 底座分别固定为 `05_Vendor/vendor_mcu/<family>` 与 `05_Vendor/vendor_rtos/`。

在 `flat-logical-resource` 中，直接实现 `plat_*` 是 Platform→Impl 的合法实现关系，不等于
Platform 反向 include Impl；Platform 公共头仍不得知道 HAL。逻辑 ID 只是抽象资源槽位，物理
句柄、引脚、DMA 映射、NVIC 和错误码转换必须留在 Impl/Board。

**策略注入（编排钩子）**：顺序/时序等产品策略由 Service 层注入（如 `board_manager_set_hooks` 的 on_device_ready/on_service_ready/on_loop_begin），Platform 管理器只提供驱动机制，不持有业务先后（ADR-001 P3）。

**两类 port 方向**（都在 Impl，文件名一律 `impl_` 前缀承载层归属，对齐命名规范 §2.1；函数符号名跟随所实现契约/底座，不改）：
- **平台面向**：实现 Platform 接口的 port（如 `impl_elog_log.c` 提供 `platform_log_ops_t`、`impl_assert_output.c` 实现 `platform_assert_output`）——对外是"Platform 的实现者"，命名 `impl_<vendor>_<契约>` 或项目已确认的同义命名。
- **Vendor 面向**：满足 Vendor 移植点的 port（如 `impl_elog_port.c` 提供 elog 的 IO/lock 回调）——对外是"Vendor 的适配者"，命名 `impl_<底座>_port`（如 `impl_elog_port.c`），函数符号保留底座要求名（`elog_port_*`）。

**backend_context 约定**：只对 `object-ops` profile 生效；Platform 抽象使用 `void *` 持有上下文。对 `flat-logical-resource`，HAL/RTOS 句柄仍只出现在 Impl，但不为了套用对象模型增加 `backend_context`。

**Platform Model 与生命周期边界**：仅当目标工程真实存在对象构造契约时，Platform Model `.c` 才实现公共对象构造、注册或稳定转发。`flat-logical-resource` 不生成空 Model；硬件初始化、HAL/CMSIS 调用、逻辑资源映射、资源申请和错误恢复仍由 `impl_mcu` 提供。

## 依赖纪律（门禁守护）

- ✅ **Impl → Platform 接口头**：合法且必要（注入的前提，实现契约必须见签名）。
- ❌ **Platform → Impl**：默认反向依赖禁止（已验证器 + baseline 测试双重守护）。
- ⚠️ **Middleware 受限例外**：仅允许中间件实现级的稳定符号、注册或转发边界；不得出现在 Platform 公共头的 include、类型或宏中，不得把 Vendor 调用、格式化、缓存、锁、重试或业务策略放回 Platform。该例外不适用于 OS、BSP、MCU 或其他 Platform 子域。

- **Vendor 内容策略**：MCU/RTOS 官方底座和生成工程完整保留；中间件/算法只保留实际使用内容；所有内容、许可证、生成器、补丁和依赖由目标工程 Git 管理，插件不携带目标工程 Vendor 实际源码。
- ❌ **Impl → Platform 实现**（include 平台 `.c`）：越权，禁止。
- ✅ **Impl → Platform Model 符号**：仅适用于 `object-ops`；通过真实存在的 Platform 公共头调用构造函数并链接 Model，不得复制构造逻辑、重复定义符号或包含 `.c` 文件。
- ✅ **Flat Impl → Platform 公共头**：`impl_mcu` 可以实现真实存在的 `plat_*` 声明；同名定义必须唯一，HAL/SDK 依赖只出现在 Impl。
- **基础类型出口**：当前 `platform_common/core/platform_type.h` 自包含基础类型，不再 include `impl_board/board_types.h`。若其他目标仍采用板级类型出口，必须标记为 `mixed` 并以该目标工程文件为准。除上述 Middleware 实现级例外外，其余 Platform→Impl 一律禁止。
- Impl include 的 `platform_*` 或 `plat_*` 头必须真实存在于 03_Platform（防幽灵依赖/漂移）。
- Board 组合根必须通过唯一的 `impl_board_<board>_middleware.c` 集中注册/注销中间件；MCU 文件不得持有中间件注册职责，失败按逆序回滚。

## 注入点实例（实践工程）

| Platform 抽象 | Impl port | Vendor 底座 |
|---|---|---|
| `platform_log`（platform_middleware） | `platform_log.c` registry + `impl_middleware/elog/impl_elog_log.c` + `impl_elog_port.c` | easylogger + SEGGER RTT |
| `platform_assert_output`（target-specific/unverified） | `impl_middleware/impl_assert_output.c`（仅目标工程确认后使用） | SEGGER RTT |
| elog 底层移植 | `impl_middleware/impl_elog_port.c`（Vendor 面向） | easylogger |
| `platform_reset_reason` / `platform_hardfault` | Impl 芯片 Port（当前未设独立 MCU 子域，留待后续） | CMSIS/寄存器 |
| `device_manager` / `service_manager`（platform_common 机制） | `04_Impl/impl_board/board_manager.c` 与 App Boot 调用注册/驱动 | 静态 16 槽表；板级顺序不由 Common 固化 |

## OS 契约

`platform_os_*` 是 Service/Impl 可见的 OS 抽象（`platform_os`）；`impl_os_*()` 是 Impl（impl_os）的 port 实现；原生 RTOS 头/API 不得越过 impl_os 的 port。`platform_os_internal_*.h` 仅是 Wrapper/Port 内部边界，不形成层。

## 验收边界

静态门禁只证明依赖边界。构建、烧录、RTT/串口运行和板上现象分别独立记录，不能互相替代（review-gate 五级证据）。
