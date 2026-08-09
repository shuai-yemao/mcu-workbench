/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file lesson09_demo.c
 *
 * @par dependencies
 * - led_device.h
 * - platform_object.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief 示范：四元组对象完整使用流程（host 冒烟，无硬件）。
 *
 * 演示：
 * 1. 注入 GPIO 写函数（模拟硬件后端，真实工程由 Impl 层提供）。
 * 2. 注入 ops 行为接口表（impl_bsp 的 Port 注入模式）。
 * 3. led_device_init() 绑定 base + cfg/ctx/data/ops。
 * 4. platform_object_is_valid() 身份双校验。
 * 5. led_set()/led_get() 走 ops → ctx 注入函数（极性换算生效）。
 * 6. 生命周期回调 start/stop 生效（真实工程由 manager 统一驱动）。
 *
 * 编译（host 冒烟）：
 * gcc -std=c11 -I00_Config \
 *     -I03_Platform/platform_common/core \
 *     -I03_Platform/platform_common/object \
 *     -I03_Platform/platform_common/diag \
 *     -I04_Impl/impl_board \
 *     -I00_Docs/lesson09_four_tuple_demo \
 *     00_Docs/lesson09_four_tuple_demo/lesson09_demo.c \
 *     00_Docs/lesson09_four_tuple_demo/led_device.c \
 *     03_Platform/platform_common/object/platform_object.c \
 *     -o /tmp/lesson09_demo && /tmp/lesson09_demo
 *
 * @version V1.0 2026-08-09
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

/* Includes ----------------------------------------------------------------- */

#include <stdio.h>
#include "led_device.h"

/* Private ------------------------------------------------------------------ */

/* 模拟 GPIO 后端：真实工程由 Impl 层提供（HAL_GPIO_WritePin 等）。 */
static void demo_gpio_write(void *backend, bool_t level)
{
    (void) backend;
    printf("  [GPIO] pin level -> %s\n", level ? "HIGH" : "LOW");
}

/* 注入的 ops 行为接口：pf_set 逻辑状态 → 物理电平（极性换算），再调 ctx 写函数。 */
static platform_err_t demo_ops_set(void *context, bool_t on)
{
    led_device_t *p_dev = (led_device_t *) context;
    bool_t level = p_dev->cfg->active_high ? on : (!on);

    p_dev->ctx->gpio_write(p_dev->ctx->p_gpio_backend, level);
    p_dev->ctx->physical_on = level;
    p_dev->data->on = on;
    p_dev->data->toggle_count++;

    return PLATFORM_ERR_OK;
}

static bool_t demo_ops_get(void *context)
{
    return ((led_device_t *) context)->data->on;
}

/* 注入的 ops 表。 */
static const led_ops_t s_demo_ops = {
    .pf_set = demo_ops_set,
    .pf_get = demo_ops_get
};

/* 实例与四元组存储。 */
static led_device_t    s_led;
static led_ctx_t       s_led_ctx;
static led_data_t      s_led_data;
static const led_cfg_t s_led_cfg = {
    .gpio_pin    = 13,        /* 示例引脚号。 */
    .active_high = PLATFORM_TRUE       /* 高电平点亮。 */
};

/* Functions ---------------------------------------------------------------- */

int main(void)
{
    printf("== lesson09: 四元组对象示范（LED）==\n\n");

    /* 1. 注入 GPIO 后端（硬件隔离在 ctx 的 void * 内）。 */
    s_led_ctx.p_gpio_backend = NULL;
    s_led_ctx.gpio_write     = demo_gpio_write;
    s_led_ctx.physical_on    = PLATFORM_FALSE;

    /* 2. 初始化：绑定 base 身份 + cfg/ctx/data/ops 四槽。 */
    platform_err_t err = led_device_init(&s_led, "led0", &s_led_cfg,
                                         &s_led_ctx, &s_led_data, &s_demo_ops);
    printf("led_device_init: %s\n", PLATFORM_IS_OK(err) ? "OK" : "FAIL");

    /* 3. 对象身份双校验（magic + type）。 */
    printf("platform_object_is_valid: %s\n",
           platform_object_is_valid(&s_led.base.object, PLATFORM_OBJECT_DEVICE)
               ? "true" : "false");

    /* 4. 生命周期回调：start 点亮（真实工程由 manager 驱动，此处直接演示）。 */
    printf("\n-- lifecycle start --\n");
    s_led.base.object.p_lifecycle->start(&s_led);
    printf("led_get: %s\n", led_get(&s_led) ? "ON" : "OFF");

    /* 5. 行为接口：set 翻转（走注入 ops → ctx 写函数）。 */
    printf("\n-- led_set --\n");
    led_set(&s_led, PLATFORM_FALSE);
    printf("led_get: %s\n", led_get(&s_led) ? "ON" : "OFF");
    led_set(&s_led, PLATFORM_TRUE);
    printf("led_get: %s\n", led_get(&s_led) ? "ON" : "OFF");
    printf("toggle_count: %u\n", (unsigned int) s_led_data.toggle_count);

    /* 6. 生命周期 stop 熄灭。 */
    printf("\n-- lifecycle stop --\n");
    s_led.base.object.p_lifecycle->stop(&s_led);
    printf("led_get: %s\n", led_get(&s_led) ? "ON" : "OFF");

    printf("\n== demo done ==\n");
    return 0;
}
