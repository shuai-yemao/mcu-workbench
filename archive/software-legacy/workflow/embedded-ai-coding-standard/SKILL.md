---
name: embedded-ai-coding-standard
description: 嵌入式 C 编码规范 — 命名规则、头文件模板、函数结构、核心原则。当用户要求写嵌入式 C 代码、STM32 驱动、BSP 层、传感器驱动时必须加载此技能作为编码约束。
version: "1.0.0"
---

# 嵌入式 C 编码规范

> AI 生成嵌入式 C 代码时必须遵循的编码约束。
> 本技能整合命名规范 + 头文件模板 + 五大核心原则。

## 硬性约束（违反即错误）

| # | 规则 | 正确 | 错误 |
|---|------|------|------|
| 1 | 缩进 4 空格，禁止 TAB | `    if (x == 0)` | `\tif (x == 0)` |
| 2 | 行宽 ≤ 80 列 | 拆分长行 | 一行到底 |
| 3 | 返回值必须检查 | `ret = func(); if (OK != ret)` | `func();` |
| 4 | 指针必须判空（常数放左边） | `if (NULL == p_data)` | 直接用 `p_data` |
| 5 | 判断时常数放左边 | `if (0 == ret)` | `if (ret == 0)` |
| 6 | 每个函数有 doxygen 注释 | `/** @brief ... */` | 无注释 |
| 7 | 函数内关键步骤有居中注释 | `/* --- Step --- */` | 无逻辑注释 |

## 命名速查

| 对象 | 规则 | 示例 |
|------|------|------|
| 文件 | `ec_{层}_{模块}_{功能}.h/.c` | `ec_bsp_mpu6050_driver.h` |
| 函数 | `{层}_{模块}_{动作}()` | `bsp_mpu6050_read_reg()` |
| 局部变量 | `snake_case` | `reg_addr`, `temp_value` |
| 全局变量 | `g_` + snake_case | `g_current_state` |
| 静态变量 | `s_` + snake_case | `s_buffer` |
| 指针变量 | `p_` 前缀 | `p_data`, `p_reg` |
| 函数指针 | `pf_` 前缀 | `pf_read_reg` |
| 宏 | `UPPER_SNAKE_CASE` | `MPU6050_REG_WHO_AM_I` |
| 枚举类型 | `snake_case_t` | `mpu6050_status_t` |
| 枚举项 | `UPPER_SNAKE_CASE` | `MPU6050_OK` |
| 结构体类型 | `snake_case_t` | `mpu6050_config_t` |
| 结构体成员 | `snake_case` | `config.reg_addr` |
| 回调变量 | `cb` 后缀/中间量 | `pf_mpu6050_irq_cb` |

### 分层命名策略

| 层级 | 前缀 | 职责 |
|------|------|------|
| BSP 层 | `bsp_{模块}_` | 寄存器读写、外设初始化 |
| 驱动层 | `driver_{模块}_` | 设备抽象、数据解析 |
| 适配层 | `adapter_{模块}_` | 接口统一、数据转换 |
| App 层 | `app_{功能}_` | 业务逻辑、状态机 |

### 外设变量命名

| 类型 | 格式 | 示例 |
|------|------|------|
| 缓冲区 | `{模块}_{用途}_buff` | `uart_rx_buff` |
| 句柄 | `{外设}_handle` | `i2c1_handle` |
| 寄存器 | `{模块}_reg_{描述}` | `mpu6050_reg_who_am_i` |
| 引脚 | `{功能}_pin` | `led_pin`, `btn_pin` |
| 超时 | `{模块}_timeout_{值}` | `bsp_timeout_i2c` |
| 标志位 | `{模块}_flag_{描述}` | `bsp_flag_data_ready` |
| 状态机 | `{模块}_state_{状态}` | `app_state_idle` |
| 错误 | `{模块}_err_{类型}` | `bsp_err_i2c_timeout` |

## 头文件模板

```c
/******************************************************************************
 * Copyright (C) 2024 ProjectName, Inc.(Gmbh) or its affiliates.
 *
 * All Rights Reserved.
 *
 * @file ec_{层}_{模块}_{功能}.h
 *
 * @par dependencies
 * - {依赖头文件1}
 * - {依赖头文件2}
 *
 * @author {作者} | R&D Dept. | ProjectName
 *
 * @brief {一句话描述模块功能}
 *
 * Processing flow:
 *
 * {调用流程步骤}
 *
 * @version V1.0 {YYYY-MM-DD}
 *
 * @note 1 tab == 4 spaces!
 *
 ******************************************************************************/

#ifndef EC_{MODULE}_{FUNCTION}_H
#define EC_{MODULE}_{FUNCTION}_H

/* Includes ----------------------------------------------------------------*/
#include <stdint.h>
#include <stdbool.h>

/* Macros ------------------------------------------------------------------*/
#define {MODULE}_REG_XXX          0x00
#define {MODULE}_BIT_XXX          0

/* Enumerations ------------------------------------------------------------*/
typedef enum
{
    {MODULE}_OK = 0,
    {MODULE}_ERROR,
    {MODULE}_TIMEOUT
} {module}_status_t;

/* Structures --------------------------------------------------------------*/
typedef struct
{
    uint8_t member;
} {module}_config_t;

/* Public Functions --------------------------------------------------------*/
{module}_status_t {层}_{模块}_init(const {module}_config_t *p_config);
{module}_status_t {层}_{模块}_read_reg(uint8_t reg, uint8_t *p_data);
{module}_status_t {层}_{模块}_write_reg(uint8_t reg, uint8_t data);

#endif /* EC_{MODULE}_{FUNCTION}_H */
```

### 头文件组织顺序

1. 文件头注释 → 2. 包含保护 → 3. 标准库 → 4. 项目头文件 → 5. 宏定义 → 6. 枚举 → 7. 结构体 → 8. 函数指针 → 9. 函数声明

## 函数结构模板

```c
/**
 * @brief  {一句话描述}
 * @param  {name} [in/out] {说明}
 * @retval {MODULE}_OK     成功
 * @retval {MODULE}_ERROR  失败
 */
{module}_status_t {层}_{模块}_{动作}({参数列表})
{
    /* ---------- Variable declarations ---------- */
    {module}_status_t ret;
    uint8_t local_var;

    /* ------------ Parameter check --------------- */
    if (NULL == p_data)
    {
        return {MODULE}_ERROR;
    }

    /* --- {步骤一描述，居中，两边横线填充} ------ */
    ret = {底层函数调用}();
    if ({MODULE}_OK != ret)
    {
        return ret;
    }

    /* --- {步骤二描述} -------------------------- */
    // 核心逻辑

    return {MODULE}_OK;
}
```

**注释格式规则：**
- 文字居中，两边用 `-` 横线填充
- 右边界对齐到 80 列
- 每个逻辑块之间空一行

## 五大核心原则

### 1. 架构先行
定义分层结构再写代码，每个模块只做一件事：
- BSP 层：仅寄存器操作，不包含业务逻辑
- 驱动层：调用 BSP，解析数据
- App 层：调用驱动，不直接访问 BSP

### 2. 接口契约
模块之间通过函数签名通信：
- 统一返回模块自己的 `{module}_status_t` 枚举
- 输入参数加 `const`，输出参数用指针
- doxygen 注释标注 `[in]`/`[out]`/`[in/out]`

### 3. 命名一致性
严格遵循本技能的命名速查表，不混用风格。

### 4. 增量验证
每次只生成一个函数，编译通过后再继续。
绝不一次生成整个模块。

### 5. 文档即代码
每个头文件有模块注释，每个函数有 doxygen 注释。
代码即文档，文档即代码。

## 输出前自检

生成代码后，逐条确认：
- [ ] 缩进 4 空格，无 TAB
- [ ] 行宽 ≤ 80 列
- [ ] 所有指针判空（`NULL == p_xxx`）
- [ ] 所有返回值检查
- [ ] 判断语句常数放左边
- [ ] 函数有 `@brief` `@param` `@retval`
- [ ] 函数内有居中格式的逻辑注释
- [ ] 命名符合规范（函数 snake_case，宏 UPPER_SNAKE_CASE）
- [ ] 分层正确（不越层调用）
- [ ] 头文件组织顺序正确
