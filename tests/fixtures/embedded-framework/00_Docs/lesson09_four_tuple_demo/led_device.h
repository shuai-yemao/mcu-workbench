/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file led_device.h
 *
 * @par dependencies
 * - platform_device.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief 示范：LED 设备（四元组模板完整实例）。
 *
 * 演示 platform_device_t 作为 base，补齐 cfg / ctx / data / ops 四槽：
 *
 * - base：platform_device_t（object 身份证 + dev_class + caps）
 * - cfg ：引脚号、极性（静态配置，const）
 * - ctx ：GPIO 后端句柄与写函数（硬件隔离在 void * 内）
 * - data：当前逻辑状态（on/off）
 * - ops ：pf_set / pf_get 行为接口表（首参 void *context）
 *
 * @version V1.0 2026-08-09
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

#ifndef __LED_DEVICE_H__
#define __LED_DEVICE_H__

/* Includes ----------------------------------------------------------------- */

#include "platform_def.h"
#include "platform_device.h"

/* Declaring ---------------------------------------------------------------- */

/**
 * @brief LED 静态配置（cfg 槽）。
 */
typedef struct
{
    int32_t gpio_pin;      /**< GPIO 引脚号（示例编号）。 */
    bool_t active_high;    /**< true = 高电平点亮，false = 低电平点亮。 */
} led_cfg_t;

/**
 * @brief LED 运行上下文（ctx 槽）。
 *
 * 硬件细节全部隔离在此：GPIO 后端句柄用 void * 持有，
 * 写函数由外部注入（Impl 层提供真实 GPIO 实现）。
 */
typedef struct
{
    void *p_gpio_backend;                          /**< GPIO 后端句柄（void * 隔离）。 */
    void (*gpio_write)(void *backend, bool_t level); /**< 注入的 GPIO 写函数。 */
    bool_t physical_on;                            /**< 当前物理电平状态。 */
} led_ctx_t;

/**
 * @brief LED 当前数据（data 槽）。
 */
typedef struct
{
    bool_t on;    /**< 当前逻辑状态：true = 点亮。 */
    uint32_t toggle_count;    /**< 翻转次数（运行统计）。 */
} led_data_t;

/**
 * @brief LED 行为接口表（ops 槽）。
 */
typedef struct
{
    platform_err_t (*pf_set)(void *context, bool_t on);    /**< 设置逻辑状态。 */
    bool_t (*pf_get)(void *context);                       /**< 读取逻辑状态。 */
} led_ops_t;

/**
 * @brief 具体 LED 设备对象：base 身份 + 四元组四槽（device 须补齐）。
 */
typedef struct
{
    platform_device_t base;    /**< 首字段：对象身份 + dev_class + caps。 */
    const led_cfg_t  *cfg;     /**< 静态配置。 */
    led_ctx_t        *ctx;     /**< 运行上下文。 */
    led_data_t       *data;    /**< 当前数据。 */
    const led_ops_t  *ops;     /**< 行为接口表。 */
} led_device_t;

/**
 * @brief 初始化 LED 设备：绑定 base 身份 + 四元组四槽 + 生命周期表。
 *
 * @param[in] p_dev  : LED 设备对象。
 * @param[in] p_name : 设备名称（如 "led0"）。
 * @param[in] p_cfg  : 静态配置。
 * @param[in] p_ctx  : 运行上下文（含注入的 GPIO 后端）。
 * @param[in] p_data : 当前数据。
 * @param[in] p_ops  : 行为接口表。
 *
 * @retval PLATFORM_ERR_OK      : 初始化成功。
 * @retval 其他 platform_err_t  : 初始化失败。
 */
platform_err_t led_device_init(led_device_t *p_dev, const char *p_name,
                               const led_cfg_t *p_cfg, led_ctx_t *p_ctx,
                               led_data_t *p_data, const led_ops_t *p_ops);

/**
 * @brief 设置 LED 逻辑状态（走 ops 行为接口，最终落到注入的 GPIO 写函数）。
 *
 * @param[in] p_dev : LED 设备对象。
 * @param[in] on    : PLATFORM_TRUE = 点亮，false = 熄灭。
 *
 * @retval PLATFORM_ERR_OK      : 设置成功。
 * @retval PLATFORM_ERR_PARAM   : 参数非法。
 */
platform_err_t led_set(led_device_t *p_dev, bool_t on);

/**
 * @brief 读取 LED 当前逻辑状态。
 *
 * @param[in] p_dev : LED 设备对象。
 *
 * @return 当前逻辑状态；对象非法返回 false。
 */
bool_t led_get(const led_device_t *p_dev);

#endif /* __LED_DEVICE_H__ */
