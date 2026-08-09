/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file platform_board_manager.c
 *
 * @par dependencies
 * - platform_def.h
 * - platform_board_manager.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief 实现整板管理器的生命周期编排。
 *
 * 处理流程：
 *
 * 1. platform_board_manager_init 使各子管理器就绪。
 * 2. platform_board_manager_start 驱动 device.init -> service.init ->
 *    device.start -> service.start。
 * 3. platform_board_manager_process 先驱动 device.process，再驱动
 *    service.process（数据向上流动，策略向下流动）。
 * 4. platform_board_manager_stop/deinit 驱动逆序流程。
 *
 * @version V1.2 2026-08-08
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

/* Includes ----------------------------------------------------------------- */

#include "platform_def.h"
#include "platform_board_manager.h"

/* Functions ---------------------------------------------------------------- */

/**
 * @brief 在编排步骤间保留首个失败的错误码。
 *
 * @param[in] first : 当前首个失败的错误码。
 * @param[in] ret   : 新的步骤结果。
 *
 * @retval first : 首个失败的错误码（保持不变）。
 * @retval ret   : 当 first 为 OK 时，返回新的步骤结果。
 */
static platform_err_t board_keep_first(platform_err_t first, platform_err_t ret)
{
    return (PLATFORM_ERR_OK == first) ? ret : first;
}

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
platform_err_t platform_board_manager_init(platform_board_manager_t *p_board)
{
    platform_err_t ret;

    if (NULL == p_board) {
        return PLATFORM_ERR_PARAM;
    }

    ret = platform_object_init(&p_board->object, "board",
                               PLATFORM_OBJECT_MANAGER, p_board, NULL, NULL);
    if (PLATFORM_ERR_OK != ret) {
        return ret;
    }

    ret = platform_device_manager_init(&p_board->device_mgr, "device_mgr");
    if (PLATFORM_ERR_OK != ret) {
        return ret;
    }

    return platform_service_manager_init(&p_board->service_mgr, "service_mgr");
}

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
platform_err_t platform_board_manager_start(platform_board_manager_t *p_board)
{
    platform_err_t first_error = PLATFORM_ERR_OK;

    if (NULL == p_board) {
        return PLATFORM_ERR_PARAM;
    }

    /* 步骤 1：在 service 之前初始化硬件能力。 */
    first_error = board_keep_first(
        first_error,
        platform_device_manager_init_all(&p_board->device_mgr, NULL));
    first_error = board_keep_first(
        first_error,
        platform_service_manager_init_all(&p_board->service_mgr, NULL));

    /* 步骤 2：先运行硬件，再在其上运行 service。 */
    first_error = board_keep_first(
        first_error,
        platform_device_manager_start_all(&p_board->device_mgr, NULL));
    first_error = board_keep_first(
        first_error,
        platform_service_manager_start_all(&p_board->service_mgr, NULL));

    (void) platform_object_set_state(&p_board->object, PLATFORM_OBJECT_STARTED);

    return first_error;
}

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
platform_err_t platform_board_manager_process(platform_board_manager_t *p_board)
{
    platform_err_t first_error;

    if (NULL == p_board) {
        return PLATFORM_ERR_PARAM;
    }

    /* 先刷新 device 数据，service 再在此基础上计算。 */
    first_error =
        platform_device_manager_process_all(&p_board->device_mgr, NULL);
    first_error = board_keep_first(
        first_error,
        platform_service_manager_process_all(&p_board->service_mgr, NULL));

    return first_error;
}

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
platform_err_t platform_board_manager_stop(platform_board_manager_t *p_board)
{
    platform_err_t first_error;

    if (NULL == p_board) {
        return PLATFORM_ERR_PARAM;
    }

    /* 逆序：service 先停止，再停止它们所用的 device。 */
    first_error =
        platform_service_manager_stop_all(&p_board->service_mgr, NULL);
    first_error = board_keep_first(
        first_error,
        platform_device_manager_stop_all(&p_board->device_mgr, NULL));

    (void) platform_object_set_state(&p_board->object, PLATFORM_OBJECT_STOPPED);

    return first_error;
}

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
platform_err_t platform_board_manager_deinit(platform_board_manager_t *p_board)
{
    platform_err_t first_error;

    if (NULL == p_board) {
        return PLATFORM_ERR_PARAM;
    }

    /* 逆序：service 先释放，再释放它们所用的 device。 */
    first_error =
        platform_service_manager_deinit_all(&p_board->service_mgr, NULL);
    first_error = board_keep_first(
        first_error,
        platform_device_manager_deinit_all(&p_board->device_mgr, NULL));

    (void) platform_object_set_state(&p_board->object,
                                     PLATFORM_OBJECT_DEINITIALIZED);

    return first_error;
}

/**
 * @brief 返回内嵌 device 管理器，用于启动时的注册。
 *
 * @param[in] p_board : 指向整板管理器目标的指针。
 *
 * @retval non-NULL : 指向内嵌 device 管理器的指针。
 * @retval NULL     : p_board 为 NULL。
 */
platform_device_manager_t *
platform_board_manager_get_device_manager(platform_board_manager_t *p_board)
{
    return (NULL != p_board) ? &p_board->device_mgr : NULL;
}

/**
 * @brief 返回内嵌 service 管理器，用于启动时的注册。
 *
 * @param[in] p_board : 指向整板管理器目标的指针。
 *
 * @retval non-NULL : 指向内嵌 service 管理器的指针。
 * @retval NULL     : p_board 为 NULL。
 */
platform_service_manager_t *
platform_board_manager_get_service_manager(platform_board_manager_t *p_board)
{
    return (NULL != p_board) ? &p_board->service_mgr : NULL;
}
