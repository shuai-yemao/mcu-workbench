# OSAL / FreeRTOS 两层映射案例

## 固定源码

证据来自 `https://github.com/shuai-yemao/stm32f411ceu6_freertos_transplant.git` 的 `Sensor_temp_humi` 分支，提交 `eb5f38b3acb55063b6a3e2777aae2fb983cda8bf`。

```text
Middlewares/os_adapter/
├─ inc/                  # osal_* 公共头
├─ shared/src/           # Wrapper 实现
├─ shared/inc/           # osal_internal_*.h 内部边界
└─ FreeRTOS/src/         # Port 实现，文件名 os_impl_*.c
```

真实调用链包括：

```text
osal_task_create() → os_task_create_impl() → xTaskCreate()
osal_queue_send()  → os_queue_send_impl()  → xQueueSend()/xQueueSendFromISR()
```

因此内部函数命名是 `os_*_impl()`，不是 `os_impl_*()`。源文件名沿用 `os_impl_*.c` 不影响函数命名契约。

## 能力边界

固定提交可确认 task、queue、semaphore、mutex、timer、heap 等公开族及相应 Port；没有 `osal_event_*`。FreeRTOS 原生具备 Event Group 或 Task Notify，不代表该 OSAL 已公开这些能力。

每次扩展 OSAL 必须按以下顺序取证：

1. 调用方确实需要该语义。
2. 公共头定义句柄、所有权、单位、ISR 能力和错误码。
3. Wrapper 只做校验与语义转换，调用 `os_*_impl()`。
4. 每个启用的 Port 都实现或显式报告不支持。
5. Fake 与具体 RTOS 测试覆盖成功、超时、ISR 和资源回收。

## 已观察风险

- `osal_queue_receive` 的接收缓冲区方向曾以 `const void *` 表达，导致 BSP Port 强制转换；输出参数应为可写指针。
- BSP Port 的注释在同一接口附近同时使用 ms 和 ticks；单位必须固定，转换只发生在 OS Port。
- ISR 临界区如果需要保存屏蔽状态，enter 必须返回 token，exit 必须使用同一 token；不能无条件开中断。
- 错误码映射要区分超时、参数、资源不足、不支持和 ISR 上下文错误，不能全部折叠为资源失败。

## 其他 Port 的示例映射

| OSAL | FreeRTOS 示例 | RT-Thread 示例 | 裸机示例 |
|---|---|---|---|
| `osal_task_delay_ms` | `vTaskDelay` | `rt_thread_mdelay` | 注入时基轮询或调度器 hook |
| `osal_mutex_lock` | `xSemaphoreTake` | `rt_mutex_take` | 临界区或单线程状态机 |
| `osal_queue_send` | `xQueueSend` | `rt_mq_send` | 固定容量环形队列 |

这些只是语义映射示例，不声明相应 Port 已存在。
