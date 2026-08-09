/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file platform_manager.c
 *
 * @par dependencies
 * - platform_def.h
 * - platform_manager.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief 实现通用的平台管理器基类对象和统一的生命周期驱动。
 *        适用于所有平台设备和服务。
 *
 * 处理流程：
 *
 * 1. 在启动时将对象注册到静态槽数组中。
 * 2. 通过前置状态规则表驱动每个对象的生命周期。
 * 3. 批量驱动出错时继续执行并报告统计数据。
 *
 * @version V1.2 2026-08-08
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

/* Includes ----------------------------------------------------------------- */

#include "platform_def.h"
#include "platform_manager.h"

/* Defines ------------------------------------------------------------------ */

typedef platform_err_t (*manager_cb_t)(void *p_self);

/* 前置状态规则表的生命周期动作索引。 */
typedef enum
{
    PLATFORM_MANAGER_ACTION_INIT = 0, /* 初始化动作。          */
    PLATFORM_MANAGER_ACTION_START,    /* 启动动作。                   */
    PLATFORM_MANAGER_ACTION_PROCESS,  /* 周期处理动作。          */
    PLATFORM_MANAGER_ACTION_STOP,     /* 停止动作。                    */
    PLATFORM_MANAGER_ACTION_DEINIT,   /* 资源释放动作。        */
    PLATFORM_MANAGER_ACTION_COUNT
} manager_action_t;

/* 生命周期前置状态规则。 */
typedef struct
{
    uint32_t pre_mask;                  /* 允许的前置状态位掩码。  */
    platform_object_state_t ok_state;   /* 成功后的状态。      */
    platform_object_state_t fail_state; /* 失败后的状态。      */
    bool_t keep_on_fail;                /* TRUE 表示失败时保持状态。*/
} manager_rule_t;

/* 根据平台对象状态构建状态位掩码。 */
#define manager_pre(state) (1u << (state))

/* 统一的生命周期前置状态规则表，按动作索引。 */
static const manager_rule_t manager_rules[PLATFORM_MANAGER_ACTION_COUNT] = {
    /* INIT    */ {manager_pre(PLATFORM_OBJECT_REGISTERED),
                   PLATFORM_OBJECT_INITIALIZED, PLATFORM_OBJECT_ERROR,
                   PLATFORM_FALSE},
    /* START   */ {manager_pre(PLATFORM_OBJECT_INITIALIZED),
                   PLATFORM_OBJECT_STARTED, PLATFORM_OBJECT_ERROR,
                   PLATFORM_FALSE},
    /* PROCESS */ {manager_pre(PLATFORM_OBJECT_STARTED),
                   PLATFORM_OBJECT_STARTED, PLATFORM_OBJECT_STARTED,
                   PLATFORM_TRUE},
    /* STOP    */ {manager_pre(PLATFORM_OBJECT_STARTED),
                   PLATFORM_OBJECT_STOPPED, PLATFORM_OBJECT_STARTED,
                   PLATFORM_TRUE},
    /* DEINIT  */ {manager_pre(PLATFORM_OBJECT_INITIALIZED) |
                       manager_pre(PLATFORM_OBJECT_STOPPED) |
                       manager_pre(PLATFORM_OBJECT_STARTED),
                   PLATFORM_OBJECT_DEINITIALIZED, PLATFORM_OBJECT_ERROR,
                   PLATFORM_FALSE}};

/* Functions ---------------------------------------------------------------- */

/**
 * @brief 比较两个对象名称，不依赖标准库。
 *
 * @param[in] p_a : 指向第一个名称的指针。
 * @param[in] p_b : 指向第二个名称的指针。
 *
 * @retval PLATFORM_TRUE  : 两个名称相等。
 * @retval PLATFORM_FALSE : 否则。
 */
static bool_t manager_name_equals(const char *p_a, const char *p_b)
{
    if ((NULL == p_a) || (NULL == p_b)) {
        return PLATFORM_FALSE;
    }

    while (('\0' != *p_a) && ('\0' != *p_b)) {
        if (*p_a != *p_b) {
            return PLATFORM_FALSE;
        }
        p_a++;
        p_b++;
    }

    return (('\0' == *p_a) && ('\0' == *p_b)) ? PLATFORM_TRUE : PLATFORM_FALSE;
}

/**
 * @brief 为给定动作选择生命周期回调。
 *
 * @param[in] action      : 生命周期动作索引。
 * @param[in] p_lifecycle : 指向生命周期回调表的指针。
 *
 * @retval non-NULL : 指向匹配回调的指针。
 * @retval NULL     : 该动作没有回调。
 */
static manager_cb_t
manager_pick_cb(manager_action_t action,
                const platform_lifecycle_ops_t *p_lifecycle)
{
    if (NULL == p_lifecycle) {
        return NULL;
    }

    switch (action) {
        case PLATFORM_MANAGER_ACTION_INIT:
            return p_lifecycle->init;
        case PLATFORM_MANAGER_ACTION_START:
            return p_lifecycle->start;
        case PLATFORM_MANAGER_ACTION_PROCESS:
            return p_lifecycle->process;
        case PLATFORM_MANAGER_ACTION_STOP:
            return p_lifecycle->stop;
        case PLATFORM_MANAGER_ACTION_DEINIT:
            return p_lifecycle->deinit;
        default:
            return NULL;
    }
}

/**
 * @brief 驱动单个对象的生命周期动作。
 *
 * @param[in] p_mgr  : 指向平台管理器目标的指针。
 * @param[in] p_obj  : 指向平台对象目标的指针。
 * @param[in] action : 生命周期动作索引。
 *
 * @retval PLATFORM_ERR_OK    : 生命周期动作已驱动。
 * @retval PLATFORM_ERR_PARAM : 参数无效或对象类型不匹配。
 * @retval PLATFORM_ERR_BUSY  : 对象不在可用的前置状态。
 * @retval PLATFORM_ERR_*     : 生命周期回调失败。
 */
static platform_err_t manager_drive_one(platform_manager_t *p_mgr,
                                        platform_object_t *p_obj,
                                        manager_action_t action)
{
    const manager_rule_t *p_rule;
    manager_cb_t cb;
    platform_err_t ret;

    if ((NULL == p_mgr) || (NULL == p_obj)) {
        return PLATFORM_ERR_PARAM;
    }
    if (!platform_object_is_valid(p_obj, p_mgr->expected_type)) {
        return PLATFORM_ERR_PARAM;
    }

    p_rule = &manager_rules[action];

    /* 拒绝无效的生命周期跳转（前置状态错误）。 */
    if (0u == (p_rule->pre_mask & (1u << p_obj->state))) {
        return PLATFORM_ERR_BUSY;
    }

    cb = manager_pick_cb(action, p_obj->p_lifecycle);
    if (NULL != cb) {
        ret = cb(p_obj->p_self);
        if (PLATFORM_ERR_OK != ret) {
            if (!p_rule->keep_on_fail) {
                (void) platform_object_set_state(p_obj, p_rule->fail_state);
            }
            return ret;
        }
    }

    (void) platform_object_set_state(p_obj, p_rule->ok_state);

    return PLATFORM_ERR_OK;
}

/**
 * @brief 为每个已注册对象驱动相同的生命周期动作。
 *
 * @param[in]  p_mgr   : 指向平台管理器目标的指针。
 * @param[in]  action  : 生命周期动作索引。
 * @param[out] p_result: 指向结果统计数据的指针，可以为 NULL。
 *
 * @retval PLATFORM_ERR_OK : 所有对象均已成功驱动。
 * @retval PLATFORM_ERR_*  : 批次的第一个失败错误码。
 */
static platform_err_t manager_drive_all(platform_manager_t *p_mgr,
                                        manager_action_t action,
                                        platform_manager_result_t *p_result)
{
    platform_err_t ret;
    platform_err_t first_error = PLATFORM_ERR_OK;
    const char *p_fail_name = NULL;
    uint32_t ok_count = 0u;
    uint32_t skip_count = 0u;
    uint32_t fail_count = 0u;
    uint32_t i;

    if (NULL == p_mgr) {
        return PLATFORM_ERR_PARAM;
    }

    for (i = 0u; i < p_mgr->count; i++) {
        platform_object_t *p_obj = p_mgr->pp_objects[i];

        /* 没有匹配回调的对象被跳过，而非失败。 */
        if (NULL == manager_pick_cb(action, (NULL != p_obj) ? p_obj->p_lifecycle
                                                            : NULL)) {
            skip_count++;
            continue;
        }

        ret = manager_drive_one(p_mgr, p_obj, action);
        if (PLATFORM_ERR_OK != ret) {
            /* 不在适用阶段的对象被跳过。 */
            if (PLATFORM_ERR_BUSY == ret) {
                skip_count++;
                continue;
            }

            fail_count++;
            if (PLATFORM_ERR_OK == first_error) {
                first_error = ret;
                p_fail_name = (NULL != p_obj) ? p_obj->name : NULL;
            }
        } else {
            ok_count++;
        }
    }

    if (NULL != p_result) {
        p_result->first_error = first_error;
        p_result->p_fail_name = p_fail_name;
        p_result->total = p_mgr->count;
        p_result->ok_count = ok_count;
        p_result->skip_count = skip_count;
        p_result->fail_count = fail_count;
    }

    return first_error;
}

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
                                     platform_object_type_t expected_type)
{
    platform_err_t ret;

    if ((NULL == p_mgr) || (NULL == pp_objects)) {
        return PLATFORM_ERR_PARAM;
    }

    ret = platform_object_init(&p_mgr->object, p_name, PLATFORM_OBJECT_MANAGER,
                               p_mgr, NULL, NULL);
    if (PLATFORM_ERR_OK != ret) {
        return ret;
    }

    p_mgr->pp_objects = pp_objects;
    p_mgr->capacity = capacity;
    p_mgr->count = 0u;
    p_mgr->expected_type = expected_type;

    return PLATFORM_ERR_OK;
}

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
                                         platform_object_t *p_obj)
{
    uint32_t i;

    if ((NULL == p_mgr) || (NULL == p_obj)) {
        return PLATFORM_ERR_PARAM;
    }
    if (!platform_object_is_valid(p_obj, p_mgr->expected_type)) {
        return PLATFORM_ERR_PARAM;
    }
    /* 初始化已驱动后，注册窗口关闭。 */
    if (PLATFORM_OBJECT_CREATED != p_mgr->object.state) {
        return PLATFORM_ERR_BUSY;
    }
    if (p_mgr->count >= p_mgr->capacity) {
        return PLATFORM_ERR_NO_RESOURCE;
    }

    /* 通过指针或名称拒绝重复注册。 */
    for (i = 0u; i < p_mgr->count; i++) {
        if ((p_mgr->pp_objects[i] == p_obj) ||
            manager_name_equals(p_mgr->pp_objects[i]->name, p_obj->name)) {
            return PLATFORM_ERR_ALREADY_INIT;
        }
    }

    p_mgr->pp_objects[p_mgr->count] = p_obj;
    p_mgr->count++;

    (void) platform_object_set_state(p_obj, PLATFORM_OBJECT_REGISTERED);
    p_obj->p_parent = p_mgr;

    return PLATFORM_ERR_OK;
}

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
                                           platform_object_t *p_obj)
{
    uint32_t i;

    if ((NULL == p_mgr) || (NULL == p_obj)) {
        return PLATFORM_ERR_PARAM;
    }

    for (i = 0u; i < p_mgr->count; i++) {
        if (p_mgr->pp_objects[i] == p_obj) {
            uint32_t j;

            for (j = i; j < (p_mgr->count - 1u); j++) {
                p_mgr->pp_objects[j] = p_mgr->pp_objects[j + 1u];
            }
            p_mgr->count--;

            (void) platform_object_set_state(p_obj, PLATFORM_OBJECT_CREATED);
            p_obj->p_parent = NULL;

            return PLATFORM_ERR_OK;
        }
    }

    return PLATFORM_ERR_NOT_FOUND;
}

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
                                     platform_object_t **pp_found)
{
    uint32_t i;

    if ((NULL == p_mgr) || (NULL == pp_found)) {
        return PLATFORM_ERR_PARAM;
    }

    *pp_found = NULL;

    for (i = 0u; i < p_mgr->count; i++) {
        if (manager_name_equals(p_mgr->pp_objects[i]->name, p_name)) {
            *pp_found = p_mgr->pp_objects[i];
            return PLATFORM_ERR_OK;
        }
    }

    return PLATFORM_ERR_NOT_FOUND;
}

/**
 * @brief 返回平台管理器的已注册对象数量。
 *
 * @param[in] p_mgr : 指向平台管理器目标的指针。
 *
 * @return uint32_t : 已注册对象数量。
 */
uint32_t platform_manager_count(const platform_manager_t *p_mgr)
{
    return (NULL != p_mgr) ? p_mgr->count : 0u;
}

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
                                      platform_object_state_t target_state)
{
    manager_action_t action;

    switch (target_state) {
        case PLATFORM_OBJECT_INITIALIZED:
            action = PLATFORM_MANAGER_ACTION_INIT;
            break;
        case PLATFORM_OBJECT_STARTED:
            action = PLATFORM_MANAGER_ACTION_START;
            break;
        case PLATFORM_OBJECT_STOPPED:
            action = PLATFORM_MANAGER_ACTION_STOP;
            break;
        case PLATFORM_OBJECT_DEINITIALIZED:
            action = PLATFORM_MANAGER_ACTION_DEINIT;
            break;
        default:
            return PLATFORM_ERR_PARAM;
    }

    return manager_drive_one(p_mgr, p_obj, action);
}

/**
 * @brief 为每个已注册对象驱动 init 动作。
 *
 * @param[in]  p_mgr   : 指向平台管理器目标的指针。
 * @param[out] p_result: 指向结果统计数据的指针，可以为 NULL。
 *
 * @retval PLATFORM_ERR_OK : 所有对象均已成功驱动。
 * @retval PLATFORM_ERR_*  : 批次的第一个失败错误码。
 */
platform_err_t platform_manager_init_all(platform_manager_t *p_mgr,
                                         platform_manager_result_t *p_result)
{
    platform_err_t ret =
        manager_drive_all(p_mgr, PLATFORM_MANAGER_ACTION_INIT, p_result);

    /* 一旦 init 已驱动，就关闭注册窗口。 */
    if (NULL != p_mgr) {
        (void) platform_object_set_state(&p_mgr->object,
                                         PLATFORM_OBJECT_INITIALIZED);
    }

    return ret;
}

/**
 * @brief 为每个已注册对象驱动 start 动作。
 *
 * @param[in]  p_mgr   : 指向平台管理器目标的指针。
 * @param[out] p_result: 指向结果统计数据的指针，可以为 NULL。
 *
 * @retval PLATFORM_ERR_OK : 所有对象均已成功驱动。
 * @retval PLATFORM_ERR_*  : 批次的第一个失败错误码。
 */
platform_err_t platform_manager_start_all(platform_manager_t *p_mgr,
                                          platform_manager_result_t *p_result)
{
    return manager_drive_all(p_mgr, PLATFORM_MANAGER_ACTION_START, p_result);
}

/**
 * @brief 为每个运行中对象驱动 process 动作。
 *
 * @param[in]  p_mgr   : 指向平台管理器目标的指针。
 * @param[out] p_result: 指向结果统计数据的指针，可以为 NULL。
 *
 * @retval PLATFORM_ERR_OK : 所有对象均已成功驱动。
 * @retval PLATFORM_ERR_*  : 批次的第一个失败错误码。
 */
platform_err_t platform_manager_process_all(platform_manager_t *p_mgr,
                                            platform_manager_result_t *p_result)
{
    return manager_drive_all(p_mgr, PLATFORM_MANAGER_ACTION_PROCESS, p_result);
}

/**
 * @brief 为每个运行中对象驱动 stop 动作。
 *
 * @param[in]  p_mgr   : 指向平台管理器目标的指针。
 * @param[out] p_result: 指向结果统计数据的指针，可以为 NULL。
 *
 * @retval PLATFORM_ERR_OK : 所有对象均已成功驱动。
 * @retval PLATFORM_ERR_*  : 批次的第一个失败错误码。
 */
platform_err_t platform_manager_stop_all(platform_manager_t *p_mgr,
                                         platform_manager_result_t *p_result)
{
    return manager_drive_all(p_mgr, PLATFORM_MANAGER_ACTION_STOP, p_result);
}

/**
 * @brief 为每个已注册对象驱动 deinit 动作。
 *
 * @param[in]  p_mgr   : 指向平台管理器目标的指针。
 * @param[out] p_result: 指向结果统计数据的指针，可以为 NULL。
 *
 * @retval PLATFORM_ERR_OK : 所有对象均已成功驱动。
 * @retval PLATFORM_ERR_*  : 批次的第一个失败错误码。
 */
platform_err_t platform_manager_deinit_all(platform_manager_t *p_mgr,
                                           platform_manager_result_t *p_result)
{
    return manager_drive_all(p_mgr, PLATFORM_MANAGER_ACTION_DEINIT, p_result);
}
