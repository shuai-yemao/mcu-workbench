/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file app_init.h
 *
 * @par dependencies
 * - platform_error.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief 应用组合根头文件。
 *
 * 组合根（CubeMX main 或 host 冒烟 main）按
 * plat_boot_init → plat_board_init → plat_service_init → plat_app_init
 * 顺序调用四阶段初始化；任何阶段返回非 OK 即终止启动。
 *
 * 四阶段入口声明属于 App 层（本头文件），不再由平台层
 * （platform_init.h）声明——平台层不声明 App 入口（依赖方向修正）。
 *
 * @version V2.0 2026-08-09
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

#ifndef __APP_INIT_H__
#define __APP_INIT_H__

/* Includes ----------------------------------------------------------------- */

#include "platform_error.h"

/* Declaring ---------------------------------------------------------------- */

/**
 * @brief boot 阶段初始化：最早运行的软件初始化（日志服务 + 启动 banner）。
 *
 * @retval PLATFORM_ERR_OK      : 初始化成功。
 * @retval 其他 platform_err_t  : 初始化失败。
 */
platform_err_t plat_boot_init(void);

/**
 * @brief board 阶段初始化：整板资源与设备注册。
 *
 * @retval PLATFORM_ERR_OK      : 初始化成功。
 * @retval 其他 platform_err_t  : 初始化失败。
 */
platform_err_t plat_board_init(void);

/**
 * @brief service 阶段初始化：服务对象注册。
 *
 * @retval PLATFORM_ERR_OK      : 初始化成功。
 * @retval 其他 platform_err_t  : 初始化失败。
 */
platform_err_t plat_service_init(void);

/**
 * @brief app 阶段初始化：应用对象注册与整板主线启动。
 *
 * @retval PLATFORM_ERR_OK      : 初始化成功。
 * @retval 其他 platform_err_t  : 初始化失败。
 */
platform_err_t plat_app_init(void);

#endif /* __APP_INIT_H__ */
