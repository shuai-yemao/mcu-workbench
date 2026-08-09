/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file platform_service.c
 *
 * @par dependencies
 * - platform_def.h
 * - platform_service.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief 实现通用的平台服务基类对象。
 *
 * 处理流程：
 *
 * 1. 构建平台服务的对象身份。
 * 2. 记录服务类别。
 * 3. 绑定 cfg/ctx/data/ops，构成四元组模型。
 *
 * @version V1.2 2026-08-08
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

/* Includes ----------------------------------------------------------------- */

#include "platform_def.h"
#include "platform_service.h"

/* Functions ---------------------------------------------------------------- */

/**
 * @brief 初始化不带 data 和 ops 槽位的平台服务。
 *
 * 步骤：
 *  1. 委托给完整的四元组初始化器。
 *  2. 将 data 和 ops 槽位留空（NULL）。
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
                      void *p_ctx, const platform_lifecycle_ops_t *p_lifecycle)
{
    return platform_service_model_init(p_svc, p_name, service_class, p_cfg,
                                       p_ctx, NULL, NULL, p_lifecycle);
}

/**
 * @brief 以完整的四元组模型初始化平台服务。
 *
 * 步骤：
 *  1. 检查服务指针是否有效。
 *  2. 初始化内嵌的对象身份并绑定生命周期。
 *  3. 记录服务类别和全部四元组指针。
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
                            const platform_lifecycle_ops_t *p_lifecycle)
{
    platform_err_t ret = PLATFORM_ERR_OK;

    if (NULL == p_svc) {
        return PLATFORM_ERR_PARAM;
    }

    ret = platform_object_init(&p_svc->object, p_name, PLATFORM_OBJECT_SERVICE,
                               p_svc, NULL, p_lifecycle);
    if (PLATFORM_ERR_OK != ret) {
        return ret;
    }

    p_svc->service_class = service_class;
    p_svc->cfg = p_cfg;
    p_svc->ctx = p_ctx;
    p_svc->data = p_data;
    p_svc->ops = p_ops;

    return PLATFORM_ERR_OK;
}
