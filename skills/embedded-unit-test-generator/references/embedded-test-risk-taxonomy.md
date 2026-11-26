# 嵌入式测试风险分类

用本分类判断生成测试何时可靠，以及何时需要降低声明强度。

## 低风险

- 纯计算
- 编码/解码
- CRC/checksum
- Buffer 操作
- 输入校验
- 查表
- 不依赖真实时序的状态机迁移

单元测试通常可以直接断言这些行为。

## 中风险

- HAL/BSP wrapper 逻辑
- 使用 mock transport 的通信协议 handler
- RTOS task helper 函数
- Flash layout 计算
- 电源模式状态决策
- 错误恢复路径

单元测试有价值，但必须披露 mock 依赖。

## 高风险

- ISR 顺序
- DMA 完成与 cache coherency
- 实时 deadline
- Clock tree 和 PLL 配置
- Bootloader handoff
- Watchdog 行为
- Brownout/power sequencing
- Flash erase/write 耐久性和时序
- 电气总线行为

只为隔离出的 helper 逻辑生成单元测试。行为声明需要集成或硬件验证。

## 危险信号

- 直接写 volatile registers
- 无限循环或阻塞等待
- 隐藏全局状态
- 没有 public seam 的 static functions
- 厂商工具生成代码
- 需要精确中断时序的函数

遇到危险信号时，建议重构 seam 或做集成测试，不要假装一个单元测试能覆盖完整行为。
