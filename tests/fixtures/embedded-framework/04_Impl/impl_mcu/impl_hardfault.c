/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file impl_hardfault.c
 *
 * @par dependencies
 * - platform_hardfault.h
 * - platform_log.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief HardFault 处理的目标端实现（框架预留）。
 *
 * 处理流程：
 *
 * 1. 目标端接入点：替换 CubeMX 的 HardFault_Handler，用汇编
 *    TST LR, #4 / MRSEQ R0, MSP / MRSNE R0, PSP 捕获异常入栈现场，
 *    将 R0（指向平台帧）传给 platform_hardfault_handler()。
 * 2. platform_hardfault_dump()：打印 PC/LR、异常类型与 CFSR 置位解析，
 *    SCB 状态寄存器（CFSR/HFSR/DFSR/MMFAR/BFAR）直读填充。
 * 3. platform_hardfault_handler()：dump 后 for(;;) 停机，等待调试器/看门狗。
 *
 * @note 本文件属目标端实现，守卫 STM32F411xE；无硬件现场时（host）
 *       不参与编译，仅以 -fsyntax-only -DSTM32F411xE 做语法验证。
 *
 * @version V1.0 2026-08-09
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

/* Includes ----------------------------------------------------------------- */

#include "platform_hardfault.h"
#include "platform_log.h"

/* Defines ------------------------------------------------------------------ */

#if defined(STM32F411xE)

    /* SCB 基址与状态寄存器偏移（ARMv7-M，Cortex-M4）。 */
    #define SCB_BASE_ADDR (0xE000ED00UL)
    #define SCB_CFSR_OFFSET (0x28UL)  /* 可配置故障状态寄存器。            */
    #define SCB_HFSR_OFFSET (0x2CUL)  /* 硬故障状态寄存器。                */
    #define SCB_DFSR_OFFSET (0x30UL)  /* 调试故障状态寄存器。              */
    #define SCB_MMFAR_OFFSET (0x34UL) /* MemManage 故障地址寄存器。       */
    #define SCB_BFAR_OFFSET (0x38UL)  /* BusFault 故障地址寄存器。        */

    /* HFSR 位。 */
    #define HFSR_FORCED (1UL << 30) /* 异常被强制升级为 HardFault。    */

    /* CFSR 关键位（UFSR 区）。 */
    #define CFSR_UNDEFINSTR (1UL << 16) /* 未定义指令。                    */
    #define CFSR_INVSTATE (1UL << 17)   /* 无效状态（EXC_RETURN 非法）。   */
    #define CFSR_INVPC (1UL << 18)      /* 无效 PC 装载。                  */
    #define CFSR_DIVBYZERO (1UL << 25)  /* 除零错误。                      */

#endif /* STM32F411xE */

/* Functions ---------------------------------------------------------------- */

#if defined(STM32F411xE)

/**
 * @brief 解析 CFSR/HFSR 并打印置位详情。
 *
 * @param[in] cfsr : CFSR 寄存器值。
 * @param[in] hfsr : HFSR 寄存器值。
 */
static void hardfault_dump_cfsr(uint32_t cfsr, uint32_t hfsr)
{
    if ((hfsr & HFSR_FORCED) != 0UL)
    {
        PLATFORM_LOG_E("fault", "  HardFault forced by a fault below");
    }

    if ((cfsr & CFSR_UNDEFINSTR) != 0UL)
    {
        PLATFORM_LOG_E("fault", "  CFSR: Undefined instruction");
    }
    if ((cfsr & CFSR_INVSTATE) != 0UL)
    {
        PLATFORM_LOG_E("fault", "  CFSR: Invalid state (bad EXC_RETURN)");
    }
    if ((cfsr & CFSR_INVPC) != 0UL)
    {
        PLATFORM_LOG_E("fault", "  CFSR: Invalid PC load");
    }
    if ((cfsr & CFSR_DIVBYZERO) != 0UL)
    {
        PLATFORM_LOG_E("fault", "  CFSR: Divide by zero");
    }
}

#endif /* STM32F411xE */

/**
 * @brief 打印 HardFault 现场详情。
 *
 * @param[in] p_frame : 指向异常入栈现场的指针（恒非空）。
 */
void platform_hardfault_dump(const platform_hardfault_frame_t *p_frame)
{
    if (p_frame == (const platform_hardfault_frame_t *) 0)
    {
        return;
    }

#if defined(STM32F411xE)
    volatile uint32_t *p_scb = (volatile uint32_t *) SCB_BASE_ADDR;
    uint32_t cfsr = p_scb[SCB_CFSR_OFFSET / 4u];

    PLATFORM_LOG_E("fault", "=== HardFault dump ===");
    PLATFORM_LOG_E("fault", "  PC = 0x%08lX  LR = 0x%08lX  PSR = 0x%08lX",
                   (unsigned long) p_frame->pc, (unsigned long) p_frame->lr,
                   (unsigned long) p_frame->psr);
    PLATFORM_LOG_E("fault", "  R0 = 0x%08lX  R1 = 0x%08lX  R2 = 0x%08lX",
                   (unsigned long) p_frame->r0, (unsigned long) p_frame->r1,
                   (unsigned long) p_frame->r2);
    PLATFORM_LOG_E("fault", "  R3 = 0x%08lX  R12= 0x%08lX", (unsigned long) p_frame->r3,
                   (unsigned long) p_frame->r12);
    PLATFORM_LOG_E("fault", "  CFSR = 0x%08lX  HFSR = 0x%08lX  DFSR = 0x%08lX",
                   (unsigned long) cfsr, (unsigned long) p_frame->hfsr,
                   (unsigned long) p_frame->dfsr);
    PLATFORM_LOG_E("fault", "  MMFAR= 0x%08lX  BFAR = 0x%08lX", (unsigned long) p_frame->mmfar,
                   (unsigned long) p_frame->bfar);

    hardfault_dump_cfsr(cfsr, p_frame->hfsr);
    PLATFORM_LOG_E("fault", "=== end dump ===");
#else
    (void) p_frame;
#endif /* STM32F411xE */
}

/**
 * @brief HardFault 处理入口。
 *
 * dump 现场后停机（for(;;)），等待调试器/看门狗接管。
 *
 * @param[in] p_frame : 指向异常入栈现场的指针（恒非空）。
 */
void platform_hardfault_handler(const platform_hardfault_frame_t *p_frame)
{
    platform_hardfault_dump(p_frame);

    /* 停机，等待调试器或看门狗接管。 */
    for (;;)
    {
    }
}
