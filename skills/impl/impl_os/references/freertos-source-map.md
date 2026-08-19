# FreeRTOS / Impl OS 源码证据映射

## 证据范围

本案例来自 `D:\zhuomian\embedded_framework`，分支 `codex/platform-os`，提交 `0bc86f209a8d7025dbd4e8432e469e1c7a7713fd`。以下是静态源码证据，不构成目标构建、烧录或板上运行证明。另有 `05_Vendor/vendor_rtos` 的本地 FreeRTOS 源码；版本配置在 `00_Config/FreeRTOSConfig.h` 标注为 V10.3.1。

## 两层目录与调用链

```text
03_Platform/platform_os/inc/platform_os_*.h
03_Platform/platform_os/inc/platform_os_internal_*.h
03_Platform/platform_os/src/platform_os_*.c
        ↓
04_Impl/impl_os/inc/impl_os_freertos.h
04_Impl/impl_os/src/impl_os_*.c
        ↓
05_Vendor/vendor_rtos/include + portable + *.c
```

已确认调用链：

```text
platform_os_task_create → impl_os_task_create → xTaskCreate
platform_os_queue_send → impl_os_queue_send → xQueueSend/xQueueSendFromISR
platform_os_mutex_take → impl_os_mutex_take → xSemaphoreTake/xSemaphoreTakeFromISR
platform_os_timer_start → impl_os_timer_start → xTimerStart/xTimerStartFromISR
platform_os_heap_malloc → impl_os_heap_malloc → pvPortMalloc
```

## 目标工程文件映射

| 目标路径 | 已观察职责 | 审查重点 |
|---|---|---|
| `04_Impl/impl_os/inc/impl_os_freertos.h:25-36` | 聚合 FreeRTOS 头文件，定义 `IMPL_OS_MS_TO_TICKS` | `portMAX_DELAY`、tick 宽度、溢出和单位必须与公共接口一致 |
| `04_Impl/impl_os/src/impl_os_task.c` | task create/delete/start/suspend/resume/delay/critical/yield/tick/hooks | 条件编译、task name、ISR token、stack/malloc hook |
| `04_Impl/impl_os/src/impl_os_queue.c` | queue create/delete/send/receive/waiting | 消息复制、空指针、阻塞和 FromISR 分支 |
| `04_Impl/impl_os/src/impl_os_sema.c` | binary/counting semaphore create/delete/give/take | 初值/计数边界和 ISR 适用性 |
| `04_Impl/impl_os/src/impl_os_mutex.c` | mutex create/delete/give/take | FreeRTOS mutex 的 ISR 限制，不能套用普通 semaphore 规则 |
| `04_Impl/impl_os/src/impl_os_timer.c` | timer create/start/stop/change/delete/reset/period/callback | timer service task 上下文、Timer ID 指向的 record 和 delete 释放 |
| `04_Impl/impl_os/src/impl_os_heap.c` | `pvPortMalloc`/`vPortFree` 直接映射 | heap_4、上下文限制、失败策略和 owner |
| `03_Platform/platform_os/inc/platform_os_internal_*.h` | `impl_os_*` 原型及 timer/task 内部 record | 这是两层内部契约，不向 App/Service 输出 |
| `00_Config/FreeRTOSConfig.h:62-124` | 1 kHz tick、动态/静态分配、mutex/counting/timer、heap_4 和裁剪宏 | 生成前必须以实际配置核验 API 是否可用 |

## 当前已具备 vs 原生可用

当前 Platform OS 公开/Impl 已观察到 task、queue、binary/counting semaphore、mutex、software timer、heap。FreeRTOS 原生 Event Group、Task Notify、stream/message buffer 的存在，不代表当前 Platform OS 已公开这些能力；扩展前必须先修改公共契约、实现和测试。

## 固定规则

- FreeRTOS 源码应固定到 tag/commit；不能用 `main` 作为版本证据。
- 只允许 `platform_os_* → impl_os_* → native API`，不把 native API 传播到 App、Service、BSP Driver 或 Platform 公共头。
- 逐函数记录单位、所有权、阻塞、ISR、错误映射和失败回滚；注释与参数命名冲突时以头文件、Wrapper 和 Impl 交叉核对。
- 目标工程没有完整构建入口时，静态检查只证明文档/源码映射；不替代交叉编译、烧录、目标运行或实物时序验收。
