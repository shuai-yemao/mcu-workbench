# AHT21 Handler 工程参考

来源：`BSP/AHT21/handler/Inc/bsp_temp_humi_handler.h` 与对应实现文件。

## 公开结构

- `TEMP_HUMI_NUM_MAX` 当前为 `3`，Handler 使用实例数组管理多个温湿度传感器节点。
- Driver 以 `temp_humi_handler_sensor_ops_t` 形式暴露 init、deinit、温度、湿度和 detect 等回调。
- Handler 额外注入毫秒时基、延时、队列、线程和临界区接口，统一收口到 `temp_humi_handler_os_t`。
- `temp_humi_handler_event_t` 携带温度/湿度输出指针、生命周期、读取类型和完成回调。
- 公共入口包括 `bsp_temp_humi_inst()`、Handler 实例方法 `pf_init`/`pf_deinit`/`pf_deinst`/`pf_instance_register`，以及 `bsp_read_temp_humi()`。

## 测试重点

测试至少覆盖最大容量、重复实例化、无效依赖、队列创建失败、线程创建失败、注册临界区平衡、事件非法参数、时基失败、生命周期跳过、单独温度/湿度读取、组合读取、传感器错误传播、正常清理和清理失败。

## 迁移时重新确认

其他 Handler 可能不需要 RTOS 或事件队列；应以实际公共头文件为准，重新确定资源所有权、线程上下文、队列元素和错误码，不要强行套用 `TEMP_HUMI_NUM_MAX` 或 AHT21 的事件结构。
