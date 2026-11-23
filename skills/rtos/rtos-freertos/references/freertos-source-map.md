# FreeRTOS 源码证据映射

- 仓库：[FreeRTOS/FreeRTOS-Kernel](https://github.com/FreeRTOS/FreeRTOS-Kernel)
- 分支：`main`
- 复核 commit：`78069a79ea8f9d17c0eae88c417fd41e2c54a2cd`

## 源码到职责

| 源码路径 | 负责内容 | Port 关注点 |
| --- | --- | --- |
| `tasks.c` | 任务、调度、延时和栈状态 | `configMAX_PRIORITIES`、栈单位和调度启动 |
| `queue.c` | Queue、Semaphore、Mutex | 阻塞、ISR 版本和优先级继承 |
| `timers.c` | 软件定时器服务任务 | 回调上下文、队列长度和停止语义 |
| `include/` | 原生公共类型和 API | 不得泄漏到 OS Wrapper/APP |
| `portable/` | CPU/编译器端口和内存管理 | 端口、Heap、临界区和中断优先级 |
| `examples/template_configuration/` | 配置起点 | 复制后锁定版本，不直接依赖 `main` |

## 项目规则

- 通过 tag 或 commit 固定 FreeRTOS 源码，不能把 `main` 当作永久版本。
- `FreeRTOSConfig.h`、Heap、Port 和中断优先级必须作为构建证据保存。
- 只验证 `osal_task_create → os_impl_task_create → xTaskCreate` 等调用链，不把 FreeRTOS 原生 API 传播到 APP、BSP 或 Middleware。
- GR5526 验收检查 `components/graphics/lvgl_port/os_adapter/FreeRTOS/src/os_impl_*.c` 是否只负责原生绑定。
