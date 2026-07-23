---
name: middleware-communication
description: 组合 MQTT、BLE、CAN、Modbus、WiFi、蜂窝、LoRa、GPS 和 USB 等通信能力。
---

# 通信中间件

## 边界

处理协议状态机、连接、重试、编解码和公共消息 API。需要并发时调用 OS Wrapper，需要设备收发时调用 BSP Wrapper；不直接调用 RTOS、Core、Driver 或厂商 Adapter。

## 工作流

先确定链路与协议，再定义平台无关消息接口、超时和错误模型，最后通过 BSP Wrapper 注入收发通道。MQTT/BLE 等技术差异放在 `references/`，不新增重复主 skill。

MQTT 任务读取 [`mqtt-coremqtt.md`](references/mqtt-coremqtt.md)，重点核对版本、传输回调、上下文串行化和重连证据。

交接：网络/无线器件绑定交给 [`bsp-adapter`](../../bsp/bsp-adapter/SKILL.md)，任务和队列交给 [`os-abstraction`](../../rtos/os-abstraction/SKILL.md)。
