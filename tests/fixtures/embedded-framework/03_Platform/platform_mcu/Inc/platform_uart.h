/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file platform_uart.h
 *
 * @par dependencies
 * - platform_device.h
 * - platform_error.h
 * - platform_type.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief UART 能力设备契约。
 *
 * 本阶段只定义阻塞发送能力。帧格式、通道映射和后端寄存器配置属于
 * Impl；Platform 只固定跨层可见的参数、错误码和生命周期边界。
 *
 * @version V2.0 2026-08-11
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

#ifndef PLATFORM_UART_H
#define PLATFORM_UART_H

/* Includes ----------------------------------------------------------------- */

#include "platform_device.h"
#include "platform_error.h"
#include "platform_type.h"

/* Types -------------------------------------------------------------------- */

typedef struct platform_uart_device platform_uart_device_t;

/** @brief UART 静态配置。 */
typedef struct
{
    uint32_t baudrate; /**< 波特率，必须大于 0。 */
} platform_uart_cfg_t;

/** @brief UART 实例运行上下文。 */
typedef struct
{
    void *backend_context; /**< 后端上下文，不透明且不归平台层解释。 */
    bool_t ready;           /**< 后端是否已完成启动。 */
} platform_uart_ctx_t;

/** @brief UART 实例当前数据。 */
typedef struct
{
    uint32_t tx_bytes; /**< 已确认发送的累计字节数。 */
} platform_uart_data_t;

/** @brief UART 行为表。 */
typedef struct
{
    platform_err_t (*write)(platform_uart_device_t *p_dev, const uint8_t *p_data,
                            uint32_t len, uint32_t timeout_ms);
} platform_uart_ops_t;

/**
 * @brief UART 设备对象。
 *
 * base 必须是首字段；cfg/ops 为共享只读契约，ctx/data 为实例独有状态。
 */
struct platform_uart_device
{
    platform_device_t base;
    const platform_uart_cfg_t *cfg;
    platform_uart_ctx_t ctx;
    platform_uart_data_t data;
    const platform_uart_ops_t *ops;
};

/* Functions ---------------------------------------------------------------- */

/**
 * @brief 初始化 UART 对象的公共身份和四元组绑定。
 *
 * @retval PLATFORM_ERR_PARAM : p_dev、p_cfg、p_ops 或 p_name 无效。
 * @retval 其他 platform_err_t : platform_common 对象初始化错误。
 */
platform_err_t platform_uart_init(platform_uart_device_t *p_dev, const char *p_name,
                                  const platform_uart_cfg_t *p_cfg,
                                  const platform_uart_ops_t *p_ops,
                                  const platform_lifecycle_ops_t *p_lifecycle);

#endif /* PLATFORM_UART_H */
