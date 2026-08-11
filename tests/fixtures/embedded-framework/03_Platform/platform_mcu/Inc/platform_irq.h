/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file platform_irq.h
 *
 * @par dependencies
 * - platform_device.h
 * - platform_error.h
 * - platform_type.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief 全局中断控制设备契约。
 *
 * 本接口只表示全局中断状态的保存、关闭和恢复，不管理具体外设通道。
 * 状态快照由 platform_irq_ops_t.save 产生，只能交还给同一个对象的
 * restore 操作；嵌套临界区必须按后进先出顺序恢复。
 *
 * @version V2.0 2026-08-11
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

#ifndef PLATFORM_IRQ_H
#define PLATFORM_IRQ_H

/* Includes ----------------------------------------------------------------- */

#include "platform_device.h"
#include "platform_error.h"
#include "platform_type.h"

/* Types -------------------------------------------------------------------- */

typedef struct platform_irq_device platform_irq_device_t;

/** @brief 全局中断静态配置。 */
typedef struct
{
    uint32_t reserved;
} platform_irq_cfg_t;

/** @brief 全局中断实例运行上下文。 */
typedef struct
{
    void *backend_context; /**< 后端上下文，不透明且不归平台层解释。 */
    bool_t ready;           /**< 后端是否已完成启动。 */
} platform_irq_ctx_t;

/** @brief 全局中断状态快照。 */
typedef uint32_t platform_irq_state_t;

/** @brief 全局中断实例当前数据。 */
typedef struct
{
    platform_irq_state_t last_state;
} platform_irq_data_t;

/** @brief 全局中断行为表。 */
typedef struct
{
    platform_irq_state_t (*save)(platform_irq_device_t *p_dev);
    platform_err_t (*restore)(platform_irq_device_t *p_dev,
                             platform_irq_state_t state);
} platform_irq_ops_t;

/**
 * @brief 全局中断设备对象。
 *
 * base 必须是首字段；cfg/ops 为共享只读契约，ctx/data 为实例独有状态。
 */
struct platform_irq_device
{
    platform_device_t base;
    const platform_irq_cfg_t *cfg;
    platform_irq_ctx_t ctx;
    platform_irq_data_t data;
    const platform_irq_ops_t *ops;
};

/* Functions ---------------------------------------------------------------- */

/**
 * @brief 初始化全局中断对象的公共身份和四元组绑定。
 *
 * 具体全局中断指令和状态寄存器不属于 Platform 公共定义，必须由
 * 生命周期和 ops 后端实现。
 */
platform_err_t platform_irq_init(platform_irq_device_t *p_dev, const char *p_name,
                                 const platform_irq_cfg_t *p_cfg,
                                 const platform_irq_ops_t *p_ops,
                                 const platform_lifecycle_ops_t *p_lifecycle);

#endif /* PLATFORM_IRQ_H */
