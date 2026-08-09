/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file app_init.h
 *
 * @par dependencies
 * - platform_init.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief 应用组合根头文件。
 *
 * 组合根（CubeMX main 或 host 冒烟 main）按
 * plat_boot_init → plat_board_init → plat_service_init → plat_app_init
 * 顺序调用四阶段初始化；任何阶段返回非 OK 即终止启动。
 * 四个阶段函数的声明由 platform_init.h 提供，本头仅作组合根入口导出。
 *
 * @version V1.0 2026-08-09
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

#ifndef __APP_INIT_H__
#define __APP_INIT_H__

/* Includes ----------------------------------------------------------------- */

#include "platform_init.h"

#endif /* __APP_INIT_H__ */
