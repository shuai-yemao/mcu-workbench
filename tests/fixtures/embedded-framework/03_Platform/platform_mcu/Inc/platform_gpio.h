/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file platform_gpio.h
 *
 * @par dependencies
 * - platform_type.h
 * - platform_error.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief GPIO 能力接口（平台契约，零芯片依赖）。
 *
 * 统一 GPIO 语义：引脚标识、方向、上下拉、电平全部平台无关枚举，
 * 上层经本接口操作引脚，不触碰 HAL/寄存器。
 *
 * 引脚标识约定：
 * - platform_gpio_pin_t.port：平台无关端口索引（0 起），目标端映射
 *   到具体端口（0=GPIOA、1=GPIOB、…，映射由目标端实现定义）。
 * - platform_gpio_pin_t.pin ：端口内引脚号（0..15）。
 *
 * 第一版最小能力：输出（set/toggle）、输入（get）、方向+上下拉配置
 * （init）。速度/开漏/复用等扩展项按需后补。
 *
 * 实现落地：04_Impl/impl_mcu/impl_gpio.c（符号实现，链接期注入）。
 *
 * @version V1.0 2026-08-10
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

#ifndef PLATFORM_GPIO_H
#define PLATFORM_GPIO_H

/* Includes ----------------------------------------------------------------- */

#include "platform_type.h"
#include "platform_error.h"

/* Types -------------------------------------------------------------------- */

/**
 * @brief 引脚标识（平台无关）。
 *
 * @note port 为平台端口索引（0 起），pin 为端口内引脚号（0..15）；
 *       具体端口映射由目标端实现定义，本接口不暴露芯片符号。
 */
typedef struct
{
    uint32_t port; /**< 端口索引（0 起）。 */
    uint32_t pin;  /**< 引脚号（0..15）。  */
} platform_gpio_pin_t;

/**
 * @brief 引脚方向。
 */
typedef enum
{
    PLATFORM_GPIO_DIR_IN = 0,  /**< 输入。 */
    PLATFORM_GPIO_DIR_OUT = 1, /**< 输出。 */
} platform_gpio_dir_t;

/**
 * @brief 上下拉配置。
 */
typedef enum
{
    PLATFORM_GPIO_PULL_NONE = 0, /**< 无上下拉。 */
    PLATFORM_GPIO_PULL_UP = 1,   /**< 上拉。     */
    PLATFORM_GPIO_PULL_DOWN = 2, /**< 下拉。     */
} platform_gpio_pull_t;

/**
 * @brief 电平值。
 */
typedef enum
{
    PLATFORM_GPIO_LEVEL_LOW = 0,  /**< 低电平。 */
    PLATFORM_GPIO_LEVEL_HIGH = 1, /**< 高电平。 */
} platform_gpio_level_t;

/* Functions ---------------------------------------------------------------- */

/**
 * @brief 配置引脚方向与上下拉（可重复调用）。
 *
 * @param[in] p_pin : 引脚标识。
 * @param[in] dir   : 方向（输入/输出）。
 * @param[in] pull  : 上下拉（输出模式下通常 PLATFORM_GPIO_PULL_NONE）。
 *
 * @retval PLATFORM_ERR_OK        : 配置成功。
 * @retval PLATFORM_ERR_PARAM     : 引脚/方向参数无效。
 * @retval 其他 platform_err_t    : 目标端错误。
 */
platform_err_t platform_gpio_init(const platform_gpio_pin_t *p_pin, platform_gpio_dir_t dir,
                                  platform_gpio_pull_t pull);

/**
 * @brief 输出电平（引脚须已配置为输出）。
 *
 * @param[in] p_pin : 引脚标识。
 * @param[in] level : 目标电平。
 */
void platform_gpio_set(const platform_gpio_pin_t *p_pin, platform_gpio_level_t level);

/**
 * @brief 读取引脚电平（输入/输出均可读）。
 *
 * @param[in] p_pin : 引脚标识。
 *
 * @return 当前电平。
 */
platform_gpio_level_t platform_gpio_get(const platform_gpio_pin_t *p_pin);

/**
 * @brief 翻转引脚输出电平（引脚须已配置为输出）。
 *
 * @param[in] p_pin : 引脚标识。
 */
void platform_gpio_toggle(const platform_gpio_pin_t *p_pin);

#endif /* PLATFORM_GPIO_H */
