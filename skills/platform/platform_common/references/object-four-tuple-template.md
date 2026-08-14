# 对象四元组模板（base + cfg / ctx / data / ops）

> v2.1（2026-08-15）：布局规则修正（ADR-013）——cfg/ops = const 指针（共享）、ctx/data = 内联值（独有）；明确对象 Ops 与纯能力 Ops 的边界，BSP 不再生成 Wrapper。

## 为什么需要模板

Platform 各层（common / mcu / os / bsp / middleware）在创建**具体设备对象 / 服务对象**时，统一按四元组模板组织结构体：`base` 承载对象身份与生命周期，`cfg / ctx / data / ops` 四槽解耦静态配置、运行上下文、当前数据与行为接口。这样任何对象都具备统一身份校验（`platform_object_is_valid()`）与统一生命周期驱动，上层可以一致地管理所有对象。

## 五要素

```text
具体设备对象
├── base    继承 platform_device_t（或 platform_service_t）身份
├── cfg     静态配置
├── ctx     运行上下文
├── data    当前数据
└── ops     行为接口
```

| 成员 | 含义 | 类型约定 | 为什么 |
| --- | --- | --- | --- |
| `base` | 对象身份与生命周期（首字段） | `platform_device_t` 或 `platform_service_t` | 偏移 0 向上转型 |
| `cfg` | 静态配置，编译期/启动期固定 | `const xxx_cfg_t *`（**指针**） | **共享**：一份配置多实例共用 |
| `ctx` | 运行时上下文（状态机、锁、缓冲句柄） | `xxx_ctx_t`（**内联值**） | **独有**：每实例一份运行状态 |
| `data` | 当前数据（最近测量/输出值） | `xxx_data_t`（**内联值**） | **独有**：每实例一份当前数据 |
| `ops` | 行为接口表 | `const xxx_ops_t *`（**指针**） | **共享**：一套行为表多实例复用 |

## 布局规则（ADR-013，判断句）

> **共享的用指针，独有的用内联。**

- `cfg` / `ops`：**const 指针**——配置与行为是"共享资产"，多实例共用一份，指针 + const 保证只读。
- `ctx` / `data`：**内联值**——运行状态与当前数据是"实例独有"，直接嵌在对象里（零指针、少间接访问、RAM 连续、大小可预测），与 device"继承式内联扩展"哲学一致。
- 例外：`platform_service_t` 已内嵌 `const void *cfg/ctx/data/ops` 四槽（指针形态），服务对象直接复用、不重复声明——**service 是统一管理面，四件套外置可共享**；device 是自包含实体，内联。

## base 选择规则

- 对象属于**硬件/板级能力**（有 `dev_class`、`caps`、物理能力，如 display/touch/imu/led）→ base 用 `platform_device_t`。
- 对象属于**可复用服务能力 / 策略编排**（`service_class`，如 sensor 融合、battery 估算、OTA）→ base 用 `platform_service_t`。
- `platform_service_t` 已内嵌 `cfg / ctx / data / ops` 四槽，具体服务对象直接复用、**不重复声明**四槽。
- `platform_device_t` 未内嵌四元组，具体设备对象须在 `base` 之后**补齐** `cfg / ctx / data / ops` 四槽，使四元组形态与 `platform_service_t` 对齐。

## 首字段约束

`base` **必须作为结构体首字段**，保证 `platform_object_t` 位于偏移 0，从而支持 C 风格向上转型（`platform_device_t *` / `platform_service_t *` 与具体对象指针互换）与 `platform_object_is_valid()` 的 magic + type 校验。

## 四件套命名（强制）

具体设备/服务类型的四件套命名固定为：

```text
<type>_cfg_t   静态配置
<type>_ctx_t   运行上下文
<type>_data_t  当前数据
<type>_ops_t   行为接口表
```

`<type>` 取设备类名（如 `imu`/`led`/`battery`）。设备对象 struct 名 = `<type>_device_t`（如 `imu_device_t`）。生成器、grep、文档均依赖此命名。

## 设备对象模板

```c
/* 具体设备对象：base 身份 + 四元组槽（platform_device_t 未内嵌四元组，须补齐） */
typedef struct
{
    platform_device_t base;        /* 首字段：object 身份 + dev_class + caps */
    const dev_cfg_t  *cfg;         /* 共享配置：const 指针 */
    dev_ctx_t         ctx;         /* 独有状态：内联值 */
    dev_data_t        data;        /* 独有数据：内联值 */
    const dev_ops_t  *ops;         /* 共享行为表：const 指针 */
} dev_device_t;
```

```c
/* 初始化：先初始化 base 身份，再绑定 cfg/ops（ctx/data 已内联） */
platform_err_t dev_init(dev_device_t *p_dev, const char *p_name, const dev_cfg_t *p_cfg)
{
    if ((p_dev == NULL) || (p_cfg == NULL))
    {
        return PLATFORM_ERR_PARAM;
    }

    platform_err_t err = platform_device_init(&p_dev->base, p_name,
                                              PLATFORM_DEVICE_CLASS_XXX,
                                              caps, p_dev, p_lifecycle);
    if (err != PLATFORM_ERR_OK)
    {
        return err;
    }

    p_dev->cfg = p_cfg;            /* ctx/data 内联：无需赋值，对象自带 */
    p_dev->ops = &s_dev_ops;       /* ops 通常指向静态行为表 */
    return PLATFORM_ERR_OK;
}
```

## 服务对象模板

```c
/* 具体服务对象：直接以 platform_service_t 为 base（已内嵌 cfg/ctx/data/ops），不重复声明四槽 */
typedef struct
{
    platform_service_t base;       /* 首字段：object 身份 + service_class + 四元组槽 */
    uint32_t reserved;             /* 服务特有扩展字段紧随 base 之后 */
} svc_t;
```

```c
/* 初始化：使用 platform_service_model_init() 一次绑定全四元组 */
platform_err_t svc_init(svc_t *p_svc, const char *p_name, const svc_cfg_t *p_cfg,
                        void *p_ctx, void *p_data, const svc_ops_t *p_ops)
{
    return platform_service_model_init(&p_svc->base, p_name,
                                       PLATFORM_SERVICE_CLASS_XXX,
                                       p_cfg, p_ctx, p_data, p_ops, p_lifecycle);
}
```

## Ops 签名与对象化边界

不同 Platform 能力可以采用不同的 Ops 形态，关键是先判定是否承载对象身份；不要为了抽象层次额外引入 BSP Wrapper：

| 层 | 位置 | 首参 | 命名 | 调用方 |
|---|---|---|---|---|
| **对象行为 Ops** | 设备/服务模型头（`<type>_ops_t`） | **具体对象指针**（如 `imu_device_t *p_dev`） | 能力名（`read`/`sleep`） | Service 或已确认的对象调用方 |
| **纯能力 Ops** | MCU/OS/Middleware 公共接口 | **`void *context`** 或能力专用句柄 | `pf_*` 前缀 | Platform 公共 API 经 Impl 注入 |

- 对象 Ops 用具体类型：类型安全、自文档，调用方无需 cast。
- 纯能力 Ops 可以用 `void *context` 隔离后端句柄，但必须在接口注释中说明上下文所有权、生命周期和线程边界。
- 设备模型直接由 Impl/组合根绑定并交给公共管理器，不经过额外的 BSP Wrapper 转发表或注册层。

## 通用类型 + 型号别名（可选约定，ADR-013）

同类设备多厂商型号时，可加"厂商型号别名"，**上层只用通用名，换芯片只改别名映射**：

```c
typedef imu_cfg_t  mpu6050_cfg_t;   /* 厂商型号别名 */
typedef imu_data_t mpu6050_data_t;  /* 上层用 imu_* 通用名，换型号只改这里 */
```

- 非强制：单型号设备不需要（YAGNI）。多型号设备（IMU/传感器）推荐。

## 统一约定来源

错误码统一使用 `platform_common/platform_error.h` 的 `platform_err_t` 枚举（`PLATFORM_ERR_*`），跨层判定用 `PLATFORM_IS_ERR` / `PLATFORM_IS_OK`；数据类型统一使用 `platform_common/platform_type.h` 出口类型；常用宏统一取自 `platform_common/platform_def.h`。禁止自造等价类型、错误码或宏。

## 反例（禁止）

- 在具体对象字段里直接放 HAL 句柄、RTOS 句柄或厂商类型（如 `I2C_HandleTypeDef`、`GPIO_TypeDef`、`TaskHandle_t`）——须通过 `ctx` 持有 `void *` 隔离上下文。
- `cfg` 声明为非常量——静态配置应 `const`。
- `ops` 函数指针签名与对象/纯能力 Ops 约定不一致（对象 Ops 首参非具体对象指针，或纯能力 Ops 未说明 `void *context` 的所有权与生命周期）。
- 把 `base` 放在非首字段——破坏偏移 0 与向上转型假设。
- 服务对象重复声明 `cfg / ctx / data / ops` 四槽——`platform_service_t` 已内嵌，重复声明造成歧义。
- 头文件 guard 用双下划线前缀（`__XXX_H__`）——双下划线保留给编译器，用 `XXX_H`（如 `PLATFORM_IMU_MODEL_H`）。
- ctx/data 误用指针（旧形态）——新代码一律内联（ADR-013）；存量指针形态代码可保留运行，迁移按需进行。

## 边界与判定标准（Platform 生成产物为 MUST）

对 Platform 层生成产物（含 platform_bsp / platform_mcu / platform_os / platform_middleware 的模型头与接口文件），本模板是**必须遵守**的规范，不是可选项；BSP 不再生成 Wrapper 文件。

### 判定标准

1. **必须套四元组**：任何定义了「承载平台身份的 struct」（结构体首字段为 `platform_device_t` 或 `platform_service_t`，或包含对象身份 / 生命周期管理字段）→ `base` 必须为首字段，随后补齐 `cfg` / `ctx` / `data` / `ops` 四槽（`platform_service_t` 已内嵌四槽，直接复用、不重复声明）。
2. **布局**：`cfg` / `ops` = const 指针；`ctx` / `data` = 内联值（device 形态）。service 复用 `platform_service_t` 指针槽。
3. **豁免（须显式声明）**：仅当类型是**纯粹行为函数表**——只含 `pf_*` 函数指针与 `p_context` / `backend_context` 上下文，不含任何身份或生命周期字段——才可豁免四元组。豁免必须在头文件注释中显式声明「纯转发、不承载对象身份」。
4. **禁止**用「纯接口」边界豁免一个已定义了设备对象 struct 的类型。

### 决策表

| 类型形态 | 是否套四元组 | 要求 |
| --- | --- | --- |
| 定义设备对象 struct（首字段 `platform_device_t` / `platform_service_t`） | 是（MUST） | `base` 首字段 + 补齐 `cfg` / `ctx` / `data` / `ops`（cfg/ops 指针、ctx/data 内联） |
| 仅纯粹行为函数表（`pf_*` + `p_context`，无身份/生命周期字段） | 否（豁免） | 头注释显式声明「纯转发、不承载对象身份」 |
| 非对象化的纯接口（如 `platform_i2c_t` ops 表 + `backend_context`） | 否（豁免） | 同上，须显式声明 |

示例：设备模型头（`platform_<type>_model.h`）内定义的设备 struct → 必须套四元组；纯 `platform_<type>_ops_t` 能力表若不承载身份，可按纯能力 Ops 规则豁免，但必须显式声明“纯转发、不承载对象身份”。模型头只含类型契约与 init 声明，具体绑定和协议实现交给 Impl。
