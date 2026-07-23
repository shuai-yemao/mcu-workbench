---
name: embedded-ai-prompt-templates
description: 嵌入式 C AI Prompt 模板集 — 逐函数生成、批量生成、重构、代码审查的标准 prompt 结构。当用户需要为嵌入式开发构造 AI prompt 时使用。
version: "1.0.0"
---

# 嵌入式 AI Prompt 模板

> 给 AI 下达嵌入式 C 编码任务时的标准 prompt 结构。
> 使用时替换 `{MODULE}`、`{module}`、`{PERIPHERAL}` 等占位符。

## 通用 Prompt 骨架

每次下达编码任务时，必须包含以下结构：

```
[角色] 你是嵌入式 C 开发工程师，遵循编码规范。

[规范] 请严格遵循 embedded-ai-coding-standard 中的规则：
  - 缩进 4 空格，禁止 TAB
  - 行宽 ≤ 80 列
  - 指针必须判空（常数放左边）
  - 返回值必须检查
  - 函数有 doxygen 注释
  - 函数内有居中格式的逻辑注释

[任务] 为 {MODULE} 模块生成 {具体功能}

[输入] 外设型号/寄存器/数据格式/约束

[输出] 头文件 + 源文件 / 单个函数
```

---

## 模板一：逐函数生成（推荐）

### 生成读寄存器函数

```
为 {MODULE} 模块生成读寄存器函数：

函数名：{层}_{模块}_read_reg()
功能：通过 {I2C/SPI} 读取 {MODULE} 的指定寄存器
输入参数：uint8_t reg（寄存器地址）、uint8_t *p_data（输出数据指针）
返回值：{module}_status_t

通信接口：{I2C/SPI}，设备地址 {0xXX}
超时时间：{N}ms

要求：
1. 先声明局部变量
2. 指针判空（NULL == p_data）
3. 调用 HAL 层通信函数
4. 检查返回值
5. 每个步骤用居中注释分隔
```

### 生成写寄存器函数

```
为 {MODULE} 模块生成写寄存器函数：

函数名：{层}_{模块}_write_reg()
功能：通过 {I2C/SPI} 向 {MODULE} 写入寄存器
输入参数：uint8_t reg（寄存器地址）、uint8_t data（写入数据）
返回值：{module}_status_t

要求同上（判空、返回值检查、居中注释）
```

### 生成初始化函数

```
为 {MODULE} 模块生成初始化函数：

函数名：{层}_{模块}_init()
功能：初始化 {MODULE}，包括读取 WHO_AM_I 验证器件
输入参数：const {module}_config_t *p_config
返回值：{module}_status_t

初始化流程：
1. 参数判空
2. 检查通信总线是否就绪
3. 读取 WHO_AM_I（地址 {0xXX}，期望值 {0xYY}）
4. 配置寄存器（可选）
5. 返回状态

要求：
- 每个步骤用居中注释分隔
- 任何失败立即返回对应错误码
```

### 示例（MPU6050 读加速度）

```
为 MPU6050 模块生成读加速度函数：

函数名：bsp_mpu6050_read_accel()
功能：读取加速度计三轴数据
输入参数：mpu6050_accel_data_t *p_data（输出参数，x/y/z 为 int16_t）
返回值：mpu6050_status_t
通信接口：I2C
起始寄存器：0x3B（ACCEL_XOUT_H），连续读取 6 字节

要求：
1. 声明局部变量 ret 和 raw_buf[6]
2. 指针判空（NULL == p_data）
3. 调用 bsp_mpu6050_read_burst() 读取 6 字节，检查返回值
4. 解析原始数据为有符号 16-bit（高字节 << 8 | 低字节）
5. 每个步骤用居中注释分隔
```

---

## 模板二：批量生成 BSP 驱动模块

```
为 {MODULE} 模块生成完整 BSP 驱动，包含：

文件 → 内容
ec_bsp_{模块}_reg.h → 寄存器地址宏定义
ec_bsp_{模块}_driver.h → 对外接口头文件
ec_bsp_{模块}_driver.c → 驱动实现

需要实现的函数（按顺序，逐个完成）：
1. bsp_{模块}_init()          — 初始化 + 器件验证
2. bsp_{模块}_read_reg()      — 读寄存器
3. bsp_{模块}_write_reg()     — 写寄存器
4. bsp_{模块}_read_burst()    — 连续读多字节
5. bsp_{模块}_read_who_am_i() — 读设备 ID
6. bsp_{模块}_read_{数据}()   — 读传感器数据
7. bsp_{模块}_deinit()        — 反初始化（可选）

通信接口：{I2C/SPI}，设备地址 {0xXX}

约束：
- 严格遵循 embedded-ai-coding-standard
- 头文件注释格式：@file、@par dependencies、@author、@brief、Processing flow
- 源文件每个函数按模板结构（变量声明→参数检查→逻辑→返回值）
- 所有指针判空，所有返回值检查
- 常数放左边

注意：请逐函数生成，每生成一个函数后等待我编译验证，通过后再继续下一个。
```

---

## 模板三：生成 App 层代码

```
为 App 层生成 {功能} 函数：

函数名：app_{功能}_{动作}()
功能：{描述}
RTOS 资源（如适用）：Task / Mutex / Semaphore / Queue
优先级/堆栈（如适用）：{N}

要求：
1. 使用 app_ 前缀函数名
2. 内部调用 RTOS 官方 API（xTaskCreate / xSemaphoreTake 等）
3. 外部接口遵循编码规范
4. 检查 RTOS API 返回值
5. 不直接访问 BSP 层函数
```

---

## 模板四：重构现有代码

```
重构以下代码，使其符合 embedded-ai-coding-standard：

[粘贴现有代码]

重构要求：
1. 函数名改为 snake_case：{层}_{模块}_{动作}()
2. 变量名改为 snake_case，指针加 p_ 前缀
3. 宏名改为 UPPER_SNAKE_CASE
4. 添加参数判空（常数放左边）
5. 添加返回值检查
6. 添加函数 doxygen 注释（@brief @param @retval）
7. 添加函数内居中格式的逻辑注释
8. 缩进改为 4 空格
9. 行宽不超过 80 列
```

---

## 模板五：代码审查

```
审查以下代码，按 embedded-ai-code-review 清单逐项检查：

[粘贴代码]

检查项目：
【语法层】
- [ ] 编译无警告（-Wall -Wextra）
- [ ] 所有变量在使用前已初始化
- [ ] 无未使用的变量或头文件

【规范层】
- [ ] 命名符合 snake_case / UPPER_SNAKE_CASE
- [ ] 缩进 4 空格，无 TAB
- [ ] 行宽 ≤ 80 列
- [ ] 头文件组织顺序正确

【逻辑层】
- [ ] 所有指针使用前判空（NULL == ptr）
- [ ] 所有函数调用检查返回值
- [ ] 判断语句常数放左边
- [ ] 无越层调用

【安全层】
- [ ] 数组访问有边界检查
- [ ] 无缓冲区溢出风险
- [ ] 中断上下文无阻塞调用

请列出所有不符合项，给出修复建议和修复代码。
```

---

## 占位符速查

| 占位符 | 替换为 | 示例 |
|--------|--------|------|
| `{MODULE}` | 模块名全大写 | `MPU6050`, `AHT21`, `W25Q64` |
| `{module}` | 模块名全小写 | `mpu6050`, `aht21`, `w25q64` |
| `{PERIPHERAL}` | 外设名全大写 | `I2C`, `SPI`, `UART` |
| `{peripheral}` | 外设名全小写 | `i2c`, `spi`, `uart` |
| `{层}` | bsp / driver / adapter / app | `bsp` |
| `{功能}` | 功能描述（英文） | `driver`, `handler`, `sensor` |
| `{动作}` | 动作（英文） | `init`, `read`, `write`, `config` |
| `{0xXX}` | 十六进制地址 | `0x75`, `0x68` |
| `{N}` | 数值 | `100`, `256` |
