/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file platform_device_manager.c
 *
 * @par dependencies
 * - platform_def.h
 * - platform_device_manager.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief 在通用 manager 基础对象之上实现 device 管理器的
 *        特化。
 *
 * 处理流程：
 *
 * 1. 通过 platform_device_manager_register 注册设备。
 * 2. 按名称或类别查询设备。
 * 3. 通过批量包装器驱动设备生命周期。
 *
 * @version V1.2 2026-08-08
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

/* Includes ----------------------------------------------------------------- */

#include "platform_def.h"
#include "platform_device_manager.h"

/* Functions ---------------------------------------------------------------- */

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
                                            const char *p_name)
{
    if (NULL == p_mgr) {
        return PLATFORM_ERR_PARAM;
    }

    return platform_manager_init(&p_mgr->manager, p_name, p_mgr->p_slots,
                                 PLATFORM_DEVICE_MANAGER_MAX_COUNT,
                                 PLATFORM_OBJECT_DEVICE);
}

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
                                 platform_device_t *p_dev)
{
    if ((NULL == p_mgr) || (NULL == p_dev)) {
        return PLATFORM_ERR_PARAM;
    }
    /* 只有 device 对象才能在 device 管理器中注册。 */
    if (!platform_object_is_valid(&p_dev->object, PLATFORM_OBJECT_DEVICE)) {
        return PLATFORM_ERR_PARAM;
    }

    return platform_manager_register(&p_mgr->manager, &p_dev->object);
}

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
                                   platform_device_t *p_dev)
{
    if ((NULL == p_mgr) || (NULL == p_dev)) {
        return PLATFORM_ERR_PARAM;
    }

    return platform_manager_unregister(&p_mgr->manager, &p_dev->object);
}

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
                                           platform_device_t **pp_dev)
{
    platform_object_t *p_obj = NULL;
    platform_err_t ret;

    if ((NULL == p_mgr) || (NULL == pp_dev)) {
        return PLATFORM_ERR_PARAM;
    }

    *pp_dev = NULL;
    ret = platform_manager_find(&p_mgr->manager, p_name, &p_obj);
    if (PLATFORM_ERR_OK != ret) {
        return ret;
    }

    *pp_dev = (platform_device_t *) p_obj;

    return PLATFORM_ERR_OK;
}

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
                                     platform_device_t **pp_dev)
{
    uint32_t i;

    if ((NULL == p_mgr) || (NULL == pp_dev)) {
        return PLATFORM_ERR_PARAM;
    }

    *pp_dev = NULL;

    for (i = 0u; i < p_mgr->manager.count; i++) {
        /* platform_object_t 是 platform_device_t 的第一个字段，因此此
           转换无需 container_of 辅助函数即为布局安全的。 */
        platform_device_t *p_dev =
            (platform_device_t *) p_mgr->manager.pp_objects[i];

        if ((NULL != p_dev) && (dev_class == p_dev->dev_class)) {
            *pp_dev = p_dev;
            return PLATFORM_ERR_OK;
        }
    }

    return PLATFORM_ERR_NOT_FOUND;
}

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
                                 platform_manager_result_t *p_result)
{
    return platform_manager_init_all(&p_mgr->manager, p_result);
}

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
                                  platform_manager_result_t *p_result)
{
    return platform_manager_start_all(&p_mgr->manager, p_result);
}

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
                                    platform_manager_result_t *p_result)
{
    return platform_manager_process_all(&p_mgr->manager, p_result);
}

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
                                 platform_manager_result_t *p_result)
{
    return platform_manager_stop_all(&p_mgr->manager, p_result);
}

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
                                   platform_manager_result_t *p_result)
{
    return platform_manager_deinit_all(&p_mgr->manager, p_result);
}
