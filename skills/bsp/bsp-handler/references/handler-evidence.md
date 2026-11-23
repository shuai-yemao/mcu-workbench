# BSP Handler 证据与验收

Handler 的证据必须能回答四个问题：谁拥有实例、谁拥有缓存、谁触发事件、谁在错误时恢复。

## 必备记录

- 实例表：设备 ID、状态、总线、GPIO、DMA 和互斥锁；
- 生命周期：`init/start/stop/sleep/recover` 的幂等性和并发规则；
- 缓冲区：生产者、消费者、长度、回收点和溢出策略；
- 事件：ISR、OS Wrapper、队列和 APP/Middleware 消费者；
- 错误：超时、断线、掉电、重新探测和资源释放。

Handler 通过 BSP Wrapper 使用器件，不能重复实现 hal_driver 协议，也不能把实例句柄泄漏到 APP。
