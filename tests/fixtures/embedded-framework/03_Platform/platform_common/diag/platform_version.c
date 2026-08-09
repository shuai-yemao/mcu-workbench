/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file platform_version.c
 *
 * @par dependencies
 * - platform_version.h
 * - platform_log.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief 平台版本与构建信息实现。
 *
 * 静态版本结构体由宏展开填充，host 与目标端共用；编译日期/时间取自
 * 编译器内置宏，Git Hash 为构建脚本注入占位（未注入时 "0000000"）。
 * 本文件仅提供纯逻辑实现，不依赖任何硬件或第三方库；启动 banner 属于
 * 业务编排，经 platform_log_raw_write()（Impl 实现）输出，不直接触碰
 * 输出库。
 *
 * @version V1.0 2026-08-09
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

/* Includes ----------------------------------------------------------------- */

#include "platform_version.h"
#include "platform_log.h"

/* Defines ------------------------------------------------------------------ */

/* banner 分隔线宽度（与标题长度匹配）。 */
#define PLATFORM_BANNER_LINE "============================================================"

/* 静态版本信息实例：宏展开填充，程序整个生命周期不变。 */
static const platform_version_t s_platform_version = {
    .p_name = PLATFORM_PROJECT_NAME,
    .p_version = PLATFORM_VERSION_STRING,
    .p_build_date = PLATFORM_BUILD_DATE,
    .p_build_time = PLATFORM_BUILD_TIME,
    .p_git_hash = PLATFORM_GIT_HASH,
    .version_major = PLATFORM_VERSION_MAJOR,
    .version_minor = PLATFORM_VERSION_MINOR,
    .version_patch = PLATFORM_VERSION_PATCH,
};

/* Functions ---------------------------------------------------------------- */

/**
 * @brief 获取平台版本信息。
 *
 * @return 指向静态版本信息结构体的指针（恒非空）。
 */
const platform_version_t *platform_version_get(void)
{
    return &s_platform_version;
}

/**
 * @brief 打印启动 banner。
 *
 * 读取版本信息并按固定排版组帧，经 platform_log_raw_write()（Impl 实现，
 * 桥接 elog_raw_output）输出。raw 输出不追加换行，故每行显式补 \r\n。
 */
void platform_banner_print(void)
{
    const platform_version_t *p_ver = platform_version_get();

    platform_log_raw_write("%s\r\n", PLATFORM_BANNER_LINE);
    platform_log_raw_write("  %s v%s (%s)\r\n", p_ver->p_name, p_ver->p_version, PLATFORM_BRAND);
    platform_log_raw_write("  Build : %s %s\r\n", p_ver->p_build_date, p_ver->p_build_time);
    platform_log_raw_write("  Git   : %s\r\n", p_ver->p_git_hash);
    platform_log_raw_write("%s\r\n", PLATFORM_BANNER_LINE);
}
