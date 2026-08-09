/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file platform_service.h
 *
 * @par dependencies
 * - platform_object.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief 提供通用的平台服务基类对象。
 *
 * 处理流程：
 *
 * 1. 将 platform_object_t 作为每个服务对象的第一个字段。
 * 2. 通过 platform_service_class_t 对服务进行分类。
 * 3. 绑定 cfg/ctx/data/ops，构成四元组服务模型。
 *
 * 生命周期存储在内嵌的 platform_object_t 中。
 *
 * @version V1.2 2026-08-08
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

#ifndef __PLATFORM_SERVICE_H__
#define __PLATFORM_SERVICE_H__

/* Includes ----------------------------------------------------------------- */

#include "platform_object.h"

/* Declaring ---------------------------------------------------------------- */

/**
 * @brief 智能手表服务类别。
 */
typedef enum
{
    PLATFORM_SERVICE_CLASS_SYSTEM,    /**< 系统编排服务。  */
    PLATFORM_SERVICE_CLASS_SENSOR,    /**< 传感器融合或轮询服务。  */
    PLATFORM_SERVICE_CLASS_BATTERY,   /**< 电池估算服务。    */
    PLATFORM_SERVICE_CLASS_POWER,     /**< 电源策略服务。          */
    PLATFORM_SERVICE_CLASS_STORAGE,   /**< 存储管理服务。    */
    PLATFORM_SERVICE_CLASS_BACKLIGHT, /**< 背光策略服务。      */
    PLATFORM_SERVICE_CLASS_BLE,       /**< 蓝牙服务。             */
    PLATFORM_SERVICE_CLASS_OTA        /**< OTA 更新服务。            */
} platform_service_class_t;

/**
 * @brief 每个平台服务的通用管理面。
 */
typedef struct
{
    platform_object_t object;               /**< 通用身份 + 生命周期。 */
    platform_service_class_t service_class; /**< 服务类别。               */
    const void *cfg;                        /**< 静态配置指针。    */
    void *ctx;                              /**< 运行时上下文指针。         */
    void *data;                             /**< 当前服务数据指针。    */
    const void *ops;                        /**< 服务行为操作。 */
} platform_service_t;

/**
 * @brief 初始化不带 data 和 ops 槽位的平台服务。
 *
 * 步骤：
 *  1. 将服务对象身份初始化为 PLATFORM_OBJECT_SERVICE。
 *  2. 将生命周期绑定到内嵌的 platform_object_t。
 *  3. 记录服务类别、cfg 和 ctx 指针。
 *
 * @param[in] p_svc         : 指向平台服务目标的指针。
 * @param[in] p_name        : 指向服务名称字符串的指针。
 * @param[in] service_class : 智能手表服务类别。
 * @param[in] p_cfg         : 指向静态配置的指针。
 * @param[in] p_ctx         : 指向运行时上下文的指针。
 * @param[in] p_lifecycle   : 指向生命周期回调表的指针。
 *
 * @retval PLATFORM_ERR_OK    : 服务已初始化。
 * @retval PLATFORM_ERR_PARAM : p_svc 为 NULL。
 */
platform_err_t
platform_service_init(platform_service_t *p_svc, const char *p_name,
                      platform_service_class_t service_class, const void *p_cfg,
                      void *p_ctx, const platform_lifecycle_ops_t *p_lifecycle);

/**
 * @brief 以完整的四元组模型初始化平台服务。
 *
 * 步骤：
 *  1. 将服务对象身份初始化为 PLATFORM_OBJECT_SERVICE。
 *  2. 将生命周期绑定到内嵌的 platform_object_t。
 *  3. 记录服务类别和全部四元组指针（cfg/ctx/data/ops）。
 *
 * @param[in] p_svc         : 指向平台服务目标的指针。
 * @param[in] p_name        : 指向服务名称字符串的指针。
 * @param[in] service_class : 智能手表服务类别。
 * @param[in] p_cfg         : 指向静态配置的指针。
 * @param[in] p_ctx         : 指向运行时上下文的指针。
 * @param[in] p_data        : 指向当前服务数据的指针。
 * @param[in] p_ops         : 指向服务行为操作的指针。
 * @param[in] p_lifecycle   : 指向生命周期回调表的指针。
 *
 * @retval PLATFORM_ERR_OK    : 服务已初始化。
 * @retval PLATFORM_ERR_PARAM : p_svc 为 NULL。
 */
platform_err_t
platform_service_model_init(platform_service_t *p_svc, const char *p_name,
                            platform_service_class_t service_class,
                            const void *p_cfg, void *p_ctx, void *p_data,
                            const void *p_ops,
                            const platform_lifecycle_ops_t *p_lifecycle);

#endif /* __PLATFORM_SERVICE_H__ */
