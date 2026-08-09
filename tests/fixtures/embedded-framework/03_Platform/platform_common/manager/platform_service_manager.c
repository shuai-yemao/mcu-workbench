/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file platform_service_manager.c
 *
 * @par dependencies
 * - platform_def.h
 * - platform_service_manager.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief 在通用 manager 基础对象之上实现 service 管理器的
 *        特化。
 *
 * 处理流程：
 *
 * 1. 通过 platform_service_manager_register 注册服务。
 * 2. 按名称查询服务。
 * 3. 通过批量包装器驱动服务生命周期。
 *
 * @version V1.2 2026-08-08
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

/* Includes ----------------------------------------------------------------- */

#include "platform_def.h"
#include "platform_service_manager.h"

/* Functions ---------------------------------------------------------------- */

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
                                             const char *p_name)
{
    if (NULL == p_mgr) {
        return PLATFORM_ERR_PARAM;
    }

    return platform_manager_init(&p_mgr->manager, p_name, p_mgr->p_slots,
                                 PLATFORM_SERVICE_MANAGER_MAX_COUNT,
                                 PLATFORM_OBJECT_SERVICE);
}

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
                                  platform_service_t *p_svc)
{
    if ((NULL == p_mgr) || (NULL == p_svc)) {
        return PLATFORM_ERR_PARAM;
    }
    /* 只有 service 对象才能在 service 管理器中注册。 */
    if (!platform_object_is_valid(&p_svc->object, PLATFORM_OBJECT_SERVICE)) {
        return PLATFORM_ERR_PARAM;
    }

    return platform_manager_register(&p_mgr->manager, &p_svc->object);
}

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
                                    platform_service_t *p_svc)
{
    if ((NULL == p_mgr) || (NULL == p_svc)) {
        return PLATFORM_ERR_PARAM;
    }

    return platform_manager_unregister(&p_mgr->manager, &p_svc->object);
}

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
                                            platform_service_t **pp_svc)
{
    platform_object_t *p_obj = NULL;
    platform_err_t ret;

    if ((NULL == p_mgr) || (NULL == pp_svc)) {
        return PLATFORM_ERR_PARAM;
    }

    *pp_svc = NULL;
    ret = platform_manager_find(&p_mgr->manager, p_name, &p_obj);
    if (PLATFORM_ERR_OK != ret) {
        return ret;
    }

    *pp_svc = (platform_service_t *) p_obj;

    return PLATFORM_ERR_OK;
}

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
                                  platform_manager_result_t *p_result)
{
    return platform_manager_init_all(&p_mgr->manager, p_result);
}

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
                                   platform_manager_result_t *p_result)
{
    return platform_manager_start_all(&p_mgr->manager, p_result);
}

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
                                     platform_manager_result_t *p_result)
{
    return platform_manager_process_all(&p_mgr->manager, p_result);
}

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
                                  platform_manager_result_t *p_result)
{
    return platform_manager_stop_all(&p_mgr->manager, p_result);
}

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
                                    platform_manager_result_t *p_result)
{
    return platform_manager_deinit_all(&p_mgr->manager, p_result);
}
