/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file app_init.c
 *
 * @par dependencies
 * - app_init.h
 * - service_log.h
 * - service_system.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief 应用组合根：四阶段初始化主线骨架。
 *
 * 处理流程：
 *
 * 1. plat_boot_init()   ：初始化日志服务、打印启动 banner（含复位原因）。
 * 2. plat_board_init()  ：经系统服务初始化整板管理器（第一版空注册）。
 * 3. plat_service_init()：注册服务对象（第一版空）。
 * 4. plat_app_init()    ：经系统服务启动整板主线
 *    （device.init→service.init→device.start→service.start 编排）。
 *
 * 组合根按上述顺序调用，任何阶段返回非 OK 即终止启动。
 * 注册（init）前置于 board/service 阶段，启动（start）收口在 app 阶段。
 *
 * App 层只调用 Service 接口（service_log / service_system），
 * 不直接触碰 Platform/Impl/Vendor 符号（依赖铁律 v4.0）。
 *
 * @version V2.0 2026-08-09
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

/* Includes ----------------------------------------------------------------- */

#include "app_init.h"
#include "service_log.h"
#include "service_system.h"

/* Functions ---------------------------------------------------------------- */

/**
 * @brief boot 阶段初始化：最早运行的软件初始化。
 *
 * 初始化日志服务、打印启动 banner（版本 + 复位原因）。
 *
 * @retval PLATFORM_ERR_OK      : 初始化成功。
 * @retval 其他 platform_err_t  : 初始化失败。
 */
platform_err_t plat_boot_init(void)
{
    platform_err_t err;

    err = service_log_init();
    if (PLATFORM_IS_ERR(err))
    {
        return err;
    }

    service_log_print_banner();

    return PLATFORM_ERR_OK;
}

/**
 * @brief board 阶段初始化：整板资源与设备注册。
 *
 * 经系统服务初始化 board manager 并注册板载设备（第一版为空注册集）。
 *
 * @retval PLATFORM_ERR_OK      : 初始化成功。
 * @retval 其他 platform_err_t  : 初始化失败。
 */
platform_err_t plat_board_init(void)
{
    platform_err_t err;

    err = service_system_board_init();
    if (PLATFORM_IS_ERR(err))
    {
        return err;
    }

    /* TODO: 板载设备注册（第一版为空，后续在此追加 device 注册）。 */
    SERVICE_LOG_I("init", "[board] devices registered: 0");

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
    SERVICE_LOG_I("init", "[service] services registered: 0");

    return PLATFORM_ERR_OK;
}

/**
 * @brief app 阶段初始化：应用对象注册与整板主线启动。
 *
 * 注册 app 对象并经系统服务启动 board manager 主线
 * （device/svc 的 init/start 编排）。
 *
 * @retval PLATFORM_ERR_OK      : 初始化成功。
 * @retval 其他 platform_err_t  : 初始化失败。
 */
platform_err_t plat_app_init(void)
{
    platform_err_t err;

    /* TODO: 应用对象注册（第一版为空）。 */

    err = service_system_start();

    SERVICE_LOG_I("init", "[app] board mainline started (rc=%d)", (int) err);

    return err;
}
