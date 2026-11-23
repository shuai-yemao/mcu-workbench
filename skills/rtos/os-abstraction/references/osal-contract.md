# OSAL Wrapper/Port 契约

## 稳定接口

Wrapper 只暴露项目需要的最小 `osal_*` API：任务、队列、信号量、互斥锁、事件、软件定时器、延时、内存和临界区。句柄、超时单位、ISR 可用性、所有权和错误码必须在接口文档中固定。

## Port 责任

Port 将 `osal_*` 绑定到 FreeRTOS、RT-Thread 或裸机实现。原生 RTOS 头文件、`xTask*`、`xQueue*` 等只能出现在 Port 和具体 RTOS reference 中。Wrapper 不包含 RTOS 头文件，也不保存业务状态。

## 验收矩阵

| 场景 | 必须证明 |
| --- | --- |
| 任务创建/删除 | 生命周期、栈单位、优先级和失败回收 |
| 队列/事件 | 阻塞超时、ISR 版本和生产者/消费者所有权 |
| 锁 | 递归规则、优先级反转策略和超时语义 |
| 定时 | 时基来源、回调上下文和停止/重启行为 |
| 裸机替代 | Fake/Mock 不依赖 RTOS，仍能运行 APP 单元测试 |

具体 FreeRTOS 的文件、配置和端口证据见 [`freertos-source-map.md`](../../rtos-freertos/references/freertos-source-map.md)。
