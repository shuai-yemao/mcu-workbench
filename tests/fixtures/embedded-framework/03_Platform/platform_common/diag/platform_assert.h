/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file platform_assert.h
 *
 * @par dependencies
 * - platform_type.h
 * - platform_log.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief 平台断言统一出口。
 *
 * 所有模块经 PLATFORM_ASSERT 上报断言失败，行为由 Impl 层实现决定：
 *
 * 1. 注册 hook（platform_assert_set_hook）后，断言失败回调 hook 并返回
 *    ——仅用于 host 冒烟等测试场景注入记录器，避免死循环。
 * 2. 未注册 hook 时（产品路径默认），经**独立于日志系统的原始输出原语**
 *    platform_assert_output 输出故障信息后进入死循环 for(;;)，配合
 *    调试器/看门狗暴露故障现场——不依赖 platform_log（日志可能未初始化
 *    或本身故障，故障路径必须自足，P2）。
 *
 * OS 接线点（本课仅文档标注，待 platform_os 层建立时接线）：
 * - FreeRTOS 的 configASSERT(x) 可重定向到 PLATFORM_ASSERT(x)。
 * - HAL 的 assert_failed(uint16_t file, uint32_t line) 可转调
 *   platform_assert_fail("", file, "assert_failed", (int32_t)line)。
 *
 * @version V1.1 2026-08-09
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

#ifndef __PLATFORM_ASSERT_H__
#define __PLATFORM_ASSERT_H__

/* Includes ----------------------------------------------------------------- */

#include "platform_type.h"

/* Declaring ---------------------------------------------------------------- */

/**
 * @brief 断言失败回调类型。
 *
 * @param[in] p_expr : 失败的断言表达式字符串。
 * @param[in] p_file : 断言所在源文件名。
 * @param[in] p_func : 断言所在函数名。
 * @param[in] line   : 断言所在行号。
 */
typedef void (*platform_assert_hook_t)(const char *p_expr, const char *p_file, const char *p_func,
                                       int32_t line);

/**
 * @brief 断言失败处理入口（Impl 层实现）。
 *
 * 有 hook 则回调 hook 并返回；否则打错误日志后进入死循环。
 *
 * @param[in] p_expr : 失败的断言表达式字符串。
 * @param[in] p_file : 断言所在源文件名。
 * @param[in] p_func : 断言所在函数名。
 * @param[in] line   : 断言所在行号。
 */
void platform_assert_fail(const char *p_expr, const char *p_file, const char *p_func, int32_t line);

/**
 * @brief 注册断言失败 hook。
 *
 * @param[in] p_hook : 回调函数；传 NULL 恢复默认死循环行为。
 */
void platform_assert_set_hook(platform_assert_hook_t p_hook);

/**
 * @brief 断言原始输出原语（Impl 层实现，独立于日志系统）。
 *
 * 故障路径输出不经过 platform_log（日志可能未初始化或本身故障）；
 * 实现直接桥接最简输出通道（如 SEGGER RTT 裸写）。
 *
 * @param[in] p_fmt : printf 格式串。
 * @param[in] ...   : 格式参数。
 */
void platform_assert_output(const char *p_fmt, ...);

/* Defines ------------------------------------------------------------------ */

/**
 * @brief 断言宏：表达式为假时上报失败现场。
 *
 * 在调用点捕获表达式串、文件、函数与行号。
 *
 * @param[in] expr : 待判定的表达式。
 */
#define PLATFORM_ASSERT(expr)                                                                      \
    do                                                                                             \
    {                                                                                              \
        if (!(expr))                                                                               \
        {                                                                                          \
            platform_assert_fail(#expr, __FILE__, __FUNCTION__, (int32_t) __LINE__);               \
        }                                                                                          \
    } while (0)

#endif /* __PLATFORM_ASSERT_H__ */
