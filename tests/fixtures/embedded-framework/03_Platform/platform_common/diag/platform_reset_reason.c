/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file platform_reset_reason.c
 *
 * @par dependencies
 * - platform_reset_reason.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief 平台复位原因字符串映射实现。
 *
 * 纯逻辑实现，无硬件依赖；复位原因读取（platform_reset_reason_get）
 * 由 Impl 层芯片 Port 提供（符号实现，链接期注入）。
 *
 * @version V1.0 2026-08-09
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

/* Includes ----------------------------------------------------------------- */

#include "platform_reset_reason.h"

/* Defines ------------------------------------------------------------------ */

/* 复位原因字符串表：索引与枚举值一一对应。 */
static const char *const s_reset_reason_str[PLATFORM_RESET_REASON_MAX] = {
    "UNKNOWN",        /* PLATFORM_RESET_REASON_UNKNOWN        */
    "POWER_ON",       /* PLATFORM_RESET_REASON_POWER_ON       */
    "PIN",            /* PLATFORM_RESET_REASON_PIN            */
    "WATCHDOG",       /* PLATFORM_RESET_REASON_WATCHDOG       */
    "SOFTWARE",       /* PLATFORM_RESET_REASON_SOFTWARE       */
    "LOW_POWER_EXIT", /* PLATFORM_RESET_REASON_LOW_POWER_EXIT */
    "BROWNOUT",       /* PLATFORM_RESET_REASON_BROWNOUT       */
};

/* Functions ---------------------------------------------------------------- */

/**
 * @brief 复位原因转字符串。
 *
 * @param[in] reason : 复位原因。
 *
 * @return 复位原因描述字符串；非法输入返回 "UNKNOWN"。
 */
const char *platform_reset_reason_str(platform_reset_reason_t reason)
{
    if ((reason < PLATFORM_RESET_REASON_UNKNOWN) || (reason >= PLATFORM_RESET_REASON_MAX))
    {
        return s_reset_reason_str[PLATFORM_RESET_REASON_UNKNOWN];
    }

    return s_reset_reason_str[(uint32_t) reason];
}
