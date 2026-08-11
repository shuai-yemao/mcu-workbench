/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file platform_gpio.h
 *
 * @par dependencies
 * - platform_device.h
 * - platform_error.h
 * - platform_type.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief GPIO 能力设备契约。
 *
 * 一个 platform_gpio_device_t 表示一个可独立配置的引脚。引脚编号、方向、
 * 上下拉和电平使用 Platform 类型；端口对象、寄存器和板级极性只能由
 * Impl 通过 backend_context 绑定。
 *
 * @version V2.0 2026-08-11
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

#ifndef PLATFORM_GPIO_H
#define PLATFORM_GPIO_H

/* Includes ----------------------------------------------------------------- */

#include "platform_device.h"
#include "platform_error.h"
#include "platform_type.h"

/* Types -------------------------------------------------------------------- */

typedef struct platform_gpio_device platform_gpio_device_t;

/** @brief GPIO 引脚标识。 */
typedef struct
{
    uint32_t port; /**< 平台端口索引。 */
    uint32_t pin;  /**< 端口内引脚号。 */
} platform_gpio_pin_t;

/** @brief GPIO 方向。 */
typedef enum
{
    PLATFORM_GPIO_DIR_IN = 0,
    PLATFORM_GPIO_DIR_OUT = 1
} platform_gpio_dir_t;

/** @brief GPIO 上下拉。 */
typedef enum
{
    PLATFORM_GPIO_PULL_NONE = 0,
    PLATFORM_GPIO_PULL_UP = 1,
    PLATFORM_GPIO_PULL_DOWN = 2
} platform_gpio_pull_t;

/** @brief GPIO 电平。 */
typedef enum
{
    PLATFORM_GPIO_LEVEL_LOW = 0,
    PLATFORM_GPIO_LEVEL_HIGH = 1
} platform_gpio_level_t;

/** @brief GPIO 静态配置。 */
typedef struct
{
    platform_gpio_pin_t pin;
    platform_gpio_dir_t direction;
    platform_gpio_pull_t pull;
} platform_gpio_cfg_t;

/** @brief GPIO 实例运行上下文。 */
typedef struct
{
    void *backend_context; /**< 后端上下文，不透明且不归平台层解释。 */
    bool_t ready;           /**< 后端是否已完成启动。 */
} platform_gpio_ctx_t;

/** @brief GPIO 实例当前数据。 */
typedef struct
{
    platform_gpio_level_t level;
} platform_gpio_data_t;

/** @brief GPIO 行为表。 */
typedef struct
{
    platform_err_t (*set)(platform_gpio_device_t *p_dev,
                          platform_gpio_level_t level);
    platform_err_t (*get)(const platform_gpio_device_t *p_dev,
                          platform_gpio_level_t *p_level);
    platform_err_t (*toggle)(platform_gpio_device_t *p_dev);
} platform_gpio_ops_t;

/**
 * @brief GPIO 设备对象。
 *
 * base 必须是首字段；cfg/ops 为共享只读契约，ctx/data 为实例独有状态。
 */
struct platform_gpio_device
{
    platform_device_t base;
    const platform_gpio_cfg_t *cfg;
    platform_gpio_ctx_t ctx;
    platform_gpio_data_t data;
    const platform_gpio_ops_t *ops;
};

/* Functions ---------------------------------------------------------------- */

/**
 * @brief 初始化 GPIO 对象的公共身份和四元组绑定。
 *
 * GPIO 的方向和上下拉配置由生命周期 init 回调应用；set/get/toggle
 * 通过对象 ops 访问同一个引脚，不重复传递引脚身份。
 */
platform_err_t platform_gpio_init(platform_gpio_device_t *p_dev, const char *p_name,
                                  const platform_gpio_cfg_t *p_cfg,
                                  const platform_gpio_ops_t *p_ops,
                                  const platform_lifecycle_ops_t *p_lifecycle);

#endif /* PLATFORM_GPIO_H */
