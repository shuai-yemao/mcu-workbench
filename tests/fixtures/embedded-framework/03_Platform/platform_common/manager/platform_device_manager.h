/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file platform_device_manager.h
 *
 * @par dependencies
 * - platform_manager.h
 * - platform_device.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief 在通用 manager 基础对象之上提供 device 管理器的
 *        特化实现。
 *
 * 处理流程：
 *
 * 1. 在启动时通过 device 管理器注册平台设备。
 * 2. 此处只能注册 PLATFORM_OBJECT_DEVICE 类型的对象。
 * 3. 批量生命周期驱动是基础管理器的薄包装。
 *
 * @version V1.2 2026-08-08
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

#ifndef __PLATFORM_DEVICE_MANAGER_H__
#define __PLATFORM_DEVICE_MANAGER_H__

/* Includes ----------------------------------------------------------------- */

#include "platform_manager.h"
#include "platform_device.h"

/* Defines ------------------------------------------------------------------ */

/* 默认 device 槽数组容量（14 个类别并留有余量）。 */
#ifndef PLATFORM_DEVICE_MANAGER_MAX_COUNT
#define PLATFORM_DEVICE_MANAGER_MAX_COUNT 16u
#endif

/* Declaring ---------------------------------------------------------------- */

/**
 * @brief device 管理器特化。
 */
typedef struct
{
    platform_manager_t manager;                                    /**< 基础对象。 */
    platform_object_t *p_slots[PLATFORM_DEVICE_MANAGER_MAX_COUNT]; /**< 槽数组。*/
} platform_device_manager_t;

/**
 * @brief 使用基础 manager 对象初始化 device 管理器。
 *
 * @param[in] p_mgr  : 指向 device 管理器目标的指针。
 * @param[in] p_name : 指向管理器名称字符串的指针。
 *
 * @retval PLATFORM_ERR_OK    : device 管理器初始化成功。
 * @retval PLATFORM_ERR_PARAM : p_mgr 为 NULL。
 */
platform_err_t platform_device_manager_init(platform_device_manager_t *p_mgr,
                                            const char *p_name);

/**
 * @brief 向 device 管理器注册一个设备。
 *
 * 步骤：
 *  1. 校验设备对象类型为 PLATFORM_OBJECT_DEVICE。
 *  2. 将注册委托给基础管理器。
 *
 * @param[in] p_mgr : 指向 device 管理器目标的指针。
 * @param[in] p_dev : 指向待注册平台设备的指针。
 *
 * @retval PLATFORM_ERR_OK    : 设备注册成功。
 * @retval PLATFORM_ERR_PARAM : p_mgr/p_dev 为 NULL 或类型不匹配。
 * @retval PLATFORM_ERR_*     : 基础管理器返回的注册错误。
 */
platform_err_t
platform_device_manager_register(platform_device_manager_t *p_mgr,
                                 platform_device_t *p_dev);

/**
 * @brief 从 device 管理器中移除一个设备。
 *
 * @param[in] p_mgr : 指向 device 管理器目标的指针。
 * @param[in] p_dev : 指向待注销平台设备的指针。
 *
 * @retval PLATFORM_ERR_OK        : 设备已移除。
 * @retval PLATFORM_ERR_PARAM     : p_mgr 或 p_dev 为 NULL。
 * @retval PLATFORM_ERR_NOT_FOUND : 设备未注册。
 */
platform_err_t
platform_device_manager_unregister(platform_device_manager_t *p_mgr,
                                   platform_device_t *p_dev);

/**
 * @brief 按名称查找已注册的设备。
 *
 * @param[in]  p_mgr : 指向 device 管理器目标的指针。
 * @param[in]  p_name: 指向待查找设备名称的指针。
 * @param[out] pp_dev: 指向查找到的设备输出指针。
 *
 * @retval PLATFORM_ERR_OK        : 找到设备，*pp_dev 指向它。
 * @retval PLATFORM_ERR_PARAM     : p_mgr 或 pp_dev 为 NULL。
 * @retval PLATFORM_ERR_NOT_FOUND : 没有指定名称的设备。
 */
platform_err_t platform_device_manager_get(platform_device_manager_t *p_mgr,
                                           const char *p_name,
                                           platform_device_t **pp_dev);

/**
 * @brief 查找给定类别的首个已注册设备。
 *
 * @param[in]  p_mgr     : 指向 device 管理器目标的指针。
 * @param[in]  dev_class : 待查找的设备类别。
 * @param[out] pp_dev    : 指向查找到的设备输出指针。
 *
 * @retval PLATFORM_ERR_OK        : 找到设备，*pp_dev 指向它。
 * @retval PLATFORM_ERR_PARAM     : p_mgr 或 pp_dev 为 NULL。
 * @retval PLATFORM_ERR_NOT_FOUND : 没有指定类别的设备。
 */
platform_err_t
platform_device_manager_get_by_class(platform_device_manager_t *p_mgr,
                                     platform_device_class_t dev_class,
                                     platform_device_t **pp_dev);

/**
 * @brief 驱动每个已注册设备的 init 动作。
 *
 * @param[in]  p_mgr   : 指向 device 管理器目标的指针。
 * @param[out] p_result: 指向结果统计的指针，可为 NULL。
 *
 * @retval PLATFORM_ERR_OK : 所有设备驱动成功。
 * @retval PLATFORM_ERR_*  : 批量中的首个错误码。
 */
platform_err_t
platform_device_manager_init_all(platform_device_manager_t *p_mgr,
                                 platform_manager_result_t *p_result);

/**
 * @brief 驱动每个已注册设备的 start 动作。
 *
 * @param[in]  p_mgr   : 指向 device 管理器目标的指针。
 * @param[out] p_result: 指向结果统计的指针，可为 NULL。
 *
 * @retval PLATFORM_ERR_OK : 所有设备驱动成功。
 * @retval PLATFORM_ERR_*  : 批量中的首个错误码。
 */
platform_err_t
platform_device_manager_start_all(platform_device_manager_t *p_mgr,
                                  platform_manager_result_t *p_result);

/**
 * @brief 驱动每个运行中设备的 process 动作。
 *
 * @param[in]  p_mgr   : 指向 device 管理器目标的指针。
 * @param[out] p_result: 指向结果统计的指针，可为 NULL。
 *
 * @retval PLATFORM_ERR_OK : 所有设备驱动成功。
 * @retval PLATFORM_ERR_*  : 批量中的首个错误码。
 */
platform_err_t
platform_device_manager_process_all(platform_device_manager_t *p_mgr,
                                    platform_manager_result_t *p_result);

/**
 * @brief 驱动每个运行中设备的 stop 动作。
 *
 * @param[in]  p_mgr   : 指向 device 管理器目标的指针。
 * @param[out] p_result: 指向结果统计的指针，可为 NULL。
 *
 * @retval PLATFORM_ERR_OK : 所有设备驱动成功。
 * @retval PLATFORM_ERR_*  : 批量中的首个错误码。
 */
platform_err_t
platform_device_manager_stop_all(platform_device_manager_t *p_mgr,
                                 platform_manager_result_t *p_result);

/**
 * @brief 驱动每个已注册设备的 deinit 动作。
 *
 * @param[in]  p_mgr   : 指向 device 管理器目标的指针。
 * @param[out] p_result: 指向结果统计的指针，可为 NULL。
 *
 * @retval PLATFORM_ERR_OK : 所有设备驱动成功。
 * @retval PLATFORM_ERR_*  : 批量中的首个错误码。
 */
platform_err_t
platform_device_manager_deinit_all(platform_device_manager_t *p_mgr,
                                   platform_manager_result_t *p_result);

#endif /* __PLATFORM_DEVICE_MANAGER_H__ */
