# Platform OS / FreeRTOS 两层映射案例（非 BSP Wrapper）

## 固定源码

证据来自实践工程 `D:\zhuomian\embedded_framework` 当前工作树：已确认文件、include、类型、宏、配置与函数映射。这是静态源码证据，不构成目标构建、烧录或板上运行证明；工作树中存在的未提交修改不应被本参考覆盖。

```text
03_Platform/platform_os/
├─ inc/                  # platform_os.h、platform_os_*.h 公共头
├─ inc/                  # platform_os_internal_*.h 内部边界
└─ src/                  # Platform OS 转发，文件名 platform_os_*.c
04_Impl/impl_os/
├─ inc/                  # impl_os_freertos.h
└─ src/                  # Port 实现，文件名 impl_os_*.c
```

真实调用链包括：

```text
platform_os_task_create() → impl_os_task_create() → xTaskCreate()
platform_os_queue_send()  → impl_os_queue_send()  → xQueueSend()/xQueueSendFromISR()
platform_os_timer_start() → impl_os_timer_start() → xTimerStart()/xTimerStartFromISR()
platform_os_heap_malloc() → impl_os_heap_malloc() → pvPortMalloc()
```

因此内部函数命名是 `impl_os_*()`，源文件统一采用 `impl_os_*.c`。当前工程可静态确认 task、queue、binary/counting semaphore、mutex、timer、heap 等公开族及相应 Impl；没有 `platform_os_event_*` 或 task-notify 公共接口。

`00_Config/FreeRTOSConfig.h` 证实使用 V10.3.1、1 kHz tick、mutex/counting/timer、动态/静态分配和 heap_4；每个项目都必须重新读取配置，不能复制这些值作为默认事实。

## 扩展顺序

1. 调用方确实需要该语义。
2. 公共头定义句柄、所有权、单位、ISR 能力和错误码。
3. Platform OS 转发层只做校验与语义转换，调用 `impl_os_*()`；它不属于已废弃的 BSP Wrapper。
4. 每个启用的 Impl 都实现或显式报告不支持。
5. Fake 与具体 RTOS 测试覆盖成功、超时、ISR 和资源回收。

## 已观察风险（只读源码观察）

- `platform_os_queue_receive` 的接收缓冲区方向必须是可写指针，不能因错误的 const 约束迫使 Port 强转。
- 接口附近若同时出现 ms 和 ticks 注释，必须固定单位；转换只发生在 OS Port。
- ISR 临界区如果需要保存屏蔽状态，enter 必须返回 token，exit 必须使用同一 token；不能无条件开中断。
- 错误码映射要区分超时、参数、资源不足、不支持和 ISR 上下文错误，不能全部折叠为资源失败。
- `impl_os_mutex.c` 对 mutex 存在 ISR 分支；必须按 FreeRTOS mutex 规则复核，不能将分支存在当作安全证明。
- `impl_os_task.c` 的 ISR 临界区 enter/exit 接口没有闭合屏蔽状态 token；应作为生成和最终 Review 门禁。
- `impl_os_timer.c` 的 callback 通过 Timer ID 取得 record，delete 路径必须核对 record 的释放和并发关系。

## 其他 Port 的语义示例

| Platform OS | FreeRTOS 示例 | RT-Thread 示例 | 裸机示例 |
|---|---|---|---|
| `platform_os_task_delay_ms` | `vTaskDelay` | `rt_thread_mdelay` | 注入时基轮询或调度器 hook |
| `platform_os_mutex_take` | `xSemaphoreTake` | `rt_mutex_take` | 临界区或单线程状态机 |
| `platform_os_queue_send` | `xQueueSend` | `rt_mq_send` | 固定容量环形队列 |

这些只是语义映射示例，不声明相应 Port 已存在。
