/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file platform_board_manager.h
 *
 * @par dependencies
 * - platform_object.h
 * - platform_device_manager.h
 * - platform_service_manager.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief 提供整板管理器，用于编排整板完整的生命周期
 *        主流程。
 *
 * 处理流程：
 *
 * 1. Init：使 device/service 管理器就绪。
 * 2. Start：device init -> service init -> device start -> service start。
 * 3. Loop：先周期处理 device 数据，再让 service 在此基础上计算。
 * 4. Stop：先 service stop，再 device stop（逆序）。
 * 5. Deinit：先 service deinit，再 device deinit（逆序）。
 *
 * 管理器本身通过显式函数调用驱动，而不是通过
 * 生命周期回调，以避免递归驱动管理器。
 *
 * @version V1.2 2026-08-08
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

#ifndef __PLATFORM_BOARD_MANAGER_H__
#define __PLATFORM_BOARD_MANAGER_H__

/* Includes ----------------------------------------------------------------- */

#include "platform_object.h"
#include "platform_device_manager.h"
#include "platform_service_manager.h"

/* Declaring ---------------------------------------------------------------- */

/**
 * @brief 整板管理器：持有两个子管理器及其自身的对象
 *        身份。
 */
typedef struct
{
    platform_object_t object;               /**< MANAGER 类型身份。    */
    platform_device_manager_t device_mgr;   /**< 内嵌 device 管理器。  */
    platform_service_manager_t service_mgr; /**< 内嵌 service 管理器。 */
} platform_board_manager_t;

/**
 * @brief 初始化整板管理器及其两个子管理器。
 *
 * 步骤：
 *  1. 将整板对象身份初始化为 PLATFORM_OBJECT_MANAGER。
 *  2. 初始化 device 管理器和 service 管理器。
 *
 * @param[in] p_board : 指向整板管理器目标的指针。
 *
 * @retval PLATFORM_ERR_OK    : 整板管理器初始化成功。
 * @retval PLATFORM_ERR_PARAM : p_board 为 NULL。
 */
platform_err_t platform_board_manager_init(platform_board_manager_t *p_board);

/**
 * @brief 驱动整板的启动主流程。
 *
 * 顺序：
 *  device.init_all -> service.init_all -> device.start_all -> service.start_all
 *
 * 每一步出错继续，并返回首个错误码。
 *
 * @param[in] p_board : 指向整板管理器目标的指针。
 *
 * @retval PLATFORM_ERR_OK : 所有步骤驱动成功。
 * @retval PLATFORM_ERR_*  : 批量中的首个错误码。
 */
platform_err_t platform_board_manager_start(platform_board_manager_t *p_board);

/**
 * @brief 驱动整板一个主循环周期（tick）。
 *
 * 顺序：
 *  device.process_all -> service.process_all
 *
 * @param[in] p_board : 指向整板管理器目标的指针。
 *
 * @retval PLATFORM_ERR_OK : 所有步骤驱动成功。
 * @retval PLATFORM_ERR_*  : 批量中的首个错误码。
 */
platform_err_t
platform_board_manager_process(platform_board_manager_t *p_board);

/**
 * @brief 按逆序驱动整板的关停主流程。
 *
 * 顺序：
 *  service.stop_all -> device.stop_all
 *
 * @param[in] p_board : 指向整板管理器目标的指针。
 *
 * @retval PLATFORM_ERR_OK : 所有步骤驱动成功。
 * @retval PLATFORM_ERR_*  : 批量中的首个错误码。
 */
platform_err_t platform_board_manager_stop(platform_board_manager_t *p_board);

/**
 * @brief 按逆序释放整板所有资源。
 *
 * 顺序：
 *  service.deinit_all -> device.deinit_all
 *
 * @param[in] p_board : 指向整板管理器目标的指针。
 *
 * @retval PLATFORM_ERR_OK : 所有步骤驱动成功。
 * @retval PLATFORM_ERR_*  : 批量中的首个错误码。
 */
platform_err_t platform_board_manager_deinit(platform_board_manager_t *p_board);

/**
 * @brief 返回内嵌 device 管理器，用于启动时的注册。
 *
 * @param[in] p_board : 指向整板管理器目标的指针。
 *
 * @retval non-NULL : 指向内嵌 device 管理器的指针。
 * @retval NULL     : p_board 为 NULL。
 */
platform_device_manager_t *
platform_board_manager_get_device_manager(platform_board_manager_t *p_board);

/**
 * @brief 返回内嵌 service 管理器，用于启动时的注册。
 *
 * @param[in] p_board : 指向整板管理器目标的指针。
 *
 * @retval non-NULL : 指向内嵌 service 管理器的指针。
 * @retval NULL     : p_board 为 NULL。
 */
platform_service_manager_t *
platform_board_manager_get_service_manager(platform_board_manager_t *p_board);

#endif /* __PLATFORM_BOARD_MANAGER_H__ */
