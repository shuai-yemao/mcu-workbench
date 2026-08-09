/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file platform_manager.h
 *
 * @par dependencies
 * - platform_def.h
 * - platform_object.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief 提供通用的平台管理器基类对象和统一的生命周期驱动。
 *        适用于所有平台设备和服务。
 *
 * platform_manager_t 是平台设备和服务的通用集合管理器，拥有一个静态对象
 * 槽数组，在启动时注册对象，并统一驱动统一的生命周期：
 *
 *
 *   register -> init -> start -> process -> stop -> deinit
 *
 * 生命周期驱动规则：
 *
 * 1. register 是一种注册动作（state -> REGISTERED，p_parent -> manager），
 *    而不是对象回调。
 * 2. 每个生命周期动作都会先检查对象的前置状态，再调用生命周期回调，并且只
 *    在成功时才更新状态。
 * 3. 批量驱动出错时继续执行，并通过 platform_manager_result_t 报告统计数
 *    据。
 *
 * @version V1.2 2026-08-08
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

#ifndef __PLATFORM_MANAGER_H__
#define __PLATFORM_MANAGER_H__

/* Includes ----------------------------------------------------------------- */

#include "platform_def.h"
#include "platform_object.h"

/* Declaring ---------------------------------------------------------------- */

/**
 * @brief 批量驱动结果统计数据。
 */
typedef struct
{
    platform_err_t first_error; /**< 首个失败错误码。       */
    const char *p_fail_name;    /**< 首个失败对象名称。      */
    uint32_t total;             /**< 本批次对象总数。   */
    uint32_t ok_count;          /**< 成功数量。                 */
    uint32_t skip_count;        /**< 跳过数量（回调为 NULL）。 */
    uint32_t fail_count;        /**< 失败对象数量。           */
} platform_manager_result_t;

/**
 * @brief 通用管理器基类对象。
 */
typedef struct
{
    platform_object_t object;             /**< MANAGER 类型身份。    */
    platform_object_t **pp_objects;       /**< 对象槽数组指针。*/
    uint32_t capacity;                    /**< 槽数组长度。        */
    uint32_t count;                       /**< 已注册对象数量。  */
    platform_object_type_t expected_type; /**< 期望对象类型。     */
} platform_manager_t;

/**
 * @brief 初始化平台管理器的通用管理字段。
 *
 * 步骤：
 *  1. 将管理器对象身份初始化为 PLATFORM_OBJECT_MANAGER。
 *  2. 绑定对象槽数组、容量和期望对象类型。
 *
 * @param[in] p_mgr         : 指向平台管理器目标的指针。
 * @param[in] p_name        : 指向管理器名称字符串的指针。
 * @param[in] pp_objects    : 指向对象槽数组的指针。
 * @param[in] capacity      : 槽数组长度。
 * @param[in] expected_type : 被管理对象的期望对象类型。
 *
 * @retval PLATFORM_ERR_OK    : 管理器已初始化。
 * @retval PLATFORM_ERR_PARAM : p_mgr 或 pp_objects 为 NULL。
 */
platform_err_t platform_manager_init(platform_manager_t *p_mgr,
                                     const char *p_name,
                                     platform_object_t **pp_objects,
                                     uint32_t capacity,
                                     platform_object_type_t expected_type);

/**
 * @brief 将平台对象注册到管理器槽数组中。
 *
 * 步骤：
 *  1. 将对象类型与期望类型进行比对。
 *  2. 拒绝重复注册和槽数组已满的情况。
 *  3. 拒绝在初始化窗口关闭后的注册。
 *  4. 将对象状态写为 REGISTERED，并将 p_parent 绑定到管理器。
 *
 * @param[in] p_mgr : 指向平台管理器目标的指针。
 * @param[in] p_obj : 指向要注册的平台对象的指针。
 *
 * @retval PLATFORM_ERR_OK           : 对象已注册。
 * @retval PLATFORM_ERR_PARAM        : p_mgr/p_obj 为 NULL 或类型不匹配。
 * @retval PLATFORM_ERR_BUSY         : 注册窗口已关闭。
 * @retval PLATFORM_ERR_NO_RESOURCE  : 槽数组已满。
 * @retval PLATFORM_ERR_ALREADY_INIT : 对象已注册。
 */
platform_err_t platform_manager_register(platform_manager_t *p_mgr,
                                         platform_object_t *p_obj);

/**
 * @brief 从管理器槽数组中移除一个平台对象。
 *
 * @param[in] p_mgr : 指向平台管理器目标的指针。
 * @param[in] p_obj : 指向要注销的平台对象的指针。
 *
 * @retval PLATFORM_ERR_OK        : 对象已移除。
 * @retval PLATFORM_ERR_PARAM     : p_mgr 或 p_obj 为 NULL。
 * @retval PLATFORM_ERR_NOT_FOUND : 对象未注册。
 */
platform_err_t platform_manager_unregister(platform_manager_t *p_mgr,
                                           platform_object_t *p_obj);

/**
 * @brief 按名称查找已注册的平台对象。
 *
 * @param[in]  p_mgr   : 指向平台管理器目标的指针。
 * @param[in]  p_name  : 指向要查找的对象名称的指针。
 * @param[out] pp_found: 指向查找到的对象输出结果的指针。
 *
 * @retval PLATFORM_ERR_OK        : 已找到对象，*pp_found 指向该对象。
 * @retval PLATFORM_ERR_PARAM     : p_mgr 或 pp_found 为 NULL。
 * @retval PLATFORM_ERR_NOT_FOUND : 没有指定名称的对象。
 */
platform_err_t platform_manager_find(const platform_manager_t *p_mgr,
                                     const char *p_name,
                                     platform_object_t **pp_found);

/**
 * @brief 返回平台管理器的已注册对象数量。
 *
 * @param[in] p_mgr : 指向平台管理器目标的指针。
 *
 * @return uint32_t : 已注册对象数量。
 */
uint32_t platform_manager_count(const platform_manager_t *p_mgr);

/**
 * @brief 驱动单个对象的生命周期动作。
 *
 * 步骤：
 *  1. 检查对象的有效性和前置状态。
 *  2. 调用生命周期回调（为 NULL 时跳过）。
 *  3. 仅在成功时更新对象状态。
 *
 * @param[in] p_mgr        : 指向平台管理器目标的指针。
 * @param[in] p_obj        : 指向平台对象目标的指针。
 * @param[in] target_state : 生命周期动作的目标状态。
 *
 * @retval PLATFORM_ERR_OK    : 生命周期动作已驱动。
 * @retval PLATFORM_ERR_PARAM : 参数无效或不支持的目标。
 * @retval PLATFORM_ERR_BUSY  : 对象不在可用的前置状态。
 * @retval PLATFORM_ERR_*     : 生命周期回调失败。
 */
platform_err_t platform_manager_drive(platform_manager_t *p_mgr,
                                      platform_object_t *p_obj,
                                      platform_object_state_t target_state);

/**
 * @brief 为每个已注册对象驱动 init 动作。
 *
 * @param[in] p_mgr   : 指向平台管理器目标的指针。
 * @param[out] p_result: 指向结果统计数据的指针，可以为 NULL。
 *
 * @retval PLATFORM_ERR_OK : 所有对象均已成功驱动。
 * @retval PLATFORM_ERR_*  : 批次的第一个失败错误码。
 */
platform_err_t platform_manager_init_all(platform_manager_t *p_mgr,
                                         platform_manager_result_t *p_result);

/**
 * @brief 为每个已注册对象驱动 start 动作。
 *
 * @param[in] p_mgr   : 指向平台管理器目标的指针。
 * @param[out] p_result: 指向结果统计数据的指针，可以为 NULL。
 *
 * @retval PLATFORM_ERR_OK : 所有对象均已成功驱动。
 * @retval PLATFORM_ERR_*  : 批次的第一个失败错误码。
 */
platform_err_t platform_manager_start_all(platform_manager_t *p_mgr,
                                          platform_manager_result_t *p_result);

/**
 * @brief 为每个运行中对象驱动 process 动作。
 *
 * @param[in] p_mgr   : 指向平台管理器目标的指针。
 * @param[out] p_result: 指向结果统计数据的指针，可以为 NULL。
 *
 * @retval PLATFORM_ERR_OK : 所有对象均已成功驱动。
 * @retval PLATFORM_ERR_*  : 批次的第一个失败错误码。
 */
platform_err_t
platform_manager_process_all(platform_manager_t *p_mgr,
                             platform_manager_result_t *p_result);

/**
 * @brief 为每个运行中对象驱动 stop 动作。
 *
 * @param[in] p_mgr   : 指向平台管理器目标的指针。
 * @param[out] p_result: 指向结果统计数据的指针，可以为 NULL。
 *
 * @retval PLATFORM_ERR_OK : 所有对象均已成功驱动。
 * @retval PLATFORM_ERR_*  : 批次的第一个失败错误码。
 */
platform_err_t platform_manager_stop_all(platform_manager_t *p_mgr,
                                         platform_manager_result_t *p_result);

/**
 * @brief 为每个已注册对象驱动 deinit 动作。
 *
 * @param[in] p_mgr   : 指向平台管理器目标的指针。
 * @param[out] p_result: 指向结果统计数据的指针，可以为 NULL。
 *
 * @retval PLATFORM_ERR_OK : 所有对象均已成功驱动。
 * @retval PLATFORM_ERR_*  : 批次的第一个失败错误码。
 */
platform_err_t platform_manager_deinit_all(platform_manager_t *p_mgr,
                                           platform_manager_result_t *p_result);

#endif /* __PLATFORM_MANAGER_H__ */
