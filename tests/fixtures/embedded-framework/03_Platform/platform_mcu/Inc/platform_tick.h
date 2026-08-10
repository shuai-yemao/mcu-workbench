/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file platform_tick.h
 *
 * @par dependencies
 * - platform_type.h
 * - platform_error.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief 统一时间基准接口（平台契约，零芯片依赖）。
 *
 * 提供系统级 1ms 时基：init 启动硬件定时器（目标端 SysTick），
 * get_ms 返回自 init 起的运行毫秒计数。所有层统一从本接口取时间，
 * 不直接触碰芯片定时器寄存器。
 *
 * 与延时接口的分工：
 * - platform_tick_get_ms()：读时间基准（非阻塞，供轮询/超时判定）。
 * - PLATFORM_DELAY_MS()：阻塞等待（platform_def.h 宏，Impl 符号实现）。
 *   两者可共用同一时基，但语义不同：前者"看表"，后者"睡觉"。
 *
 * 回绕语义：uint32 计数约 49.7 天回绕（@96MHz 无关，按计数），
 * 时长比较一律用差值：(end - start) < duration 判定，禁止直接比较
 * 大小（回绕后大值可能变小）。
 *
 * 实现落地：04_Impl/impl_mcu/impl_tick.c（符号实现，链接期注入）。
 *
 * @version V1.0 2026-08-10
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

#ifndef PLATFORM_TICK_H
#define PLATFORM_TICK_H

/* Includes ----------------------------------------------------------------- */

#include "platform_type.h"
#include "platform_error.h"

/* Functions ---------------------------------------------------------------- */

/**
 * @brief 初始化系统时基（1ms 节拍）。
 *
 * 目标端启动硬件定时器中断并清零计数；须在任意依赖时间的服务
 * 使用前调用（boot 阶段，早于 platform_log 之外的业务）。
 *
 * @retval PLATFORM_ERR_OK        : 初始化成功。
 * @retval 其他 platform_err_t    : 初始化失败（目标端相关）。
 */
platform_err_t platform_tick_init(void);

/**
 * @brief 获取自初始化起的系统运行毫秒计数。
 *
 * @return 运行毫秒（uint32，约 49.7 天回绕；差值比较语义见头注释）。
 */
uint32_t platform_tick_get_ms(void);

#endif /* PLATFORM_TICK_H */
