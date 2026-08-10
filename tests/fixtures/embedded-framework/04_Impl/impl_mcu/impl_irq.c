/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file impl_irq.c
 *
 * @par dependencies
 * - platform_irq.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief 全局中断控制的目标端实现（Cortex-M4 PRIMASK）。
 *
 * 处理流程：
 *
 * 1. platform_irq_save()：读 PRIMASK 保存旧状态，写 1 关闭全局中断，
 *    返回旧状态——嵌套安全（归还的是"借走时的状态"）。
 * 2. platform_irq_restore()：将 PRIMASK 写回调用方状态。
 *
 * @note 使用内联汇编 MRS/MSR 操作 PRIMASK，不依赖 CMSIS 头
 *       （D7：Vendor 源码不复制进工程）。
 *
 * @version V1.0 2026-08-10
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

/* Includes ----------------------------------------------------------------- */

#include "platform_irq.h"

#if defined(STM32F411xE)

/* Defines ------------------------------------------------------------------ */

#define PLATFORM_IRQ_PRIMASK_DISABLED (1UL) /* PRIMASK=1 时全局中断关闭。 */

/* Inline Helpers ----------------------------------------------------------- */

/**
 * @brief 读取当前 PRIMASK 值。
 */
static inline uint32_t s_primask_read(void)
{
    uint32_t state;
    __asm volatile ("MRS %0, PRIMASK" : "=r" (state));
    return state;
}

/**
 * @brief 写入 PRIMASK 值。
 */
static inline void s_primask_write(uint32_t state)
{
    __asm volatile ("MSR PRIMASK, %0" ::"r" (state) : "memory");
}

/* Functions ---------------------------------------------------------------- */

/**
 * @brief 保存全局中断状态并关闭中断。
 */
platform_irq_state_t platform_irq_save(void)
{
    platform_irq_state_t state = s_primask_read();

    s_primask_write(PLATFORM_IRQ_PRIMASK_DISABLED);

    return state;
}

/**
 * @brief 恢复全局中断状态。
 */
void platform_irq_restore(platform_irq_state_t state)
{
    s_primask_write(state);
}

#else /* STM32F411xE */

/* host 冒烟守卫：非目标端仅保证接口可链接。 */

platform_irq_state_t platform_irq_save(void)
{
    return 0u;
}

void platform_irq_restore(platform_irq_state_t state)
{
    (void) state;
}

#endif /* STM32F411xE */
