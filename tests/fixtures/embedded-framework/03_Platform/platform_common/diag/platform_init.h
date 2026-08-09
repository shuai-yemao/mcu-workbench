/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file platform_init.h
 *
 * @par dependencies
 * - platform_type.h
 * - platform_error.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief 平台初始化主线框架声明。
 *
 * 定义四阶段初始化入口：boot（最早）→ board（整板）→ service（服务）
 * → app（应用）。实现由 Impl/App 层提供：
 *
 * - plat_boot_init   ：日志系统 + banner + reset reason（impl_middleware）。
 * - plat_board_init  ：板级资源/设备注册（impl 层 board）。
 * - plat_service_init：服务对象注册（01_App/app_init）。
 * - plat_app_init    ：应用对象注册 + 启动整板主线（01_App/app_init）。
 *
 * 组合根（CubeMX main 或 host 冒烟 main）按 boot→board→service→app
 * 顺序调用，任何阶段返回非 OK 即终止启动。
 *
 * @version V1.0 2026-08-09
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

#ifndef __PLATFORM_INIT_H__
#define __PLATFORM_INIT_H__

/* Includes ----------------------------------------------------------------- */

#include "platform_error.h"
#include "platform_type.h"

/* Declaring ---------------------------------------------------------------- */

/**
 * @brief boot 阶段初始化：最早运行的软件初始化。
 *
 * 初始化平台日志系统、打印启动 banner、读取并上报复位原因。
 *
 * @retval PLATFORM_ERR_OK      : 初始化成功。
 * @retval 其他 platform_err_t  : 初始化失败。
 */
platform_err_t plat_boot_init(void);

/**
 * @brief board 阶段初始化：整板资源与设备注册。
 *
 * 初始化 board manager 并注册板载设备（第一版为空注册集）。
 *
 * @retval PLATFORM_ERR_OK      : 初始化成功。
 * @retval 其他 platform_err_t  : 初始化失败。
 */
platform_err_t plat_board_init(void);

/**
 * @brief service 阶段初始化：服务对象注册。
 *
 * 注册各 service 对象（第一版为空，预留系统服务）。
 *
 * @retval PLATFORM_ERR_OK      : 初始化成功。
 * @retval 其他 platform_err_t  : 初始化失败。
 */
platform_err_t plat_service_init(void);

/**
 * @brief app 阶段初始化：应用对象注册与整板主线启动。
 *
 * 注册 app 对象并启动 board manager 主线（device/svc 的 init/start 编排）。
 *
 * @retval PLATFORM_ERR_OK      : 初始化成功。
 * @retval 其他 platform_err_t  : 初始化失败。
 */
platform_err_t plat_app_init(void);

#endif /* __PLATFORM_INIT_H__ */
