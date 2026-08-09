/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file platform_assert.c
 *
 * @par dependencies
 * - platform_assert.h
 * - platform_log.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief 平台断言统一出口实现。
 *
 * 处理流程：
 *
 * 1. 断言失败进入 platform_assert_fail()。
 * 2. 已注册 hook（测试/冒烟注入）→ 回调 hook 后返回，程序继续。
 * 3. 未注册 hook（产品路径默认）→ 打印错误日志后 for(;;) 停机，
 *    暴露故障现场供调试器/看门狗处理。
 *
 * @version V1.0 2026-08-09
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

/* Includes ----------------------------------------------------------------- */

#include "platform_assert.h"
#include "platform_log.h"

/* Declaring ---------------------------------------------------------------- */

/* 断言失败 hook：默认空，注册后优先于死循环行为（仅服务测试场景）。 */
static platform_assert_hook_t s_assert_hook = (platform_assert_hook_t) 0;

/* Functions ---------------------------------------------------------------- */

/**
 * @brief 断言失败处理入口。
 *
 * 有 hook 则回调 hook 并返回；否则打印错误日志后进入死循环。
 *
 * @param[in] p_expr : 失败的断言表达式字符串。
 * @param[in] p_file : 断言所在源文件名。
 * @param[in] p_func : 断言所在函数名。
 * @param[in] line   : 断言所在行号。
 */
void platform_assert_fail(const char *p_expr, const char *p_file, const char *p_func, int32_t line)
{
    if (s_assert_hook != (platform_assert_hook_t) 0)
    {
        s_assert_hook(p_expr, p_file, p_func, line);

        return;
    }

    PLATFORM_LOG_E("assert", "%s assert failed: %s (%s line %d)", p_file, p_expr, p_func,
                   (int) line);

    /* 产品路径默认停机，等待调试器或看门狗接管。 */
    for (;;)
    {
    }
}

/**
 * @brief 注册断言失败 hook。
 *
 * @param[in] p_hook : 回调函数；传 NULL 恢复默认死循环行为。
 */
void platform_assert_set_hook(platform_assert_hook_t p_hook)
{
    s_assert_hook = p_hook;
}
