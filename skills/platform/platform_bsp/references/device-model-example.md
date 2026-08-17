# 设备能力头样例（platform_<type>.h）

> v1.1（2026-08-15）| 依据：当前工程 `03_Platform/platform_bsp` 的 Model 产出、四元组模板 v2、platform_bsp 输出契约
> 来源：吸收 `watch_device.h`（EC-S100 手表设备模型）实例形态，按插件规范对齐。

## 完整样例：platform_imu.h

```c
/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file platform_imu.h
 *
 * @par dependencies
 * - platform_type.h
 * - platform_device.h
 * - platform_lifecycle.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief IMU 设备能力：cfg/ctx/data/ops 类型契约 + 设备对象 struct。
 *
 * 能力头只定义"设备长什么样"（类型契约，芯片无关，接口永不改）；
 * Platform 源文件只完成公共对象初始化；硬件绑定、器件协议和注册装配由 Impl/组合根负责。
 *
 * 布局规则：cfg/ops = const 指针（共享），ctx/data = 内联值（独有）。
 *
 * @version V2.0 2026-08-10
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

#ifndef __PLATFORM_IMU_H__
#define __PLATFORM_IMU_H__

/* Includes ----------------------------------------------------------------- */

#include "platform_type.h"
#include "platform_device.h"
#include "platform_lifecycle.h"

/* Declaring ---------------------------------------------------------------- */

typedef struct imu_device imu_device_t;   /* 前向声明：供 ops 首参使用 */

/* ---- 配置（静态，const 指针共享） ---- */
typedef struct
{
    uint8_t bus_id;
    uint8_t irq_id;
    uint32_t sample_period_ms;
    uint8_t fifo_enable;
} imu_cfg_t;

/* ---- 运行上下文（内联值，实例独有） ---- */
typedef struct
{
    uint8_t initialized;
    uint8_t data_ready;
    uint32_t last_sample_ms;
    uint32_t error_count;
} imu_ctx_t;

/* ---- 当前数据（内联值，实例独有） ---- */
typedef struct
{
    int16_t x_mg;
    int16_t y_mg;
    int16_t z_mg;
    uint32_t timestamp_ms;
    uint8_t valid;
} imu_data_t;

/* ---- 行为接口表（模型 ops：首参具体设备指针，Service 类型安全调用） ---- */
typedef struct
{
    platform_err_t (*read)(imu_device_t *p_dev, imu_data_t *p_out);
    platform_err_t (*read_raw)(imu_device_t *p_dev, uint8_t **p_out);
    platform_err_t (*read_done)(imu_device_t *p_dev);
    platform_err_t (*sleep)(imu_device_t *p_dev);
    platform_err_t (*wakeup)(imu_device_t *p_dev);
} imu_ops_t;

/* ---- 设备对象：base 身份 + 四元组（base 首字段，偏移 0） ---- */
struct imu_device
{
    platform_device_t base;       /* 首字段：身份证 */
    const imu_cfg_t *cfg;         /* 共享：const 指针 */
    imu_ctx_t ctx;                /* 独有：内联值 */
    imu_data_t data;              /* 独有：内联值 */
    const imu_ops_t *ops;         /* 共享：const 指针 */
};

/* ---- 厂商型号别名（可选约定）：上层用通用名，换芯片只改这里 ---- */
typedef imu_cfg_t mpu6050_cfg_t;
typedef imu_data_t mpu6050_data_t;

/* ---- 能力初始化（声明；实现放 platform_imu.c） ---- */
platform_err_t platform_imu_init(imu_device_t *p_dev, const char *p_name,
                                 const imu_cfg_t *p_cfg,
                                 const platform_lifecycle_ops_t *p_lifecycle);

#endif /* __PLATFORM_IMU_H__ */
```

## 与原始实例（watch_device.h）的差异处理

| 原始实例 | 优化后 | 说明 |
|---|---|---|
| `__WATCH_DEVICE_H__` | `__PLATFORM_IMU_H__` | guard 统一使用前后双下划线 |
| ctx/data 内联值 | 保留内联 | 布局规则确认（ADR-013） |
| ops 首参具体类型 | 保留 | Model Ops 保持类型安全 |
| ops 裸名 | 保留裸名 | 模型 Ops 首参为具体设备指针，保持类型安全 |
| 类型间接传递 | 显式 include `platform_type.h` | 依赖链清晰 |
| 注释分区 `//**** //` | `/* --- */` | 插件规范 |
| 纯模型无 init | 补 `platform_imu_init` 声明 | 模型头含初始化入口（实现分离） |
| 聚合 4 设备 | 单设备模型头 | 生成契约单设备独立演进（聚合仅课程样例） |

## 与 Impl/组合根的衔接

```text
platform_imu.h（类型契约：四件套 + 设备 struct + init 声明）
        ↓ platform_imu.c（公共对象初始化）
Impl/组合根绑定 typed Ops、板级资源和生命周期
        ↓
manager 注册 → 生命周期驱动
```

- **模型 ops**（`imu_ops_t`）：Service 层直接调用，首参 `imu_device_t *`，零 cast。
- **Impl 绑定**：由组合根把已确认的 Driver/Handler、板级资源和生命周期 Ops 直接装配到模型对象；Model 不保存协议状态机和业务缓存。

## 生成自检要点（对齐本样例）

- [ ] guard = `__PLATFORM_<TYPE>_H__`（前后双下划线）
- [ ] 四件套命名 `<type>_cfg_t/<ctx>/<data>/<ops>`
- [ ] `cfg`/`ops` = const 指针；`ctx`/`data` = 内联值
- [ ] `base` 首字段（偏移 0），设备 struct 名 `<type>_device_t`
- [ ] 零芯片/HAL/Vendor 依赖（显式 include `platform_type.h`）
- [ ] 模型 ops 首参具体设备指针、裸名；没有额外 BSP Wrapper 转发表
- [ ] 注释遵循 `style-profile.md`（文件头、公开 API、必要约束和源文件分区）
