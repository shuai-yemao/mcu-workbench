/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file service_log.h
 *
 * @par dependencies
 * - platform_log.h
 * - platform_error.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief 日志服务门面（Service 层）。
 *
 * App 层统一经本服务使用日志能力，不直接触碰 platform_log 接口：
 *
 * - service_log_init()：初始化平台日志系统（Impl 层桥接 EasyLogger/RTT）。
 * - service_log_print_banner()：打印启动 banner 与复位原因（内部读版本/复位状态）。
 * - SERVICE_LOG_A/E/W/I/D/V()：日志宏转发，App 调用点捕获文件/函数/行号。
 *
 * 服务实现依赖 Platform 接口（合法方向 Service → Platform），
 * 实际输出由 Impl 层（impl_middleware/platform_log_elog.c）提供。
 *
 * @version V1.0 2026-08-09
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

#ifndef __SERVICE_LOG_H__
#define __SERVICE_LOG_H__

/* Includes ----------------------------------------------------------------- */

#include "platform_error.h"
#include "platform_log.h"

/* Macros ------------------------------------------------------------------- */

/* 日志宏转发：App 层只使用 SERVICE_LOG_*，不直接写 platform_log 符号。 */
#define SERVICE_LOG_A(tag, fmt, ...) PLATFORM_LOG_A((tag), (fmt), ##__VA_ARGS__)
#define SERVICE_LOG_E(tag, fmt, ...) PLATFORM_LOG_E((tag), (fmt), ##__VA_ARGS__)
#define SERVICE_LOG_W(tag, fmt, ...) PLATFORM_LOG_W((tag), (fmt), ##__VA_ARGS__)
#define SERVICE_LOG_I(tag, fmt, ...) PLATFORM_LOG_I((tag), (fmt), ##__VA_ARGS__)
#define SERVICE_LOG_D(tag, fmt, ...) PLATFORM_LOG_D((tag), (fmt), ##__VA_ARGS__)
#define SERVICE_LOG_V(tag, fmt, ...) PLATFORM_LOG_V((tag), (fmt), ##__VA_ARGS__)

/* Declaring ---------------------------------------------------------------- */

/**
 * @brief 初始化平台日志系统（Impl 层桥接 elog_init + 格式 + start）。
 *
 * @retval PLATFORM_ERR_OK      : 初始化成功。
 * @retval 其他 platform_err_t  : 初始化失败。
 */
platform_err_t service_log_init(void);

/**
 * @brief 打印启动 banner 与复位原因。
 *
 * 内部读取平台版本信息（platform_version）与复位原因
 * （platform_reset_reason），经日志系统输出。
 */
void service_log_print_banner(void);

#endif /* __SERVICE_LOG_H__ */
