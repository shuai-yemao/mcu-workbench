/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file service_system.h
 *
 * @par dependencies
 * - platform_error.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief 系统服务门面（Service 层）：启动编排。
 *
 * 收敛 App 组合根对 platform_board_manager 的依赖：
 *
 * - service_system_board_init()：初始化整板管理器（board 阶段）。
 * - service_system_start()     ：启动整板主线（app 阶段，device/service 编排）。
 *
 * 整板管理器实例由本服务持有并管理生命周期，App 不直接触碰
 * platform_board_manager 类型与 API。
 *
 * @version V1.0 2026-08-09
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

#ifndef __SERVICE_SYSTEM_H__
#define __SERVICE_SYSTEM_H__

/* Includes ----------------------------------------------------------------- */

#include "platform_error.h"

/* Declaring ---------------------------------------------------------------- */

/**
 * @brief 初始化整板管理器（board 阶段）。
 *
 * @retval PLATFORM_ERR_OK      : 初始化成功。
 * @retval 其他 platform_err_t  : 初始化失败。
 */
platform_err_t service_system_board_init(void);

/**
 * @brief 启动整板管理器主线（app 阶段）。
 *
 * 编排 device.init → service.init → device.start → service.start。
 *
 * @retval PLATFORM_ERR_OK      : 启动成功。
 * @retval 其他 platform_err_t  : 启动失败。
 */
platform_err_t service_system_start(void);

#endif /* __SERVICE_SYSTEM_H__ */
