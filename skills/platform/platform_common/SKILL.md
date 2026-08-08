---
name: platform_common
description: Platform 公共对象模型与生命周期：platform_def/error/type 基础、platform_object 身份证 + platform_lifecycle 回调表、device/service 基类（含 object/device/service 三个 .c 实现），不绑芯片/RTOS。
---

# Platform Common（平台抽象 · 公共对象模型与生命周期）

## 边界

承载全平台共享的**公共对象模型与生命周期**：类型出口、统一错误码、公共宏、对象身份证、生命周期回调表、设备/服务基类。**含实现**（3 个 `.c`）。不依赖具体芯片、HAL、RTOS 或厂商类型。

## 文件清单（依赖方向）

| 文件 | 职责 |
| --- | --- |
| `platform_type.h` | 类型出口：从 `04_Impl/impl_board/board_types.h` 引出统一基础类型 |
| `platform_error.h` | 定义 `platform_err_t` 与统一成功/失败判断宏 |
| `platform_def.h` | 收纳通用状态、布尔、NULL、对齐、数组长度和延时声明 |
| `platform_object.h/.c` | 所有平台对象共有的 magic、name、type、state 与基础校验 |
| `platform_lifecycle.h` | 生命周期回调表（init/start/process/stop/sleep/wakeup/deinit） |
| `platform_device.h/.c` | 设备对象基类，继承 `platform_object_t` 并扩展设备类别、静态能力 |
| `platform_service.h/.c` | 服务对象基类，继承 `platform_object_t` 并扩展服务类别与 cfg/ctx/data/ops |

依赖方向（上层只 include `platform_type.h`，禁直接 include `board_types.h`）：

```text
04_Impl/impl_board/board_types.h
        |
        v
platform_type.h
        |
        +--> platform_error.h
        |
        +--> platform_def.h
        |
        +--> platform_object.h  <-- platform_lifecycle.h
              |
              +--> platform_device.h
              |
              +--> platform_service.h
```

## 统一错误码

`platform_error.h` 以 **enum 定义**全局基线，Service/Impl 只在其后扩展，禁止重复编号：

```c
typedef enum
{
    PLATFORM_ERR_OK              = 0,
    PLATFORM_ERR_GENERAL         = 1,
    PLATFORM_ERR_TIMEOUT         = 2,
    PLATFORM_ERR_PARAM           = 3,
    PLATFORM_ERR_NO_MEMORY       = 4,
    PLATFORM_ERR_NO_RESOURCE     = 5,
    PLATFORM_ERR_NOT_SUPPORTED   = 6,
    PLATFORM_ERR_NOT_INITIALIZED = 7,
    PLATFORM_ERR_ALREADY_INIT    = 8,
    PLATFORM_ERR_BUSY            = 9,
    PLATFORM_ERR_FAIL            = 10,
    PLATFORM_ERR_RESERVED        = 0x7FFFFFFF
} platform_err_t;

#define PLATFORM_IS_ERR(err)    ((err) != PLATFORM_ERR_OK)
#define PLATFORM_IS_OK(err)     ((err) == PLATFORM_ERR_OK)
```

要点：错误码**只用 enum，不用同名 #define**，避免预处理期把枚举名替换成数字导致编译错误。`platform_def.h` 仍保留 `PLATFORM_OK / PLATFORM_ERROR` 宏（返回码语义），与 `platform_err_t`（接口返回值语义）两套并存为命名审计确认保留的现状。

## 基础类型与公共宏

- `platform_type.h`：`int8_t..uint64_t`、`float_t/double_t`、`char_t/uchar_t`、`bool_t`，从 `board_types.h` 映射，是 Platform/Service/App 的类型出口。
- `platform_def.h`：`PLATFORM_OK/ERROR/TRUE/FALSE`、`platform_bool_t`、`NULL`、`PLATFORM_ALIGN_SIZE`(4u)/`PLATFORM_ALIGN(n)`、`ARRAY_SIZE`、`PLATFORM_DELAY_MS(ms)`/`PLATFORM_DELAY_US(us)` 及 `platform_delay_ms(uint32_t)`/`platform_delay_us(uint32_t)` 声明——**延时只在此声明，实现在 Impl 层**。

## 对象身份证 `platform_object_t`

所有平台对象的统一身份与状态记录（9 字段）：

```c
typedef struct
{
    uint32_t magic;                          /* Runtime identity check value.   */
    const char *name;                        /* Object name, such as display0. */
    platform_object_type_t type;             /* Object high-level type.        */
    platform_object_state_t state;           /* Object current lifecycle state.*/
    uint32_t flags;                          /* Reserved extension flags.      */
    void *p_self;                            /* Pointer to concrete owner.     */
    void *p_parent;                          /* Pointer to parent or manager.  */
    const platform_lifecycle_ops_t *p_lifecycle; /* Lifecycle callback table.  */
    void *user_data;                         /* User extension pointer.        */
} platform_object_t;
```

- `PLATFORM_OBJECT_MAGIC` = `0x504F424Au`（"POBJ" ASCII）。
- `platform_object_type_t`：`PLATFORM_OBJECT_DEVICE / SERVICE / MANAGER / APP`。
- `platform_object_state_t`：`CREATED / REGISTERED / INITIALIZED / STARTED / STOPPED / DEINITIALIZED / ERROR`。
- 函数：`platform_object_init()` / `platform_object_set_state()` / `platform_object_is_valid()`。

设计要点：
- 具体对象（device/service/manager/app）的**第一个字段必须是 `platform_object_t`**，实现 C 风格继承 + 类型向上转型。
- `platform_object_is_valid()` 同时校验 `magic`（运行时身份）与 `type`（类型匹配），杜绝野指针/错类型对象。
- 此协议取代旧"ops 指针 + impl 私有数据 + handle"模型：对象身份与生命周期由 `platform_object_t` 统一承载。

## 生命周期 `platform_lifecycle_ops_t`

所有对象统一的生命周期回调表（7 回调，签名统一 `platform_err_t (*)(void *p_self)`）：

```c
typedef struct
{
    platform_err_t (*init)(void *p_self);    /* Object initialization.       */
    platform_err_t (*start)(void *p_self);   /* Object start entry.          */
    platform_err_t (*process)(void *p_self); /* Optional period processing.  */
    platform_err_t (*stop)(void *p_self);    /* Object stop entry.           */
    platform_err_t (*sleep)(void *p_self);   /* Optional low-power entry.    */
    platform_err_t (*wakeup)(void *p_self);  /* Optional wake-up entry.      */
    platform_err_t (*deinit)(void *p_self);  /* Object resource release.     */
} platform_lifecycle_ops_t;
```

设计要点：
- `state` 只记录对象所处阶段，**真正动作入口在回调表**，Manager 通过该表统一驱动。
- 含 `sleep/wakeup`，适配低功耗策略。
- 生命周期是横切能力（cross-cutting），不属于单类对象的专属逻辑。

## 设备基类 `platform_device_t`

设备对象的管理面（首字段继承 `platform_object_t`）：

```c
typedef struct
{
    platform_object_t object;          /* Common identity + lifecycle.      */
    platform_device_class_t dev_class; /* Device class.                     */
    uint32_t caps;                     /* Static IO capability flags.        */
} platform_device_t;
```

- `platform_device_class_t` 14 类：`DISPLAY / TOUCH / IMU / TEMP_HUMI / HEART_RATE / BATTERY / STORAGE / BACKLIGHT / MOTOR / CPU / CLOCK / POWER / RTC / KEY`。
- `platform_device_cap_t` 8 位静态能力掩码（`1u << n`）：`READ / WRITE / CONTROL / IRQ / DMA / SLEEP / WAKEUP / PERIODIC`。
- `platform_device_init(p_dev, p_name, dev_class, caps, p_self, p_lifecycle)` 内部委托 `platform_object_init()`。

设计要点：`caps` 是**静态运行能力**，当前功耗状态由 `object.state` 记录（不是独立 power 字段）。不沿用传统 READ/WRITE/CONTROL 设备文件思路——具体设备的动作差异留给后续 typed ops（如 `display_ops_t` / `touch_ops_t` / `storage_ops_t`）。

## 服务基类 `platform_service_t`

服务对象的管理面（首字段继承 `platform_object_t`）：

```c
typedef struct
{
    platform_object_t object;                /* Common identity + lifecycle.  */
    platform_service_class_t service_class;  /* Service class.                */
    const void *cfg;                         /* Static configuration ptr.     */
    void *ctx;                               /* Runtime context ptr.          */
    void *data;                              /* Current service data ptr.     */
    const void *ops;                         /* Service behavior operations.  */
} platform_service_t;
```

- `platform_service_class_t` 8 类：`SYSTEM / SENSOR / BATTERY / POWER / STORAGE / BACKLIGHT / BLE / OTA`。
- 四元组模型 `cfg / ctx / data / ops`：静态配置、运行时上下文、当前数据、行为操作表。
- **两个初始化入口**：
  - `platform_service_init()`：不带 data/ops 槽（转发给四元组版）；
  - `platform_service_model_init()`：全四元组。

## 生成契约

`03_Platform/platform_common/` 含 **3 个 `.c`**（`platform_object.c` / `platform_device.c` / `platform_service.c`）与对应头文件。上层统一 include `platform_common/platform_*.h`，不得复制定义；**禁直接 include `04_Impl/impl_board/board_types.h`**（类型出口是 `platform_type.h`）。

说明：插件 `skills/platform` 技能目录本身仍只存文档（零 `.c` 门禁扫描的是技能目录内的实体文件）；生成工程内 `platform_common` 含对象模型实现。

## 禁止

- 禁止在此放芯片专有能力、Vendor 类型、RTOS 句柄或业务状态。
- 不把具体设备操作强行塞进统一 `read/write/control`；typed ops 属后续课程。
- `caps` 是静态能力，休眠状态由 `object.state` 记录。

## 命名说明（P1 可选）

代码现状：guard 为 `__PLATFORM_XXX_H__`（双下划线）、生命周期回调为裸名（无 `pf_` 前缀）、`user_data` 无 `p_` 前缀。这些是命名审计（`00_Docs/embedded-framework-naming-audit.md`）判定的 **P1 可选对齐项，不强制**；插件生成代码仍遵循 naming-convention（`XXX_H` guard、`pf_` 前缀）。参考代码时不要"顺手"改动现有实现。

## 交接

芯片外设能力接口交给 [`platform_mcu`](../platform_mcu/SKILL.md)；OS 能力接口交给 [`platform_os`](../platform_os/SKILL.md)；板级器件接口交给 [`platform_bsp`](../platform_bsp/SKILL.md)；中间件能力接口交给 [`platform_middleware`](../platform_middleware/SKILL.md)。

共享层契约见 [`software-layer-contract.md`](../../workflow/workflow-review-gate/references/software-layer-contract.md)。
