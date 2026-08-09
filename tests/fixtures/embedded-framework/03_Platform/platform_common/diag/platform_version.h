/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file platform_version.h
 *
 * @par dependencies
 * - platform_type.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief 平台版本与构建信息定义。
 *
 * 提供软件版本、编译日期/时间与 Git Hash 的宏与访问接口。
 * 编译日期/时间使用编译器内置宏（__DATE__/__TIME__），host 与目标端
 * 均可用；Git Hash 预留注入点，由构建脚本以 -DPLATFORM_GIT_HASH 覆盖。
 *
 * @version V1.0 2026-08-09
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

#ifndef __PLATFORM_VERSION_H__
#define __PLATFORM_VERSION_H__

/* Includes ----------------------------------------------------------------- */

#include "platform_type.h"

/* Defines ------------------------------------------------------------------ */

/* 软件版本号：主版本/次版本/修订号与版本字符串。 */
#define PLATFORM_VERSION_MAJOR 1u
#define PLATFORM_VERSION_MINOR 0u
#define PLATFORM_VERSION_PATCH 0u
#define PLATFORM_VERSION_STRING "1.0.0"

/* 工程与品牌名称：启动 banner 展示用。 */
#define PLATFORM_PROJECT_NAME "embedded_framework"
#define PLATFORM_BRAND "EternalChip"

/* 编译日期/时间：编译器内置宏，host/target 通用；可由构建脚本覆盖。 */
#ifndef PLATFORM_BUILD_DATE
    #define PLATFORM_BUILD_DATE __DATE__
#endif

#ifndef PLATFORM_BUILD_TIME
    #define PLATFORM_BUILD_TIME __TIME__
#endif

/* Git Hash：预留注入点，构建脚本以 -DPLATFORM_GIT_HASH='"xxxxxxx"' 覆盖。 */
#ifndef PLATFORM_GIT_HASH
    #define PLATFORM_GIT_HASH "0000000"
#endif

/* Declaring ---------------------------------------------------------------- */

/**
 * @brief 平台版本信息结构。
 */
typedef struct
{
    const char *p_name;       /**< 工程名。       */
    const char *p_version;    /**< 版本字符串。   */
    const char *p_build_date; /**< 编译日期。     */
    const char *p_build_time; /**< 编译时间。     */
    const char *p_git_hash;   /**< Git Hash。     */
    uint32_t version_major;   /**< 主版本号。     */
    uint32_t version_minor;   /**< 次版本号。     */
    uint32_t version_patch;   /**< 修订号。       */
} platform_version_t;

/**
 * @brief 获取平台版本信息。
 *
 * 返回指向静态版本结构体的指针，纯逻辑实现（platform_version.c）。
 *
 * @return 指向版本信息的指针（恒非空）。
 */
const platform_version_t *platform_version_get(void);

/**
 * @brief 打印启动 banner（platform 层实现，输出平台名/版本/编译信息/Git Hash）。
 *
 * 本函数属于业务编排：读取版本信息并按固定排版组帧，经
 * platform_log_raw_write()（Impl 实现）输出，不直接触碰输出库。
 */
void platform_banner_print(void);

#endif /* __PLATFORM_VERSION_H__ */
