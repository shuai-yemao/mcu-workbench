/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file platform_hardfault.h
 *
 * @par dependencies
 * - platform_type.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief HardFault 处理框架预留。
 *
 * 定义硬件异常现场结构体与处理接口。实现由 Impl 层芯片 Port 提供
 * （目标端守卫分支）：
 *
 * 1. platform_hardfault_handler()：解析现场并 dump，随后停机。
 * 2. platform_hardfault_dump()：打印 PC/LR、异常类型与状态寄存器置位解析。
 *
 * 目标端接入点（下一课与 CubeMX 工程联动）：
 * 用 TST LR, #4 / MRSEQ R0, MSP / MRSNE R0, PSP 捕获入栈现场后
 * 将 R0 作为 p_frame 调 platform_hardfault_handler()，替换默认
 * HardFault_Handler。
 *
 * @version V1.0 2026-08-09
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

#ifndef __PLATFORM_HARDFAULT_H__
#define __PLATFORM_HARDFAULT_H__

/* Includes ----------------------------------------------------------------- */

#include "platform_type.h"

/* Declaring ---------------------------------------------------------------- */

/**
 * @brief 硬件异常现场。
 *
 * 前 8 项为异常自动入栈寄存器（r0-r3, r12, lr, pc, xPSR），
 * 后 5 项为可从系统控制寄存器读取的状态寄存器。
 */
typedef struct
{
    uint32_t r0;    /**< 通用寄存器 r0。  */
    uint32_t r1;    /**< 通用寄存器 r1。  */
    uint32_t r2;    /**< 通用寄存器 r2。  */
    uint32_t r3;    /**< 通用寄存器 r3。  */
    uint32_t r12;   /**< 通用寄存器 r12。 */
    uint32_t lr;    /**< 链接寄存器。      */
    uint32_t pc;    /**< 故障指令地址。    */
    uint32_t psr;   /**< 程序状态寄存器。  */
    uint32_t cfsr;  /**< 可配置故障状态寄存器。 */
    uint32_t hfsr;  /**< 硬故障状态寄存器。     */
    uint32_t dfsr;  /**< 调试故障状态寄存器。   */
    uint32_t mmfar; /**< MemManage 故障地址寄存器。 */
    uint32_t bfar;  /**< BusFault 故障地址寄存器。  */
} platform_hardfault_frame_t;

/**
 * @brief HardFault 处理入口（Impl 层实现）。
 *
 * dump 现场后停机（for(;;)），等待调试器/看门狗接管。
 *
 * @param[in] p_frame : 指向异常入栈现场的指针（恒非空）。
 */
void platform_hardfault_handler(const platform_hardfault_frame_t *p_frame);

/**
 * @brief 打印 HardFault 现场详情（Impl 层实现）。
 *
 * 输出 PC/LR/异常类型与 CFSR 各故障位解析。
 *
 * @param[in] p_frame : 指向异常入栈现场的指针（恒非空）。
 */
void platform_hardfault_dump(const platform_hardfault_frame_t *p_frame);

#endif /* __PLATFORM_HARDFAULT_H__ */
