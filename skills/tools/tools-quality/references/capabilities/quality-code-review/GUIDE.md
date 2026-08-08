---
name: quality-code-review
description: 嵌入式代码审查 — 九层检查（语法/规范/逻辑/安全/内存/中断/初始化/错误/反模式），对照 style-profile 编码规范审查 AI 生成代码。当用户需要对嵌入式 C 代码进行审查时使用。
version: "1.0.0"
---

# 嵌入式代码审查清单

> 嵌入式 C 代码审查必检项目（对照 [style-profile 编码规范](../../style-profile.md)）。
> 九层检查：语法层 → 规范层 → 逻辑层 → 安全层 → 内存安全层 → 中断安全层 → 初始化顺序层 → 错误传播层 → 反模式检查。

## 审查流程

```
AI 生成代码
    ↓
【第一层】语法检查（编译即发现）
    ↓
【第二层】规范检查（对照编码规范）
    ↓
【第三层】逻辑检查（需人工判断）
    ↓
【第四层】安全检查（硬件相关）
    ↓
【第五层】内存安全（DMA/栈/数组/指针）
    ↓
【第六层】中断安全（ISR 阻塞/共享变量）
    ↓
【第七层】初始化顺序（时钟/GPIO/外设/中断）
    ↓
【第八层】错误传播（错误码/不吞没）
    ↓
【第九层】反模式检查
    ↓
通过 → 编译验证 → 硬件验证
```

---

## 第一层：语法检查

| # | 检查项 | 方法 | 严重度 |
|---|--------|------|--------|
| 1.1 | 编译零警告（`-Wall -Wextra -Werror`） | 直接编译 | **CRITICAL** |
| 1.2 | 所有 `#include` 路径正确 | 检查 include path | **CRITICAL** |
| 1.3 | 宏定义括号完整 `#define FOO (a+b)` | 目视检查 | **HIGH** |
| 1.4 | 类型匹配（不用 `int` 当 `uint32_t`） | 目视检查 | **HIGH** |
| 1.5 | 枚举/结构体类型名以 `_t` 结尾 | 目视检查 | **MEDIUM** |
| 1.6 | 无隐式类型转换（尤其是有符号/无符号混用） | `-Wconversion` | **HIGH** |

---

## 第二层：规范检查

| # | 检查项 | 规范要求 | 严重度 |
|---|--------|---------|--------|
| 2.1 | 缩进为 4 空格，无 TAB | 编码规范 #1 | **CRITICAL** |
| 2.2 | 行宽 ≤ 80 列 | 编码规范 #2 | **HIGH** |
| 2.3 | 文件命名 `{proj}_{层}_{模块}_{功能}.h/.c` | 命名规范 | **MEDIUM** |
| 2.4 | 对外函数命名 `{层}_{模块}_{动作}()`，内部 static 函数 `{驱动名}_{功能}()` | 命名规范 | **MEDIUM** |
| 2.5 | 宏命名 `UPPER_SNAKE_CASE` | 命名规范 | **MEDIUM** |
| 2.6 | 局部变量 `snake_case` | 命名规范 | **MEDIUM** |
| 2.7 | 指针变量 `p_` 前缀 | 命名规范 | **LOW** |
| 2.8 | 全局变量 `g_` 前缀，静态变量 `s_` 前缀 | 命名规范 | **LOW** |
| 2.9a | 函数有 `@brief` 且说清函数意图 | 编码规范 #6 | **HIGH** |
| 2.9b | `@param` 标注所有参数，方向 `[in]`/`[out]`/`[in/out]` 正确 | 编码规范 #6 | **HIGH** |
| 2.9c | `@retval` 覆盖所有可能返回值 | 编码规范 #6 | **HIGH** |
| 2.9d | `@note` 描述使用注意事项（若函数有注意点） | Doxygen 规范 | **MEDIUM** |
| 2.9e | `@warning` 标注调用前提/危险场景（若存在） | Doxygen 规范 | **MEDIUM** |
| 2.9f | `@see` 交叉引用关联函数（若存在） | Doxygen 规范 | **LOW** |
| 2.10 | 函数内步骤注释为左对齐-填充-右对齐格式 | 编码规范 #7 | **MEDIUM** |
| 2.11 | 头文件组织顺序正确 | header-template 顺序表 | **MEDIUM** |
| 2.12 | 枚举类型有 `@brief` 总述，枚举项有 `/**< 说明 */` | 类型注释规范 | **MEDIUM** |
| 2.13 | 结构体类型有 `@brief` 总述，成员有 `/**< 说明 */` | 类型注释规范 | **MEDIUM** |
| 2.14 | 宏定义上方有段注释说明用途 | 宏注释规范 | **MEDIUM** |
| 2.15 | 注释与代码一致（无过期/误导性注释） | 注释维护 | **HIGH** |

---

## 第三层：逻辑检查

| # | 检查项 | 方法 | 严重度 |
|---|--------|------|--------|
| 3.1 | **所有指针使用前判空** `if (NULL == p_xxx)` | 搜索每个 `p_` 变量 | **CRITICAL** |
| 3.2 | **所有函数调用检查返回值** | 搜索每个函数调用 | **CRITICAL** |
| 3.3 | 判断语句常数放左边 `if (0 == ret)` | 搜索 `if (` | **HIGH** |
| 3.4 | 不越层调用（BSP 不调 App，App 不直接调 HAL） | 检查 `#include` 和调用链 | **HIGH** |
| 3.5 | 错误路径有 return，不会"fall through" | 跟踪每个 `if (err)` 分支 | **CRITICAL** |
| 3.6 | 循环有退出条件，不会死循环 | 检查 `while`/`for` | **CRITICAL** |
| 3.7 | 数组索引不越界 | 检查数组访问 | **HIGH** |
| 3.8 | I2C/SPI 地址正确（7bit vs 8bit） | 对照 datasheet | **HIGH** |
| 3.9 | 寄存器地址正确 | 对照 datasheet | **CRITICAL** |

---

## 第四层：安全检查

| # | 检查项 | 方法 | 严重度 |
|---|--------|------|--------|
| 4.1 | 中断回调不调用阻塞函数（I2C 等待、延时等） | 检查 `HAL_xxx_IRQHandler` | **CRITICAL** |
| 4.2 | 中断回调不访问非原子全局变量 | 检查中断内全局变量访问 | **CRITICAL** |
| 4.3 | DMA 缓冲区对齐和内存区域正确（非栈上） | 检查 DMA buffer 声明 | **CRITICAL** |
| 4.4 | 看门狗在长操作前喂狗 | 检查耗时操作 | **HIGH** |
| 4.5 | 堆栈大小足够（尤其是 RTOS 任务栈） | 检查栈大小声明 | **HIGH** |
| 4.6 | 时钟配置正确（HSI/HSE/PLL 频率匹配） | 对照时钟树 | **CRITICAL** |
| 4.7 | GPIO 模式配置正确（推挽/开漏/上下拉） | 对照原理图 | **HIGH** |

---

## 第五层：内存安全检查

| # | 检查项 | 方法 | 严重度 |
|---|--------|------|--------|
| 5.1 | DMA 缓冲区不在栈上（局部变量） | 检查 DMA buffer 声明位置 | **CRITICAL** |
| 5.2 | 数组访问前索引判界 | 检查数组访问处是否有边界判断 | **CRITICAL** |
| 5.3 | 所有指针使用前判 NULL | 搜索每个 `p_` 变量 | **CRITICAL** |
| 5.4 | 无动态内存分配（malloc/free） | 搜索 `malloc`/`free` | **HIGH** |
| 5.5 | RTOS 任务栈留有 50% 余量 | 检查栈大小声明与 HighWaterMark | **HIGH** |

---

## 第六层：中断安全检查

| # | 检查项 | 方法 | 严重度 |
|---|--------|------|--------|
| 6.1 | ISR 中无阻塞调用（HAL_Delay/I2C/SPI transmit） | 检查 ISR 函数体 | **CRITICAL** |
| 6.2 | ISR→Task 通信使用 FromISR API | 检查 `xQueueSend`/`xSemaphoreGive` 是否带 `FromISR` | **CRITICAL** |
| 6.3 | ISR 与 Task 共享变量声明 `volatile` | 检查中断内访问的全局变量 | **CRITICAL** |
| 6.4 | ISR 中无 printf/semihosting | 搜索 ISR 中 `printf` 等 | **HIGH** |
| 6.5 | 中断优先级分组合理 | 检查 NVIC 配置 | **HIGH** |

---

## 第七层：初始化顺序检查

| # | 检查项 | 方法 | 严重度 |
|---|--------|------|--------|
| 7.1 | 初始化顺序：时钟 → GPIO → 外设 → 中断 | 检查 main/MX 初始化顺序 | **CRITICAL** |
| 7.2 | 反初始化严格逆序 | 检查反初始化函数 | **HIGH** |
| 7.3 | 外设初始化前显式检查依赖是否就绪 | 检查 init 函数开始处 | **HIGH** |

---

## 第八层：错误传播检查

| # | 检查项 | 方法 | 严重度 |
|---|--------|------|--------|
| 8.1 | 所有函数调用返回值被检查 | 搜索每个函数调用 | **CRITICAL** |
| 8.2 | 每个 `if (err)` 分支有 return 或错误处理 | 跟踪每个错误分支 | **CRITICAL** |
| 8.3 | 错误码逐层传播，不静默吞没 | 检查错误码转换与返回 | **HIGH** |
| 8.4 | HAL 外设操作返回值被检查 | 检查 HAL 函数调用 | **HIGH** |

---

## 常见反模式（Anti-Patterns）

### 反模式 1：盲目信任 AI 生成的寄存器地址

```c
// ❌ AI 生成的寄存器地址可能来自错误的 datasheet 版本
#define MPU6050_REG_ACCEL_XOUT_H  0x3C  // 错！应该是 0x3B

// ✅ 必须对照官方 datasheet 逐地址验证
#define MPU6050_REG_ACCEL_XOUT_H  0x3B  // 官方 datasheet Rev 4.2
```

**规避**: AI 生成的每个寄存器地址和 bit 位必须对照 datasheet 验证。

### 反模式 2：一次生成过多代码

```c
// ❌ AI 一次生成了 300 行代码，包含 8 个函数
// 编译报 15 个错误，不知道从哪开始修

// ✅ 逐函数生成，每个函数编译通过后再继续
// Step 1: bsp_mpu6050_read_reg() → 编译通过 ✅
// Step 2: bsp_mpu6050_write_reg() → 编译通过 ✅
```

**规避**: 黄金法则：一次只生成一个函数。

### 反模式 3：跳过审查直接集成

```c
// ❌ AI 生成的代码编译通过就直接烧录
// 结果：I2C 地址写成了 8bit 模式（左移了 1 位），器件不应答

// ✅ 编译通过 → 对照 datasheet 审查 → 单元测试 → 硬件验证
```

**规避**: 编译通过只是第一步，必须逐层审查。

### 反模式 4：忽视硬件约束

```c
// ❌ AI 假设 I2C 可以无限快，配置 1MHz Fast-mode+
// 但上拉电阻是 10kΩ，物理上不支持这个速率

// ✅ Prompt 中提供完整硬件约束：
// "I2C 速率 400kHz，上拉电阻 4.7kΩ，从机地址 0x68（7bit）"
```

**规避**: Prompt 中必须提供完整的硬件约束信息。

### 反模式 5：注释代码不同步

```c
// ❌ 修改了函数签名但注释没更新，Doxygen 与实际不一致
/**
 * @param  p_data [out] 输出指针
 */
void bsp_set_mode(uint8_t mode);  // 根本没有 p_data 参数

// ✅ 每次修改签名后同步更新 Doxygen，参数/返回值/方向一一对应
/**
 * @param  mode [in] 目标模式
 */
void bsp_set_mode(uint8_t mode);
```

**规避**: 审查时对照函数签名逐条核对 `@param`/`@retval`。

### 反模式 6：ISR 中放阻塞函数

```c
// ❌ ISR 中调用 HAL_Delay，SysTick 优先级低导致死锁
void EXTI0_IRQHandler(void)
{
    HAL_Delay(100);          // 死锁！
    HAL_I2C_Master_Transmit(...);
}

// ✅ ISR 只置标志位/发队列，耗时操作交给 Task
void EXTI0_IRQHandler(void)
{
    BaseType_t xHigherPriorityTaskWoken = pdFALSE;
    xQueueSendFromISR(g_event_queue, &event, &xHigherPriorityTaskWoken);
    portYIELD_FROM_ISR(xHigherPriorityTaskWoken);
}
```

**规避**: ISR 中遵循"三不"：不阻塞、不等待、不共享（非原子）。

### 反模式 7：static 函数暴露到 .h

```c
// ❌ 内部实现函数暴露在头文件，外部可直接调用
// mpu6050.h
void mpu6050_read_reg(uint8_t reg, uint8_t *p_data);  // 应是 static

// ✅ static 函数仅在 .c 中实现，.h 只暴露 public 接口
// mpu6050.c
static void mpu6050_read_reg(uint8_t reg, uint8_t *p_data)
{
    ...
}
// mpu6050.h
void bsp_mpu6050_init(void);
```

**规避**: .c 中的 static 辅助函数不写入 .h，对外接口统一用 `{层}_{模块}_{动作}`。

### 反模式 8：初始化顺序依赖

```c
// ❌ 模块 B 假设模块 A 已经初始化，但 main 中改了顺序就崩
void bsp_b_init(void)
{
    g_a_handle->ready = true;  // 若 A 未初始化则 HardFault
}

// ✅ init 函数内部显式检查依赖是否就绪
void bsp_b_init(void)
{
    if ((NULL == g_a_handle) || (false == g_a_handle->is_init)) {
        return BSP_B_ERROR_NOT_READY;
    }
    g_a_handle->ready = true;
}
```

**规避**: 不依赖隐式调用顺序，依赖项在 init 内部显式检查。

---

## 审查结果分级

| 级别 | 含义 | 动作 |
|------|------|------|
| **CRITICAL** | 会导致编译失败、硬件损坏、数据丢失 | **立即修复，不得烧录** |
| **HIGH** | 可能导致运行时 bug 或安全漏洞 | **修复后再继续** |
| **MEDIUM** | 违反编码规范，影响可维护性 | 本模块内修复 |
| **LOW** | 风格建议 | 可选修复 |

## 审查输出模板

```
## 审查报告 — {文件名}

### 概要
- 检查文件：{N} 个
- CRITICAL：{N} 个, HIGH：{N} 个, MEDIUM：{N} 个, LOW：{N} 个
- 结论：[通过 / 有条件通过 / 不通过]

### 详细发现

#### [CRITICAL] {问题简述}
- 位置：{文件名}:{行号}
- 代码：`{问题代码}`
- 说明：{为什么是问题}
- 修复：`{修复后代码}`
```
