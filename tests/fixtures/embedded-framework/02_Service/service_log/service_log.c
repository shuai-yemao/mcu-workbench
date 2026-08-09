/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file service_log.c
 *
 * @par dependencies
 * - service_log.h
 * - platform_version.h
 * - platform_reset_reason.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief 日志服务门面实现（Service 层）。
 *
 * 收敛 App 对 platform_log / platform_version / platform_reset_reason
 * 的依赖：App 只调用本服务，平台细节在此消化。
 *
 * @version V1.0 2026-08-09
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

/* Includes ----------------------------------------------------------------- */

#include "service_log.h"
#include "platform_reset_reason.h"
#include "platform_version.h"

/* Functions ---------------------------------------------------------------- */

platform_err_t service_log_init(void)
{
    return platform_log_init();
}

void service_log_print_banner(void)
{
    platform_banner_print();

    PLATFORM_LOG_I("svc_log", "[boot] reset reason = %s",
                   platform_reset_reason_str(platform_reset_reason_get()));
}
