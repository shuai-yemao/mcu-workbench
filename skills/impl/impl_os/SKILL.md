---
name: impl_os
description: Impl 落地：具体 RTOS（尤其 FreeRTOS）或裸机的 impl_os_*() 原生 Port 实现、调度调试和迁移验收。用户提到 OSAL、任务/队列/信号量/互斥锁/软件定时器/heap、FreeRTOSConfig、FromISR、tick 转换、临界区或 RTOS Port 时必须使用本 Skill。
---

# Impl OS（平台适配 · OS 绑定）

## 边界

处理具体 RTOS 或裸机运行时的原生配置与 `impl_os_*()` Port 实现：任务、队列、二值/计数信号量、互斥锁、软件定时器、heap、临界区、tick 和调度诊断。稳定的项目接口由 [`platform_os`](../../platform/platform_os/SKILL.md) 定义；本层只负责把 Platform 接口落到具体 RTOS。

在当前 FreeRTOS 证据工程中，调用链是：

```text
platform_os_* → platform_os_internal_*.h → impl_os_* → FreeRTOS native API
```

`platform_os_internal_*.h` 是 Platform/Impl 的内部边界，不是第三层；`impl_os_freertos.h` 是 Port 的 FreeRTOS 头文件和配置宏聚合入口。目标工程中真实路径、函数和配置以 [`freertos-source-map.md`](references/freertos-source-map.md) 为准。

## 规则

FreeRTOS 类型和 `xTask*`/`xQueue*`/`xSemaphore*`/`xTimer*` 只能出现在 Impl 或本 Skill 的具体 RTOS references 中；APP、Service、BSP Driver 和 Platform 公共头使用 `platform_os_*`。不要为 FreeRTOS 再创建第二套 Adapter。

Impl 先从当前 Platform 公共头和实现确认 period/timeout 的单位，再保持其所有权和错误语义映射到原生 API；不能仅凭参数名或注释猜测 ms/ticks。转换只能位于 Impl。Tickless、Idle Hook、Trace Hook、stack overflow hook 和 malloc failed hook 属于本层；任务看门狗、故障恢复和系统重启策略交给 [`software-system`](../../service/service_system/SKILL.md)。

每个 API 都要单独记录：任务/ISR 上下文、是否阻塞、超时单位、句柄/缓冲区/record 所有权、原生失败值到 Platform 错误码的映射、初始化失败回滚和 deinit 行为。`FromISR` 分支只证明调用了 ISR 变体，不自动证明对象类型、优先级或临界区语义安全。

## 当前 FreeRTOS Port 能力

| 能力 | 目标工程观察 | 生成/审查要求 |
|---|---|---|
| Task | `impl_os_task.c` 使用 `xTaskCreate`、删除/挂起/恢复、delay、scheduler、tick | 栈单位、名称长度、优先级范围和 scheduler 前后状态必须取证 |
| Queue | `xQueueCreate`、send/receive、ISR send/receive、waiting count | 消息大小、队列深度、阻塞超时和 ISR 版本分别记录 |
| Semaphore | binary/counting create、give/take、ISR give/take | 计数边界、初始值和 ISR 适用性分别核验 |
| Mutex | `xSemaphoreCreateMutex`、give/take | FreeRTOS mutex 不按普通 semaphore 的 ISR 规则推断；源代码分支必须作为风险复核 |
| Timer | `xTimerCreate`、start/stop/change/delete/reset、period get、callback | callback 上下文是 timer service task；Timer ID 指向的 record 生命周期必须闭环 |
| Heap | `pvPortMalloc`/`vPortFree` | 记录 heap 实现、分配失败行为、调用上下文和释放者 |

Event Group、Task Notify、stream/message buffer 即使在 FreeRTOS 原生存在，也不能写成当前 Platform OS 已公开能力，除非公共头、Impl 和测试共同证明。

## 必须触发的风险门禁

- **ISR 互斥锁**：先核对 FreeRTOS 对 mutex 的 ISR 限制；不能因为代码存在 `xSemaphoreGiveFromISR`/`xSemaphoreTakeFromISR` 分支就放行。
- **临界区 token**：若 native `enter-from-ISR` 返回屏蔽状态 token，接口必须返回并在 exit 使用同一 token；无条件传 0 或无条件开中断只能标为风险。
- **Timer record**：若 callback 通过 Timer ID 借用外部 record，必须说明 record 创建者、释放者、删除时机和 callback 并发关系。
- **失败回滚**：检查空指针、分配失败、创建失败、句柄输出初始化和重复 deinit；静态检查不能证明无泄漏。
- **配置裁剪**：每个条件编译 API 必须由 `FreeRTOSConfig.h` 或目标配置证明；未证明的 API 只能生成预览并标 `UNRESOLVED_RTOS_CONFIG`。

## 证据与工作流

1. 读取 `platform_os` 公共头、`platform_os_internal_*.h`、Wrapper `.c`、Impl `.c`、FreeRTOSConfig 和 Vendor 端口。
2. 输出能力矩阵和 `platform_os_* → impl_os_* → native API` 调用链，逐项标记 `confirmed`/`inferred`/`unverified`。
3. 对单位、所有权、阻塞/ISR、错误码和资源回收做反猜测审查。
4. 用 Fake/Mock 覆盖成功、失败、超时、ISR 投递和释放；再分别规划交叉编译、目标运行和实物时序验证。
5. 目标工程没有构建入口时，保留 `UNVERIFIED_BUILD_ENTRY`，不能把源码映射或主机测试写成目标通过。

源码目录、配置、端口映射和目标工程观察见 [`freertos-source-map.md`](references/freertos-source-map.md)；原生 API 速查见 [`freertos-api-quickref.md`](references/freertos-api-quickref.md)。

源文件可以命名为 `impl_os_*.c`，内部函数统一采用 `impl_os_*()`。不要把某个工程的路径、FreeRTOS 版本或配置值复制成所有项目的默认事实；项目案例必须放在 reference，并标出证据等级。
