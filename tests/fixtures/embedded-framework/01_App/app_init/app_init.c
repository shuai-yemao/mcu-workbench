/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file app_init.c
 *
 * @par dependencies
 * - app_init.h
 * - platform_log.h
 * - platform_version.h
 * - platform_reset_reason.h
 * - platform_board_manager.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief 应用组合根：四阶段初始化主线骨架。
 *
 * 处理流程：
 *
 * 1. plat_boot_init()   ：初始化日志系统、打印启动 banner、上报复位原因。
 * 2. plat_board_init()  ：初始化整板管理器并注册板载设备（第一版空）。
 * 3. plat_service_init()：注册服务对象（第一版空）。
 * 4. plat_app_init()    ：启动整板管理器主线
 *    （device.init→service.init→device.start→service.start 编排）。
 *
 * 组合根按上述顺序调用，任何阶段返回非 OK 即终止启动。
 * 注册（init）前置于 board/service 阶段，启动（start）收口在 app 阶段，
 * 复用 platform_board_manager 的 init/start 分离，不自造编排。
 *
 * @version V1.0 2026-08-09
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

/* Includes ----------------------------------------------------------------- */

#include "app_init.h"
#include "platform_board_manager.h"
#include "platform_log.h"
#include "platform_reset_reason.h"
#include "platform_version.h"

/* Declaring ---------------------------------------------------------------- */

/* 整板管理器实例：本文件内 static，跨 board/service/app 阶段共享。 */
static platform_board_manager_t g_board;

/* Functions ---------------------------------------------------------------- */

/**
 * @brief boot 阶段初始化：最早运行的软件初始化。
 *
 * 初始化平台日志系统、打印启动 banner、读取并上报复位原因。
 *
 * @retval PLATFORM_ERR_OK      : 初始化成功。
 * @retval 其他 platform_err_t  : 初始化失败。
 */
platform_err_t plat_boot_init(void)
{
    platform_err_t err;

    err = platform_log_init();
    if (PLATFORM_IS_ERR(err))
    {
        return err;
    }

    platform_banner_print();

    PLATFORM_LOG_I("init", "[boot] reset reason = %s",
                   platform_reset_reason_str(platform_reset_reason_get()));

    return PLATFORM_ERR_OK;
}

/**
 * @brief board 阶段初始化：整板资源与设备注册。
 *
 * 初始化 board manager 并注册板载设备（第一版为空注册集）。
 *
 * @retval PLATFORM_ERR_OK      : 初始化成功。
 * @retval 其他 platform_err_t  : 初始化失败。
 */
platform_err_t plat_board_init(void)
{
    platform_err_t err;

    err = platform_board_manager_init(&g_board);
    if (PLATFORM_IS_ERR(err))
    {
        return err;
    }

    /* TODO: 板载设备注册（第一版为空，后续在此追加 device 注册）。 */
    PLATFORM_LOG_I("init", "[board] devices registered: 0");

    return PLATFORM_ERR_OK;
}

/**
 * @brief service 阶段初始化：服务对象注册。
 *
 * 注册各 service 对象（第一版为空，预留系统服务注册点）。
 *
 * @retval PLATFORM_ERR_OK      : 初始化成功。
 * @retval 其他 platform_err_t  : 初始化失败。
 */
platform_err_t plat_service_init(void)
{
    /* TODO: 服务注册（第一版为空，后续在此追加 service 注册）。 */
    PLATFORM_LOG_I("init", "[service] services registered: 0");

    return PLATFORM_ERR_OK;
}

/**
 * @brief app 阶段初始化：应用对象注册与整板主线启动。
 *
 * 注册 app 对象并启动 board manager 主线（device/svc 的 init/start 编排）。
 *
 * @retval PLATFORM_ERR_OK      : 初始化成功。
 * @retval 其他 platform_err_t  : 初始化失败。
 */
platform_err_t plat_app_init(void)
{
    platform_err_t err;

    /* TODO: 应用对象注册（第一版为空）。 */

    err = platform_board_manager_start(&g_board);

    PLATFORM_LOG_I("init", "[app] board mainline started (rc=%d)", (int) err);

    return err;
}
