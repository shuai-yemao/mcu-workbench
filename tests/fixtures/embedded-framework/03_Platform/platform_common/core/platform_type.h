/******************************************************************************
 * Copyright (C) 2024 EternalChip, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file platform_type.h
 *
 * @par dependencies
 * - impl_board/board_types.h
 *
 * @author Jack | R&D Dept. | EternalChip
 *
 * @brief 提供平台基础类型。
 *
 * platform_type.h 是 Platform 层的类型出口。上层应包含本文件，
 * 而不是直接包含 board_types.h。
 *
 * @version V1.2 2026-08-08
 *
 * @note 1 个 Tab == 4 个空格！
 *
 *****************************************************************************/

#ifndef __PLATFORM_TYPE_H__
#define __PLATFORM_TYPE_H__

/* Includes ----------------------------------------------------------------- */

#include "board_types.h"

/* Declaring ---------------------------------------------------------------- */

/* 基础整型：统一为 board_types.h 的固定宽度类型。 */
typedef int8 int8_t;
typedef uint8 uint8_t;
typedef int16 int16_t;
typedef uint16 uint16_t;
typedef int32 int32_t;
typedef uint32 uint32_t;
typedef int64 int64_t;
typedef uint64 uint64_t;

/* 浮点类型：单精度与双精度别名。 */
typedef float32 float_t;
typedef float64 double_t;

/* 字符与布尔类型。 */
typedef char char_t;
typedef uint8 uchar_t;

typedef uint8 bool_t;

#endif /* __PLATFORM_TYPE_H__ */
