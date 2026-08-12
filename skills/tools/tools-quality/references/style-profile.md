---
name: style-profile
description: MCU Workbench 生成代码与开发者嵌入式 C 代码的统一格式、分层命名和注释规范。
version: "2.0.0"
---

# MCU Workbench 统一代码规范

本文件是插件生成代码、AI 辅助修改代码和开发者新增嵌入式 C 代码的唯一格式、命名与注释规范。
不再按生成代码、BSP 代码或普通手写代码拆分其他风格 Profile。

## 1. 适用范围与优先级

适用范围：`01_App`、`02_Service`、`03_Platform`、`04_Impl`、`05_Vendor`、`99_Utils` 中的嵌入式 C 代码，以及插件生成的 Core、Driver、Handler、Port、Wrapper 文件。

规则优先级：用户明确要求 > 目标工程配置 > 本文件 > 相邻源码兼容约定。

Vendor 官方源码、第三方库和芯片 SDK 保留原始命名与格式，通过 Wrapper、Port 或映射层隔离边界。

## 2. 代码格式

- 使用 4 个空格缩进，禁止 Tab；
- 代码行宽不超过 80 列；
- 函数、枚举和结构体的大括号独占一行；
- `if`、`for`、`while` 的左大括号与语句同行；
- 二元运算符两侧有空格，一元运算符不加空格；
- 函数之间和逻辑步骤之间保留一个空行；
- 不使用居中装饰性分隔线；
- 数据类型从同一列开始，变量名按声明列右对齐；
- 指针 `*` 靠近变量名；
- 行尾注释从同一列开始，结束符 `*/` 右对齐；
- 函数参数使用相同的类型、变量名和注释对齐规则。

```c
uint8_t                         retry_count; /**< 当前重试次数。                 */
uint16_t                              width; /**< 显示宽度，单位：像素。         */
bool                        is_initialized; /**< 初始化完成标志。               */
platform_err_t                       status; /**< 最近一次操作结果。             */
uint8_t                         *p_buffer; /**< 数据缓冲区。                     */
```

函数示例：

```c
platform_err_t
impl_display_handle_init(
    impl_display_handle_t             *p_handle)
{
    platform_err_t                       status;

    if (NULL == p_handle)
    {
        return PLATFORM_ERR_PARAM;
    }

    status = impl_display_driver_init(p_handle->p_driver);
    if (PLATFORM_ERR_OK != status)
    {
        return status;
    }

    return PLATFORM_ERR_OK;
}
```

指针使用前必须判空，比较常量放在左侧，函数返回值必须检查或明确转换为 `(void)`。错误必须返回、转换、记录或进入清理路径。ISR 中不得调用阻塞 API、动态分配、互斥锁或复杂业务逻辑。DMA 缓冲区必须明确地址、长度、对齐、Cache 和所有权边界。

## 3. 分层命名

依赖方向：`App → Service → Platform 接口 ← Impl/BSP → Vendor/HAL/SDK`。

| 层或角色 | 目录/文件示例 | 公开符号前缀 |
|---|---|---|
| App | `01_App/app_main.c` | `app_` |
| Service | `02_Service/service_battery/service_battery.c` | `service_battery_` |
| Platform | `03_Platform/platform_mcu/platform_i2c.h` | `platform_i2c_` |
| Driver | `04_Impl/impl_bsp/<type>/<DEVICE>/impl_w25q64_driver.c` | `impl_w25q64_driver_` |
| Handler | `04_Impl/impl_bsp_handler/<type>/impl_display_handle.c` | `impl_display_handle_` |
| Port | `04_Impl/impl_board/<type>/impl_display_port.c` | `impl_display_port_` |
| Wrapper | `03_Platform/platform_bsp/<type>/platform_display_wrapper.c` | `platform_display_wrapper_` |
| Utils | `99_Utils/utils_crc/utils_crc.c` | `utils_crc_` |
| Vendor | `05_Vendor/<vendor>` | 保留原厂商命名 |

目录、文件、公开符号和类型使用小写 `snake_case`；器件型号目录和配置宏可以保留官方大写型号，例如 `SSD1306`、`IMPL_SSD1306_WIDTH`。

类型规则：

- 结构体和枚举 typedef 使用 `_t`，如 `platform_i2c_t`；
- 操作函数表使用 `_ops_t`，如 `impl_display_driver_ops_t`；
- 状态使用 `_state_t`，事件使用 `_event_t`；
- 函数指针成员使用 `pf_`，指针成员和参数使用 `p_`，二级指针使用 `pp_`；
- 静态变量和静态函数使用 `s_`，全局变量使用 `g_`；
- 布尔成员使用 `is_`、`has_` 或 `enabled`；
- 宏和枚举项使用带模块前缀的 `UPPER_SNAKE_CASE`；
- 不使用拼音缩写、无语义单字母名称或未说明的缩写。

角色边界：Wrapper 只保存抽象 Ops 并转发；Port 拥有具体对象并完成组装；Handler 管理生命周期、队列、缓存、重试和回调；Driver 只实现器件协议，不创建任务、不管理 Handler 缓存、不直接调用 HAL/RTOS。

## 4. 注释格式

- 注释默认使用简体中文；
- 每个文件必须有文件头注释；
- 每个公开函数必须有 Doxygen 注释；
- 私有函数只在逻辑、资源、硬件、并发或错误路径不明显时添加注释；
- 结构体、枚举、函数表和宏只在职责或约束不明显时添加说明；
- 注释必须说明真实行为，不得用注释掩盖未实现逻辑；
- 阻塞、ISR、DMA、Cache、资源所有权、回滚或回调上下文必须明确说明；
- 注释文本左对齐，行尾填充至右边界，结束符 `*/` 右对齐；
- 不使用单独的生成代码注释 Profile。

文件头：

```c
/**
 * @file impl_display_handle.c
 * @par dependencies
 * - impl_display_handle.h
 * - platform_error.h
 * @author MCU Workbench
 * @brief 显示 Handler 的生命周期和状态管理。
 * Processing flow:
 * Port 注入 Driver 和 OS Ops；Handler 管理状态并转发显示操作。
 * @version V1.0
 * @note 阻塞操作只能在任务上下文调用。
 */
```

公开函数：

```c
/**
 * @brief 初始化显示 Handler。
 * @param p_handle 显示 Handler 实例。
 * @retval PLATFORM_ERR_OK 初始化成功。
 * @retval PLATFORM_ERR_PARAM 输入参数无效。
 * @retval PLATFORM_ERR_NOT_SUPPORTED 依赖操作不可用。
 * @warning 可能调用阻塞式 Driver API，不允许在 ISR 中调用。
 */
```

参数方向使用 `[in]`、`[out]`、`[in/out]`；返回值使用 `@retval`，不混用 `@return`。

私有逻辑：

```c
/* 检查输入参数和注入的 Driver 操作。 */
status = s_display_handle_validate(p_handle);

/* 初始化失败时清除 ready 状态，避免保留旧状态。 */
if (PLATFORM_ERR_OK != status)
{
    p_handle->is_initialized = false;
    return status;
}
```

行尾注释只用于短小说明：

```c
uint8_t                         retry_count; /**< 当前重试次数。                 */
bool                        is_initialized; /**< 初始化完成标志。               */
platform_err_t                       status; /**< 最近一次操作结果。             */
```

复杂说明、所有权说明和失败路径说明使用独立块注释，不强行塞进行尾。

## 5. 统一文件结构

头文件顺序：文件头、Include guard、标准库头文件、项目头文件、Public Defines、Public Types、Public Ops、Public Functions、Include guard 结束。

源文件顺序：文件头、Includes、Public Defines、Private Defines、Public Types、Private Types、Public State、Private State、Public Functions、Private Functions。空分区可以省略，实际存在的分区按此顺序排列。

## 6. 生成与审查门禁

- 生成器、模板、校验器和测试均以本文件为唯一风格来源；
- 生成结果必须同时满足格式、命名、注释和分层边界；
- `validate:layer` 只检查命令参数指定的生成切片，不替代编译、主机测试、目标运行或实物验证；
- 格式、命名、注释、功能和安全问题分别报告；
- 发现目标工程存在更高优先级的 `.clang-format` 或 `.editorconfig` 时，以目标工程配置为准并记录差异；
- Vendor/SDK 原生文件不纳入自动重排和重命名范围。
