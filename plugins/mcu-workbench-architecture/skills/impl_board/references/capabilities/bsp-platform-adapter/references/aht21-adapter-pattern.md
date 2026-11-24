# AHT21 历史 Adapter 工程参考

来源：历史 `System/Adapter/Inc/system_adapter.h`、`System/Adapter/Src/system_adapter.c` 和 `BSP/AHT21/iic/`。本页用于识别旧边界，目标设计以共享 BSP 契约为准。

## 绑定关系

- `system_init_resources()` 先实例化 AHT21 Driver，再实例化 Handler、注册传感器节点并投递启动探测事件。
- 历史 `aht21_iic_iface` 在 Adapter 内包装软件 I2C；新设计由 Port 注入事务级 Core Bus，不在 Port 实现软硬 IIC。
- Port 可注入 tick/毫秒延时和可选 yield/trace；共享总线锁由 Core Bus 管理，不把互斥或开关中断接口注入 Driver。
- Handler 的延时、队列、线程、临界区和状态转换由 `handler_os` 统一提供。
- 生产 Port 通过静态接口表组装 Core Bus、Driver 和 Handler，不接触 HAL/GPIO 位操作/原生 RTOS。

## 时序与日志

Core Software IIC Backend 的 SDA/SCL 翻转、ACK 等待和微秒延时路径不能输出高频日志；错误应通过事务状态返回，在安全边界统一记录。Port 的日志只记录装配和状态映射，不能承载位时序。

## 测试替换

Port 测试应以 Core Bus/OSAL/Driver Ops 为替换点，Fake 可控制事务失败、返回状态字、读数帧、OSAL 资源状态和调用顺序。ACK 等位级行为只在 Core Software Backend 测试。生产 Port 不应包含 Unity runner 或测试专用全局状态。
