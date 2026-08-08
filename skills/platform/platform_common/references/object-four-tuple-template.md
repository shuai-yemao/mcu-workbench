# 对象四元组模板（base + cfg / ctx / data / ops）

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

| 成员 | 含义 | 类型约定 |
| --- | --- | --- |
| `base` | 对象身份与生命周期（首字段） | `platform_device_t` 或 `platform_service_t` |
| `cfg` | 静态配置，编译期/启动期固定 | `const xxx_cfg_t *` |
| `ctx` | 运行时上下文（状态机、锁、缓冲句柄） | `xxx_ctx_t *` |
| `data` | 当前数据（最近测量/输出值） | `xxx_data_t *` |
| `ops` | 行为接口表 | `const xxx_ops_t *`（`pf_*`，首参 `void *context`） |

## base 选择规则

- 对象属于**硬件/板级能力**（有 `dev_class`、`caps`、物理能力，如 display/touch/imu/led）→ base 用 `platform_device_t`。
- 对象属于**可复用服务能力 / 策略编排**（`service_class`，如 sensor 融合、battery 估算、OTA）→ base 用 `platform_service_t`。
- `platform_service_t` 已内嵌 `cfg / ctx / data / ops` 四槽，具体服务对象直接复用、**不重复声明**四槽。
- `platform_device_t` 未内嵌四元组，具体设备对象须在 `base` 之后**补齐** `cfg / ctx / data / ops` 四槽，使四元组形态与 `platform_service_t` 对齐。

## 首字段约束

`base` **必须作为结构体首字段**，保证 `platform_object_t` 位于偏移 0，从而支持 C 风格向上转型（`platform_device_t *` / `platform_service_t *` 与具体对象指针互换）与 `platform_object_is_valid()` 的 magic + type 校验。

## 设备对象模板

```c
/* 具体设备对象：base 身份 + 四元组槽（platform_device_t 未内嵌四元组，须补齐） */
typedef struct
{
    platform_device_t base;        /* 首字段：object 身份 + dev_class + caps */
    const dev_cfg_t  *cfg;         /* 静态配置 */
    dev_ctx_t        *ctx;         /* 运行上下文 */
    dev_data_t       *data;        /* 当前数据 */
    const dev_ops_t  *ops;         /* 行为接口表（pf_*，首参 void *context） */
} dev_t;
```

```c
/* 初始化：先初始化 base 身份，再绑定四元组槽 */
platform_err_t dev_init(dev_t *p_dev, const char *p_name, const dev_cfg_t *p_cfg)
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

    p_dev->cfg  = p_cfg;
    p_dev->ctx  = &s_dev_ctx;
    p_dev->data = &s_dev_data;
    p_dev->ops  = &s_dev_ops;
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

## 统一约定来源

错误码统一使用 `platform_common/platform_error.h` 的 `platform_err_t` 枚举（`PLATFORM_ERR_*`），跨层判定用 `PLATFORM_IS_ERR` / `PLATFORM_IS_OK`；数据类型统一使用 `platform_common/platform_type.h` 出口类型；常用宏统一取自 `platform_common/platform_def.h`。禁止自造等价类型、错误码或宏。

## 反例（禁止）

- 在具体对象字段里直接放 HAL 句柄、RTOS 句柄或厂商类型（如 `I2C_HandleTypeDef`、`GPIO_TypeDef`、`TaskHandle_t`）——须通过 `ctx` 持有 `void *` 隔离上下文。
- `cfg` 声明为非常量——静态配置应 `const`。
- `ops` 函数指针签名与 `pf_*` 约定不一致（首参非 `void *context`）——`ops` 表应沿用 Platform 层函数表约定。
- 把 `base` 放在非首字段——破坏偏移 0 与向上转型假设。
- 服务对象重复声明 `cfg / ctx / data / ops` 四槽——`platform_service_t` 已内嵌，重复声明造成歧义。

## 边界与判定标准（Platform 生成产物为 MUST）

对 Platform 层生成产物（含 platform_bsp / platform_mcu / platform_os / platform_middleware 的 wrapper 与接口文件），本模板是**必须遵守**的规范，不是可选项。

### 判定标准

1. **必须套四元组**：任何定义了「承载平台身份的 struct」（结构体首字段为 `platform_device_t` 或 `platform_service_t`，或包含对象身份 / 生命周期管理字段）→ `base` 必须为首字段，随后补齐 `cfg` / `ctx` / `data` / `ops` 四槽（`platform_service_t` 已内嵌四槽，直接复用、不重复声明）。
2. **豁免（须显式声明）**：仅当类型是**纯粹行为函数表**——只含 `pf_*` 函数指针与 `p_context` / `backend_context` 上下文，不含任何身份或生命周期字段——才可豁免四元组。豁免必须在头文件注释中显式声明「纯转发、不承载对象身份」。
3. **禁止**用「纯接口」边界豁免一个已定义了设备对象 struct 的类型。

### 决策表

| 类型形态 | 是否套四元组 | 要求 |
| --- | --- | --- |
| 定义设备对象 struct（首字段 `platform_device_t` / `platform_service_t`） | 是（MUST） | `base` 首字段 + 补齐 `cfg` / `ctx` / `data` / `ops` 四槽 |
| 仅纯粹行为函数表（`pf_*` + `p_context`，无身份/生命周期字段） | 否（豁免） | 头注释显式声明「纯转发、不承载对象身份」 |
| 非对象化的纯接口（如 `platform_i2c_t` ops 表 + `backend_context`） | 否（豁免） | 同上，须显式声明 |

示例：wrapper 若定义 `platform_led_t`（首字段 `platform_device_t`）→ 必须套四元组；wrapper 仅提供 `platform_led_ops_t` 转发表 → 豁免但须显式声明。
