# Platform OS Wrapper/Impl 契约

## 稳定接口

Wrapper 只暴露项目需要且 Impl 已实现的最小 `platform_os_*` API：任务、队列、信号量、互斥锁、软件定时器、延时、时基、内存和临界区。事件、Notify、取消等能力不得从某个 RTOS 的能力反推为 Platform OS 已具备。句柄、超时单位、ISR 可用性、所有权和错误码必须在接口文档中固定；现有工程的实际返回类型和错误别名还要与规范目标分开记录。

## Impl 责任

公开 Wrapper 调用内部 `impl_os_*()`，Impl 再绑定 FreeRTOS、RT-Thread 或裸机。`platform_os_internal_*.h` 只声明两层内部接口，不是第三层。原生 RTOS 头文件、`xTask*`、`xQueue*` 等只能出现在 Impl 和具体 RTOS reference 中。Wrapper 不包含 RTOS 头文件，也不保存业务状态。

```text
Caller → platform_os_task_create() → impl_os_task_create() → native RTOS API
```

FreeRTOS、RT-Thread 和裸机映射只能作为实现示例；公共能力清单必须以当前 Impl 的实际头文件、实现和测试为准。目标工程若有 `platform_os_*.c`，应将其视为上层转发实现，不据此改变 Platform/Impl 的边界。

## 验收矩阵

| 场景 | 必须证明 |
|---|---|
| 任务创建/删除 | 生命周期、栈单位、优先级、名称限制和失败回收 |
| 队列/可选事件 | 阻塞超时、ISR 版本、生产者/消费者所有权，以及该能力是否真实实现 |
| 锁 | 递归规则、优先级反转策略、mutex owner、ISR 限制和超时语义 |
| 定时 | period/timeout 单位、时基来源、timer service task 回调上下文和停止/重启行为 |
| 临界区 | 任务/ISR 屏蔽状态 token、嵌套和退出对称性 |
| 内存/Timer | heap owner、Timer ID/record 生命周期、callback 上下文和删除路径 |
| 错误 | 参数、超时、忙、资源不足、不支持和 ISR 上下文错误的可区分映射 |
| 裸机替代 | Fake/Mock 不依赖 RTOS，仍能运行 APP 单元测试 |

具体 FreeRTOS 的文件、配置和端口证据见 [`freertos-source-map.md`](../../../impl/impl_os/references/freertos-source-map.md)。
