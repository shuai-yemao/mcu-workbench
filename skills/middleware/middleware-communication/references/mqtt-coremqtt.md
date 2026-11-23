# MQTT 源码证据：coreMQTT

## 来源

- 仓库：[FreeRTOS/coreMQTT](https://github.com/FreeRTOS/coreMQTT)
- 分支：`main`
- 复核 commit：`5be5f95d12d97dbbe3cfbd0f4a9a8a1a7a5aab19`
- 关注路径：`source/`、`test/`、配置头和网络传输接口

## 责任映射

coreMQTT 只提供 MQTT 会话、报文、订阅发布和状态机。网络收发函数由项目注入，但不因此新增 Middleware Adapter：

```text
APP/Profile
  → middleware-communication 公共消息 API
  → coreMQTT 会话与状态机
  → BSP Wrapper 提供网络收发
  → OS Wrapper 提供任务、锁、超时和事件
```

## 必查规则

- 先锁定 MQTT 3.1.1 或 MQTT 5，再选择对应 API 和测试向量。
- `MQTTContext_t` 的调用必须串行化；多个任务不能无锁共享一个上下文。
- 网络传输、时间函数和内存配置必须显式记录，不能把 Socket、FreeRTOS 类型泄漏到 APP。
- 重连、Keep Alive、订阅恢复和错误码必须作为状态机验收，不只验证一次 `publish` 成功。
- Broker 互操作测试可使用 Mosquitto；Broker 不属于 MCU Middleware 实现。

## 验收证据

- 连接、订阅、发布、断线重连各有日志和超时证据。
- 主机测试覆盖报文编解码和错误路径，目标板测试覆盖真实 BSP 收发。
- 交接给 [`os-abstraction`](../../../rtos/os-abstraction/SKILL.md) 时只交并发/计时需求；交接给 [`bsp-adapter`](../../../bsp/bsp-adapter/SKILL.md) 时只交网络设备能力。
