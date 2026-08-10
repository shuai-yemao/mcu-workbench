/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file impl_gpio.c
 *
 * @par dependencies
 * - platform_gpio.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief GPIO 的目标端实现（STM32F411 寄存器直操）。
 *
 * 处理流程：
 *
 * 1. platform_gpio_init()：使能端口时钟（RCC_AHB1ENR），配置 MODER
 *    （方向）与 PUPDR（上下拉）。
 * 2. platform_gpio_set()：BSRR 置位/复位引脚。
 * 3. platform_gpio_get()：读 IDR 电平。
 * 4. platform_gpio_toggle()：读 ODR 电平取反后写 BSRR。
 *
 * 端口映射：port 0..7 → GPIOA..GPIOH（STM32F411 共 8 端口）。
 *
 * @note 寄存器基址/位定义自包含（数据手册值），不依赖 HAL/CMSIS 头
 *       （D7：Vendor 源码不复制进工程）。
 * @note 本文件不配置 GPIO 速度（OSPEEDR）/开漏（OTYPER）——第一版
 *       输出默认推挽、默认速度；需要时经 platform_gpio.h 扩展。
 *
 * @version V1.0 2026-08-10
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

/* Includes ----------------------------------------------------------------- */

#include "platform_gpio.h"
#include "platform_def.h"

#include <stdint.h>

#if defined(STM32F411xE)

/* Defines ------------------------------------------------------------------ */

/* RCC（复位与时钟控制）。 */
#define RCC_BASE_ADDR     (0x40023800UL)
#define RCC_AHB1ENR_OFF   (0x30UL) /* AHB1 外设时钟使能。 */
#define GPIOA_CLK_BIT     (0UL)    /* GPIOAEN：GPIOA 时钟位。 */

/* GPIO 外设：端口基址按 0x400 步进（GPIOA 0x40020000 … GPIOH 0x40021C00）。 */
#define GPIOA_BASE        (0x40020000UL)
#define GPIO_PORT_STRIDE  (0x400UL)
#define GPIO_PORT_MAX     (8UL) /* 0..7 = GPIOA..GPIOH。 */

/* 端口内寄存器偏移。 */
#define GPIO_MODER_OFF    (0x00UL) /* 模式：每引脚 2 位。 */
#define GPIO_PUPDR_OFF    (0x0CUL) /* 上下拉：每引脚 2 位。 */
#define GPIO_IDR_OFF      (0x10UL) /* 输入数据。 */
#define GPIO_ODR_OFF      (0x14UL) /* 输出数据。 */
#define GPIO_BSRR_OFF     (0x18UL) /* 置位/复位（低 16 置位、高 16 复位）。 */

#define GPIO_PIN_MAX      (16UL)

/* MODER 编码（每引脚 2 位）。 */
#define GPIO_MODER_IN     (0UL)
#define GPIO_MODER_OUT    (1UL)

/* PUPDR 编码（每引脚 2 位）。 */
#define GPIO_PUPDR_NONE   (0UL)
#define GPIO_PUPDR_UP     (1UL)
#define GPIO_PUPDR_DOWN   (2UL)

/* Functions ---------------------------------------------------------------- */

/**
 * @brief 端口索引 → 端口基址。
 *
 * @return 端口基址（uintptr_t，避免 32 位地址在 host 64 位下转换告警）。
 */
static uintptr_t s_port_base(uint32_t port)
{
    return (uintptr_t) (GPIOA_BASE + (port * GPIO_PORT_STRIDE));
}

/**
 * @brief 配置引脚方向与上下拉。
 */
platform_err_t platform_gpio_init(const platform_gpio_pin_t *p_pin, platform_gpio_dir_t dir,
                                  platform_gpio_pull_t pull)
{
    volatile uint32_t *p_ahb1enr;
    volatile uint32_t *p_moder;
    volatile uint32_t *p_pupdr;
    uint32_t bit_shift;

    if ((p_pin == NULL) || (p_pin->port >= GPIO_PORT_MAX) || (p_pin->pin >= GPIO_PIN_MAX))
    {
        return PLATFORM_ERR_PARAM;
    }

    /* 使能端口时钟。 */
    p_ahb1enr = (volatile uint32_t *) (RCC_BASE_ADDR + RCC_AHB1ENR_OFF);
    *p_ahb1enr |= (1UL << (GPIOA_CLK_BIT + p_pin->port));

    /* MODER：清该引脚 2 位后按方向写入。 */
    p_moder = (volatile uint32_t *) (s_port_base(p_pin->port) + GPIO_MODER_OFF);
    bit_shift = p_pin->pin * 2u;
    *p_moder &= ~(3UL << bit_shift);
    *p_moder |= (uint32_t) ((dir == PLATFORM_GPIO_DIR_OUT) ? GPIO_MODER_OUT : GPIO_MODER_IN)
                << bit_shift;

    /* PUPDR：清该引脚 2 位后按上下拉写入（输出模式通常 NONE）。 */
    p_pupdr = (volatile uint32_t *) (s_port_base(p_pin->port) + GPIO_PUPDR_OFF);
    *p_pupdr &= ~(3UL << bit_shift);
    if (pull == PLATFORM_GPIO_PULL_UP)
    {
        *p_pupdr |= (GPIO_PUPDR_UP << bit_shift);
    }
    else if (pull == PLATFORM_GPIO_PULL_DOWN)
    {
        *p_pupdr |= (GPIO_PUPDR_DOWN << bit_shift);
    }

    return PLATFORM_ERR_OK;
}

/**
 * @brief 输出电平。
 */
void platform_gpio_set(const platform_gpio_pin_t *p_pin, platform_gpio_level_t level)
{
    volatile uint32_t *p_bsrr =
        (volatile uint32_t *) (s_port_base(p_pin->port) + GPIO_BSRR_OFF);

    if (level == PLATFORM_GPIO_LEVEL_HIGH)
    {
        *p_bsrr = (1UL << p_pin->pin);            /* 置位。 */
    }
    else
    {
        *p_bsrr = (1UL << (p_pin->pin + GPIO_PIN_MAX)); /* 复位。 */
    }
}

/**
 * @brief 读取引脚电平。
 */
platform_gpio_level_t platform_gpio_get(const platform_gpio_pin_t *p_pin)
{
    volatile uint32_t *p_idr =
        (volatile uint32_t *) (s_port_base(p_pin->port) + GPIO_IDR_OFF);

    return (((*p_idr >> p_pin->pin) & 1UL) != 0UL) ? PLATFORM_GPIO_LEVEL_HIGH
                                                   : PLATFORM_GPIO_LEVEL_LOW;
}

/**
 * @brief 翻转引脚输出电平。
 */
void platform_gpio_toggle(const platform_gpio_pin_t *p_pin)
{
    volatile uint32_t *p_odr =
        (volatile uint32_t *) (s_port_base(p_pin->port) + GPIO_ODR_OFF);
    volatile uint32_t *p_bsrr =
        (volatile uint32_t *) (s_port_base(p_pin->port) + GPIO_BSRR_OFF);

    if (((*p_odr >> p_pin->pin) & 1UL) != 0UL)
    {
        *p_bsrr = (1UL << (p_pin->pin + GPIO_PIN_MAX)); /* 当前高 → 复位。 */
    }
    else
    {
        *p_bsrr = (1UL << p_pin->pin);                  /* 当前低 → 置位。 */
    }
}

#else /* STM32F411xE */

/* host 冒烟守卫：非目标端仅保证接口可链接。 */

platform_err_t platform_gpio_init(const platform_gpio_pin_t *p_pin, platform_gpio_dir_t dir,
                                  platform_gpio_pull_t pull)
{
    (void) p_pin;
    (void) dir;
    (void) pull;
    return PLATFORM_ERR_NOT_SUPPORTED;
}

void platform_gpio_set(const platform_gpio_pin_t *p_pin, platform_gpio_level_t level)
{
    (void) p_pin;
    (void) level;
}

platform_gpio_level_t platform_gpio_get(const platform_gpio_pin_t *p_pin)
{
    (void) p_pin;
    return PLATFORM_GPIO_LEVEL_LOW;
}

void platform_gpio_toggle(const platform_gpio_pin_t *p_pin)
{
    (void) p_pin;
}

#endif /* STM32F411xE */
