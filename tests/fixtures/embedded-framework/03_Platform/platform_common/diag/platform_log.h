/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file platform_log.h
 *
 * @par dependencies
 * - platform_type.h
 * - platform_error.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief 平台统一日志抽象接口。
 *
 * 平台日志系统第一版：定义日志级别、编译裁剪开关与统一输出宏。
 * 抽象层只声明接口，不依赖任何第三方库；实际输出由 Impl 层
 * （impl_middleware/platform_log_elog.c）桥接到 EasyLogger/RTT。
 *
 * 处理流程：
 *
 * 1. 调用方在模块内使用长宏并显式携带模块 tag，例如
 *    PLATFORM_LOG_I("battery", "level %d%%", 88)。
 * 2. 宏在调用点捕获 __FILE__/__FUNCTION__/__LINE__，转发给
 *    platform_log_output()；Impl 层最终组帧输出到 RTT。
 * 3. PLATFORM_LOG_LEVEL 是编译裁剪开关：降到 INFO 时 D/V 宏整体
 *    编译为空，不产生调用、不占栈。
 *
 * @version V1.0 2026-08-09
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

#ifndef __PLATFORM_LOG_H__
#define __PLATFORM_LOG_H__

/* Includes ----------------------------------------------------------------- */

#include "platform_error.h"
#include "platform_type.h"

/* Defines ------------------------------------------------------------------ */

/* 日志级别宏常量：预处理期可见，供裁剪 #if 比较与日志宏调用。
 * （若用 enum 成员做 #if 比较，预处理阶段 enum 不可见会被视为 0，
 *   导致裁剪判断恒真。） */
#define PLATFORM_LOG_LVL_ASSERT 0  /**< 断言级：最低级。         */
#define PLATFORM_LOG_LVL_ERROR 1   /**< 错误级。                 */
#define PLATFORM_LOG_LVL_WARN 2    /**< 警告级。                 */
#define PLATFORM_LOG_LVL_INFO 3    /**< 信息级：默认常用级别。   */
#define PLATFORM_LOG_LVL_DEBUG 4   /**< 调试级。                 */
#define PLATFORM_LOG_LVL_VERBOSE 5 /**< 冗长级：最高级，全量输出。 */

/**
 * @brief 编译裁剪开关：低于该级别的日志宏整体编译为空。
 *
 * @note 默认全开；模块或构建脚本可在包含本头前覆盖。
 */
#ifndef PLATFORM_LOG_LEVEL
    #define PLATFORM_LOG_LEVEL PLATFORM_LOG_LVL_VERBOSE
#endif

/* Declaring ---------------------------------------------------------------- */

/**
 * @brief 平台日志级别类型，值对齐上述宏常量（供类型化 API 使用）。
 */
typedef enum
{
    PLATFORM_LOG_LEVEL_ASSERT = PLATFORM_LOG_LVL_ASSERT,  /**< 断言级。   */
    PLATFORM_LOG_LEVEL_ERROR = PLATFORM_LOG_LVL_ERROR,    /**< 错误级。   */
    PLATFORM_LOG_LEVEL_WARN = PLATFORM_LOG_LVL_WARN,      /**< 警告级。   */
    PLATFORM_LOG_LEVEL_INFO = PLATFORM_LOG_LVL_INFO,      /**< 信息级。   */
    PLATFORM_LOG_LEVEL_DEBUG = PLATFORM_LOG_LVL_DEBUG,    /**< 调试级。   */
    PLATFORM_LOG_LEVEL_VERBOSE = PLATFORM_LOG_LVL_VERBOSE /**< 冗长级。   */
} platform_log_level_t;

/* Functions ---------------------------------------------------------------- */

/**
 * @brief 初始化平台日志系统（Impl 层实现：elog_init + 格式 + start）。
 *
 * @retval PLATFORM_ERR_OK       : 初始化成功。
 * @retval 其他 platform_err_t   : 初始化失败。
 */
platform_err_t platform_log_init(void);

/**
 * @brief 反初始化平台日志系统（Impl 层实现）。
 */
void platform_log_deinit(void);

/**
 * @brief 统一日志输出入口（Impl 层实现，变参透传 elog_output）。
 *
 * @param[in] level : 日志级别。
 * @param[in] p_tag : 模块 tag。
 * @param[in] p_file: 源文件名（宏捕获 __FILE__）。
 * @param[in] p_func: 函数名（宏捕获 __FUNCTION__）。
 * @param[in] line  : 行号（宏捕获 __LINE__）。
 * @param[in] p_fmt : printf 格式串。
 * @param[in] ...   : 格式参数。
 */
void platform_log_output(platform_log_level_t level, const char *p_tag, const char *p_file,
                         const char *p_func, int32_t line, const char *p_fmt, ...);

/**
 * @brief 原始输出原语（Impl 层实现）。
 *
 * 无级别前缀、无换行追加的纯文本输出，供启动 banner 等需要完全控制
 * 排版内容的场景使用。实现层桥接到 elog_raw_output；platform 层业务
 * （如 platform_banner_print）仅依赖本原语，不直接触碰输出库。
 *
 * @param[in] p_fmt : printf 格式串。
 * @param[in] ...   : 格式参数。
 */
void platform_log_raw_write(const char *p_fmt, ...);

/* 日志宏：在调用点捕获文件/函数/行号，显式携带模块 tag。 */

#if PLATFORM_LOG_LEVEL >= PLATFORM_LOG_LVL_ASSERT
    #define PLATFORM_LOG_A(tag, fmt, ...)                                                          \
        platform_log_output(PLATFORM_LOG_LVL_ASSERT, (tag), __FILE__, __FUNCTION__,                \
                            (int32_t) __LINE__, (fmt), ##__VA_ARGS__)
#else
    #define PLATFORM_LOG_A(tag, fmt, ...) ((void) 0)
#endif

#if PLATFORM_LOG_LEVEL >= PLATFORM_LOG_LVL_ERROR
    #define PLATFORM_LOG_E(tag, fmt, ...)                                                          \
        platform_log_output(PLATFORM_LOG_LVL_ERROR, (tag), __FILE__, __FUNCTION__,                 \
                            (int32_t) __LINE__, (fmt), ##__VA_ARGS__)
#else
    #define PLATFORM_LOG_E(tag, fmt, ...) ((void) 0)
#endif

#if PLATFORM_LOG_LEVEL >= PLATFORM_LOG_LVL_WARN
    #define PLATFORM_LOG_W(tag, fmt, ...)                                                          \
        platform_log_output(PLATFORM_LOG_LVL_WARN, (tag), __FILE__, __FUNCTION__,                  \
                            (int32_t) __LINE__, (fmt), ##__VA_ARGS__)
#else
    #define PLATFORM_LOG_W(tag, fmt, ...) ((void) 0)
#endif

#if PLATFORM_LOG_LEVEL >= PLATFORM_LOG_LVL_INFO
    #define PLATFORM_LOG_I(tag, fmt, ...)                                                          \
        platform_log_output(PLATFORM_LOG_LVL_INFO, (tag), __FILE__, __FUNCTION__,                  \
                            (int32_t) __LINE__, (fmt), ##__VA_ARGS__)
#else
    #define PLATFORM_LOG_I(tag, fmt, ...) ((void) 0)
#endif

#if PLATFORM_LOG_LEVEL >= PLATFORM_LOG_LVL_DEBUG
    #define PLATFORM_LOG_D(tag, fmt, ...)                                                          \
        platform_log_output(PLATFORM_LOG_LVL_DEBUG, (tag), __FILE__, __FUNCTION__,                 \
                            (int32_t) __LINE__, (fmt), ##__VA_ARGS__)
#else
    #define PLATFORM_LOG_D(tag, fmt, ...) ((void) 0)
#endif

#if PLATFORM_LOG_LEVEL >= PLATFORM_LOG_LVL_VERBOSE
    #define PLATFORM_LOG_V(tag, fmt, ...)                                                          \
        platform_log_output(PLATFORM_LOG_LVL_VERBOSE, (tag), __FILE__, __FUNCTION__,               \
                            (int32_t) __LINE__, (fmt), ##__VA_ARGS__)
#else
    #define PLATFORM_LOG_V(tag, fmt, ...) ((void) 0)
#endif

#endif /* __PLATFORM_LOG_H__ */
