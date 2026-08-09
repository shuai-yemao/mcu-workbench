/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file platform_reset_reason.h
 *
 * @par dependencies
 * - platform_type.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief 平台复位原因定义与预留接口。
 *
 * 复位原因枚举与字符串映射为纯逻辑（platform_reset_reason.c），
 * 复位原因读取由 Impl 层实现（impl_mcu/impl_reset_reason.c）：
 * 目标端从复位状态寄存器解析并清标志，host 端守卫分支返回
 * PLATFORM_RESET_REASON_UNKNOWN。
 *
 * @version V1.0 2026-08-09
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

#ifndef __PLATFORM_RESET_REASON_H__
#define __PLATFORM_RESET_REASON_H__

/* Includes ----------------------------------------------------------------- */

#include "platform_type.h"

/* Declaring ---------------------------------------------------------------- */

/**
 * @brief 平台复位原因枚举。
 */
typedef enum
{
    PLATFORM_RESET_REASON_UNKNOWN = 0,    /**< 未知（host 或暂不支持）。 */
    PLATFORM_RESET_REASON_POWER_ON,       /**< 上电复位（POR/PDR）。     */
    PLATFORM_RESET_REASON_PIN,            /**< NRST 引脚复位。           */
    PLATFORM_RESET_REASON_WATCHDOG,       /**< 看门狗复位（IWDG/WWDG）。 */
    PLATFORM_RESET_REASON_SOFTWARE,       /**< 软件复位（SYSRESETREQ）。 */
    PLATFORM_RESET_REASON_LOW_POWER_EXIT, /**< 低功耗模式唤醒复位。      */
    PLATFORM_RESET_REASON_BROWNOUT,       /**< 欠压复位（BOR）。         */
    PLATFORM_RESET_REASON_MAX             /**< 枚举上限（非有效原因）。  */
} platform_reset_reason_t;

/**
 * @brief 复位原因转字符串（纯逻辑实现）。
 *
 * @param[in] reason : 复位原因。
 *
 * @return 复位原因描述字符串；非法输入返回 "UNKNOWN"。
 */
const char *platform_reset_reason_str(platform_reset_reason_t reason);

/**
 * @brief 获取本次复位原因（Impl 层实现）。
 *
 * 目标端读取并清除复位状态寄存器标志；host 端守卫返回 UNKNOWN。
 *
 * @return 复位原因。
 */
platform_reset_reason_t platform_reset_reason_get(void);

#endif /* __PLATFORM_RESET_REASON_H__ */
