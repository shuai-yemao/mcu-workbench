/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file platform_device.h
 *
 * @par dependencies
 * - platform_object.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief 提供通用的平台设备（device）基础对象。
 *
 * 处理流程：
 *
 * 1. 将 platform_object_t 作为每个设备（device）对象的第一个字段。
 * 2. 通过 platform_device_class_t 对设备（device）分类。
 * 3. 通过 caps（能力位）声明设备（device）的 IO 能力（capability）。
 *
 * 注意：生命周期（lifecycle）现存储于 platform_object_t 中，此处不再重复。
 * 电源状态由对象生命周期（lifecycle）状态机跟踪。
 *
 * @version V1.3 2026-08-11
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

#ifndef __PLATFORM_DEVICE_H__
#define __PLATFORM_DEVICE_H__

/* Includes ----------------------------------------------------------------- */

#include "platform_object.h"

/* Declaring ---------------------------------------------------------------- */

/**
 * @brief 智能手表设备（device）类别（class）。
 */
typedef enum
{
    PLATFORM_DEVICE_CLASS_DISPLAY,    /**< 显示面板设备。            */
    PLATFORM_DEVICE_CLASS_TOUCH,      /**< 触摸面板设备。              */
    PLATFORM_DEVICE_CLASS_IMU,        /**< 运动传感器设备。            */
    PLATFORM_DEVICE_CLASS_TEMP_HUMI,  /**< 温湿度设备。 */
    PLATFORM_DEVICE_CLASS_HEART_RATE, /**< 心率传感器设备。        */
    PLATFORM_DEVICE_CLASS_BATTERY,    /**< 电池与充电器监控。     */
    PLATFORM_DEVICE_CLASS_STORAGE,    /**< 外部或内部存储。    */
    PLATFORM_DEVICE_CLASS_BACKLIGHT,  /**< 显示背光设备。        */
    PLATFORM_DEVICE_CLASS_MOTOR,      /**< 振动电机设备。          */
    PLATFORM_DEVICE_CLASS_CPU,        /**< CPU 或内核时钟控制对象。*/
    PLATFORM_DEVICE_CLASS_CLOCK,      /**< 系统时钟树控制对象。*/
    PLATFORM_DEVICE_CLASS_TICK,       /**< 系统时间基准对象。      */
    PLATFORM_DEVICE_CLASS_UART,       /**< 异步串行控制器对象。    */
    PLATFORM_DEVICE_CLASS_GPIO,       /**< 通用输入输出对象。      */
    PLATFORM_DEVICE_CLASS_IRQ,        /**< 全局中断控制对象。      */
    PLATFORM_DEVICE_CLASS_POWER,      /**< PMIC 或板级电源控制对象。 */
    PLATFORM_DEVICE_CLASS_RTC,        /**< 实时时钟设备。          */
    PLATFORM_DEVICE_CLASS_KEY         /**< 物理按键或按钮设备。   */
} platform_device_class_t;

/**
 * @brief 静态设备（device）IO 能力（capability）。
 */
typedef enum
{
    PLATFORM_DEVICE_CAP_READ = 1u << 0,    /**< 读操作。        */
    PLATFORM_DEVICE_CAP_WRITE = 1u << 1,   /**< 写操作。       */
    PLATFORM_DEVICE_CAP_CONTROL = 1u << 2, /**< 控制操作。     */
    PLATFORM_DEVICE_CAP_IRQ = 1u << 3,     /**< 中断事件。       */
    PLATFORM_DEVICE_CAP_DMA = 1u << 4,     /**< DMA 传输。          */
    PLATFORM_DEVICE_CAP_SLEEP = 1u << 5,   /**< 低功耗休眠（sleep）。        */
    PLATFORM_DEVICE_CAP_WAKEUP = 1u << 6,  /**< 从休眠（sleep）中唤醒（wakeup）。     */
    PLATFORM_DEVICE_CAP_PERIODIC = 1u << 7 /**< 周期处理（process）。    */
} platform_device_cap_t;

/**
 * @brief 每个平台设备（device）的公共管理界面。
 */
typedef struct
{
    platform_object_t object;          /**< 公共身份（identity）与生命周期（lifecycle）。 */
    platform_device_class_t dev_class; /**< 设备（device）类别（class）。                  */
    uint32_t caps;                     /**< 静态 IO 能力（capability）标志（flags）。     */
} platform_device_t;

/**
 * @brief 初始化平台设备（device）的公共管理字段。
 *
 * 步骤：
 *  1. 将设备（device）对象身份（identity）初始化为 PLATFORM_OBJECT_DEVICE。
 *  2. 将生命周期（lifecycle）绑定到内嵌的 platform_object_t。
 *  3. 记录设备（device）类别（class）与静态能力（capability）标志（flags）。
 *
 * @param[in] p_dev       : 指向目标平台设备（device）的指针（pointer）。
 * @param[in] p_name      : 指向设备（device）名称字符串的指针。
 * @param[in] dev_class   : 智能手表设备（device）类别（class）。
 * @param[in] caps        : 静态 IO 能力（capability）标志（flags）。
 * @param[in] p_self      : 指向具体设备（device）对象的指针。
 * @param[in] p_lifecycle : 指向生命周期（lifecycle）回调（callback）表的指针。
 *
 * @retval PLATFORM_ERR_OK    : 设备（device）已初始化。
 * @retval PLATFORM_ERR_PARAM : p_dev 为 NULL。
 */
platform_err_t
platform_device_init(platform_device_t *p_dev, const char *p_name,
                     platform_device_class_t dev_class, uint32_t caps,
                     void *p_self, const platform_lifecycle_ops_t *p_lifecycle);

#endif /* __PLATFORM_DEVICE_H__ */
