# Mock 与 Stub 策略

使用 mocks 和 stubs 将逻辑与硬件、系统依赖隔离。

## 依赖分类

- Pure helper：在测试中直接调用。
- Read-only dependency：用 deterministic return values 做 stub。
- Stateful dependency：用测试持有状态的 fake。
- Interaction dependency：用 mock 验证调用或参数。
- Hardware timing dependency：除非已抽象，否则避免单元测试声明。

## 常见嵌入式边界

- HAL functions：`HAL_*`、`LL_*`、`nrfx_*`、`esp_*`、`gpio_*`、`i2c_*`、`spi_*`、`uart_*`
- RTOS APIs：`xQueue*`、`xSemaphore*`、`osThread*`、`k_*`
- Register access：`PERIPH->REG`、`*(volatile ...)`、`HWREG`、vendor CMSIS macros
- Time：`HAL_GetTick`、`millis`、timer counters、delay functions
- Logging 和 assert hooks：替换为 no-op 或 capture fake

## 规则

- 对 stateful protocol buffers 和 queues 优先用 fakes。
- 对 HAL return codes 和 call verification 优先用 mocks。
- mock 保持窄范围：只 mock 测试所需依赖。
- 不要 mock 被测函数本身。
- 除非交互本身就是行为，否则不要用 mock 断言实现细节。
- 每个生成的 mock expectation 都要标注为有证据支持或推断。
