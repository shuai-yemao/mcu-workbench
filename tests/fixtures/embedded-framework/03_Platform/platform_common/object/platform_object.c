/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file platform_object.c
 *
 * @par dependencies
 * - platform_def.h
 * - platform_object.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief 实现通用的平台对象身份（identity）与生命周期（lifecycle）模型。
 *
 * 处理流程：
 *
 * 1. 创建带生命周期（lifecycle）绑定的对象身份（identity）字段。
 * 2. 维护对象生命周期（lifecycle）状态记录。
 * 3. 提供基础的魔数（magic）与类型校验。
 *
 * @version V1.2 2026-08-08
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

/* Includes ----------------------------------------------------------------- */

#include "platform_def.h"
#include "platform_object.h"

/* Functions ---------------------------------------------------------------- */

/**
 * @brief 初始化平台对象的公共身份（identity）与生命周期（lifecycle）绑定。
 *
 * 步骤：
 *  1. 检查对象指针（pointer）是否有效（valid）。
 *  2. 写入对象魔数（magic）、名称、类型和已创建状态。
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
platform_err_t platform_object_init(platform_object_t *p_obj,
                                    const char *p_name,
                                    platform_object_type_t type, void *p_self,
                                    void *p_parent,
                                    const platform_lifecycle_ops_t *p_lifecycle)
{
    if (NULL == p_obj) {
        return PLATFORM_ERR_PARAM;
    }
    if (NULL == p_self) {
        p_self = p_obj;
    }

    p_obj->magic = PLATFORM_OBJECT_MAGIC;
    p_obj->name = p_name;
    p_obj->type = type;
    p_obj->state = PLATFORM_OBJECT_CREATED;
    p_obj->flags = 0u;
    p_obj->p_self = p_self;
    p_obj->p_parent = p_parent;
    p_obj->p_lifecycle = p_lifecycle;
    p_obj->user_data = NULL;

    return PLATFORM_ERR_OK;
}

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
                                         platform_object_state_t state)
{
    if (NULL == p_obj) {
        return PLATFORM_ERR_PARAM;
    }

    p_obj->state = state;

    return PLATFORM_ERR_OK;
}

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
                                platform_object_type_t type)
{
    return (NULL != p_obj) && (PLATFORM_OBJECT_MAGIC == p_obj->magic) &&
           (type == p_obj->type);
}
