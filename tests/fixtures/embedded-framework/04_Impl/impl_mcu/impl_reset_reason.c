/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file impl_reset_reason.c
 *
 * @par dependencies
 * - platform_reset_reason.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief 复位原因读取的目标端实现。
 *
 * 处理流程：
 *
 * 1. STM32F411xE 分支：直读 RCC_CSR 复位标志（PORRST/BORRST/PINRST/
 *    IWDGRST/WWDGRST/SFTRST/LPWRRST），按优先级映射到复位原因枚举，
 *    随后写 RMVF 清除标志，保证下次上电读到的是本次复位原因。
 * 2. 其他分支（host 冒烟等）：返回 PLATFORM_RESET_REASON_UNKNOWN。
 *
 * @note 本文件属目标端实现，参与 STM32F411xE 固件编译；host 端仅
 *       提供守卫分支供冒烟验证接口可用。
 *
 * @version V1.0 2026-08-09
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

/* Includes ----------------------------------------------------------------- */

#include "platform_reset_reason.h"

/* Defines ------------------------------------------------------------------ */

#if defined(STM32F411xE)

    /* RCC 基址与 CSR 偏移（STM32F4 系列）。 */
    #define RCC_BASE_ADDR (0x40023800UL)
    #define RCC_CSR_OFFSET (0x74UL)

    /* RCC_CSR 复位标志位。 */
    #define RCC_CSR_RMVF (1UL << 24)     /* 写 1 清除复位标志。      */
    #define RCC_CSR_LPWRRSTF (1UL << 25) /* 低功耗复位标志。          */
    #define RCC_CSR_BORRSTF (1UL << 26)  /* 欠压复位标志。            */
    #define RCC_CSR_PINRSTF (1UL << 27)  /* 引脚复位标志。            */
    #define RCC_CSR_PORRSTF (1UL << 28)  /* 上电复位标志。            */
    #define RCC_CSR_SFTRSTF (1UL << 29)  /* 软件复位标志。            */
    #define RCC_CSR_IWDGRSTF (1UL << 30) /* 独立看门狗复位标志。      */
    #define RCC_CSR_WWDGRSTF (1UL << 31) /* 窗口看门狗复位标志。      */

#endif /* STM32F411xE */

/* Functions ---------------------------------------------------------------- */

/**
 * @brief 获取本次复位原因。
 *
 * 目标端读取并清除 RCC_CSR 复位标志；host 端守卫返回 UNKNOWN。
 *
 * @return 复位原因。
 */
platform_reset_reason_t platform_reset_reason_get(void)
{
#if defined(STM32F411xE)
    volatile uint32_t *p_csr = (volatile uint32_t *) (RCC_BASE_ADDR + RCC_CSR_OFFSET);
    uint32_t flags = *p_csr;
    platform_reset_reason_t reason;

    /* 按优先级判定：上电 > 欠压 > 引脚 > 看门狗 > 软件 > 低功耗唤醒。 */
    if ((flags & RCC_CSR_PORRSTF) != 0UL)
    {
        reason = PLATFORM_RESET_REASON_POWER_ON;
    }
    else if ((flags & RCC_CSR_BORRSTF) != 0UL)
    {
        reason = PLATFORM_RESET_REASON_BROWNOUT;
    }
    else if ((flags & RCC_CSR_PINRSTF) != 0UL)
    {
        reason = PLATFORM_RESET_REASON_PIN;
    }
    else if (((flags & RCC_CSR_IWDGRSTF) != 0UL) || ((flags & RCC_CSR_WWDGRSTF) != 0UL))
    {
        reason = PLATFORM_RESET_REASON_WATCHDOG;
    }
    else if ((flags & RCC_CSR_SFTRSTF) != 0UL)
    {
        reason = PLATFORM_RESET_REASON_SOFTWARE;
    }
    else if ((flags & RCC_CSR_LPWRRSTF) != 0UL)
    {
        reason = PLATFORM_RESET_REASON_LOW_POWER_EXIT;
    }
    else
    {
        reason = PLATFORM_RESET_REASON_UNKNOWN;
    }

    /* 写 1 清除复位标志，保证下次上电读到本次复位原因。 */
    *p_csr = RCC_CSR_RMVF;

    return reason;
#else
    return PLATFORM_RESET_REASON_UNKNOWN;
#endif /* STM32F411xE */
}
