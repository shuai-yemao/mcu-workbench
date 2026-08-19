---
name: platform_common
description: 基于目标工程真实文件设计和审查 Platform 公共类型、错误码、对象模型、直接生命周期回调、设备/服务注册管理器与版本查询；不绑定芯片、HAL、RTOS 或 Vendor。
---

# Platform Common（公共对象模型与生命周期机制）

## 适用范围

当需求涉及公共类型、错误码、对象身份、对象父子关系、生命周期、设备/服务注册表或 Platform 版本信息时使用本 Skill。开始设计前必须读取目标工程的 `03_Platform/platform_common/`、实际构建清单和调用者；目录存在不等于已经接入构建。

当前工程证据以目标工程 `<project_root>/03_Platform/platform_common/` 的现状为基线。若其他工程采用不同目录或兼容 API，必须标记为 `mixed`，不能把旧文件名写成当前事实。

## 当前文件契约（confirmed）

| 目录 | 当前文件 | 职责 |
| --- | --- | --- |
| `core/` | `platform_type.h` | 自包含基础类型出口；不 include `impl_board/board_types.h` |
| `core/` | `platform_error.h` | `platform_err_t`、`PLATFORM_IS_OK/ERR` |
| `core/` | `platform_def.h` | NULL、状态宏、布尔、对齐、数组长度和延时声明 |
| `object/inc|src/` | `platform_object.h/.c` | magic、类型、状态、父对象、生命周期回调和阶段驱动 |
| `object/inc|src/` | `platform_device.h/.c` | 设备基类、设备类别和静态能力位 |
| `object/inc|src/` | `platform_service.h/.c` | 服务基类与 `cfg/ctx/data/ops` 模型 |
| `manager/inc|src/` | `platform_lifecycle.h` | 生命周期 Ops 与阶段枚举 |
| `manager/inc|src/` | `device_manager.h/.c` | 16 槽全局设备注册表和生命周期驱动 |
| `manager/inc|src/` | `service_manager.h/.c` | 16 槽全局服务注册表和生命周期驱动 |
| `diag/` | `platform_version.h/.c` | 从 `platform_config/version_config.h` 读取并返回版本快照 |

当前快照为 16 个生成文件、6 个 `.c`。`platform_assert`、`platform_runtime`、通用 `platform_manager`、`platform_device_manager`、`platform_service_manager` 和 `platform_board_manager` 不属于当前 Common 文件契约；板级组合根位于 `<project_root>/04_Impl/impl_board`。

## 依赖方向与边界

```text
App → Service → Platform 接口 ← Impl / BSP → Vendor / HAL / RTOS
```

`platform_common` 可以提供无平台依赖的公共对象实现，但不负责：

- 芯片寄存器、HAL/LL、CMSIS Device、RTOS 句柄和 Vendor 类型；
- 具体外设协议、板级引脚、Driver/Handle 装配和硬件初始化；
- Service 业务策略、产品级启动顺序、任务循环、队列和业务缓存；
- 日志机制（归属 `platform_middleware`）、复位原因/HardFault（归属 `platform_mcu`）；
- 板级 `board_manager`。它可以调用 Common 的设备管理器，但不应被 Common 生成器反向生成。

公共 `.c` 只完成参数校验、对象字段构造、固定槽管理和生命周期转发。延时函数只声明在 `platform_def.h`，实际实现由 Impl 提供。

## 公共类型、错误码与宏

- `platform_type.h` 是当前工程的自包含类型出口，定义 `int8_t` 至 `uint64_t`、`float_t/double_t`、`char_t/uchar_t/bool_t`。不得根据旧版本重新引入 `board_types.h` 依赖。
- `platform_error.h` 的错误枚举包括 `OK/GENERAL/TIMEOUT/PARAM/NO_MEMORY/NO_RESOURCE/NOT_SUPPORTED/NOT_INITIALIZED/ALREADY_INIT/BUSY/FAIL/NOT_FOUND/RESERVED`。接口返回值使用 `platform_err_t`，禁止使用 `-1` 替代。
- `platform_def.h` 提供 `PLATFORM_OK/ERROR/TRUE/FALSE`、`platform_bool_t`、`PLATFORM_ALIGN`、`ARRAY_SIZE`、`PLATFORM_DELAY_MS/US`。新代码优先使用 `PLATFORM_ERR_OK` 等枚举错误码；兼容宏不能被解释成新的错误码体系。

## 对象模型

`platform_object_t` 是所有 Common 对象的身份首字段：

```c
typedef struct {
    uint32_t magic;
    const char *name;
    platform_object_type_t type;
    platform_object_state_t state;
    uint32_t flags;
    void *p_self;
    void *p_parent;
    const platform_lifecycle_ops_t *p_lifecycle;
    void *user_data;
} platform_object_t;
```

- magic 为 `0x504F424Ju`；类型为 `DEVICE/SERVICE/MANAGER/APP`。
- 状态为 `CREATED/REGISTERED/INITIALIZED/STARTED/STOPPED/DEINITIALIZED/ERROR`。
- `platform_object_init()` 接收 `p_self` 和 `p_parent`；`p_self == NULL` 时当前实现回退为对象自身。
- `platform_object_is_valid()` 当前只检查非空、magic 和期望类型，不把 `p_self != NULL` 当作额外合法性条件。
- 派生对象必须把 `platform_device_t` 或 `platform_service_t` 放在首字段，禁止跨模块访问私有字段。

## 生命周期契约

当前工程使用直接 7 回调，不使用旧的 `supported_actions + invoke()`：

```c
typedef struct {
    platform_err_t (*init)(void *p_self);
    platform_err_t (*start)(void *p_self);
    platform_err_t (*process)(void *p_self);
    platform_err_t (*stop)(void *p_self);
    platform_err_t (*sleep)(void *p_self);
    platform_err_t (*wakeup)(void *p_self);
    platform_err_t (*deinit)(void *p_self);
} platform_lifecycle_ops_t;
```

阶段枚举为 `PLATFORM_LIFECYCLE_STAGE_INIT/START/PROCESS/STOP/SLEEP/WAKEUP/DEINIT`。`platform_object_lifecycle_run()` 将阶段分发到对象便捷 API：

- `init`：已初始化或已启动时幂等返回成功；回调失败进入 `ERROR`；成功进入 `INITIALIZED`。
- `start`：已启动时幂等返回成功；成功进入 `STARTED`。
- `process`：非 `STARTED` 时当前实现直接返回成功；无回调也返回成功。
- `stop`：非 `STARTED` 时直接进入 `STOPPED`；运行态对象成功停止后进入 `STOPPED`。
- `sleep/wakeup`：仅对 `STARTED` 对象执行回调，成功后保持 `STARTED`；是否调用由设备能力位决定。
- `deinit`：无回调也会进入 `DEINITIALIZED`；回调失败进入 `ERROR`。

回调的 `p_self`、阻塞属性、ISR 可用性、线程安全和缓冲区所有权必须由具体 Platform/Impl 契约补充；Common 本身不假设回调可在 ISR 中运行。

## 设备与服务基类

`platform_device_t` 只有 `object + dev_class + caps`。当前设备类别为 `DISPLAY/TOUCH/IMU/TEMP_HUMI/HEART_RATE/BATTERY/STORAGE/BACKLIGHT/MOTOR/CPU/CLOCK/POWER/RTC/KEY`；能力位为 `READ/WRITE/CONTROL/IRQ/DMA/SLEEP/WAKEUP/PERIODIC`。`caps` 是静态能力，不是运行态功耗状态。

`platform_service_t` 为 `object + service_class + cfg + ctx + data + ops`。当前服务类别为 `SYSTEM/SENSOR/BATTERY/POWER/STORAGE/BACKLIGHT/BLE/OTA/LOG/DIAGNOSIS`。使用：

- `platform_service_init()`：建立基础服务对象，四元组槽置空；
- `platform_service_model_init()`：绑定调用者借用的 `cfg/ctx/data/ops`，Common 不负责释放这些指针。

设备具体 Model 若承载对象身份，仍应使用 `base + cfg/ctx/data/ops` 四元组；纯函数表不强行伪装成对象。详见 [`object-four-tuple-template.md`](references/object-four-tuple-template.md)。

## 管理器机制与板级边界

`device_manager` 与 `service_manager` 是当前 Common 提供的静态全局表，不是可实例化的通用 Manager 类：

- `register()` 校验对象类型、拒绝重复指针（`PLATFORM_ERR_BUSY`）和容量溢出（`PLATFORM_ERR_NO_RESOURCE`）；注册会设置 `p_parent` 和 `REGISTERED` 状态；
- `init/start/process` 按注册顺序驱动；`stop/deinit` 逆序驱动；首个错误立即返回；
- 设备 `sleep` 逆序驱动带 `SLEEP` 能力的对象，`wakeup` 按注册顺序驱动带 `WAKEUP` 能力的对象；服务管理器没有 sleep/wakeup API；
- `count()` 和 `get_data()` 只返回注册表视图，不转移对象所有权；表和对象均由调用者/静态存储区拥有；
- 当前无锁、无动态分配、无任务创建。若从多任务或 ISR 调用，必须由上层提供外部同步并补充证据。

`04_Impl/impl_board` 的 `board_manager` 负责调用设备管理器并组织板级启动顺序；App Boot 负责注册 Service 以及 Service/Board 的整体启动顺序。不要把这些策略复制到 Common Manager。

## 版本与诊断归属

当前 `diag/` 只确认 `platform_version.h/.c`：它依赖目标工程的 `<project_root>/03_Platform/platform_config/version_config.h`，返回静态版本快照和版本字符串。`platform_assert` 在当前工程快照中不是已确认实现；相关文档只能标记 `unverified`，不能生成或宣称已接入。

日志接口和日志后端属于 `platform_middleware`；`service_log` 可以依赖 Common 的 Service 对象/错误码/生命周期，但不能把 `platform_log.h` 归到 Common。复位原因、HardFault 归 `platform_mcu`。

## 生成与审查门禁

生成或修改 Common 代码前必须：

- 以目标文件清单、构建清单和真实调用者校验路径；
- 保持 4 个子域的依赖单向，禁止引入 HAL、RTOS、Vendor、Board 或外部器件协议；
- 保持当前 16 文件/6 `.c` 契约，除非目标工程先完成并提供新的迁移证据；
- 检查对象首字段、指针借用生命周期、固定槽容量、重复注册、失败后的状态和反初始化清理；
- 把旧 `platform_lifecycle_action_t`、`supported_actions`、旧 Manager 或 `platform_runtime` 引用标记为 `mixed/unverified`，不要自动兼容两套公共 API；
- 运行插件测试、生成器检查、`git diff --check`；目标编译、主机 Fake 和实机运行必须分别报告。

相关调用 Skill：[`platform_mcu`](../platform_mcu/SKILL.md)、[`platform_bsp`](../platform_bsp/SKILL.md)、[`impl_board`](../../impl/impl_board/SKILL.md)、[`service_log`](../../service/service_log/SKILL.md)、[`service_diagnosis`](../../service/service_diagnosis/SKILL.md)。

跨层契约见 [`software-layer-contract.md`](../../workflow/workflow-review-gate/references/software-layer-contract.md)，对象四元组见 [`object-four-tuple-template.md`](references/object-four-tuple-template.md)，日志/诊断流转见 [`diag-log-flow.md`](references/diag-log-flow.md)。
