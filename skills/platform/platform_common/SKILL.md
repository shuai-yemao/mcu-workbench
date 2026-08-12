---
name: platform_common
description: Platform 公共对象模型、生命周期驱动与诊断可观测：四子域 core（基础定义）/ object（对象模型）/ manager（生命周期驱动，内置能力）/ diag（诊断可观测），含 10 个 .c，不绑芯片/RTOS。
---

# Platform Common（平台抽象 · 公共对象模型与生命周期）

## 边界

承载全平台共享的**公共对象模型、生命周期驱动与诊断可观测**，四子域：`core`（基础定义）/ `object`（对象模型）/ `manager`（生命周期驱动引擎，**内置能力**）/ `diag`（诊断可观测）。**含实现**（10 个 `.c`）。不依赖具体芯片、HAL、RTOS 或厂商类型（架构范围声明见"禁止与准入"）。

## 文件清单（四子域，依赖方向）

| 子域 | 文件 | 职责 |
| --- | --- | --- |
| `core/` | `platform_type.h` | 类型出口：从 `04_Impl/impl_board/board_types.h` 引出统一基础类型 |
| `core/` | `platform_error.h` | 定义 `platform_err_t` 与统一成功/失败判断宏 |
| `core/` | `platform_def.h` | 收纳通用状态、布尔、NULL、对齐、数组长度和延时声明 |
| `object/` | `platform_object.h/.c` | 对象身份证：magic、name、type、state 与基础校验 |
| `object/` | `platform_lifecycle.h` | 生命周期回调表（init/start/process/stop/sleep/wakeup/deinit） |
| `object/` | `platform_device.h/.c` | 设备对象基类（dev_class + caps），继承 `platform_object_t` |
| `object/` | `platform_service.h/.c` | 服务对象基类（service_class + cfg/ctx/data/ops），继承 `platform_object_t` |
| `manager/` | `platform_manager.h/.c` | 通用管理器基类：静态对象槽数组 + 生命周期统一驱动（机制） |
| `manager/` | `platform_device_manager.h/.c` | 设备管理器特化（类型安全薄包装） |
| `manager/` | `platform_service_manager.h/.c` | 服务管理器特化（类型安全薄包装） |
| `manager/` | `platform_board_manager.h/.c` | 整板编排：device/service 生命周期推进（机制，顺序策略归 Service） |
| `diag/` | `platform_log.h` | 日志抽象契约：级别宏常量/编译裁剪/统一输出宏；输出由 Impl 符号实现桥接 elog/RTT（流转见 [`diag-log-flow.md`](references/diag-log-flow.md)） |
| `diag/` | `platform_version.h/.c` | 版本/构建信息 + 启动 banner |
| `diag/` | `platform_assert.h/.c` | 断言统一出口 + hook 注册（`platform_assert_set_hook`）+ 独立输出原语 `platform_assert_output`（P2，故障路径不依赖日志） |
| `diag/` | `platform_reset_reason.h/.c` | 复位原因枚举 + 字符串映射（读取由 Impl 提供） |
| `diag/` | `platform_hardfault.h` | 硬件异常现场 + 处理接口（ARM 架构契约；实现由 Impl 提供） |
| `references/` | `object-four-tuple-template.md` | 对象四元组模板：base + cfg/ctx/data/ops 规范与 C 示例 |

依赖方向（上层只 include `platform_type.h`，禁直接 include `board_types.h`）：

```text
04_Impl/impl_board/board_types.h
        |
        v
platform_type.h  (core/)
        |
        +--> platform_error.h  (core/)
        |
        +--> platform_def.h    (core/)
        |
        +--> platform_object.h  <-- platform_lifecycle.h   (object/)
              |
              +--> platform_device.h                       (object/)
              |
              +--> platform_service.h                      (object/)
              |
              +--> platform_manager.h  (manager/，驱动 object 身份与生命周期)
                    |
                    +--> platform_device_manager.h / platform_service_manager.h
                    |
                    +--> platform_board_manager.h
diag/（log/version/assert/reset_reason/hardfault）依赖 core/ 类型与错误码；实现由 Impl 提供
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

要点：错误码**只用 enum，不用同名 #define**，避免预处理期把枚举名替换成数字导致编译错误。**平台接口返回码统一使用 `platform_err_t` 枚举与 `PLATFORM_ERR_*` 枚举值（`platform_error.h`），这是唯一返回码来源**；`platform_def.h` 中的 `PLATFORM_OK / PLATFORM_ERROR` 为遗留兼容宏（返回码语义），**仅存量代码可保留，新生成的代码一律禁用**，统一改用 `PLATFORM_ERR_OK` 等枚举值。

## 基础类型与公共宏

- `platform_type.h`：`int8_t..uint64_t`、`float_t/double_t`、`char_t/uchar_t`、`bool_t`，从 `board_types.h` 映射，是 Platform/Service/App 的类型出口。
- `platform_def.h`：`PLATFORM_OK/ERROR/TRUE/FALSE`、`platform_bool_t`、`NULL`、`PLATFORM_ALIGN_SIZE`(4u)/`PLATFORM_ALIGN(n)`、`ARRAY_SIZE`、`PLATFORM_DELAY_MS(ms)`/`PLATFORM_DELAY_US(us)` 及 `platform_delay_ms(uint32_t)`/`platform_delay_us(uint32_t)` 声明——**延时只在此声明，实现在 Impl 层**。

本文件即 Platform/Service/App 的类型与宏**唯一出口**：上层只 include `platform_type.h` / `platform_def.h`，禁止直接 include `board_types.h`，禁止自造与 `PLATFORM_ALIGN`、`ARRAY_SIZE`、`PLATFORM_DELAY_MS/US` 等价的宏。

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

## 对象四元组模板（base + cfg / ctx / data / ops）

Platform 各层创建**具体设备对象 / 服务对象**时，统一按四元组模板组织结构体：`base`（继承 `platform_device_t` 或 `platform_service_t` 身份）+ `cfg`（静态配置）+ `ctx`（运行上下文）+ `data`（当前数据）+ `ops`（行为接口）。

- **base 必须作为结构体首字段**，保证 `platform_object_t` 位于偏移 0，支持 C 风格向上转型与 `platform_object_is_valid()` 校验。
- **base 选择规则**：硬件/板级能力对象（有 `dev_class`、`caps`）→ `platform_device_t`；可复用服务能力/策略编排对象（`service_class`）→ `platform_service_t`。`platform_service_t` 已内嵌四元组槽，具体服务对象直接复用、不重复声明；`platform_device_t` 未内嵌四元组，具体设备对象须在 `base` 后补齐四槽。
- **判定标准（Platform 生成产物为 MUST）**：定义了「承载平台身份的 struct」→ 必须套四元组；仅纯粹行为函数表（`pf_*` + 上下文）可豁免，且须在头注释显式声明「纯转发、不承载对象身份」；禁止用「纯接口」边界豁免已定义对象 struct 的类型。
- 错误码统一用 `platform_err_t`、类型统一用 `platform_type.h`、宏统一用 `platform_def.h`。

权威定义与 C 模板示例见 [`object-four-tuple-template.md`](references/object-four-tuple-template.md)。

## 生成自检门禁（输出前 MUST）

输出代码前逐项核对，任一不满足不得交付：

- [ ] 四元组：base 首字段 + cfg/ctx/data/ops 四槽；纯转发豁免须在头注释显式声明
- [ ] 错误码：统一 `platform_err_t`/`PLATFORM_ERR_*`，不压平为 -1
- [ ] 类型/宏：出口自 `platform_type.h`/`platform_def.h`，不自造等价物
- [ ] 依赖：不包含芯片/HAL/RTOS/厂商类型
- [ ] 注释：统一遵循 `style-profile.md`，覆盖文件头、公开 API、必要约束和源文件分区
- [ ] 代码质量：按 `review-gates.md` 自查

## 生成契约

`03_Platform/platform_common/` 四子域共含 **10 个 `.c`**（`object/`：platform_object/device/service 3 个；`manager/`：platform_manager/device_manager/service_manager/board_manager 4 个；`diag/`：platform_assert/reset_reason/version 3 个；`core/` 零 `.c` 纯头契约）。上层统一 include `platform_common/platform_*.h`（编译路径须覆盖四个子域），不得复制定义；**禁直接 include `04_Impl/impl_board/board_types.h`**（类型出口是 `platform_type.h`）。

说明：插件 `skills/platform` 技能目录允许无芯片/RTOS/厂商依赖的公共实现（门禁检查 `.c` 的 include 与符号，禁止 HAL/RTOS/芯片依赖）；`platform_common` 的对象模型/管理器/诊断实现可直接落在技能目录，生成工程 `03_Platform/platform_common/` 同样含实现。

## Manager 内置能力（机制，非策略）

`manager/` 是 platform_common 的**内置能力**（不拆独立技能）：提供对象生命周期统一驱动**机制**——

- 注册动作：register → `state=REGISTERED` → `p_parent=manager`（注册不是回调）。
- 驱动循环：init → start → process → stop → deinit，continue-on-error 批量统计。
- 槽数组：容量由编译期宏定义；**满槽返回 `PLATFORM_ERR_NO_RESOURCE`**；重复注册返回 `PLATFORM_ERR_ALREADY_INIT`（P5）。

**策略边界（P3）**：manager 只提供驱动机制，**不持有产品级编排顺序策略**（如"先传感器稳定再启动背光"）。多对象编排顺序由 Service 层（如 `service_system`）表达；board_manager 的默认顺序（device.init → service.init → device.start → service.start）是**机制默认值**，可被上层配置覆盖，禁止把业务先后写死为不可变契约。

## 日志与检测流转（diag 契约）

diag 是**横切可观测原语**：机制在 Platform（本子域），策略在 Service（`service_log` / `service_diagnosis` / `service_watchdog`），落地在 Impl（port 文件）。流转三方向（详见 [`diag-log-flow.md`](references/diag-log-flow.md)）：

- **调用向下**：App 经 `service_log` 门面（`SERVICE_LOG_*`，禁 include `platform_log.h`，D8）；Service 其他层与 Impl 直调 `PLATFORM_LOG_*`；Vendor 永不反向。
- **注入由 Impl**：注入为**符号实现**（链接期）——Impl port 文件直接实现 `platform_log_*` 函数体（如 `impl_log_elog.c`），**非运行期 ops 注册**（简单、零 RAM、无初始化顺序问题，禁止引入运行期注册）。
- **输出到底**：`platform_log_output` 组帧后写 Vendor 底座（elog / SEGGER RTT / HAL UART）；日志须在任何平台对象使用前初始化（boot 第一步）。

**断言旁路（P2）**：`PLATFORM_ASSERT` 失败 → `platform_assert_fail`：有 hook 则回调并返回（host 冒烟）；无 hook 则经 `platform_assert_output`（独立于日志系统的原始输出，Impl 桥接 RTT）输出后死循环——故障路径自足，不依赖日志。

## 禁止与准入

- **准入规则（P1）**：新能力须被 ≥2 个子域/层共享且零芯片/RTOS/厂商依赖方可进入 platform_common；单域使用的公共能力归属对应层。diag 是平台内建可观测原语，**只声明接口、实现永远在 Impl**。
- **日志契约（P2）**：断言（故障路径）**不依赖日志系统**，须有独立输出通道或注入式输出；日志实现由 Impl 提供，且须在任何平台对象使用前初始化（boot 阶段第一步）。
- **架构范围（P4）**：`platform_hardfault_frame_t` 为 **ARM Cortex-M 架构契约**，跨架构（如 RISC-V）由 Impl 提供等价契约；禁止在平台层做寄存器级通用抽象。
- 禁止在此放芯片专有能力、Vendor 类型、RTOS 句柄或业务状态。
- 不把具体设备操作强行塞进统一 `read/write/control`；typed ops 属后续课程。
- `caps` 是静态能力，休眠状态由 `object.state` 记录。

## 命名说明（P1 可选）

代码现状：guard 为 `__PLATFORM_XXX_H__`（双下划线）、生命周期回调为裸名（无 `pf_` 前缀）、`user_data` 无 `p_` 前缀。这些是命名审计（`00_Docs/embedded-framework-naming-audit.md`）判定的 **P1 可选对齐项，不强制**；插件生成代码仍遵循 naming-convention（`XXX_H` guard、`pf_` 前缀）。参考代码时不要"顺手"改动现有实现。

## 交接

芯片外设能力接口交给 [`platform_mcu`](../platform_mcu/SKILL.md)；OS 能力接口交给 [`platform_os`](../platform_os/SKILL.md)；板级器件接口交给 [`platform_bsp`](../platform_bsp/SKILL.md)；中间件能力接口交给 [`platform_middleware`](../platform_middleware/SKILL.md)。

共享层契约见 [`software-layer-contract.md`](../../workflow/workflow-review-gate/references/software-layer-contract.md)。
