/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file platform_def.h
 *
 * @par dependencies
 * - platform_type.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief 提供平台通用定义。
 *
 * @version V1.2 2026-08-08
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

#ifndef __PLATFORM_DEF_H__
#define __PLATFORM_DEF_H__

/* Includes ----------------------------------------------------------------- */

#include "platform_type.h"

/* Defines ------------------------------------------------------------------ */

/* 通用返回值与布尔值宏。 */
#define PLATFORM_OK 0
#define PLATFORM_ERROR 1
#define PLATFORM_TRUE 1
#define PLATFORM_FALSE 0

/* 空指针定义：未由编译环境提供时才定义。 */
#ifndef NULL
#define NULL ((void *) 0)
#endif

/* 对齐宏：按 PLATFORM_ALIGN_SIZE 字节上取整。 */
#define PLATFORM_ALIGN_SIZE 4u
#define PLATFORM_ALIGN(n)                                                      \
    (((n) + PLATFORM_ALIGN_SIZE - 1u) & ~(PLATFORM_ALIGN_SIZE - 1u))

/* 数组长度宏：未由编译环境提供时才定义。 */
#ifndef ARRAY_SIZE
#define ARRAY_SIZE(arr) (sizeof(arr) / sizeof((arr)[0]))
#endif

/* 延时宏：转发到 Impl 层实现。 */
#define PLATFORM_DELAY_MS(ms) platform_delay_ms(ms)
#define PLATFORM_DELAY_US(us) platform_delay_us(us)

/* Declaring ---------------------------------------------------------------- */

void platform_delay_ms(uint32_t ms);
void platform_delay_us(uint32_t us);

#endif /* __PLATFORM_DEF_H__ */
