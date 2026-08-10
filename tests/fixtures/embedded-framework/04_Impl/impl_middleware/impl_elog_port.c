/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file impl_elog_port.c
 *
 * @par dependencies
 * - elog.h
 * - SEGGER_RTT.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief EasyLogger 移植层：将 elog 日志输出接到 SEGGER RTT。
 *
 * 处理流程：
 *
 * 1. 初始化时调用 SEGGER_RTT_Init() 建立 RTT 控制块与 ch0 缓冲区。
 * 2. 输出时 elog 组帧后调用 elog_port_output()，本层经 SEGGER_RTT_Write()
 *    写入 up-buffer ch0；host 端由 SEGGER_RTT_ReadUpBuffer()（模拟 J-Link
 *    读取）读回，验证 elog->RTT 链路。
 * 3. 时间戳 / 进程 / 线程信息当前为阶段占位值，后续阶段接入系统时钟
 *    与任务调度器的真实信息。
 *
 * 本文件同时服务 host 端验证（CI 内 gcc 直编）与目标端固件，无需条件编译。
 * 移植函数签名严格对齐 05_Vendor/easylogger/src/elog.c 内的 extern 声明。
 *
 * @version V1.0 2026-08-09
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

/* Includes ----------------------------------------------------------------- */

#include <elog.h>
#include <SEGGER_RTT.h>

/* Functions ---------------------------------------------------------------- */

/**
 * @brief EasyLogger 初始化移植入口。
 *
 * 建立 SEGGER RTT 控制块与 ch0 上/下行缓冲区。
 *
 * @retval ELOG_NO_ERR : 初始化成功。
 */
ElogErrCode elog_port_init(void)
{
    SEGGER_RTT_Init();

    return ELOG_NO_ERR;
}

/**
 * @brief EasyLogger 反初始化移植入口。
 *
 * 当前无资源需要释放（RTT 缓冲为静态内存，随系统常驻）。
 *
 * @retval ELOG_NO_ERR : 反初始化成功。
 */
ElogErrCode elog_port_deinit(void)
{
    return ELOG_NO_ERR;
}

/**
 * @brief EasyLogger 日志输出移植入口。
 *
 * 将 elog 组好的整行日志（非 '\0' 结尾缓冲）以字节流方式写入 RTT up-buffer
 * ch0，host 端读回后按长度截断即可还原。
 *
 * @param[in] log  : 指向日志缓冲的指针（可能含颜色控制序列）。
 * @param[in] size : 日志有效字节数。
 */
void elog_port_output(const char *log, size_t size)
{
    SEGGER_RTT_Write(0u, log, (unsigned)size);
}

/**
 * @brief EasyLogger 输出临界区上锁。
 *
 * 无 OS、无并发写者，空实现。
 */
void elog_port_output_lock(void)
{
}

/**
 * @brief EasyLogger 输出临界区解锁。
 *
 * 无 OS、无并发写者，空实现。
 */
void elog_port_output_unlock(void)
{
}

/**
 * @brief 返回日志时间戳字符串（阶段占位）。
 *
 * 格式 "HH:MM:SS.mmm"，当前为固定假时间，后续由系统时钟源替换。
 *
 * @return 指向时间戳字符串的指针。
 */
const char *elog_port_get_time(void)
{
    return "00:00:00.000";
}

/**
 * @brief 返回日志进程信息（阶段占位）。
 *
 * @return 指向进程名（"main"）的指针。
 */
const char *elog_port_get_p_info(void)
{
    return "main";
}

/**
 * @brief 返回日志线程信息（阶段占位）。
 *
 * @return 指向线程名（"main"）的指针。
 */
const char *elog_port_get_t_info(void)
{
    return "main";
}
