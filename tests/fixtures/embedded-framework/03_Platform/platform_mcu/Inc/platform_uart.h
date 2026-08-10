/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file platform_uart.h
 *
 * @par dependencies
 * - platform_type.h
 * - platform_error.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief UART 写接口（平台契约，零芯片依赖）。
 *
 * 第一版最小能力：阻塞发送（init + write）。UART 标识为平台无关
 * 索引（0 起），目标端映射到具体串口外设（0=USART1、1=USART2、
 * 2=USART6，映射由目标端实现定义）。
 *
 * 帧格式约定：8N1（8 数据位、无校验、1 停止位），第一版固定；
 * 数据位/停止位/校验等配置项按需后补。
 *
 * 读/回调能力（rx）本阶段不提供——先打通"最小发送"，接收链
 * 下一迭代再扩展。
 *
 * 实现落地：04_Impl/impl_mcu/impl_uart.c（符号实现，链接期注入）。
 *
 * @version V1.0 2026-08-10
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

#ifndef PLATFORM_UART_H
#define PLATFORM_UART_H

/* Includes ----------------------------------------------------------------- */

#include "platform_type.h"
#include "platform_error.h"

/* Types -------------------------------------------------------------------- */

/**
 * @brief UART 配置（第一版最小集：仅波特率，帧格式固定 8N1）。
 */
typedef struct
{
    uint32_t baudrate; /**< 波特率（如 115200）。 */
} platform_uart_cfg_t;

/* Functions ---------------------------------------------------------------- */

/**
 * @brief 初始化串口（可重复调用以重配波特率）。
 *
 * @param[in] uart_id : 平台无关串口索引（0 起）。
 * @param[in] p_cfg   : 配置（波特率；帧格式 8N1）。
 *
 * @retval PLATFORM_ERR_OK          : 初始化成功。
 * @retval PLATFORM_ERR_PARAM       : 参数无效。
 * @retval PLATFORM_ERR_NOT_SUPPORTED : 目标端不支持该串口索引。
 * @retval 其他 platform_err_t      : 目标端错误。
 */
platform_err_t platform_uart_init(uint32_t uart_id, const platform_uart_cfg_t *p_cfg);

/**
 * @brief 阻塞发送数据。
 *
 * 在 timeout_ms 内完成全部字节发送；超时返回
 * PLATFORM_ERR_TIMEOUT（已发送部分不保证回滚）。
 *
 * @param[in] uart_id   : 平台无关串口索引。
 * @param[in] p_data    : 待发送数据缓冲。
 * @param[in] len       : 数据长度（字节）。
 * @param[in] timeout_ms: 超时（毫秒）。
 *
 * @retval PLATFORM_ERR_OK       : 发送完成。
 * @retval PLATFORM_ERR_PARAM    : 参数无效。
 * @retval PLATFORM_ERR_TIMEOUT  : 发送超时。
 * @retval PLATFORM_ERR_NOT_SUPPORTED : 目标端不支持该串口索引。
 * @retval 其他 platform_err_t   : 目标端错误。
 */
platform_err_t platform_uart_write(uint32_t uart_id, const uint8_t *p_data, uint32_t len,
                                   uint32_t timeout_ms);

#endif /* PLATFORM_UART_H */
