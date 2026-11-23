# 嵌入式风险分类

用本分类判断变更风险，并决定报告中哪些章节需要更强证据。

## 高风险区域

### Boot、Startup、Linker、Flash 布局

示例：

- `startup_*.s`、`startup_*.c`
- `*.ld`、`*.icf`、scatter files
- bootloader、vector table、image header、partition table
- flash erase/write layout

报告必须说明：

- Boot 路径影响
- 内存区域影响
- 回滚或恢复方法
- 构建产物与烧录兼容性

### 时钟、电源、复位、看门狗

示例：

- system clock config
- PLL、oscillator、voltage scaling
- 低功耗进入和退出
- watchdog refresh policy

报告必须说明：

- 时序和外设时钟影响
- 电源模式行为
- 硬件验证状态

### 中断、DMA、时序

示例：

- ISR 文件
- NVIC priority
- DMA descriptors
- timer periods
- critical sections

报告必须说明：

- 延迟或优先级影响
- 共享资源保护
- 竞态或死锁风险
- 硬件或压力测试证据

### RTOS 调度与并发

示例：

- task entry functions
- priorities、stack sizes
- queues、semaphores、mutexes、event groups
- software timers

报告必须说明：

- 任务交互变化
- 栈和内存影响
- 阻塞行为
- 死锁或饥饿风险

### 外设驱动与 BSP

示例：

- `bsp/`、`drivers/`、`Core/Src/*_hal_msp.c`
- pinmux、GPIO、UART、SPI、I2C、ADC、PWM、CAN、USB、Ethernet
- board configuration

报告必须说明：

- 引脚或资源影响
- 外部器件假设
- 初始化顺序影响
- 硬件验证状态

### 通信协议

示例：

- CAN IDs
- Modbus register map
- UART frame format
- TCP/UDP packet format
- SCPI/VISA commands
- custom binary protocol

报告必须说明：

- 兼容性影响
- frame/register/command 变化
- timeout/retry/error-handling 变化
- 互操作测试证据

### 持久化存储与参数

示例：

- EEPROM、flash NVM、filesystem、calibration data
- parameter defaults
- versioned structures

报告必须说明：

- 数据迁移行为
- factory reset 行为
- 向后兼容性
- 掉电风险

## 中风险区域

- 应用状态机
- 错误处理
- 构建选项
- 编译器或链接器 flags
- 内存使用增长
- 影响时序的日志
- 跨模块共享的 public headers
- feature flags 或生产配置

## 低风险区域

- 文档
- 注释
- 纯格式化变更
- 仅测试变更
- 非生产 debug 文本
- 有清晰证据表明行为不变的局部重构

## 风险升级规则

出现以下情况时，风险等级上调一级：

- 模块被标记为已验证、生产使用、安全关键或时序敏感。
- 变更触及生成代码保护区域。
- 硬件型号或外设参数未知。
- 面向硬件的变更缺少验证证据。
- 变更影响共享库或多个产品变体。
- 可见内存增长，但限制未知。
