/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file platform_lifecycle.h
 *
 * @par dependencies
 * - platform_error.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief 提供平台对象生命周期回调表。
 *
 * 处理流程：
 *
 * 1. 对象所有者填写该回调表。
 * 2. 管理器通过该接口统一驱动生命周期。
 * 3. 这些回调描述对象生命周期，包括休眠/唤醒。
 *
 * @version V1.2 2026-08-08
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

#ifndef __PLATFORM_LIFECYCLE_H__
#define __PLATFORM_LIFECYCLE_H__

/* Includes ----------------------------------------------------------------- */

#include "platform_error.h"

/* Declaring ---------------------------------------------------------------- */

/**
 * @brief 平台对象生命周期回调表。
 *
 * @note sleep/wakeup 为可选项，未实现时可为 NULL。
 */
typedef struct
{
    platform_err_t (*init)(void *p_self);    /**< 对象初始化。   */
    platform_err_t (*start)(void *p_self);   /**< 对象启动入口。      */
    platform_err_t (*process)(void *p_self); /**< 可选的周期处理。 */
    platform_err_t (*stop)(void *p_self);    /**< 对象停止入口。       */
    platform_err_t (*sleep)(void *p_self);   /**< 可选的低功耗入口。*/
    platform_err_t (*wakeup)(void *p_self);  /**< 可选的唤醒入口。  */
    platform_err_t (*deinit)(void *p_self);  /**< 对象资源释放。 */
} platform_lifecycle_ops_t;

#endif /* __PLATFORM_LIFECYCLE_H__ */
