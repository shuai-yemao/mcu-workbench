# BSP Handle 证据与验收

> 本文件中的 Handle 与历史资料中的 Handler 指同一职责。新规则统一使用 Handle；Handler 只作为
> 兼容检索词，不表示额外的软件层。

Handle 的证据必须能回答五个问题：谁拥有 Driver 实例集合、谁选择/遍历实例、谁拥有缓存、谁触发事件、谁在错误时恢复。

## 必备记录

- Driver 集合表：设备类别、设备 ID、Driver 指针、状态、总线、GPIO、DMA 和互斥锁；必须证明集合内没有异类 Driver；
- 选择策略：按设备 ID、能力、健康状态或广播遍历的规则；部分实例失败时的聚合结果；
- 生命周期：`init/start/stop/sleep/recover` 的幂等性和并发规则；
- 缓冲区：生产者、消费者、长度、回收点和溢出策略；聚合缓存与单 Driver 状态不得重复拥有；
- 事件：ISR、注入的 OS 同步接口、队列和 APP/Middleware 消费者；
- 错误：超时、断线、掉电、重新探测和资源释放。

Handle 通过 Driver 的稳定实例操作使用器件，不能重复实现 Driver 协议，也不能把 Driver 私有句柄或 Driver 数组泄漏到 Service/App。IRQ/DMA 完成事件由 Driver 接收并转换为设备事件，Handle 只负责同类设备的事件聚合、排队和回调。

## W25Qxx 示例的适用范围

W25Qxx 的 4 KB 写缓冲、OTA/日志双区、块擦除标志和掉电刷写属于设备或 Service 策略，不能直接
复制到通用 Handle。通用 Handle 只要求描述请求所有权、队列容量、异步缓冲区生命周期、超时、取消、
错误恢复和回调上下文；分区布局、写放大和掉电策略必须由独立 profile 或 Service 需求确认。
