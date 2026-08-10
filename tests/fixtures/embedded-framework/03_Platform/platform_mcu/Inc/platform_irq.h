/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file platform_irq.h
 *
 * @par dependencies
 * - platform_type.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief 全局中断基础控制接口（平台契约，零芯片依赖）。
 *
 * 提供"带状态保存"的全局中断开关（token 模式）：save 返回调用前的
 * 中断状态并关闭全局中断，restore 恢复先前状态——嵌套调用安全。
 *
 * 为什么是 token 模式而非裸 disable/enable？
 * 直接 disable→enable 在嵌套/异常路径下会错误地打开本应保持屏蔽的
 * 中断（历史教训：elog_port lock 曾因不保存进入前状态导致中断状态
 * 错乱）。save/restore 让调用方归还的是"借走时的状态"，而不是
 * 固定的"开"。
 *
 * 契约边界：
 * - 仅全局中断级别（Cortex-M PRIMASK），不涉及具体外设 NVIC 通道
 *   （外设级中断使能属于对应外设接口/驱动职责）。
 * - 临界区内禁止调用任何可能依赖中断的服务。
 *
 * 实现落地：04_Impl/impl_mcu/impl_irq.c（符号实现，链接期注入）。
 *
 * @version V1.0 2026-08-10
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

#ifndef PLATFORM_IRQ_H
#define PLATFORM_IRQ_H

/* Includes ----------------------------------------------------------------- */

#include "platform_type.h"

/* Types -------------------------------------------------------------------- */

/**
 * @brief 全局中断状态快照。
 *
 * 由 platform_irq_save() 返回、platform_irq_restore() 消费；
 * 语义由目标端定义（Cortex-M 为 PRIMASK 值：0=开，1=关）。
 */
typedef uint32_t platform_irq_state_t;

/* Functions ---------------------------------------------------------------- */

/**
 * @brief 保存当前全局中断状态并关闭中断。
 *
 * @return 调用前的全局中断状态（平台不透明快照，仅可交还 restore）。
 */
platform_irq_state_t platform_irq_save(void);

/**
 * @brief 恢复全局中断到指定状态。
 *
 * @param[in] state : platform_irq_save() 返回的状态快照。
 */
void platform_irq_restore(platform_irq_state_t state);

#endif /* PLATFORM_IRQ_H */
