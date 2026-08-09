/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file platform_error.h
 *
 * @par dependencies
 * - platform_type.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief 提供平台错误码定义。
 *
 * @version V1.2 2026-08-08
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

#ifndef __PLATFORM_ERROR_H__
#define __PLATFORM_ERROR_H__

/* Includes ----------------------------------------------------------------- */

#include "platform_type.h"

/* Declaring ---------------------------------------------------------------- */

/**
 * @brief 平台统一错误码。
 *
 * @note PLATFORM_ERR_RESERVED 将枚举宽度固定为 32 位。
 */
typedef enum
{
    PLATFORM_ERR_OK = 0,              /**< 无错误。                    */
    PLATFORM_ERR_GENERAL = 1,         /**< 通用失败。             */
    PLATFORM_ERR_TIMEOUT = 2,         /**< 操作超时。         */
    PLATFORM_ERR_PARAM = 3,           /**< 参数无效。           */
    PLATFORM_ERR_NO_MEMORY = 4,       /**< 内存分配失败。    */
    PLATFORM_ERR_NO_RESOURCE = 5,     /**< 缺少所需资源。   */
    PLATFORM_ERR_NOT_SUPPORTED = 6,   /**< 不支持的操作。     */
    PLATFORM_ERR_NOT_INITIALIZED = 7, /**< 对象未初始化。      */
    PLATFORM_ERR_ALREADY_INIT = 8,    /**< 对象已初始化。  */
    PLATFORM_ERR_BUSY = 9,            /**< 对象忙或处于无效阶段。*/
    PLATFORM_ERR_FAIL = 10,           /**< 通用操作失败。   */
    PLATFORM_ERR_NOT_FOUND = 11,      /**< 未找到目标。            */
    PLATFORM_ERR_RESERVED = 0x7FFFFFFF /**< 枚举宽度固定（32 位）。    */
} platform_err_t;

/* 错误判定宏：非 OK 即视为出错。 */
#define PLATFORM_IS_ERR(err) ((err) != PLATFORM_ERR_OK)
#define PLATFORM_IS_OK(err) ((err) == PLATFORM_ERR_OK)

#endif /* __PLATFORM_ERROR_H__ */
