# BSP AHT21 分层案例

## 固定证据

- 仓库：`https://github.com/shuai-yemao/stm32f411ceu6_freertos_transplant.git`
- 分支：`Sensor_temp_humi`
- 提交：`eb5f38b3acb55063b6a3e2777aae2fb983cda8bf`
- Driver：`Bsp/Borad_drive/Sensor_temp_humi/driver/AHT21/`
- Handler：`Bsp/Borad_drive/Sensor_temp_humi/handler/`
- 历史软件 IIC：`Bsp/Borad_drive/Sensor_temp_humi/iic/`
- Port：`Bsp/Porting/drv_adapter_port_temp_humi/`

## 可保留的设计

- Driver 实例通过 Ops 注入总线和时基，并封装 AHT21 命令、测量、状态与数据转换。
- Handler 使用泛化 Sensor Ops，管理队列、工作线程、缓存和多实例描述符。
- Port 把 Handler 所需队列、任务、延时和临界区操作映射到公开 OSAL。
- GPIO 模拟 IIC 已用函数表隔离 HAL，说明硬件/软件总线可以共享上层事务接口。

## 需要纠正的边界

| 当前事实 | 风险 | 通用改进 |
|---|---|---|
| AHT21 Driver 的 IIC Ops 含 start/stop/wait_ack/send_ack。 | 器件协议感知软件 IIC 位时序；硬件 IIC 只能用空桩满足接口。 | Driver 仅接收事务级 read/write Ops。 |
| Port 内直接调用 HAL IIC并配置 GPIO/DWT 软件 IIC。 | Port 同时承担装配与 Core 总线实现。 | 两种实现迁入 Core Backend，Port 只注入 Core Bus。 |
| Driver 公共头包含 `debug.h` 并绑定 EasyLogger 宏。 | 设备协议被具体观测后端污染。 | 注入可选 trace Ops，或由上层记录状态码。 |
| Handler 事件包含调用方输出指针。 | 异步执行时可能出现指针生命周期问题。 | 队列消息拥有值或稳定副本，完成回调传值。 |
| Port 注释同时把 timeout 描述为 ticks，而 Handler 接口写 ms。 | 超时单位歧义。 | API 名或文档固定 `_ms`/`_ticks`，边界只转换一次。 |
| `osal_queue_receive` 输出缓冲区被声明为 `const void *`。 | const 方向错误，Port 需要强制转换。 | OSAL 接口修正为可写输出参数并补回归测试。 |
| Handler 临界区接口没有保存 ISR/任务锁 token。 | 某些 RTOS/架构不能正确恢复先前屏蔽状态。 | 使用带 token 的 enter/exit，或只在任务上下文用 mutex。 |

## 目标调用链

```text
APP/Middleware
  → BSP Wrapper: stable sensor API
  → BSP Port: construct/register/inject
  → BSP Handler: lifecycle/queue/cache/retry
  → BSP Driver: AHT21 command/CRC/conversion/state
  → Core IIC Bus: transaction + shared bus mutex
```

Port 的构造动作可以分别指向 Handler 和 Driver；它不改变运行时依赖方向。取消、事件或回调能力只有在 Handler 与 OSAL 真实实现并测试后才写入公共 API。

## 测试口径

- Driver Fake Bus：初始化、读数、总线失败、忙超时、帧/CRC 错误、反初始化回滚。
- Handler Fake Driver/OSAL：初始化幂等、请求串行化、缓存新鲜度、设备缺失、停止顺序和回调上下文。
- Wrapper/Fake Port：只验证稳定 API、状态映射和依赖隐藏。
- 板级：分别验证硬件 IIC 和软件 IIC，并记录实际读数与错误恢复；构建成功和 RTT 连通不能替代该证据。
