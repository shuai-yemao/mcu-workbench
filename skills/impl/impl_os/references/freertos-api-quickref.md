# FreeRTOS API 速查：原生能力、公开能力与当前 Port 分开

> 本表只用于核对 FreeRTOS 原生 API，不等于当前 Platform OS 已公开能力。
> 目标工程的实际映射必须另行记录公共头、实现、配置、构建和测试证据。

## 证据字段

每次使用本表审查目标工程时，至少记录：

```text
capability_profile: direct-platform-backend | explicit-impl-bridge | bare-metal-or-fake | mixed | missing
public_platform_api: confirmed | unverified | missing
port_mapping: confirmed | nearest | mixed | missing
rtos_config: confirmed | unverified
validation_level: static | host | build | target | physical
```

FreeRTOS 原生 API 存在时，只能说明 `native capability`；只有公共头、后端
实现和测试共同存在，才能登记为 `public capability`。

## 任务

| API | 功能 | ISR 安全 | 阻塞 |
|---|---|---|---|
| `xTaskCreate` | 创建任务 | 否 | 否 |
| `vTaskDelete` | 删除任务 | 否 | 否 |
| `vTaskDelay` | 相对延时 | 否 | 是 |
| `vTaskSuspend`/`vTaskResume` | 挂起/恢复 | 否 | 否 |
| `xTaskResumeFromISR` | ISR 中恢复任务 | 是 | 否 |
| `uxTaskGetStackHighWaterMark` | 查看栈余量 | 否 | 否 |
| `xTaskGetTickCount/FromISR` | 获取 tick | 是 | 否 |

必须继续核对栈单位、任务名称长度、优先级范围、入口参数、调度器状态和
`FreeRTOSConfig.h` 裁剪。原生 API 表不能替代 Platform 任务契约。

## 队列

| API | 功能 | ISR 安全 | 阻塞 |
|---|---|---|---|
| `xQueueCreate` | 创建队列 | 否 | 否 |
| `xQueueSend`/`xQueueReceive` | 任务上下文收发 | 否 | 可阻塞 |
| `xQueueSendFromISR`/`xQueueReceiveFromISR` | ISR 收发 | 是 | 否 |
| `uxQueueMessagesWaiting/FromISR` | 查询等待消息数 | 是 | 否 |

必须核对消息复制语义、项大小、队列深度、输出缓冲区可写方向、timeout 单位、
ISR 唤醒和失败值。错误的 `const` 方向不能由 Port 强制转换掩盖。

## 信号量与互斥锁

| API | 功能 | ISR 安全 | 阻塞 |
|---|---|---|---|
| `xSemaphoreCreateBinary` | 创建二值信号量 | 否 | 否 |
| `xSemaphoreCreateCounting` | 创建计数信号量 | 否 | 否 |
| `xSemaphoreCreateMutex` | 创建互斥锁 | 否 | 否 |
| `xSemaphoreGive/Take` | 任务上下文释放/获取 | 否 | Take 可阻塞 |
| `xSemaphoreGiveFromISR/TakeFromISR` | ISR 变体 | 按对象类型核验 | 否 |

FreeRTOS mutex 具有所有权和优先级继承语义，不能把普通 semaphore 的
FromISR 规则套用到 mutex。代码中存在 ISR 分支不是 ISR 安全证明。

## 软件定时器

| API | 功能 | 调用者阻塞 |
|---|---|---|
| `xTimerCreate` | 创建定时器 | 否 |
| `xTimerStart/Stop/Reset` | 任务上下文命令 | 可等待 command queue |
| `xTimerStartFromISR/StopFromISR/ResetFromISR` | ISR 命令 | 否 |
| `xTimerChangePeriod` | 修改周期 | 可阻塞 |
| `xTimerDelete` | 删除定时器 | 可阻塞 |

callback 通常运行在 timer service task 上下文；若 Timer ID 借用外部 record，
必须闭合 record 创建者、释放者、删除时机、callback 参数生命周期和并发关系。

## 内存管理

| API | 功能 | 必须确认 |
|---|---|---|
| `pvPortMalloc` | 从 FreeRTOS heap 分配 | heap 实现、失败值、上下文、所有权 |
| `vPortFree` | 释放 FreeRTOS heap | 释放者、重复释放、生命周期 |
| `xPortGetFreeHeapSize` | 获取剩余 heap | 是否由目标配置启用 |
| `xPortGetMinimumEverFreeHeapSize` | 获取历史最小 heap | 是否由目标配置启用 |

不要因为存在 heap API 就在 ISR、实时关键路径或没有失败策略的代码中引入
动态分配。必须把堆碎片、峰值、对齐和失败恢复与 Platform 契约分开记录。

## 临界区与 tick 转换

- `taskENTER_CRITICAL_FROM_ISR()` 若返回屏蔽状态 token，必须保存并由对应
  exit 使用；包装成 `void enter/void exit(0)` 只能标记为风险。
- 毫秒到 tick 的转换只能作用于公共接口明确声明为毫秒的参数。
- period、timeout 和 delay 若已经是 tick，不能重复转换。
- `portMAX_DELAY`、最大延时、tick 宽度和 `configUSE_16_BIT_TICKS` 必须与
  公共接口契约交叉核对。

## 配置和调用链取证

建议顺序为：`FreeRTOSConfig.h` → `portable/heap` → 后端聚合头 → 后端 `.c`
→ 构建入口 → 测试。若项目有 CubeMX 或其他生成器，先确认生成边界；本表不
证明任何生成配置。

调用链只能根据证据选择：

```text
platform_os_* → platform_os.c → FreeRTOS native API
platform_os_* → platform_os_internal_*.h → impl_os_* → FreeRTOS native API
```

若不同能力族链路不同，记录为 `mixed`；缺少关键文件或构建入口，记录为
`missing`/`unverified`，不能用最接近案例补齐。

## 原生能力与公开能力

FreeRTOS 原生 Event Group、Task Notification、Stream Buffer 和 Message Buffer
不自动属于 Platform OS。扩展任何一个能力前，必须同时提供公共头、后端实现、
错误/所有权/ISR 契约和测试证据；本 reference 不负责放行这些扩展。
