/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file platform_object.h
 *
 * @par dependencies
 * - platform_lifecycle.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief 提供通用的平台对象身份（identity）与生命周期（lifecycle）模型。
 *
 * platform_object_t 是平台设备（device）、服务（service）、管理器（manager）
 * 以及应用对象共享的基础身份（identity）。
 *
 * 处理流程：
 *
 * 1. 具体对象将 platform_object_t 作为其第一个字段嵌入。
 * 2. 管理器（manager）统一注册对象并驱动生命周期（lifecycle）。
 * 3. 生命周期（lifecycle）是横切性的平台能力，而非按类型各自实现的事项。
 *
 * @version V1.2 2026-08-08
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

#ifndef __PLATFORM_OBJECT_H__
#define __PLATFORM_OBJECT_H__

/* Includes ----------------------------------------------------------------- */

#include "platform_lifecycle.h"

/* Defines ------------------------------------------------------------------ */

/* 对象身份（identity）魔数（magic）：ASCII 'POBJ'。 */
#define PLATFORM_OBJECT_MAGIC 0x504F424Au

/* Declaring ---------------------------------------------------------------- */

/**
 * @brief 平台对象的高层对象类别（category）。
 */
typedef enum
{
    PLATFORM_OBJECT_DEVICE,  /**< 硬件或板级能力对象。   */
    PLATFORM_OBJECT_SERVICE, /**< 可复用的服务（service）能力对象。    */
    PLATFORM_OBJECT_MANAGER, /**< 用于对象集合的管理器（manager）对象。  */
    PLATFORM_OBJECT_APP      /**< 应用层对象。              */
} platform_object_type_t;

/**
 * @brief 平台对象的生命周期（lifecycle）状态记录。
 */
typedef enum
{
    PLATFORM_OBJECT_CREATED,       /**< 对象身份（identity）已创建。      */
    PLATFORM_OBJECT_REGISTERED,    /**< 对象已向其管理器（manager）注册。    */
    PLATFORM_OBJECT_INITIALIZED,   /**< 对象资源已初始化。  */
    PLATFORM_OBJECT_STARTED,       /**< 对象已进入运行阶段。  */
    PLATFORM_OBJECT_STOPPED,       /**< 对象已停止正常运行。   */
    PLATFORM_OBJECT_DEINITIALIZED, /**< 对象已释放所有资源。     */
    PLATFORM_OBJECT_ERROR          /**< 对象进入错误状态。            */
} platform_object_state_t;

/**
 * @brief 作为每个平台对象第一个字段嵌入的公共身份（identity）头，
 *        适用于所有平台对象。
 */
typedef struct
{
    uint32_t magic;                     /**< 运行时身份校验值。   */
    const char *name;                   /**< 对象名称，例如 display0。 */
    platform_object_type_t type;        /**< 对象高层类型。        */
    platform_object_state_t state;      /**< 对象当前生命周期（lifecycle）状态。*/
    uint32_t flags;                     /**< 保留（Reserved）的扩展（extension）标志（flags）。      */
    void *p_self;                       /**< 指向具体所有者对象的指针（pointer）。     */
    void *p_parent;                     /**< 指向父对象或管理器（manager）的指针。  */
    const platform_lifecycle_ops_t
        *p_lifecycle;                   /**< 生命周期（lifecycle）回调（callback）表。      */
    void *user_data;                    /**< 用户扩展（extension）指针（pointer）。        */
} platform_object_t;

/**
 * @brief 初始化平台对象的公共身份（identity）与生命周期（lifecycle）绑定。
 *
 * 步骤：
 *  1. 检查对象指针（pointer）是否有效（valid）。
 *  2. 写入对象魔数（magic）、名称、类型和初始状态。
 *  3. 绑定 p_self、p_parent 和生命周期（lifecycle）回调（callback）表。
 *  4. 清除扩展（extension）标志（flags）和用户数据。
 *
 * @param[in] p_obj        : 指向目标平台对象的指针（pointer）。
 * @param[in] p_name       : 指向对象名称字符串的指针。
 * @param[in] type         : 平台对象高层类型。
 * @param[in] p_self       : 指向具体所有者对象的指针。
 * @param[in] p_parent     : 指向父对象或管理器（manager）对象的指针。
 * @param[in] p_lifecycle  : 指向生命周期（lifecycle）回调（callback）表的指针。
 *
 * @retval PLATFORM_ERR_OK    : 对象身份（identity）已初始化。
 * @retval PLATFORM_ERR_PARAM : p_obj 为 NULL。
 */
platform_err_t
platform_object_init(platform_object_t *p_obj, const char *p_name,
                     platform_object_type_t type, void *p_self, void *p_parent,
                     const platform_lifecycle_ops_t *p_lifecycle);

/**
 * @brief 更新平台对象的生命周期（lifecycle）状态记录。
 *
 * @param[in] p_obj : 指向目标平台对象的指针。
 * @param[in] state : 新的对象生命周期（lifecycle）状态。
 *
 * @retval PLATFORM_ERR_OK    : 状态已更新。
 * @retval PLATFORM_ERR_PARAM : p_obj 为 NULL。
 */
platform_err_t platform_object_set_state(platform_object_t *p_obj,
                                         platform_object_state_t state);

/**
 * @brief 检查平台对象指针（pointer）是否与期望类型（expected type）匹配。
 *
 * @param[in] p_obj : 指向目标平台对象的指针。
 * @param[in] type  : 期望的平台对象高层类型。
 *
 * @retval TRUE  : p_obj 有效（valid）且与期望类型（expected type）匹配。
 * @retval FALSE : 其他情况。
 */
bool_t platform_object_is_valid(const platform_object_t *p_obj,
                                platform_object_type_t type);

#endif /* __PLATFORM_OBJECT_H__ */
