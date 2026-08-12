# Platform / Impl OS 命名迁移映射

## 1. 状态与证据

- 状态：`confirmed static mapping`。
- 证据：`D:\zhuomian\embedded_framework` 的 `HEAD` 旧 OS 切片与当前 `codex/platform-os` 工作区的 `03_Platform/platform_os`、`04_Impl/impl_os` 文件树和符号扫描。
- 范围：38 个 Platform 函数、37 个 Impl 函数、14 个类型和 20 个文件/局部标识，共 109 个 token。
- 边界：本表仅用于破坏性迁移审计；旧命名不作为 alias、示例 API、生成输出或测试正向断言保留。
- 验证等级：静态源码。目标构建、烧录与板上运行仍为 `unverified`。

## 2. Platform 函数（38 项）

`osal_enter_critical` → `platform_os_enter_critical`；`osal_exit_critical` → `platform_os_exit_critical`；`osal_heap_free` → `platform_os_heap_free`；`osal_heap_malloc` → `platform_os_heap_malloc`；`osal_mutex_create` → `platform_os_mutex_create`；`osal_mutex_delete` → `platform_os_mutex_delete`；`osal_mutex_give` → `platform_os_mutex_give`；`osal_mutex_take` → `platform_os_mutex_take`；`osal_port_yield` → `platform_os_port_yield`；`osal_queue_create` → `platform_os_queue_create`；`osal_queue_delete` → `platform_os_queue_delete`；`osal_queue_msg_waiting` → `platform_os_queue_msg_waiting`；`osal_queue_peek` → `platform_os_queue_peek`；`osal_queue_receive` → `platform_os_queue_receive`；`osal_queue_send` → `platform_os_queue_send`；`osal_sema_binary_create` → `platform_os_sema_binary_create`；`osal_sema_countings_create` → `platform_os_sema_countings_create`；`osal_sema_delete` → `platform_os_sema_delete`；`osal_sema_give` → `platform_os_sema_give`；`osal_sema_take` → `platform_os_sema_take`；`osal_task_create` → `platform_os_task_create`；`osal_task_delay` → `platform_os_task_delay`；`osal_task_delay_ms` → `platform_os_task_delay_ms`；`osal_task_delete` → `platform_os_task_delete`；`osal_task_disable_interrupts` → `platform_os_task_disable_interrupts`；`osal_task_enable_interrupts` → `platform_os_task_enable_interrupts`；`osal_task_get_tick_count` → `platform_os_task_get_tick_count`；`osal_task_resume` → `platform_os_task_resume`；`osal_task_start` → `platform_os_task_start`；`osal_task_suspend` → `platform_os_task_suspend`；`osal_task_suspend_all` → `platform_os_task_suspend_all`；`osal_timer_create` → `platform_os_timer_create`；`osal_timer_delete` → `platform_os_timer_delete`；`osal_timer_period_change` → `platform_os_timer_period_change`；`osal_timer_period_get` → `platform_os_timer_period_get`；`osal_timer_reset` → `platform_os_timer_reset`；`osal_timer_start` → `platform_os_timer_start`；`osal_timer_stop` → `platform_os_timer_stop`。

规则：只替换模块前缀；动作词、参数顺序、返回类型、错误语义、阻塞属性、ISR 属性和资源生命周期均不改。

## 3. Impl 函数（37 项）

`os_enter_critical_impl` → `impl_os_enter_critical`；`os_exit_critical_impl` → `impl_os_exit_critical`；`os_heap_free_impl` → `impl_os_heap_free`；`os_heap_malloc_impl` → `impl_os_heap_malloc`；`os_mutex_create_impl` → `impl_os_mutex_create`；`os_mutex_delete_impl` → `impl_os_mutex_delete`；`os_mutex_give_impl` → `impl_os_mutex_give`；`os_mutex_take_impl` → `impl_os_mutex_take`；`os_port_yield_impl` → `impl_os_port_yield`；`os_queue_create_impl` → `impl_os_queue_create`；`os_queue_delete_impl` → `impl_os_queue_delete`；`os_queue_msg_waiting_impl` → `impl_os_queue_msg_waiting`；`os_queue_receive_impl` → `impl_os_queue_receive`；`os_queue_send_impl` → `impl_os_queue_send`；`os_sema_binary_create_impl` → `impl_os_sema_binary_create`；`os_sema_countings_create_impl` → `impl_os_sema_countings_create`；`os_sema_delete_impl` → `impl_os_sema_delete`；`os_sema_give_impl` → `impl_os_sema_give`；`os_sema_take_impl` → `impl_os_sema_take`；`os_task_create_impl` → `impl_os_task_create`；`os_task_delay_impl` → `impl_os_task_delay`；`os_task_delay_ms_impl` → `impl_os_task_delay_ms`；`os_task_delete_impl` → `impl_os_task_delete`；`os_task_disable_interrupts_impl` → `impl_os_task_disable_interrupts`；`os_task_enable_interrupts_impl` → `impl_os_task_enable_interrupts`；`os_task_get_tick_count_impl` → `impl_os_task_get_tick_count`；`os_task_resume_impl` → `impl_os_task_resume`；`os_task_start_impl` → `impl_os_task_start`；`os_task_suspend_all_impl` → `impl_os_task_suspend_all`；`os_task_suspend_impl` → `impl_os_task_suspend`；`os_timer_create_impl` → `impl_os_timer_create`；`os_timer_delete_impl` → `impl_os_timer_delete`；`os_timer_period_change_impl` → `impl_os_timer_period_change`；`os_timer_period_get_impl` → `impl_os_timer_period_get`；`os_timer_reset_impl` → `impl_os_timer_reset`；`os_timer_start_impl` → `impl_os_timer_start`；`os_timer_stop_impl` → `impl_os_timer_stop`。

规则：只把 `impl` 后缀移动为 `impl_os_` 层前缀；不重排动作词，不改变任何函数关系。

## 4. 类型（14 项）

`osal_base_type_t` → `platform_os_base_type_t`；`osal_mutex_handle_t` → `platform_os_mutex_handle_t`；`osal_priority_t` → `platform_os_priority_t`；`osal_queue_handle_t` → `platform_os_queue_handle_t`；`osal_sema_handle_t` → `platform_os_sema_handle_t`；`osal_stackptr_t` → `platform_os_stackptr_t`；`osal_task_entry` → `platform_os_task_entry`；`osal_task_handle_t` → `platform_os_task_handle_t`；`osal_task_internal_record_t` → `platform_os_task_internal_record_t`；`osal_tick_type_t` → `platform_os_tick_type_t`；`osal_timer_cb_function_t` → `platform_os_timer_cb_function_t`；`osal_timer_handle_t` → `platform_os_timer_handle_t`；`osal_timer_internal_record_t` → `platform_os_timer_internal_record_t`；`osal_timer_t` → `platform_os_timer_t`。

规则：类型只修改前缀，保留 `_t`、`_entry`、`_function_t` 等类型后缀。

## 5. 文件与局部标识（20 项）

| 旧 token | 新 token | 分类 |
|---|---|---|
| `osal_config` | `platform_os_config` | 文件/模块 |
| `osal_error` | `platform_os_error` | 文件/模块 |
| `osal_heap` | `platform_os_heap` | 文件/模块 |
| `osal_internal_globaldefs` | `platform_os_internal_globaldefs` | 文件/模块 |
| `osal_internal_heap` | `platform_os_internal_heap` | 文件/模块 |
| `osal_internal_mutex` | `platform_os_internal_mutex` | 文件/模块 |
| `osal_internal_queue` | `platform_os_internal_queue` | 文件/模块 |
| `osal_internal_sema` | `platform_os_internal_sema` | 文件/模块 |
| `osal_internal_task` | `platform_os_internal_task` | 文件/模块 |
| `osal_internal_timer` | `platform_os_internal_timer` | 文件/模块 |
| `osal_macros` | `platform_os_macros` | 文件/模块 |
| `osal_mutex` | `platform_os_mutex` | 文件/模块 |
| `osal_queue` | `platform_os_queue` | 文件/模块 |
| `osal_sema` | `platform_os_sema` | 文件/模块 |
| `osal_task` | `platform_os_task` | 文件/模块 |
| `osal_timer` | `platform_os_timer` | 文件/模块 |
| `osal_task_handle` | `task_handle` | 局部/参数 |
| `osal_ticks` | `ticks` | 局部 |
| `osal_time_in_ms` | `time_in_ms` | 宏参数 |
| `osal_timer_cb` | `timer_cb` | 局部静态函数 |

## 6. 宏、guard 与跨层 include

| 旧命名 | 新命名 | 不变项 |
|---|---|---|
| `OSAL_<name>` | `PLATFORM_OS_<name>` | 宏体、值、参数、条件表达式和展开调用 |
| `OS_<name>` | `IMPL_OS_<name>` | 宏体、值、参数、条件表达式和展开调用 |
| `OS_MS_TO_TICKS` | `IMPL_OS_MS_TO_TICKS` | 换算公式 |
| `__OSAL_X_H__` | `__PLATFORM_OS_X_H__` | guard 与文件名的一一关系 |
| `__OS_FREERTOS_H__` | `__IMPL_OS_FREERTOS_H__` | Impl 专属 FreeRTOS 依赖 |

| 旧 include | 新 include | 使用关系 |
|---|---|---|
| `osal_internal_heap.h` | `platform_os_internal_heap.h` | Platform 源 / Impl 源共同依赖 |
| `osal_internal_globaldefs.h` | `platform_os_internal_globaldefs.h` | Platform 源 / Impl timer |
| `osal_internal_mutex.h` | `platform_os_internal_mutex.h` | Platform 源 / Impl mutex |
| `osal_internal_queue.h` | `platform_os_internal_queue.h` | Platform 源 / Impl queue |
| `osal_internal_sema.h` | `platform_os_internal_sema.h` | Platform 源 / Impl sema |
| `osal_internal_task.h` | `platform_os_internal_task.h` | Platform 源 / Impl task |
| `osal_internal_timer.h` | `platform_os_internal_timer.h` | Platform 源 / Impl timer |
| `os_freertos.h` | `impl_os_freertos.h` | Impl 专属；FreeRTOS API 依赖不变 |
| `osal.h` | `platform_os.h` | Platform OS 聚合公共头 |
| `common_types.h` | `platform_os_common_types.h` | Platform OS 公共类型头 |

include 顺序不变；Platform/Impl 的调用关系不变。
