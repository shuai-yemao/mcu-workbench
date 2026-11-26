# DebugComponent / RTT 观测案例

## 固定证据

- 仓库：`https://github.com/shuai-yemao/stm32f411ceu6_freertos_transplant.git`
- 分支：`Sensor_temp_humi`
- 提交：`eb5f38b3acb55063b6a3e2777aae2fb983cda8bf`
- 路径：`DebugComponent/RTT/`、`DebugComponent/easylogger/`、`DebugComponent/Debug/`

固定源码的输出链为：

```text
业务日志 → EasyLogger → elog_port_output() → SEGGER_RTT_Write() → J-Link RTT Viewer
printf     → __io_putchar()/fputc() → SEGGER_RTT_PutChar()
```

## 已观察事实与风险

- `debug_init()` 在 `RTT_PRINTF` 启用时初始化 EasyLogger；备用 `test_printf` 未使用会产生编译 warning。该 warning 是源码观察，不等于构建失败，也不应被忽略。
- `elog_port_output_lock()` 直接调用 `__disable_irq()`，unlock 直接 `__enable_irq()`。这没有保存进入前状态，嵌套调用或原本已关中断时可能错误开启中断。
- EasyLogger 格式化和输出位于输出锁范围时，全局关中断会放大中断延迟。锁应尽量只保护共享缓冲/RTT 写入，并使用 OSAL mutex、RTT 自身可嵌套锁或保存/恢复 token 的短临界区。
- 时间戳直接调用 `HAL_GetTick()`，任务信息直接调用 FreeRTOS API。这些绑定应留在观测 Port，不应扩散到通用日志 API。

## 推荐边界

```text
Module log API
  → logger core: format/filter/buffer
  → observability port: time/task/lock/write ops
  → RTT/UART/SWO backend
```

ISR 日志必须使用专门的非阻塞路径，不能复用可能拿 mutex 或格式化大缓冲的任务路径。输出策略应记录缓冲大小、满时丢弃/截断/阻塞行为以及丢包计数。

## 证据格式

```text
[project][layer] test_name: PASS|FAIL
  operation: <what was exercised>
  expected: <observable result>
  actual: <captured log or counter>
  timestamp: <tick with explicit unit>
  loss: <overflow/drop counter>
```

“RTT Viewer 已连接”只能作为通道证据。业务验证还需说明输入、预期、实际值、回调上下文和失败路径；实物传感器读数必须来自目标板运行。
