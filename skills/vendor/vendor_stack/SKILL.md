---
name: vendor_stack
description: Vendor 底座登记：MQTT、BLE、CAN、Modbus、WiFi、蜂窝、LoRa、GPS 和 USB 等通信协议栈源码与知识。
---

# 通信中间件

目标工程物理落位：`05_Vendor/vendor_middleware/communication/`。MQTT、BLE、CAN、Modbus、WiFi、蜂窝、LoRa、GPS、USB 等只保留本工程选定的协议栈和必要移植内容，版本、许可证与编译单元由目标工程 Git 管理；本插件不携带实际协议栈源码。

## 边界

处理协议状态机、连接、重试、编解码和公共消息 API。上层调用固定经过 `platform_middleware` → `impl_middleware`；具体并发、设备收发和底层移植由 Impl 通过 `platform_os`/`platform_bsp` 契约接入。Vendor 不直接调用 RTOS、Core、Driver 或厂商 Adapter。

设备数据应由 APP/Service 以公共事件或快照提供；通信层不得绕过它访问具体 Driver、BSP Port 或 HAL。

## 工作流

先确定链路与协议，再定义平台无关消息接口、超时和错误模型，最后由 `impl_middleware` 通过 Platform 契约接入收发通道。MQTT/BLE 等技术差异放在 `references/`，不新增重复主 skill。

MQTT 任务读取 [`mqtt-coremqtt.md`](references/mqtt-coremqtt.md)，重点核对版本、传输回调、上下文串行化和重连证据。
BLE、CAN、蜂窝、GPS、LoRa、Modbus、USB、WiFi、Ymodem 与 MQTT 的完整协议资料见 [`capability-index.md`](references/capability-index.md)。

交接：网络/无线设备能力由 `impl_middleware` 接入 [`platform_bsp`](../../platform/platform_bsp/SKILL.md)，任务和队列由 `impl_os` 实现 [`platform_os`](../../platform/platform_os/SKILL.md)。
