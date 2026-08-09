/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file service_system.c
 *
 * @par dependencies
 * - service_system.h
 * - platform_board_manager.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief 系统服务门面实现（Service 层）：启动编排。
 *
 * 持有整板管理器实例并管理其生命周期，App 组合根只调用本服务。
 *
 * @version V1.0 2026-08-09
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

/* Includes ----------------------------------------------------------------- */

#include "service_system.h"
#include "platform_board_manager.h"

/* Private ------------------------------------------------------------------ */

/* 整板管理器实例：本服务持有，跨 board/app 阶段共享。 */
static platform_board_manager_t g_board;

/* Functions ---------------------------------------------------------------- */

platform_err_t service_system_board_init(void)
{
    return platform_board_manager_init(&g_board);
}

platform_err_t service_system_start(void)
{
    return platform_board_manager_start(&g_board);
}
