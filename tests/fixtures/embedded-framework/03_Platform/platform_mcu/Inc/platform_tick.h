/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file platform_tick.h
 *
 * @par dependencies
 * - platform_device.h
 * - platform_error.h
 * - platform_type.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief 系统时间基准设备契约。
 *
 * 本文件只定义平台能力，不绑定具体芯片、寄存器或操作系统。时间基准
 * 以 platform_device_t 为对象身份，使用 platform_common 的生命周期回调
 * 统一管理初始化、启动、停止和释放。
 *
 * @version V2.0 2026-08-11
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

#ifndef PLATFORM_TICK_H
#define PLATFORM_TICK_H

/* Includes ----------------------------------------------------------------- */

#include "platform_device.h"
#include "platform_error.h"
#include "platform_type.h"

/* Types -------------------------------------------------------------------- */

typedef struct platform_tick_device platform_tick_device_t;

/** @brief 时间基准静态配置。 */
typedef struct
{
    uint32_t period_ms; /**< 基础节拍周期，当前契约要求为 1 ms。 */
} platform_tick_cfg_t;

/** @brief 时间基准实例运行上下文。 */
typedef struct
{
    void *backend_context; /**< 后端上下文，不透明且不归平台层解释。 */
    bool_t ready;           /**< 后端是否已完成启动。 */
} platform_tick_ctx_t;

/** @brief 时间基准实例当前数据。 */
typedef struct
{
    uint32_t elapsed_ms; /**< 自启动以来的毫秒计数，允许自然回绕。 */
} platform_tick_data_t;

/**
 * @brief 时间基准行为表。
 *
 * 这是对象模型 ops，不是全局状态入口；调用者必须传入已经通过
 * platform_tick_init() 建立身份的对象。
 */
typedef struct
{
    platform_err_t (*get_ms)(const platform_tick_device_t *p_dev,
                             uint32_t *p_elapsed_ms);
} platform_tick_ops_t;

/**
 * @brief 时间基准设备对象。
 *
 * base 必须是首字段，以保证 platform_common 的对象身份校验和生命周期
 * 管理可以向上转换；cfg/ops 为共享只读契约，ctx/data 为实例独有状态。
 */
struct platform_tick_device
{
    platform_device_t base;
    const platform_tick_cfg_t *cfg;
    platform_tick_ctx_t ctx;
    platform_tick_data_t data;
    const platform_tick_ops_t *ops;
};

/* Functions ---------------------------------------------------------------- */

/**
 * @brief 初始化时间基准对象的公共身份和四元组绑定。
 *
 * 该函数是对象构造入口；硬件初始化、启动和释放由 p_lifecycle 回调表
 * 提供，不在 Platform 公共头中暴露具体后端类型。
 */
platform_err_t platform_tick_init(platform_tick_device_t *p_dev, const char *p_name,
                                  const platform_tick_cfg_t *p_cfg,
                                  const platform_tick_ops_t *p_ops,
                                  const platform_lifecycle_ops_t *p_lifecycle);

#endif /* PLATFORM_TICK_H */
