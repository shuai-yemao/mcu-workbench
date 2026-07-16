# AHT21 Driver 工程参考

来源：`BSP/AHT21/driver/Inc/bsp_aht21_driver.h` 与对应实现文件。

## 抽象接口

- 当前工程默认 `HARDWARE_IIC=0`，Driver 通过 `iic_driver_interface_t` 使用 `pf_init`、`pf_send_bytes`、`pf_receive_bytes` 和 `pf_read_status` 等软件 I2C 抽象。
- `timebase_interface_t` 提供 tick 与毫秒延时；启用 RTOS 时，`yield_interface_t` 提供任务让出。
- `irq_interface_t` 负责锁、解锁、关闭中断和开启中断。
- `aht21_ops_t` 聚合 I2C、时基、RTOS 和中断依赖；`bsp_aht21_driver_t` 保存实例状态、依赖指针和 `pf_deinst`、`pf_init`、`pf_deinit`、`pf_read_id`、`pf_read_temp`、`pf_read_humidity`、`pf_sleep`、`pf_wakeup` 等操作。

## 实例化关注点

`bsp_aht21_driver_inst()` 需要验证自身、ops、各级依赖和函数指针，拒绝重复初始化；成功路径会绑定操作表并执行设备初始化。任一 I2C 初始化、状态读取或校准步骤失败，都应回滚实例状态。

## 协议特例

- AHT21 使用固定 I2C 地址 `0x38`。
- 工程中的“ID 检测”实际是发送 `0x71` 读取状态字并验证状态位，不应描述成真正的芯片 ID 寄存器。
- 温湿度读取包含忙状态等待、数据帧校验/CRC 和公式换算；测试要覆盖传输失败、忙超时、CRC 错误和公式边界。

## 迁移时重新确认

移植其他器件时必须重新读取头文件和数据手册，确认地址、命令、忙状态、CRC、单位、等待时间和错误码；不能复制 AHT21 的协议常量。
