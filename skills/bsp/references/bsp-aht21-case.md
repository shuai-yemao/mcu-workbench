# BSP AHT21 分层案例

## 固定证据

- 仓库：`https://github.com/shuai-yemao/stm32f411ceu6_freertos_transplant.git`
- 分支：`Sensor_temp_humi`
- 提交：`eb5f38b3acb55063b6a3e2777aae2fb983cda8bf`
- Driver：`Bsp/Borad_drive/Sensor_temp_humi/driver/AHT21/`
- Handler：`Bsp/Borad_drive/Sensor_temp_humi/handler/`
- 历史软件 IIC：`Bsp/Borad_drive/Sensor_temp_humi/iic/`
- Port：`Bsp/Porting/drv_adapter_port_temp_humi/`

## 逐文件事实（现状反例）

| 文件 | 固定事实 |
|---|---|
| `Bsp/Wapper/.../Inc/drv_adapter_wapper_temp_humi.h:17,50,62` | 以 `temphumi_drv_t` 定义稳定表面 API；目录与标识中的 `Wapper` 是历史拼写，目标设计统一写 `Wrapper`。 |
| `Bsp/Wapper/.../Src/drv_adapter_wapper_temp_humi.c:36,93,109` | Wrapper 静态保存并纯转发 `temphumi_drv_t` 函数表；这才是 Wrapper 的所有权边界。 |
| `Bsp/Porting/.../Inc/drv_adapter_port_temp_humi.h:27-39` | 编译期选择硬件/软件 IIC，并公开直接生命周期 API；目标改为同形装配接口。 |
| `Bsp/Porting/.../Src/drv_adapter_port_temp_humi.c:63,164,175-204,243-308,363,382,510,726-820` | Port 直接调用 HAL、实现软件 IIC、提供总线回调并静态持有 AHT21 Driver/Handler；具体实例持有是允许的，软件时序与重复缓存仍需纠正。 |
| `Bsp/Borad_drive/.../handler/Inc/bsp_temp_humi_handler.h:176,191,461-520` | Handler 通过由 Port 定义的描述符表和泛化 Ops 管理实例。 |
| `Bsp/Borad_drive/.../handler/Src/bsp_temp_humi_handler.c:250-269,519-533,661-709` | Handler 创建/注册设备实例并绑定队列、线程、缓存；这是 Handler 的生命周期职责。 |
| `Bsp/Borad_drive/.../driver/AHT21/Inc/bsp_aht21_driver.h:87-115,136-139` | Driver 注入 IIC 与时基，但 IIC 接口泄漏位级控制函数。 |
| `Bsp/Borad_drive/.../driver/AHT21/Src/bsp_aht21_driver.c:63-91,198-217,412-625` | AHT21 协议、测量、状态转换和回滚属于 Driver，应保留在该层。 |
| `Bsp/Borad_drive/.../driver/AHT21/config/bsp_aht21_config.h` | 地址、命令、时序和编译期开关集中于配置头；不得加入板级句柄。 |
| `Bsp/Borad_drive/.../iic/Inc/bsp_gpio_iic.h:109-155` | 对外暴露 START/STOP/ACK/逐字节操作；这些不应成为 Driver 依赖。 |
| `Bsp/Borad_drive/.../iic/Src/bsp_gpio_iic.c:145-302` | 实现软件 IIC 位时序；应迁入 Core 私有后端。 |

## 可保留的设计

- Driver 实例通过 Ops 注入总线和时基，并封装 AHT21 命令、测量、状态与数据转换。
- Handler 使用泛化 Sensor Ops，管理队列、工作线程、缓存和多实例描述符。
- Port 把 Handler 所需队列、任务、延时和临界区操作映射到公开 OSAL。
- GPIO 模拟 IIC 已用函数表隔离 HAL，说明硬件/软件总线可以共享上层事务接口。

## 需要纠正的边界

| 当前事实 | 风险 | 通用改进 |
|---|---|---|
| AHT21 Driver 的 IIC Ops 含 start/stop/wait_ack/send_ack。 | 器件协议感知软件 IIC 位时序；硬件 IIC 只能用空桩满足接口。 | Driver 仅接收事务级 read/write Ops。 |
| Port 内直接调用 HAL IIC并配置 GPIO/DWT 软件 IIC。 | 通用 HAL Bus Ops 与器件协议容易混在一起。 | 通用 Bus Ops 可保留为受审查 Port 回调；设备命令仅归 Driver，软件 IIC后端归 Core。 |
| Port 静态持有 `s_aht21_driver` 和 `s_handler`。 | 无。Port 是具体实例与平台资源的装配所有者。 | 保留实例所有权，但只向 Wrapper 注册抽象函数表。 |
| Port 维护 `s_latest_temp`、`s_latest_humi`。 | 与 Handler 的最新值缓存重复，生命周期和一致性可能分叉。 | 删除 Port 副本，由 Handler 统一保存和读取缓存。 |
| Driver 公共头包含 `debug.h` 并绑定 EasyLogger 宏。 | 设备协议被具体观测后端污染。 | 注入可选 trace Ops，或由上层记录状态码。 |
| Handler 事件包含调用方输出指针。 | 异步执行时可能出现指针生命周期问题。 | 队列消息拥有值或稳定副本，完成回调传值。 |
| Port 注释同时把 timeout 描述为 ticks，而 Handler 接口写 ms。 | 超时单位歧义。 | API 名或文档固定 `_ms`/`_ticks`，边界只转换一次。 |
| `osal_queue_receive` 输出缓冲区被声明为 `const void *`。 | const 方向错误，Port 需要强制转换。 | OSAL 接口修正为可写输出参数并补回归测试。 |
| Handler 临界区接口没有保存 ISR/任务锁 token。 | 某些 RTOS/架构不能正确恢复先前屏蔽状态。 | 使用带 token 的 enter/exit，或只在任务上下文用 mutex。 |

## 目标调用链

```text
APP/Middleware
  → BSP Wrapper: stable sensor API
  → BSP Port: own concrete instances/register function table
  → BSP Handler: lifecycle/queue/cache/retry
  → BSP Driver: AHT21 command/CRC/conversion/state
  → Core IIC Bus: transaction + shared bus mutex
```

Port 的构造动作可以分别指向 Handler 和 Driver；它不改变运行时依赖方向。生产与 Fake Port 必须共享装配函数表：前者绑定 STM32 Core 后端，后者注入 Fake Bus、时基和 OSAL。取消、事件或回调能力只有在 Handler 与 OSAL 真实实现并测试后才写入公共 API。

## 补充证据：Flash 与 APP Facade

- 用户提供的 `drv_adapter_port_flash.c:199-200` 使用 `osal_task_create(..., flash_handler_thread, ...)`。Port 创建并注入 Handler OSAL 资源是允许的；`flash_handler_thread` 的定义、循环和业务处理必须位于 Handler。
- `User_Task/*/Platform/*_port/` 中 `temphumi_read_temp() → drv_adapter_temphumi_read_temp()` 一类代码是 APP Facade，只做上层转发，不能视为 BSP Port。本节是补充案例，不属于 `eb5f38b` 固定提交事实。

## 协议模式配置

架构验证器默认不从裸命令值推断设备协议。项目可在 `--config` 文件提供 `portDeviceProtocolPatterns`，按设备命令/寄存器符号配置正则；命中才报告 `BSP_PORT_DEVICE_PROTOCOL_CALL`。例如：

```json
{
  "portDeviceProtocolPatterns": [
    { "id": "aht21-command", "pattern": "\\bAHT21_(?:CMD|TRIGGER|INIT)_[A-Z0-9_]+\\b" },
    { "id": "display-register", "pattern": "\\bST7789_(?:CMD|REG)_[A-Z0-9_]+\\b" }
  ]
}
```

## 测试口径

- Driver Fake Bus：初始化、读数、总线失败、忙超时、帧/CRC 错误、反初始化回滚。
- Handler Fake Driver/OSAL：初始化幂等、请求串行化、缓存新鲜度、设备缺失、停止顺序和回调上下文。
- Wrapper/Fake Port：只验证稳定 API、状态映射和依赖隐藏。
- 板级：分别验证硬件 IIC 和软件 IIC，并记录实际读数与错误恢复；构建成功和 RTT 连通不能替代该证据。
