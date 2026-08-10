/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file impl_tick.c
 *
 * @par dependencies
 * - platform_tick.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief 系统时基的目标端实现（Cortex-M4 SysTick，1ms 节拍）。
 *
 * 处理流程：
 *
 * 1. platform_tick_init()：按 PLATFORM_TICK_SYSCLK_HZ 计算重载值，
 *    配置 SysTick（内核时钟源 + 1ms 中断 + 使能），NVIC 使能
 *    SysTick 异常（IRQn=15），清零计数。
 * 2. platform_tick_get_ms()：读 1ms 中断累计计数。
 * 3. SysTick_Handler()：每 1ms 递增计数（若工程已定义同名处理器，
 *    需合并两处逻辑，见 @note）。
 *
 * @note PLATFORM_TICK_SYSCLK_HZ 默认 HSI 16MHz；若工程经 PLL 提升
 *       内核时钟，须在编译时覆盖：
 *       -DPLATFORM_TICK_SYSCLK_HZ=96000000
 * @note 若目标工程已有 SysTick_Handler（如已有时基），本文件应改为
 *       提供 s_tick_ms++ 的内部函数并由该处理器调用，避免重复定义。
 *
 * @version V1.0 2026-08-10
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

/* Includes ----------------------------------------------------------------- */

#include "platform_tick.h"

#if defined(STM32F411xE)

/* Defines ------------------------------------------------------------------ */

/* 内核时钟频率（Hz）：默认 HSI 16MHz，PLL 后须外部覆盖。 */
#ifndef PLATFORM_TICK_SYSCLK_HZ
    #define PLATFORM_TICK_SYSCLK_HZ (16000000UL)
#endif

/* SysTick 外设（Cortex-M4 系统控制块）。 */
#define SYSTICK_BASE_ADDR (0xE000E010UL)
#define STK_CTRL_OFFSET   (0x00UL)
#define STK_LOAD_OFFSET   (0x04UL)
#define STK_VAL_OFFSET    (0x08UL)

/* STK_CTRL 位定义。 */
#define STK_CTRL_ENABLE    (1UL << 0) /* SysTick 使能。      */
#define STK_CTRL_TICKINT   (1UL << 1) /* 计数到 0 产生中断。 */
#define STK_CTRL_CLKSOURCE (1UL << 2) /* 时钟源=内核时钟。   */

/* NVIC ISER0（Cortex-M4 中断使能寄存器 0）。 */
#define NVIC_ISER0_ADDR (0xE000E100UL)
#define SYSTICK_IRQN    (15) /* SysTick 异常号。 */

/* Variables ----------------------------------------------------------------- */

static volatile uint32_t s_tick_ms = 0u; /* 1ms 累计计数。 */

/* Functions ---------------------------------------------------------------- */

/**
 * @brief 初始化 1ms 系统时基。
 */
platform_err_t platform_tick_init(void)
{
    volatile uint32_t *p_ctrl = (volatile uint32_t *) (SYSTICK_BASE_ADDR + STK_CTRL_OFFSET);
    volatile uint32_t *p_load = (volatile uint32_t *) (SYSTICK_BASE_ADDR + STK_LOAD_OFFSET);
    volatile uint32_t *p_val  = (volatile uint32_t *) (SYSTICK_BASE_ADDR + STK_VAL_OFFSET);
    volatile uint32_t *p_iser0 = (volatile uint32_t *) NVIC_ISER0_ADDR;

    const uint32_t reload = (PLATFORM_TICK_SYSCLK_HZ / 1000UL) - 1UL;

    /* 关中断保护计数清零（配置阶段无并发，直接操作即可）。 */
    s_tick_ms = 0u;

    *p_val  = 0u;
    *p_load = reload;
    *p_ctrl = STK_CTRL_CLKSOURCE | STK_CTRL_TICKINT | STK_CTRL_ENABLE;

    /* NVIC 使能 SysTick 异常。 */
    *p_iser0 |= (1UL << SYSTICK_IRQN);

    return PLATFORM_ERR_OK;
}

/**
 * @brief 获取系统运行毫秒计数。
 */
uint32_t platform_tick_get_ms(void)
{
    return s_tick_ms;
}

/**
 * @brief SysTick 1ms 中断处理。
 */
void SysTick_Handler(void)
{
    s_tick_ms++;
}

#else /* STM32F411xE */

/* host 冒烟守卫：非目标端仅保证接口可链接。 */

platform_err_t platform_tick_init(void)
{
    return PLATFORM_ERR_NOT_SUPPORTED;
}

uint32_t platform_tick_get_ms(void)
{
    return 0u;
}

#endif /* STM32F411xE */
