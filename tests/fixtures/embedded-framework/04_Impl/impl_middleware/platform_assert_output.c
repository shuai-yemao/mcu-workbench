/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file platform_assert_output.c
 *
 * @par dependencies
 * - platform_assert.h
 * - SEGGER_RTT.h（Vendor，05_Vendor/segger_rtt）
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief 断言原始输出原语实现（Impl 层，独立于日志系统）。
 *
 * P2 决策：故障路径（断言）不依赖 platform_log——日志可能未初始化或
 * 本身故障，断言输出必须自足。本实现直接桥接 SEGGER RTT 裸写，
 * 不经过 elog 格式/级别/初始化状态。
 *
 * @version V1.0 2026-08-09
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

/* Includes ----------------------------------------------------------------- */
/* 平台头在前：board_types.h 提供 typedef uint8 bool;，若先 include
 * SEGGER_RTT.h 可能带入 <stdbool.h> 的 bool 宏，二者冲突。 */

#include "platform_assert.h"

#include <stdarg.h>
#include <stdio.h>

#include <SEGGER_RTT.h>

/* Functions ---------------------------------------------------------------- */

/**
 * @brief 断言原始输出：格式化为本地缓冲后经 RTT 通道 0 裸写。
 *
 * @param[in] p_fmt : printf 格式串。
 * @param[in] ...   : 格式参数。
 */
void platform_assert_output(const char *p_fmt, ...)
{
    char buffer[128];
    va_list args;

    va_start(args, p_fmt);
    (void) vsnprintf(buffer, sizeof(buffer), p_fmt, args);
    va_end(args);

    (void) SEGGER_RTT_WriteString(0, buffer);
}
