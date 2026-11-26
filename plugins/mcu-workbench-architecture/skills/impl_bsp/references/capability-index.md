# 内化能力索引

以下资料已经成为 `impl_bsp` 的 active references。仅在请求命中对应技术或工作流时读取相关条目；主入口仍负责边界、路由和验收。

| 能力主题 | 详细资料 |
| --- | --- |
| 平台无关的单器件 BSP Driver | [完整流程与资源](capabilities/bsp-device-driver/GUIDE.md) |
| 高频 IMU（MPU6050）Driver 模式 | [DMA 双缓冲 + 中断上下半部分离](capabilities/bsp-device-driver/references/mpu6050-driver-pattern.md) |
| 外部 Flash（W25Qxx）Driver 模式 | [页对齐 + 写使能锁 + 忙状态轮询](capabilities/bsp-device-driver/references/w25qxx-driver-pattern.md) |
| 多实例 BSP 服务与资源编排 | [完整流程与资源](capabilities/bsp-device-service/GUIDE.md) |
| 高频 IMU（MPU6050）Handler 模式 | [单消费者队列 + ISR 桥接](capabilities/bsp-device-service/references/mpu6050-handler-pattern.md) |
| 外部 Flash（W25Qxx）Handler 模式 | [4KB 缓冲写入 + 块存储](capabilities/bsp-device-service/references/w25qxx-handler-pattern.md) |
