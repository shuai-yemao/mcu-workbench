---
name: vendor_fatfs
description: Vendor 底座登记：FatFs、SFUD、Flash 存储、磨损处理和文件系统源码与知识。
---

# 存储中间件

## 边界

提供块设备、文件、日志和配置数据的公共 API，处理一致性、缓存、磨损、掉电恢复和错误映射。通过 BSP Wrapper 使用 Flash，不直接访问 hal_driver 或厂商库。

传感器历史持久化只消费公共服务提供的稳定快照，不在设备回调或 Driver 内直接写 Flash。外部 Flash 器件协议属于 BSP，分区、配置和持久化策略属于本层或系统层。

## 工作流

先确定介质与容量，再定义读写粒度、同步策略和恢复路径；FatFs/SFUD/裸 Flash 的差异放入 references。需要后台刷写时交给 OS Wrapper 创建的任务或队列。

Flash/KV/时序存储读取 [`flash-storage-sources.md`](references/flash-storage-sources.md)，区分 Middleware 公共存储 API 与 BSP 器件协议。
FatFs、SFUD 的移植步骤、配置和参考资料见 [`capability-index.md`](references/capability-index.md)。

交接：Flash 器件协议交给 [`bsp-hal-driver`](../../impl/impl_bsp/SKILL.md)，存储层只经 [`bsp-wrapper`](../../platform/platform_bsp/SKILL.md) 使用设备能力。
