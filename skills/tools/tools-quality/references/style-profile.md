---
name: style-profile
description: 嵌入式 C 编码规范（AI 生成代码风格基线）— 命名规则、头文件模板、函数结构、Doxygen 注释、宏/类型注释、代码排版、九大核心原则。当用户要求写嵌入式 C 代码、STM32 驱动、BSP 层、传感器驱动时必须加载此规范作为编码约束。
version: "1.0.0"
---

# 嵌入式 C 编码规范

> AI 生成嵌入式 C 代码时必须遵循的编码约束（tools-quality 风格基线）。
> 本规范整合命名规范 + 头文件模板 + Doxygen 注释规范 + 代码排版规则 + 九大核心原则。

## 硬性约束（违反即错误）

| # | 规则 | 正确 | 错误 |
|---|------|------|------|
| 1 | 缩进 4 空格，禁止 TAB | `    if (x == 0)` | `\tif (x == 0)` |
| 2 | 行宽 ≤ 80 列 | 拆分长行 | 一行到底 |
| 3 | 返回值必须检查 | `ret = func(); if (OK != ret)` | `func();` |
| 4 | 指针必须判空（常数放左边） | `if (NULL == p_data)` | 直接用 `p_data` |
| 5 | 判断时常数放左边 | `if (0 == ret)` | `if (ret == 0)` |
| 6 | 每个函数有 doxygen 注释 | `/** @brief ... */` | 无注释 |
| 7 | 函数内关键步骤有段注释（左对齐-填充-右对齐） | `/* Step --- */` | 无逻辑注释 |
| 8 | 注释语言默认为中文（Doxygen 与段/行尾注释均适用） | `/**< 操作成功 */` | `/**< Operation OK */` |

## 命名速查

> `{proj}` 为项目简称占位符（如 `gp`、`imu`），由用户或工程配置确定；无约定时直接用层名开头。

| 对象 | 规则 | 示例 |
|------|------|------|
| 文件 | `{proj}_{层}_{模块}_{功能}.h/.c` | `{proj}_bsp_mpu6050_driver.h` |
| 对外函数 | `{层}_{模块}_{动作}()` | `bsp_mpu6050_read_reg()` |
| 内部 static 函数 | `{驱动名}_{功能}()` | `mpu6050_read_reg()` |
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
| App 层 | `app_{功能}_` | 场景编排、Task、Logic、UI |
| Service 层 | `service_{模块}_` | 面向业务的稳定服务和策略 |
| Platform 层 | `platform_{模块}_` | 能力接口、统一类型、错误码和对象协议 |
| Impl 层 | `impl_{模块}_` | Platform 接口的具体实现和资源绑定 |
| Vendor 层 | `vendor_{模块}_` | 芯片厂商库、SDK、HAL、LL 或第三方底层实现 |

固定依赖方向为：

```text
App → Service → Platform 接口 ← Impl → Vendor
```

App 不得直接依赖 Platform 的具体实现、Impl、Vendor、HAL、RTOS 或芯片寄存器。

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
 * @file {proj}_{层}_{模块}_{功能}.h
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

#ifndef {PROJ}_{MODULE}_{FUNCTION}_H
#define {PROJ}_{MODULE}_{FUNCTION}_H

/* Includes ---------------------------------------------------------------- */
#include <stdint.h>
#include <stdbool.h>

/* Macros ------------------------------------------------------------------ */

/* {MODULE} 寄存器/位宏定义说明 --------------------------------------------- */
#define {MODULE}_REG_XXX          0x00
#define {MODULE}_BIT_XXX          0

/* Enumerations ------------------------------------------------------------ */

/**
 * @brief {模块} 操作状态枚举
 */
typedef enum
{
    {MODULE}_OK      = 0, /**< 操作成功 */
    {MODULE}_ERROR,       /**< 通用错误 */
    {MODULE}_TIMEOUT,     /**< 操作超时 */
} {module}_status_t;

/* Structures -------------------------------------------------------------- */

/**
 * @brief {模块} 初始化配置结构体
 */
typedef struct
{
    uint8_t member;       /**< {成员说明} */
} {module}_config_t;

/* Public Functions -------------------------------------------------------- */
{module}_status_t {层}_{模块}_init(const {module}_config_t *p_config);
{module}_status_t {层}_{模块}_read_reg(uint8_t reg, uint8_t *p_data);
{module}_status_t {层}_{模块}_write_reg(uint8_t reg, uint8_t data);

#endif /* {PROJ}_{MODULE}_{FUNCTION}_H */
```

### 头文件组织顺序

1. 文件头注释 → 2. 包含保护 → 3. 标准库 → 4. 项目头文件 → 5. 宏定义 → 6. 枚举 → 7. 结构体 → 8. 函数指针 → 9. 函数声明

## 函数结构模板

```c
/**
 * @brief   {一句话描述}
 * @param   {name} [in/out] {说明}
 * @retval  {MODULE}_OK     成功
 * @retval  {MODULE}_ERROR  失败
 * @note    {使用注意事项}
 * @warning {调用前提条件或危险场景}
 * @see     {关联函数交叉引用}
 */
{module}_status_t {层}_{模块}_{动作}({参数列表})
{
    /* Variable declarations ----------------------------------------------- */
    {module}_status_t ret;
    uint8_t           local_var;

    /* Parameter check ----------------------------------------------------- */
    if (NULL == p_data) {
        return {MODULE}_ERROR;
    }

    /* {步骤一描述} -------------------------------------------------------- */
    ret = {底层函数调用}();
    if ({MODULE}_OK != ret) {
        return ret;
    }

    /* {步骤二描述} -------------------------------------------------------- */
    // 核心逻辑

    return {MODULE}_OK;
}
```

**注释格式规则：**
- 注释语言默认为中文；仅当用户或项目明确要求英文时才使用英文
- 段注释文字左对齐，紧跟 `/* ` 之后
- 文字右侧用 `-` 横线填充至第 80 列，结尾为 ` */`
- 函数内每个逻辑块之间空一行
- Doxygen 注释中 `@tag` 统一缩进 2 个空格

## 注释类型速查

| 注释类型 | 格式 | 示例 |
|----------|------|------|
| 文件头注释 | `/** ... */` 块 | `@file`/`@brief`/`@author`/`@version` 必填 |
| 函数 Doxygen | 块注释 | `@brief` + `@param` + `@retval` + `@note`/`@warning`/`@see` |
| 枚举/结构体 | 块注释 + 行尾注释 | `/** @brief */` + `/**< 成员说明 */` |
| 宏定义 | 段注释 | `/* 宏说明 ----------------- */` |
| 函数内步骤 | 段注释 | `/* 步骤说明 ----------------- */` |
| 行尾说明 | 行尾注释 | `/* 简短说明 */` |

## 枚举与结构体注释

```c
/**
 * @brief {模块} 操作状态枚举
 */
typedef enum
{
    {MODULE}_OK      = 0, /**< 操作成功 */
    {MODULE}_ERROR,       /**< 通用错误 */
    {MODULE}_TIMEOUT,     /**< 操作超时 */
} {module}_status_t;

/**
 * @brief {模块} 初始化配置结构体
 */
typedef struct
{
    uint8_t  member1;     /**< {成员说明} */
    uint16_t member2;     /**< {成员说明} */
} {module}_config_t;
```

## 宏定义注释

```c
/* {MODULE} 寄存器地址定义 ----------------------------------------------- */

/* {模块} 器件 ID 寄存器地址 (Datasheet §X.Y) ------------------------------- */
#define {MODULE}_REG_WHO_AM_I     0x75

/* {模块} 配置寄存器地址 (Datasheet §X.Y) --------------------------------- */
#define {MODULE}_REG_CONFIG       0x00

/* {模块} 上电默认配置值 (Datasheet §X.Y) --------------------------------- */
#define {MODULE}_CONFIG_DEFAULT   0x00
```

## 代码排版细节

| # | 规则 | 示例 |
|---|------|------|
| 1 | 缩进 4 空格，禁止 TAB | `    if (0 == ret)` |
| 2 | 行宽 ≤ 80 列 | 超长行在运算符处拆行 |
| 3 | 函数大括号 `{` 换行独行 | `void func(void)\n{` |
| 4 | `if/for/while` 大括号 `{` 同行 | `if (0 == ret) {` |
| 5 | 枚举/结构体大括号 `{` 换行独行 | `typedef enum\n{` |
| 6 | 二元运算符两侧加空格 | `a + b`, `ret == OK`, `x = y` |
| 7 | 一元运算符不空格 | `*p_data`, `&var`, `!flag`, `~mask` |
| 8 | `,` `;` 后加空格 | `func(a, b)`, `for (i = 0; i < n; i++)` |
| 9 | 括号内不加空格 | `func(a, b)` 不写 `func( a, b )` |
| 10 | 指针 `*` 靠变量名 | `uint8_t *p_data` |
| 11 | 判断时常数放左边 | `NULL == p`, `0 != (mask & val)` |
| 12 | 函数间空一行 | 两个函数定义之间一个空行 |
| 13 | 逻辑块间空一行 | 步骤注释前保留一个空行 |
| 14 | 同类型声明对齐 | `uint8_t           reg;\n    uint16_t          value;` |

## 九大核心原则

### 1. 架构先行
定义分层结构再写代码，每个模块只做一件事：
- App 层：编排业务场景，只调用 Service 公开接口
- Service 层：承载业务策略，只依赖 Platform 公开能力
- Platform 层：只定义能力接口、统一类型、错误码和对象协议
- Impl 层：绑定具体 Driver、Handler、板级资源和 Platform 接口
- Vendor 层：提供 HAL、LL、SDK 或芯片底层能力，只被 Impl 依赖

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

### 6. 内存安全
所有缓冲区在作用域内有效：
- DMA 缓冲区使用静态/全局内存，禁止用栈上局部变量
- RTOS 任务栈留有 20% 余量，并结合 HighWaterMark、峰值路径和异常路径验证
- 数组访问前索引判界
- 指针使用前必须判 NULL

### 7. 中断安全
ISR 中遵循"三不"原则：
- 不调用阻塞函数（`HAL_Delay`、`HAL_I2C_Transmit` 等）
- 不获取互斥锁/信号量（除非使用 `FromISR` API）
- `volatile` 只解决编译器优化问题，不等于原子性或线程安全
- 多字节变量、复合状态和读改写操作必须使用临界区、原子操作、队列、通知或其他同步机制

### 8. 初始化顺序
严格遵循 时钟 → GPIO → 外设 → 中断 的初始化顺序：
- 反初始化严格逆序执行
- 模块 init() 时显式检查依赖句柄是否就绪
- 不依赖隐式的 main 调用顺序

### 9. 错误传播
错误必须被显式处理：
- 所有错误路径有 return 或错误处理
- 错误码逐层向上传播，禁止静默吞没
- 每个 `if (err)` 分支都有对应处理
- 外设 HAL 操作后检查返回值

## 输出前自检

生成代码后，逐条确认：
- [ ] 缩进 4 空格，无 TAB
- [ ] 行宽 ≤ 80 列
- [ ] 所有指针判空（`NULL == p_xxx`）
- [ ] 所有返回值检查
- [ ] 判断语句常数放左边
- [ ] 函数有 `@brief` `@param` `@retval`，有则用 `@note`/`@warning`/`@see`
- [ ] 函数内步骤注释为左对齐-填充-右对齐格式（文字靠 `/* `，`*/` 右对齐至第 80 列）
- [ ] 枚举/结构体类型有 `@brief` 总述，成员有 `/**< 说明 */`
- [ ] 宏定义上方有段注释说明用途
- [ ] 命名符合规范（对外函数 `{层}_{模块}_{动作}`，内部 static 函数 `{驱动名}_{功能}`）
- [ ] 分层正确（不越层调用）
- [ ] 头文件组织顺序正确
- [ ] DMA 缓冲区不在栈上，数组索引已判界
- [ ] ISR 中无阻塞调用
- [ ] `volatile` 未被误当作同步机制；多字节变量、复合状态和读改写操作已使用合适的同步机制
- [ ] 初始化顺序为 时钟→GPIO→外设→中断
- [ ] 所有错误路径有 return 或处理，不静默吞没
