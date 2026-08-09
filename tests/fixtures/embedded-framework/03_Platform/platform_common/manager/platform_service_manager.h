/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file platform_service_manager.h
 *
 * @par dependencies
 * - platform_manager.h
 * - platform_service.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief 在通用 manager 基础对象之上提供 service 管理器的
 *        特化实现。
 *
 * 处理流程：
 *
 * 1. 在启动时通过 service 管理器注册平台服务。
 * 2. 此处只能注册 PLATFORM_OBJECT_SERVICE 类型的对象。
 * 3. 批量生命周期驱动是基础管理器的薄包装。
 *
 * @version V1.2 2026-08-08
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

#ifndef __PLATFORM_SERVICE_MANAGER_H__
#define __PLATFORM_SERVICE_MANAGER_H__

/* Includes ----------------------------------------------------------------- */

#include "platform_manager.h"
#include "platform_service.h"

/* Defines ------------------------------------------------------------------ */

/* 默认 service 槽数组容量（8 个类别）。 */
#ifndef PLATFORM_SERVICE_MANAGER_MAX_COUNT
#define PLATFORM_SERVICE_MANAGER_MAX_COUNT 8u
#endif

/* Declaring ---------------------------------------------------------------- */

/**
 * @brief service 管理器特化。
 */
typedef struct
{
    platform_manager_t manager;                                     /**< 基础对象。 */
    platform_object_t *p_slots[PLATFORM_SERVICE_MANAGER_MAX_COUNT]; /**< 槽数组。*/
} platform_service_manager_t;

/**
 * @brief 使用基础 manager 对象初始化 service 管理器。
 *
 * @param[in] p_mgr  : 指向 service 管理器目标的指针。
 * @param[in] p_name : 指向管理器名称字符串的指针。
 *
 * @retval PLATFORM_ERR_OK    : service 管理器初始化成功。
 * @retval PLATFORM_ERR_PARAM : p_mgr 为 NULL。
 */
platform_err_t platform_service_manager_init(platform_service_manager_t *p_mgr,
                                             const char *p_name);

/**
 * @brief 向 service 管理器注册一个服务。
 *
 * 步骤：
 *  1. 校验服务对象类型为 PLATFORM_OBJECT_SERVICE。
 *  2. 将注册委托给基础管理器。
 *
 * @param[in] p_mgr : 指向 service 管理器目标的指针。
 * @param[in] p_svc : 指向待注册平台服务的指针。
 *
 * @retval PLATFORM_ERR_OK    : 服务注册成功。
 * @retval PLATFORM_ERR_PARAM : p_mgr/p_svc 为 NULL 或类型不匹配。
 * @retval PLATFORM_ERR_*     : 基础管理器返回的注册错误。
 */
platform_err_t
platform_service_manager_register(platform_service_manager_t *p_mgr,
                                  platform_service_t *p_svc);

/**
 * @brief 从 service 管理器中移除一个服务。
 *
 * @param[in] p_mgr : 指向 service 管理器目标的指针。
 * @param[in] p_svc : 指向待注销平台服务的指针。
 *
 * @retval PLATFORM_ERR_OK        : 服务已移除。
 * @retval PLATFORM_ERR_PARAM     : p_mgr 或 p_svc 为 NULL。
 * @retval PLATFORM_ERR_NOT_FOUND : 服务未注册。
 */
platform_err_t
platform_service_manager_unregister(platform_service_manager_t *p_mgr,
                                    platform_service_t *p_svc);

/**
 * @brief 按名称查找已注册的服务。
 *
 * @param[in]  p_mgr : 指向 service 管理器目标的指针。
 * @param[in]  p_name: 指向待查找服务名称的指针。
 * @param[out] pp_svc: 指向查找到的服务输出指针。
 *
 * @retval PLATFORM_ERR_OK        : 找到服务，*pp_svc 指向它。
 * @retval PLATFORM_ERR_PARAM     : p_mgr 或 pp_svc 为 NULL。
 * @retval PLATFORM_ERR_NOT_FOUND : 没有指定名称的服务。
 */
platform_err_t platform_service_manager_get(platform_service_manager_t *p_mgr,
                                            const char *p_name,
                                            platform_service_t **pp_svc);

/**
 * @brief 驱动每个已注册服务的 init 动作。
 *
 * @param[in]  p_mgr   : 指向 service 管理器目标的指针。
 * @param[out] p_result: 指向结果统计的指针，可为 NULL。
 *
 * @retval PLATFORM_ERR_OK : 所有服务驱动成功。
 * @retval PLATFORM_ERR_*  : 批量中的首个错误码。
 */
platform_err_t
platform_service_manager_init_all(platform_service_manager_t *p_mgr,
                                  platform_manager_result_t *p_result);

/**
 * @brief 驱动每个已注册服务的 start 动作。
 *
 * @param[in]  p_mgr   : 指向 service 管理器目标的指针。
 * @param[out] p_result: 指向结果统计的指针，可为 NULL。
 *
 * @retval PLATFORM_ERR_OK : 所有服务驱动成功。
 * @retval PLATFORM_ERR_*  : 批量中的首个错误码。
 */
platform_err_t
platform_service_manager_start_all(platform_service_manager_t *p_mgr,
                                   platform_manager_result_t *p_result);

/**
 * @brief 驱动每个运行中服务的 process 动作。
 *
 * @param[in]  p_mgr   : 指向 service 管理器目标的指针。
 * @param[out] p_result: 指向结果统计的指针，可为 NULL。
 *
 * @retval PLATFORM_ERR_OK : 所有服务驱动成功。
 * @retval PLATFORM_ERR_*  : 批量中的首个错误码。
 */
platform_err_t
platform_service_manager_process_all(platform_service_manager_t *p_mgr,
                                     platform_manager_result_t *p_result);

/**
 * @brief 驱动每个运行中服务的 stop 动作。
 *
 * @param[in]  p_mgr   : 指向 service 管理器目标的指针。
 * @param[out] p_result: 指向结果统计的指针，可为 NULL。
 *
 * @retval PLATFORM_ERR_OK : 所有服务驱动成功。
 * @retval PLATFORM_ERR_*  : 批量中的首个错误码。
 */
platform_err_t
platform_service_manager_stop_all(platform_service_manager_t *p_mgr,
                                  platform_manager_result_t *p_result);

/**
 * @brief 驱动每个已注册服务的 deinit 动作。
 *
 * @param[in]  p_mgr   : 指向 service 管理器目标的指针。
 * @param[out] p_result: 指向结果统计的指针，可为 NULL。
 *
 * @retval PLATFORM_ERR_OK : 所有服务驱动成功。
 * @retval PLATFORM_ERR_*  : 批量中的首个错误码。
 */
platform_err_t
platform_service_manager_deinit_all(platform_service_manager_t *p_mgr,
                                    platform_manager_result_t *p_result);

#endif /* __PLATFORM_SERVICE_MANAGER_H__ */
