/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file impl_log_elog.c
 *
 * @par dependencies
 * - platform_log.h
 * - elog.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief 平台日志抽象 → EasyLogger 桥接实现。
 *
 * 将 platform_log 抽象接口机械映射到 EasyLogger，不含业务编排：
 *
 * 1. platform_log_init()：elog_init → 颜色 → 各级别 fmt → start。
 * 2. platform_log_output()：elog_output 是纯变参函数（无 va_list 版本），
 *    C 标准不允许 variadic→variadic 直接透传，故先在本层用 va_list +
 *    vsnprintf 组帧到本地缓冲，再以 "%s" 单参传给 elog_output，保留
 *    elog 的级别/标签前缀、级别过滤与颜色。
 * 3. platform_log_raw_write()：原始输出原语，桥接 elog_raw_output，
 *    供 platform 层业务（如启动 banner）使用；本层不读取或组织任何
 *    platform 业务数据。
 *
 * @version V1.0 2026-08-09
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

/* Includes ----------------------------------------------------------------- */
/* 平台头在前：board_types.h 提供 typedef uint8 bool;，若先 include elog.h
 * 则会带入 <stdbool.h> 的 bool 宏，二者冲突导致重复类型定义。 */

#include "platform_log.h"

#include <stdarg.h>
#include <stdio.h>

#include <elog.h>

/* Functions ---------------------------------------------------------------- */

/**
 * @brief 初始化平台日志系统。
 *
 * 配置六级别 fmt（模板参考参考工程 debug.c），级别越高信息越精简。
 *
 * @retval PLATFORM_ERR_OK      : 初始化成功。
 * @retval 其他 platform_err_t  : 初始化失败。
 */
platform_err_t platform_log_init(void)
{
    if (elog_init() != ELOG_NO_ERR)
    {
        return PLATFORM_ERR_GENERAL;
    }

    elog_set_text_color_enabled(true);

    /* ASSERT：全部信息，提供最完整上下文。 */
    elog_set_fmt(ELOG_LVL_ASSERT, ELOG_FMT_ALL);

    /* ERROR：时间 + 级别 + 标签 + 路径 + 函数 + 行号。 */
    elog_set_fmt(ELOG_LVL_ERROR, ELOG_FMT_TIME | ELOG_FMT_LVL | ELOG_FMT_TAG | ELOG_FMT_DIR |
                                     ELOG_FMT_FUNC | ELOG_FMT_LINE);

    /* WARN / INFO：时间 + 级别 + 标签。 */
    elog_set_fmt(ELOG_LVL_WARN, ELOG_FMT_TIME | ELOG_FMT_LVL | ELOG_FMT_TAG);
    elog_set_fmt(ELOG_LVL_INFO, ELOG_FMT_TIME | ELOG_FMT_LVL | ELOG_FMT_TAG);

    /* DEBUG：级别 + 标签 + 路径 + 函数 + 行号。 */
    elog_set_fmt(ELOG_LVL_DEBUG,
                 ELOG_FMT_LVL | ELOG_FMT_TAG | ELOG_FMT_DIR | ELOG_FMT_FUNC | ELOG_FMT_LINE);

    /* VERBOSE：仅级别 + 标签，最精简。 */
    elog_set_fmt(ELOG_LVL_VERBOSE, ELOG_FMT_LVL | ELOG_FMT_TAG);

    elog_start();

    return PLATFORM_ERR_OK;
}

/**
 * @brief 反初始化平台日志系统。
 */
void platform_log_deinit(void)
{
    elog_deinit();
}

/**
 * @brief 统一日志输出入口。
 *
 * elog_output 是纯变参函数（无 va_list 版本），C 标准不允许
 * variadic→variadic 直接透传，故先本地组帧再以 "%s" 单参转发，
 * 保留 elog 的级别/标签前缀、级别过滤与颜色。
 *
 * @param[in] level : 日志级别。
 * @param[in] p_tag : 模块 tag。
 * @param[in] p_file: 源文件名。
 * @param[in] p_func: 函数名。
 * @param[in] line  : 行号。
 * @param[in] p_fmt : printf 格式串。
 * @param[in] ...   : 格式参数。
 */
void platform_log_output(platform_log_level_t level, const char *p_tag, const char *p_file,
                         const char *p_func, int32_t line, const char *p_fmt, ...)
{
    char buf[ELOG_LINE_BUF_SIZE];
    va_list args;

    va_start(args, p_fmt);
    (void) vsnprintf(buf, sizeof(buf), p_fmt, args);
    va_end(args);

    elog_output((uint8_t) level, p_tag, p_file, p_func, (long) line, "%s", buf);
}

/**
 * @brief 原始输出原语。
 *
 * 桥接 elog_raw_output（无前缀、不自动换行），供 platform 层业务
 * （如启动 banner）输出排版内容；本层只透传文本，不读取任何
 * platform 业务数据。
 *
 * @param[in] p_fmt : printf 格式串。
 * @param[in] ...   : 格式参数。
 */
void platform_log_raw_write(const char *p_fmt, ...)
{
    char buf[ELOG_LINE_BUF_SIZE];
    va_list args;

    va_start(args, p_fmt);
    (void) vsnprintf(buf, sizeof(buf), p_fmt, args);
    va_end(args);

    elog_raw_output("%s", buf);
}
