---
name: middleware-storage
description: 设计 FatFs、SFUD、Flash 存储、磨损处理和文件系统接入。
---

# 存储中间件

## 边界

提供块设备、文件、日志和配置数据的公共 API，处理一致性、缓存、磨损、掉电恢复和错误映射。通过 BSP Wrapper 使用 Flash，不直接访问 hal_driver 或厂商库。

## 工作流

先确定介质与容量，再定义读写粒度、同步策略和恢复路径；FatFs/SFUD/裸 Flash 的差异放入 references。需要后台刷写时交给 OS Wrapper 创建的任务或队列。

Flash/KV/时序存储读取 [`flash-storage-sources.md`](references/flash-storage-sources.md)，区分 Middleware 公共存储 API 与 BSP 器件协议。

交接：Flash 器件协议交给 [`bsp-hal-driver`](../../bsp/bsp-hal-driver/SKILL.md)，板级绑定交给 [`bsp-adapter`](../../bsp/bsp-adapter/SKILL.md)。
