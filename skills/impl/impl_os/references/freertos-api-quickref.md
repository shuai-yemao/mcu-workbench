# FreeRTOS API 速查：原生能力与当前 Port 分开

> 本表是原生 API 的核对工具，不等于当前 Platform OS 已公开能力。当前 Port 的实际映射以 `freertos-source-map.md` 和目标工程 `04_Impl/impl_os/src/impl_os_*.c` 为准。

## 任务

| API | 功能 | ISR 安全 | 阻塞 |
|---|---|---|---|
| `xTaskCreate` | 创建任务 | ❌ | ❌ |
| `vTaskDelete` | 删除任务 | ❌ | ❌ |
| `vTaskDelay` | 相对延时 | ❌ | ✅ |
| `vTaskSuspend`/`vTaskResume` | 挂起/恢复 | ❌ | ❌ |
| `xTaskResumeFromISR` | ISR 中恢复任务 | ✅ | ❌ |
| `uxTaskGetStackHighWaterMark` | 查看栈余量 | ❌ | ❌ |
| `xTaskGetTickCount`/`FromISR` | 获取 tick | ✅ | ❌ |

## 队列

| API | 功能 | ISR 安全 | 阻塞 |
|---|---|---|---|
| `xQueueCreate` | 创建队列 | ❌ | ❌ |
| `xQueueSend`/`xQueueReceive` | 任务上下文发送/接收 | ❌ | ✅ |
| `xQueueSendFromISR`/`xQueueReceiveFromISR` | ISR 发送/接收 | ✅ | ❌ |
| `uxQueueMessagesWaiting`/`FromISR` | 等待消息数量 | ✅ | ❌ |

## 信号量与互斥锁

| API | 功能 | ISR 安全 | 阻塞 |
|---|---|---|---|
| `xSemaphoreCreateBinary` | 创建二值信号量 | ❌ | ❌ |
| `xSemaphoreCreateCounting` | 创建计数信号量 | ❌ | ❌ |
| `xSemaphoreCreateMutex` | 创建互斥锁 | ❌ | ❌ |
| `xSemaphoreGive`/`xSemaphoreTake` | 任务上下文释放/获取 | ❌ | take 可阻塞 |
| `xSemaphoreGiveFromISR`/`xSemaphoreTakeFromISR` | ISR 变体 | ✅（按对象类型核验） | ❌ |

### Port 审查提示

- FreeRTOS mutex 具有所有权/优先级继承语义，不能把 `xSemaphoreTakeFromISR` 当成 mutex 的通用替代。
- 目标工程的 `impl_os_mutex.c` 存在 ISR 分支；这是一项需要确认的源码风险，不是“已验证 ISR 安全”的证据。
- 创建、删除、give/take 的句柄所有权和失败映射必须回到 `platform_os_*` 公共头核对。

## 软件定时器

| API | 功能 | 调用者阻塞 |
|---|---|---|
| `xTimerCreate` | 创建定时器 | ❌ |
| `xTimerStart`/`Stop`/`Reset` | 任务上下文命令 | ✅，等待 timer command queue |
| `xTimerStartFromISR`/`StopFromISR`/`ResetFromISR` | ISR 命令 | ❌ |
| `xTimerChangePeriod` | 修改周期 | ✅ |
| `xTimerDelete` | 删除定时器 | ✅ |

目标 Port 已观察到 create/start/stop/change/delete/reset/period-get 和 callback 转发。callback 运行在 timer service task 上下文；若 Timer ID 借用外部 record，必须在设计中闭合 record 的创建者、释放者、删除时机和并发关系。

## 内存管理

| API | 功能 |
|---|---|
| `pvPortMalloc` | 从 FreeRTOS 堆分配 |
| `vPortFree` | 释放 FreeRTOS 堆 |
| `xPortGetFreeHeapSize` | 获取剩余堆 |
| `xPortGetMinimumEverFreeHeapSize` | 获取历史最小堆 |

当前目标 Port 只直接映射 `pvPortMalloc`/`vPortFree`。不要因为存在 heap API 就在 ISR、实时关键路径或没有失败策略的代码中随意引入动态分配。

## 临界区与 tick 转换门禁

- `taskENTER_CRITICAL_FROM_ISR()` 若返回屏蔽状态 token，必须保存并由对应 exit 使用；包装成 `void enter/void exit(0)` 只能标记为风险。
- `IMPL_OS_MS_TO_TICKS` 只应转换明确声明为毫秒的参数；period 和 timeout 若均以 ticks 表达，不能重复转换。
- `portMAX_DELAY` 与 Platform 的最大延时常量、tick 宽度和 `configUSE_16_BIT_TICKS` 必须一致核对。

## 配置读取顺序

若项目使用 CubeMX，先确认生成边界；本案例目标工程不是由本表证明 CubeMX 配置。建议按以下顺序读取：`FreeRTOSConfig.h` → `portable/heap` → `impl_os_freertos.h` → `impl_os_*.c`。任务优先级、栈单位、tick 宽度和中断优先级不得依赖默认值。

## 选型提示

| 场景 | 常见原生选择 | 仍需确认 |
|---|---|---|
| ISR → 单任务同步 | task notification 或 binary semaphore | 当前 Platform OS 是否公开该能力 |
| 资源管理 | mutex | 优先级继承、ISR 禁止和 owner |
| 数据传递 | queue | 消息大小、复制语义和容量 |
| 周期回调 | software timer | timer service task 上下文和 callback 时长 |
