/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file led_device.c
 *
 * @par dependencies
 * - led_device.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief 示范：LED 设备实现（四元组 + 生命周期回调）。
 *
 * 演示要点：
 * 1. 生命周期回调统一签名 platform_err_t (*)(void *p_self)，p_self 向上转型。
 * 2. 初始化失败回滚（不保留半初始化状态）。
 * 3. 硬件 GPIO 写操作通过 ctx 注入的函数指针完成，设备层不碰 HAL。
 * 4. ops 行为接口表由使用方注入（impl_bsp 的 Port 注入模式），
 *    本模块只负责对象身份、四元组绑定与生命周期回调。
 *
 * @version V1.0 2026-08-09
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

/* Includes ----------------------------------------------------------------- */

#include "led_device.h"

/* Private functions -------------------------------------------------------- */

/* 生命周期回调：init —— 幂等，失败回滚，不保留旧 ready 状态。 */
static platform_err_t led_lifecycle_init(void *p_self)
{
    led_device_t *p_dev = (led_device_t *) p_self;

    if ((p_dev == NULL) || (p_dev->cfg == NULL) || (p_dev->ctx == NULL) ||
        (p_dev->data == NULL) || (p_dev->ops == NULL))
    {
        return PLATFORM_ERR_PARAM;
    }

    /* 初始熄灭：按极性写物理电平。 */
    p_dev->ctx->gpio_write(p_dev->ctx->p_gpio_backend,
                           p_dev->cfg->active_high ? PLATFORM_FALSE : PLATFORM_TRUE);
    p_dev->ctx->physical_on = PLATFORM_FALSE;
    p_dev->data->on = PLATFORM_FALSE;
    p_dev->data->toggle_count = 0u;

    return PLATFORM_ERR_OK;
}

/* 生命周期回调：start —— 点亮 LED，表示设备就绪。 */
static platform_err_t led_lifecycle_start(void *p_self)
{
    return led_set((led_device_t *) p_self, PLATFORM_TRUE);
}

/* 生命周期回调：stop —— 熄灭 LED。 */
static platform_err_t led_lifecycle_stop(void *p_self)
{
    return led_set((led_device_t *) p_self, PLATFORM_FALSE);
}

/* 生命周期回调：deinit —— 熄灭并复位数据（可重复调用）。 */
static platform_err_t led_lifecycle_deinit(void *p_self)
{
    led_device_t *p_dev = (led_device_t *) p_self;

    if (p_dev == NULL)
    {
        return PLATFORM_ERR_PARAM;
    }

    if (p_dev->ctx != NULL)
    {
        p_dev->ctx->gpio_write(p_dev->ctx->p_gpio_backend,
                               p_dev->cfg->active_high ? PLATFORM_FALSE : PLATFORM_TRUE);
        p_dev->ctx->physical_on = PLATFORM_FALSE;
    }
    p_dev->data->on = PLATFORM_FALSE;
    p_dev->data->toggle_count = 0u;

    return PLATFORM_ERR_OK;
}

/* 生命周期回调表：process/sleep/wakeup 本设备无需求，置空。 */
static const platform_lifecycle_ops_t s_led_lifecycle = {
    .init    = led_lifecycle_init,
    .start   = led_lifecycle_start,
    .process = NULL,
    .stop    = led_lifecycle_stop,
    .sleep   = NULL,
    .wakeup  = NULL,
    .deinit  = led_lifecycle_deinit
};

/* Functions ---------------------------------------------------------------- */

platform_err_t led_device_init(led_device_t *p_dev, const char *p_name,
                               const led_cfg_t *p_cfg, led_ctx_t *p_ctx,
                               led_data_t *p_data, const led_ops_t *p_ops)
{
    if ((p_dev == NULL) || (p_name == NULL) || (p_cfg == NULL) ||
        (p_ctx == NULL) || (p_data == NULL) || (p_ops == NULL))
    {
        return PLATFORM_ERR_PARAM;
    }

    /* 绑定四元组四槽。 */
    p_dev->cfg  = p_cfg;
    p_dev->ctx  = p_ctx;
    p_dev->data = p_data;
    p_dev->ops  = p_ops;

    /* 初始化 base 身份：object 身份证 + dev_class + caps（WRITE | CONTROL）。 */
    platform_err_t err = platform_device_init(&p_dev->base, p_name,
                                              PLATFORM_DEVICE_CLASS_BACKLIGHT,
                                              (uint32_t) (PLATFORM_DEVICE_CAP_WRITE |
                                                          PLATFORM_DEVICE_CAP_CONTROL),
                                              p_dev, &s_led_lifecycle);
    if (PLATFORM_IS_ERR(err))
    {
        return err;
    }

    return PLATFORM_ERR_OK;
}

platform_err_t led_set(led_device_t *p_dev, bool_t on)
{
    if (p_dev == NULL)
    {
        return PLATFORM_ERR_PARAM;
    }

    /* 对象身份 + 类型双校验：magic 防野指针，type 防错类型。 */
    if (!platform_object_is_valid(&p_dev->base.object, PLATFORM_OBJECT_DEVICE))
    {
        return PLATFORM_ERR_NOT_INITIALIZED;
    }

    /* 行为经 ops 表转发，最终由 ctx 注入的 GPIO 写函数完成（硬件隔离）。 */
    return p_dev->ops->pf_set(p_dev, on);
}

bool_t led_get(const led_device_t *p_dev)
{
    if ((p_dev == NULL) || (p_dev->ops == NULL) || (p_dev->data == NULL))
    {
        return PLATFORM_FALSE;
    }
    return p_dev->ops->pf_get((void *) p_dev);
}
