# OSAL Wrapper/Port 契约

## 稳定接口

Wrapper 只暴露项目需要且 Port 已实现的最小 `osal_*` API：任务、队列、信号量、互斥锁、软件定时器、延时、时基、内存和临界区。事件、Notify、取消等能力不得从某个 RTOS 的能力反推为 OSAL 已具备。句柄、超时单位、ISR 可用性、所有权和错误码必须在接口文档中固定。

## Port 责任

公开 Wrapper 调用内部 `os_*_impl()`，Port 再绑定 FreeRTOS、RT-Thread 或裸机。`osal_internal_*.h` 只声明 Wrapper/Port 的内部接口，不是第三层。原生 RTOS 头文件、`xTask*`、`xQueue*` 等只能出现在 Port 和具体 RTOS reference 中。Wrapper 不包含 RTOS 头文件，也不保存业务状态。

```text
Caller → osal_task_create() → os_task_create_impl() → native RTOS API
```

FreeRTOS、RT-Thread 和裸机映射只能作为实现示例；公共能力清单必须以当前 Port 的实际头文件、实现和测试为准。

## 验收矩阵

| 场景 | 必须证明 |
| --- | --- |
| 任务创建/删除 | 生命周期、栈单位、优先级和失败回收 |
| 队列/可选事件 | 阻塞超时、ISR 版本、生产者/消费者所有权，以及该能力是否真实实现 |
| 锁 | 递归规则、优先级反转策略和超时语义 |
| 定时 | 时基来源、回调上下文和停止/重启行为 |
| 裸机替代 | Fake/Mock 不依赖 RTOS，仍能运行 APP 单元测试 |

具体 FreeRTOS 的文件、配置和端口证据见 [`freertos-source-map.md`](../../os-runtime/references/freertos-source-map.md)。
