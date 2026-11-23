# AHT21 Adapter 工程参考

来源：`System/Adapter/Inc/system_adapter.h`、`System/Adapter/Src/system_adapter.c` 和 `BSP/AHT21/iic/`。

## 绑定关系

- `system_init_resources()` 先实例化 AHT21 Driver，再实例化 Handler、注册传感器节点并投递启动探测事件。
- `aht21_iic_iface` 将软件 I2C 总线包装成 Driver 的发送、接收和 `0x71` 状态读取接口。
- `aht21_timebase_iface` 绑定 tick/毫秒延时；`aht21_yield_iface` 绑定 RTOS 让出；`aht21_irq_iface` 绑定互斥锁和中断保护。
- Handler 的延时、队列、线程、临界区和状态转换由 `handler_os` 统一提供。
- 生产 Adapter 的函数通过静态接口表组装，不应让 Driver 直接接触 HAL/GPIO/RTOS 具体实现。

## 时序与日志

软件 I2C 的 SDA/SCL 翻转、ACK 等待和微秒延时路径不能输出高频日志；错误应通过状态返回，在安全边界统一记录。Adapter 的日志应包含层级和状态码，便于区分 Driver、Handler 与平台错误。

## 测试替换

Adapter 测试应以接口表为替换点，Mock 可控制 ACK、读写失败、返回状态字、读数帧、RTOS 资源状态和调用顺序。生产 Adapter 不应包含 Unity runner 或测试专用全局状态。
