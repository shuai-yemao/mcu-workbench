# platform_common 设计说明

本目录是 Platform 层的公共基础层，回答四个问题：

> **目录结构**：本层按架构分为三个物理子目录，代码内 include 保持简单文件名，
> 编译 / 索引时将三个子目录都加入 include 搜索路径：
>
> ```text
> platform_common/
> ├── core/      基础层：类型、错误码、公共宏与延时（platform_type / platform_error / platform_def）
> ├── object/    对象模型：身份、生命周期、设备、服务（platform_object / platform_lifecycle / platform_device / platform_service）
> └── manager/   管理层：通用基类 + device/service 特化 + 整板编排（platform_manager / device|service_manager / platform_board_manager）
> ```

1. **平台用什么类型说话** —— `platform_type.h` / `platform_error.h` / `platform_def.h`；
2. **平台对象是谁、是否合法、处于什么状态** —— `platform_object.h` / `platform_device.h` / `platform_service.h`；
3. **对象如何被统一启动、停止和运行** —— `platform_lifecycle.h`；
4. **谁注册、谁初始化、谁启动、谁停止** —— `platform_manager.h` 及其 device/service 特化、`platform_board_manager.h`。

从演进上看：第 4 课建立类型、错误码和公共宏；第 5 课在此基础上建立 object / device / service 的轻量对象模型；第 7 课在对象模型之上建立 manager 层，统一回答「谁注册、谁初始化、谁启动、谁停止」。

---

## 一、基础层三文件的设计意义

### 为什么拆成三个文件

三个文件各自只回答一个问题，可以独立演进、任意组合：

| 文件 | 回答的问题 | 依赖 |
| --- | --- | --- |
| `platform_type.h` | 平台统一用什么类型 | `board_types.h` |
| `platform_error.h` | 平台接口统一怎么报错 | `platform_type.h` |
| `platform_def.h` | 平台通用宏、布尔、延时从哪来 | `platform_type.h` |

### `platform_type.h` —— 类型出口

`board_types.h` 是当前板级/当前编译环境的基础类型源头，放在 `04_Impl/impl_board`。它描述的是**"这块板子、这个编译环境"的底子**（例如固定宽度整型的 `typedef`），属于板级实现细节。

`platform_type.h` 把 `board_types.h` 的类型**重新引出**为 `int8_t`…`uint64_t`、`float_t` / `double_t`、`char_t` / `uchar_t`、`bool_t`，成为 Platform、Service、App 共用的**唯一类型出口**。

这样设计的意义：

- **上层不碰板级细节**。Platform/Service/App 只 include `platform_type.h`，不直接 include `board_types.h`，板级类型怎么实现被隔离在 Impl 层。
- **换板不换代码**。换一块板子、换一个编译器，只需换 `board_types.h`，类型出口和上层代码不用动。
- **固定宽度可移植**。`int64` / `uint64` 在 32 位环境下必须落成 `long long`（见"注意点"），统一在这里收敛，避免各层各写各的。

### `platform_error.h` —— 错误协议

`platform_err_t` 是平台统一的错误码枚举：`PLATFORM_ERR_OK` 之外的错误码覆盖超时、参数、内存、资源、未初始化、重复初始化、忙、未找到等常见失败场景，末尾用 `PLATFORM_ERR_RESERVED = 0x7FFFFFFF` 占位，预留扩展空间。

设计意义：

- **接口返回值优先用 `platform_err_t`**。所有平台接口用同一套错误语言，调用方不用猜测某个函数失败时返回什么；`PLATFORM_IS_OK()` / `PLATFORM_IS_ERR()` 给出统一的成功/失败判断入口。
- **错误码必须用 enum，不能同名 `#define`**。若同时出现 `#define PLATFORM_ERR_OK 0` 和枚举名 `PLATFORM_ERR_OK`，预处理阶段会把枚举名替换成数字，导致后续编译错误（详见"注意点"）。
- **0 是成功**。`PLATFORM_ERR_OK = 0`，让成功判断和 C 语言 `0 == OK` 的习惯一致，也便于批量接口用"首个错误码"做汇总（见 manager 层的 `first_error`）。

### `platform_def.h` —— 通用宏与延时声明

收纳各层都会用到的公共定义：

- `PLATFORM_OK` / `PLATFORM_ERROR` / `PLATFORM_TRUE` / `PLATFORM_FALSE` / `platform_bool_t`：与错误码分开的通用布尔语义；
- `NULL`：避免各层重复定义；
- `PLATFORM_ALIGN(n)`：按 `PLATFORM_ALIGN_SIZE = 4` 对齐到 4 字节边界，用于内存池、静态缓冲区等场景；
- `ARRAY_SIZE(arr)`：静态数组长度，供槽数组、能力位表等使用；
- `platform_delay_ms()` / `platform_delay_us()`：**只声明不实现**。延时依赖具体硬件的定时器，实现必须放到 Impl 层，Platform 层只约定接口；`PLATFORM_DELAY_MS()` / `PLATFORM_DELAY_US()` 是其宏别名。

---

## 二、对象模型的设计目的与应用

### 为什么需要 `platform_object_t`

device、service、manager 本是完全不同的东西，但它们有一个共同点：**都要被统一注册、统一按生命周期启动/停止**。如果每种对象各写一套管理逻辑，manager 层就要为每种对象写一套重复代码，而且无法统一回答"这个指针是不是一个合法对象、它现在处于什么阶段"。

所以先抽出一个公共身份头 `platform_object_t`，放进每个具体对象的**第一个字段**（C 语言下最朴素的"继承"）：

```c
typedef struct
{
    uint32_t magic;                          /* 运行时身份校验值        */
    const char *name;                        /* 对象名，如 "display0"     */
    platform_object_type_t type;             /* DEVICE / SERVICE / MANAGER / APP */
    platform_object_state_t state;           /* 当前生命周期状态          */
    uint32_t flags;                          /* 预留扩展标志位            */
    void *p_self;                            /* 指向具体拥有者对象        */
    void *p_parent;                          /* 指向父对象或所属 manager  */
    const platform_lifecycle_ops_t *p_lifecycle; /* 生命周期回调表       */
    void *user_data;                         /* 用户扩展指针              */
} platform_object_t;
```

字段逐一的设计意图：

| 字段 | 设计意图 |
| --- | --- |
| `magic` | 运行时身份校验值。配合 `type` 做双重校验，`platform_object_is_valid()` 能拦截"野指针 / 未初始化的内存 / 类型不匹配"三类误用。 |
| `name` | 对象名是 manager 按名字查找的唯一键，也方便调试打印。 |
| `type` | 高层类别，告诉系统"这是什么对象"，也是 manager 的类型门禁依据。 |
| `state` | 生命周期状态机，只记录"处于哪个阶段"，不执行任何动作（动作在 `p_lifecycle` 里）。 |
| `p_self` | 指向具体拥有者。生命周期回调只收 `void *p_self`，靠它转回具体对象（如某个 `display_dev_t *`）。 |
| `p_parent` | 指向父对象或所属 manager，注册后由 manager 绑定。 |
| `p_lifecycle` | 生命周期回调表，见"四、lifecycle 的设计思路"。 |
| `user_data` / `flags` | 预留的扩展位，避免以后加字段要改结构体布局。 |

**为什么必须是第一个字段**：manager 只持有 `platform_object_t *`，却要能安全地把对象转回 `platform_device_t *` / `platform_service_t *`。因为基类在偏移 0 处，直接 `(platform_device_t *)p_obj` 就是布局安全的，不需要 `container_of` 宏。device_manager 的 `get_by_class()` 就靠这个直接转回取 `dev_class`（见 `platform_device_manager.c`）。

### `platform_device_t` —— 设备（驱动）对象

```c
typedef struct
{
    platform_object_t object;          /* 公共身份 + 生命周期        */
    platform_device_class_t dev_class; /* 设备类别                    */
    uint32_t caps;                     /* 静态 IO 能力位              */
} platform_device_t;
```

**设计目的**：`platform_device_t` 是硬件设备的**公共管理面**，不是所有设备的完整行为接口。它只回答"系统怎么认识并管理这台设备"，不回答"这台设备具体怎么读写"。

- `dev_class`：设备类别，覆盖智能手表整机的硬件能力——显示屏、触摸、IMU、温湿度、心率、电池、存储、背光、马达、CPU、时钟、电源、RTC、按键。
- `caps`：**静态** IO 能力位。注意这里**不再沿用传统 `READ/WRITE/CONTROL` 的设备文件思路**，而是描述系统策略关心的能力，例如 `CAP_SLEEP`（支持休眠）、`CAP_WAKEUP`（可作为唤醒源）、`CAP_IRQ`、`CAP_DMA`、`CAP_PERIODIC`（支持周期处理）。"当前是否正在休眠"由 `object.state` 生命周期状态机记录，不再有独立的 `power_state` 字段。

**为什么不把 `read/write/control` 塞进基类**：显示屏、触摸、IMU、电池、Flash、背光的具体动作差异太大，强行统一成 `read/write/control` 会得到一个又空又漏的接口。这些具体操作留给后续课程作为 typed ops 展开（`display_ops_t`、`touch_ops_t`、`storage_ops_t` 等），`platform_device_t` 只做管理面。

**应用**：显示屏、触摸、IMU、电池、背光等具体设备对象把 `platform_device_t` 作为首字段，实现各自的 `init/start/stop` 回调，统一注册进 `device_manager`，由 manager 批量驱动。具体设备的数据读写，通过对象自己的字段和 typed ops 完成，与公共管理面解耦。

### `platform_service_t` —— 服务对象

```c
typedef struct
{
    platform_object_t object;               /* 公共身份 + 生命周期  */
    platform_service_class_t service_class; /* 服务类别              */
    const void *cfg;                        /* 静态配置指针          */
    void *ctx;                              /* 运行上下文指针        */
    void *data;                             /* 当前服务数据指针      */
    const void *ops;                        /* 服务行为操作表        */
} platform_service_t;
```

**设计目的**：device 描述"硬件有什么"，service 描述"业务怎么跑"。服务是**可复用的业务能力**——传感器融合、电池估算、电源策略、背光策略、存储管理、BLE、OTA、系统编排，它们消费 device 提供的底层数据，产出业务决策。

- **四元组 `cfg` / `ctx` / `data` / `ops`**：静态配置（编译期确定）、运行上下文（会话期可变）、当前数据（每次运算的结果）、行为操作表（服务的方法集）。四元组把服务的"配置、状态、数据、行为"分开存放，职责清晰、便于测试。
- **两个初始化入口**：
  - `platform_service_init()`：不填 `data`/`ops`，适合简单服务；
  - `platform_service_model_init()`：完整四元组，适合有独立数据与行为表的服务。

**应用**：系统服务、传感器服务、电池服务、电源服务、存储服务、背光服务、BLE 服务、OTA 服务等具体服务对象把 `platform_service_t` 作为首字段，统一注册进 `service_manager`。

### device 与 service 的分工

```text
object      解决对象是谁、是否合法、处于什么状态
device      解决硬件设备如何进入统一管理面（静态能力 + 生命周期）
service     解决业务服务如何进入统一管理面（四元组 + 生命周期）
lifecycle   解决对象如何被统一启动、停止和运行
caps        解决系统策略如何识别设备支持的运行能力
object.state 解决系统策略如何记录设备当前运行/休眠阶段（无独立 power_state 字段）
```

两者都要继承 `platform_object_t`，因为生命周期是**横切能力**：无论 device 还是 service，都要被 manager 用同一套 `init→start→process→stop→deinit` 驱动。具体设备的读法写法、具体服务的算法，都在各自对象内部和 typed ops / 行为表里，不进公共基类。

> 边界提醒：本层只回答"平台对象如何被统一管理"，不回答"某个具体设备到底怎么读写"。显示屏、触摸、IMU、电池、Flash、背光的具体动作差异很大，不强行塞进统一的 `read/write/control`，具体设备操作表会在后续课程里作为 typed ops 展开（例如 `display_ops_t`、`touch_ops_t`、`storage_ops_t`）。因此 `platform_device_t` 是设备的公共管理面，不是所有设备的完整行为接口。

---

## 三、lifecycle 的设计思路与意义

`platform_lifecycle.h` 定义对象的生命周期回调表：

```c
typedef struct
{
    platform_err_t (*init)(void *p_self);    /* 对象初始化           */
    platform_err_t (*start)(void *p_self);   /* 对象启动入口          */
    platform_err_t (*process)(void *p_self); /* 可选：周期处理        */
    platform_err_t (*stop)(void *p_self);    /* 对象停止入口          */
    platform_err_t (*sleep)(void *p_self);   /* 可选：低功耗入口      */
    platform_err_t (*wakeup)(void *p_self);  /* 可选：唤醒入口        */
    platform_err_t (*deinit)(void *p_self);  /* 对象资源释放          */
} platform_lifecycle_ops_t;
```

### state 与 lifecycle 分离

这是本层最关键的设计决策：

- **`object.state` 只记录状态**（`CREATED → REGISTERED → INITIALIZED → STARTED → STOPPED → DEINITIALIZED`，外加 `ERROR`），是系统对"对象当前所处阶段"的事实登记。
- **`platform_lifecycle_ops_t` 只执行动作**，是对象拥有的回调表，每个回调知道怎么真正初始化/启动/停止自己。

分开的原因：如果让对象自己边执行边改状态，容易出现"动作做了但状态没改"或"状态改了但动作没做"的错位；把"记录"和"执行"分开，状态迁移的合法性就交给 manager 的规则表统一裁决（见下一节）。

### 为什么生命周期是横切能力、由 manager 驱动

`init/start/process/stop/sleep/wakeup/deinit` 是任何平台对象都要回答的问题，不是 device 或 service 的私有逻辑。因此回调表挂在公共的 `platform_object_t.p_lifecycle` 上，任何对象（包括 manager 自己）都可以绑。执行者是 manager——统一遍历、统一校验前置状态、统一统计结果，而不是每个对象自己驱动自己。

`process` / `sleep` / `wakeup` 是可选回调：对象不实现（NULL）时，批量驱动会将其**跳过**而不是当作失败。

---

## 四、manager 层的设计思路与意义

### `platform_manager` —— 通用管理基类

`platform_manager.h/.c` 是所有 manager 的公共底座：一个**静态对象槽数组**（`pp_objects` / `capacity` / `count`），加 `register` / `unregister` / `find` / `count`，加**单对象驱动**与**批量五段驱动**（init / start / process / stop / deinit）。

```c
typedef struct
{
    platform_object_t       object;        /* MANAGER 类型身份        */
    platform_object_t     **pp_objects;    /* 对象槽数组指针（静态）  */
    uint32_t                capacity;      /* 槽数组长度              */
    uint32_t                count;         /* 已注册对象个数          */
    platform_object_type_t  expected_type; /* 期望管理的对象类型      */
} platform_manager_t;
```

#### 状态机规则表：合法跳转的唯一裁决者

核心是 `platform_manager.c` 里的静态规则表 `manager_rules[]`。每个生命周期动作都带三样东西：

```c
typedef struct
{
    uint32_t                pre_mask;      /* 允许的前置状态位掩码 */
    platform_object_state_t ok_state;      /* 成功后的状态         */
    platform_object_state_t fail_state;    /* 失败后的状态         */
    bool_t                  keep_on_fail;  /* 失败时是否保持原状态 */
} platform_manager_rule_t;
```

实际规则（表驱动，而非一堆 if/switch）：

| 动作 | 允许的前置状态 | 成功→ | 失败→ | 失败是否保持 |
| --- | --- | --- | --- | --- |
| INIT | REGISTERED | INITIALIZED | ERROR | 否 |
| START | INITIALIZED | STARTED | ERROR | 否 |
| PROCESS | STARTED | STARTED | STARTED | 是 |
| STOP | STARTED | STOPPED | STARTED | 是 |
| DEINIT | INITIALIZED / STOPPED / STARTED | DEINITIALIZED | ERROR | 否 |

设计意义：

- **杜绝非法跳转**。对象不在允许的前置状态时，驱动返回 `PLATFORM_ERR_BUSY`，例如"没 init 就想 start"被直接拒绝。
- **process/stop 失败不回滚状态**（`keep_on_fail = TRUE`）：周期处理失败或停止失败不把对象打成 ERROR，避免一次瞬时失败污染整个状态机。
- **init/start 失败进 ERROR**（`keep_on_fail = FALSE`）：初始化或启动失败是结构性失败，需要显式标记。
- 用**规则表**而不是代码里的 if/switch，是因为生命周期动作种类少而规则意图强（每个动作都有"前置、成功、失败、是否保持"四维约束），集中成表便于审查、便于新增动作。

#### register 是登记动作，不是对象回调

`platform_manager_register()` 只做登记：校验对象类型、查重（指针或名字）、写入槽数组、把对象状态置为 `REGISTERED`、绑定 `p_parent = manager`。**不调用任何对象回调**——对象自己怎么初始化，属于 lifecycle 的事。

两个注册约束：

- **类型门禁**：对象 `type` 必须等于 manager 的 `expected_type`，否则拒绝；
- **注册窗口**：manager 自身状态不是 `CREATED`（即 `init_all` 已驱动过）后，注册返回 `PLATFORM_ERR_BUSY`。保证清单在运行期冻结，防止运行中临时改对象集合。

#### 批量驱动：continue-on-error + 结果统计

`manager_drive_all()` 对每个已注册对象执行同一动作，并区分三种结局：

- **跳过**：没有该动作的回调（NULL），或对象不在适用阶段（返回 `PLATFORM_ERR_BUSY`）；
- **成功**：计入 `ok_count`；
- **失败**：计入 `fail_count`，且仅记录**首个**错误码和失败对象名。

驱动不因一个对象失败就中断（continue-on-error），而是跑完全部对象，把结果汇总到 `platform_manager_result_t`：

```c
typedef struct
{
    platform_err_t first_error;   /* 首个失败错误码 */
    const char    *p_fail_name;   /* 首个失败对象名 */
    uint32_t       total;         /* 本次批量对象总数 */
    uint32_t       ok_count;      /* 成功数 */
    uint32_t       skip_count;    /* 跳过数（无回调） */
    uint32_t       fail_count;    /* 失败数 */
} platform_manager_result_t;
```

**为什么 continue-on-error 而不是一错即停**：嵌入式系统里一个对象失败（例如某个传感器 init 失败）不应该阻止其它对象继续启动；系统要的是"尽量把能起来的都起来"，同时把失败记录下来供上层决策。

#### manager 自身也是对象

manager 用 `PLATFORM_OBJECT_MANAGER` 类型初始化自己的 `object`，也可以被注册进别的 manager（manager 可嵌套）。但**集合驱动走显式函数调用**（`platform_manager_init_all()` 等），不走自己的生命周期回调，避免"manager 驱动自己时无限递归"。

### `platform_device_manager` / `platform_service_manager` —— 特化薄包装

两个特化只做三件事，其余全部转发给基类：

1. **内嵌基类 + 内联槽数组**：

```c
typedef struct
{
    platform_manager_t  manager;                                        /* 基类 */
    platform_object_t  *p_slots[PLATFORM_DEVICE_MANAGER_MAX_COUNT];     /* 槽 */
} platform_device_manager_t;
```

`device_manager` 默认容量 16（14 个设备类别 + 余量），`service_manager` 默认容量 8。

2. **类型门禁**：`platform_device_manager_register()` 先校验 `PLATFORM_OBJECT_DEVICE`，`service_manager` 同理——**DEVICE 只能进 device_manager、SERVICE 只能进 service_manager**，把类型错误拦截在注册点。

3. **按名/按类查询**：
   - 按名：`get()` 转发 `platform_manager_find()`；
   - device_manager 额外提供 `get_by_class()`：按设备类别找第一个匹配设备。这里利用"object 是首字段"，`(platform_device_t *)p_obj` 直接转回后比较 `dev_class`。

4. **批量驱动是纯转发**：`init_all / start_all / process_all / stop_all / deinit_all` 一行转给基类，不重复实现。

**为什么要有这层薄包装**：如果不做特化，调用方要么裸用 `platform_manager`（自己维护槽数组、自己保证类型）、要么为每种对象复制一份 manager 代码。薄包装用**最少的代码**给出"类型安全 + 固定容量 + 专用查询"的专用 manager，成本几乎为零（每个函数只有 1–3 行）。

### `platform_board_manager` —— 整板编排（第 7 课补充）

`platform_board_manager` 内嵌 device / service 两个子 manager，自己也是一个 `PLATFORM_OBJECT_MANAGER` 对象：

```c
typedef struct
{
    platform_object_t          object;       /* MANAGER 类型身份 */
    platform_device_manager_t  device_mgr;   /* 内嵌设备 manager */
    platform_service_manager_t service_mgr;  /* 内嵌服务 manager */
} platform_board_manager_t;
```

它编排整板的生命周期主线，体现三条顺序原则：

- **启动主线**：`device.init_all → service.init_all → device.start_all → service.start_all`。
  - *为什么 init 全量先于 start 全量*：先让所有硬件资源就绪（init），再统一进入运行（start），避免"服务 start 时依赖的设备还没 init"。
  - *为什么 device 先于 service*：service 消费 device 的数据，硬件必须先于业务跑起来。
- **运行 tick**：`device.process_all → service.process_all`。设备数据先刷新，服务再基于最新数据计算——**数据向上流，策略向下流**。
- **停止/回收主线（逆序）**：`service.stop_all → device.stop_all`、`service.deinit_all → device.deinit_all`。**服务先停、设备后停**，因为服务可能还在使用设备；资源释放同样逆序，防止"设备已释放而服务还引用它"。

board manager 的 `get_device_manager()` / `get_service_manager()` 是开机时注册设备的入口：应用/板级代码在 `board.start` 之前拿到两个子 manager，逐个注册 device 和 service，然后交给 board 统一驱动。

---

## 五、依赖方向

```text
04_Impl/impl_board/board_types.h
        |
        v
03_Platform/platform_common/platform_type.h
        |
        +--> platform_error.h
        |
        +--> platform_def.h
        |
        +--> platform_object.h
              |
              +--> platform_device.h
              |
              +--> platform_service.h
              |
              +--> platform_lifecycle.h
              |
              +--> platform_manager.h  ──> platform_device_manager.h ─┐
                    │                                                 │
                    └──────────────┬──────────────────────────────────┘
                                   +--> platform_service_manager.h ──┘
                                   |
                                   +--> platform_board_manager.h
```

`board_types.h` 是当前板级/当前编译环境的基础类型源头。`platform_type.h` 是给 Platform、Service、App 使用的类型出口。上层代码不建议直接 include `board_types.h`。

manager 层依赖方向：`platform_object.h` → `platform_manager.h` → `platform_device_manager.h` / `platform_service_manager.h` → `platform_board_manager.h`。新文件不 include `board_types.h` / Impl / Vendor / HAL。

---

## 六、注意点

- `platform_error.h` 不再同时使用同名 `#define` 和 enum 枚举值。错误码只保留 enum 定义，避免预处理阶段把枚举名替换成数字后导致编译错误。
- `int64` / `uint64` 在 STM32/Keil 这类 32 位环境下应使用 `long long`，不能写成 `long`，否则很可能只有 32 位。
- `platform_delay_ms()` / `platform_delay_us()` 只在本层声明，实现必须放在 Impl 层（依赖具体硬件定时器）。

---

## 七、课堂验收

学生应能解释第 4 课基础内容：

1. 为什么 `board_types.h` 放在 `04_Impl/impl_board`，`platform_type.h` 作为 Platform 层类型出口。
2. 为什么接口返回值优先使用 `platform_err_t`。
3. `PLATFORM_IS_OK()` 和 `PLATFORM_IS_ERR()` 如何统一判断错误。
4. `PLATFORM_ALIGN()` 和 `ARRAY_SIZE()` 的正确使用边界。
5. 为什么 `platform_delay_ms()` / `platform_delay_us()` 只在这里声明，实现应放到 Impl 层。
6. 为什么错误码用 enum 而不用同名 `#define`。

学生还应能解释第 5 课对象模型：

1. `platform_object_t` 为什么要有 `magic` / `name` / `type` / `state`。
2. 为什么 `platform_object_is_valid()` 要同时检查 magic 和 type。
3. `PLATFORM_OBJECT_DEVICE` 和 `PLATFORM_DEVICE_CLASS_IMU` 的区别。
4. 为什么 `platform_device_t` 与 `platform_service_t` 的第一个字段都必须是 `platform_object_t object`（布局安全转回，不需要 `container_of`）。
5. 为什么 state 只记录对象阶段，真正动作入口放在 `platform_lifecycle_ops_t`。
6. 为什么 `caps` 表示静态运行能力，而当前功耗状态由 `object.state`（lifecycle 状态机）记录，不再有独立 `power_state` 字段。
7. 为什么 device 与 service 的 `read/write/control` 等具体行为不塞进公共基类（留给 typed ops / 四元组行为表）。

学生还应能解释第 7 课 manager 层：

1. 为什么 register 是 manager 的登记动作而不是对象回调。
2. state 与 lifecycle 的区别，为什么 manager 是唯一执行者。
3. 为什么 DEVICE 只能进 device_manager、SERVICE 只能进 service_manager。
4. 为什么启动主线是 device → service（且 init 全量先于 start 全量）。
5. 为什么关机/回收要逆序（service 先停、device 后停）。
6. 为什么批量驱动用 continue-on-error 而不是一错即停。
7. 注册窗口为什么在 `init_all` 后关闭（返回 `PLATFORM_ERR_BUSY`）。
8. 为什么 manager 自身也是对象（`PLATFORM_OBJECT_MANAGER`），且集合驱动走显式函数调用而非生命周期回调。
9. 为什么生命周期驱动用规则表 `manager_rules[]` 而不是一堆 if/switch（每个动作的前置状态、成功/失败状态、失败是否保持集中成表，杜绝非法跳转）。
