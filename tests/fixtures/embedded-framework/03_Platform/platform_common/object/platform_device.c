/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file platform_device.c
 *
 * @par dependencies
 * - platform_def.h
 * - platform_device.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief 实现通用的平台设备（device）基础对象。
 *
 * 处理流程：
 *
 * 1. 构建平台设备（device）的对象身份（identity）。
 * 2. 记录设备（device）类别（class）与 IO 能力（capability）。
 *
 * @version V1.2 2026-08-08
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

/* Includes ----------------------------------------------------------------- */

#include "platform_def.h"
#include "platform_device.h"

/* Functions ---------------------------------------------------------------- */

/**
 * @brief 初始化平台设备（device）的公共管理字段。
 *
 * 步骤：
 *  1. 检查设备（device）指针（pointer）是否有效（valid）。
 *  2. 使用生命周期（lifecycle）绑定初始化内嵌的对象身份（identity）。
 *  3. 记录设备（device）类别（class）与 IO 能力（capability）标志（flags）。
 *
 * @param[in] p_dev       : 指向目标平台设备（device）的指针（pointer）。
 * @param[in] p_name      : 指向设备（device）名称字符串的指针。
 * @param[in] dev_class   : 智能手表设备（device）类别（class）。
 * @param[in] caps        : 静态 IO 能力（capability）标志（flags）。
 * @param[in] p_self      : 指向具体设备（device）对象的指针。
 * @param[in] p_lifecycle : 指向生命周期（lifecycle）回调（callback）表的指针。
 *
 * @retval PLATFORM_ERR_OK    : 设备（device）已初始化。
 * @retval PLATFORM_ERR_PARAM : p_dev 为 NULL。
 */
platform_err_t platform_device_init(platform_device_t *p_dev,
                                    const char *p_name,
                                    platform_device_class_t dev_class,
                                    uint32_t caps, void *p_self,
                                    const platform_lifecycle_ops_t *p_lifecycle)
{
    platform_err_t ret = PLATFORM_ERR_OK;

    if (NULL == p_dev) {
        return PLATFORM_ERR_PARAM;
    }

    if (NULL == p_self) {
        p_self = p_dev;
    }

    ret = platform_object_init(&p_dev->object, p_name, PLATFORM_OBJECT_DEVICE,
                               p_self, NULL, p_lifecycle);
    if (PLATFORM_ERR_OK != ret) {
        return ret;
    }

    p_dev->dev_class = dev_class;
    p_dev->caps = caps;

    return PLATFORM_ERR_OK;
}
