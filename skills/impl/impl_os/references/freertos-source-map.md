# FreeRTOS / Impl OS 源码证据映射

## 证据范围

本文件是目标工程取证模板和案例映射规则，不是固定工程路径的通用事实。每次
使用时必须填写目标工程绝对路径、分支/提交、FreeRTOS 版本、配置、构建入口
和验证等级。外部案例只能标记为 `nearest`，不能替代目标工程证据。

```text
project_root: <absolute target firmware path>
branch_commit: <branch @ commit>
rtos_version: <confirmed | unverified>
validation_level: static | host | build | target | physical
capability_profile: direct-platform-backend | explicit-impl-bridge | bare-metal-or-fake | mixed | missing
```

## 1. 调用链剖面

### 直接 Platform 后端

```text
Platform public header
        ↓
Platform implementation .c
        ↓
FreeRTOS headers/native API
        ↓
Vendor RTOS source and portable layer
```

标记为 `direct-platform-backend` 的前提：Platform `.c` 的原生 include/API、
RTOS 配置、实际构建入口和至少一项测试证据均已确认。

### 显式 Impl 桥接

```text
Platform public header
        ↓
Platform internal header
        ↓
Impl OS backend .h/.c
        ↓
FreeRTOS headers/native API
        ↓
Vendor RTOS source and portable layer
```

标记为 `explicit-impl-bridge` 的前提：internal 头、Platform/Impl 实现、
配置、构建入口和测试形成闭合证据。不能只因目录叫 `impl_os` 就采用该状态。

### 混合或缺失

不同能力族链路不同则标记 `mixed`，并在能力矩阵逐项记录；缺少关键公共头、
实现、配置、构建入口或测试则标记 `missing`/`unverified`。

## 2. 文件映射模板

| 目标路径 | 观察职责 | 必须记录的审查重点 | 证据状态 |
|---|---|---|---|
| `<platform public header>` | 公共 OS 能力、句柄、错误和配置 | 禁止 RTOS/CMSIS/HAL/芯片/C 标准库泄漏 | confirmed/nearest/missing |
| `<platform implementation .c>` | 参数检查、公共语义和后端调用 | 直接 native 绑定或内部转发是否有构建证据 | confirmed/nearest/missing |
| `<platform internal header>` | 两层内部原型或 record | 是否真实存在、是否被公共层隔离 | confirmed/nearest/missing |
| `<impl backend header>` | 原生头聚合和配置宏 | API 裁剪、tick/heap/port 依赖 | confirmed/nearest/missing |
| `<impl task source>` | Task create/delete/delay/tick/hooks | 栈、优先级、调度器、ISR token | confirmed/nearest/missing |
| `<impl queue source>` | Queue create/delete/send/receive | 消息复制、缓冲区方向、阻塞/FromISR | confirmed/nearest/missing |
| `<impl sema source>` | Binary/counting semaphore | 初值、边界、ISR 适用性 | confirmed/nearest/missing |
| `<impl mutex source>` | Mutex create/give/take | mutex ISR 限制、所有权、优先级继承 | confirmed/nearest/missing |
| `<impl timer source>` | Timer create/start/stop/delete/callback | service task、ID/record、删除释放 | confirmed/nearest/missing |
| `<impl heap source>` | heap malloc/free | heap 实现、失败策略、owner、上下文 | confirmed/nearest/missing |
| `<FreeRTOSConfig.h>` | 条件编译和资源配置 | tick、静态/动态、mutex/timer/heap API | confirmed/nearest/missing |
| `<build entry>` | 实际编译单元和配置 | 是否真的编译这些文件 | confirmed/nearest/missing |

## 3. 能力映射记录模板

| Platform API | Platform 实现 | Impl 后端（如有） | FreeRTOS native | 公开能力 | 状态 |
|---|---|---|---|---|---|
| `platform_os_task_create` | `<path:symbol>` | `<path:symbol or none>` | `xTaskCreate` | confirmed/unverified | `<status>` |
| `platform_os_queue_send` | `<path:symbol>` | `<path:symbol or none>` | `xQueueSend`/FromISR | confirmed/unverified | `<status>` |
| `platform_os_mutex_take` | `<path:symbol>` | `<path:symbol or none>` | `xSemaphoreTake` | confirmed/unverified | `<status>` |
| `platform_os_timer_start` | `<path:symbol>` | `<path:symbol or none>` | `xTimerStart`/FromISR | confirmed/unverified | `<status>` |
| `platform_os_heap_malloc` | `<path:symbol>` | `<path:symbol or none>` | `pvPortMalloc` | confirmed/unverified | `<status>` |

表中 `none` 只有在目标工程确认直接 Platform 后端时使用；不能因为没有找到
Impl 文件就默认填 `none`。每项还要记录单位、所有权、阻塞、ISR、错误映射和
失败回滚。

## 4. 固定风险门禁

- FreeRTOS 源码版本必须固定到 tag/commit；不能用 `main` 作为版本证据。
- 不能把 native API 传播到 App、Service、BSP Driver 或 Platform 公共头。
- `taskENTER_CRITICAL_FROM_ISR()` 的屏蔽状态 token 必须在对应 exit 闭合。
- mutex 不能按普通 semaphore 的 ISR 规则推断。
- Timer ID/record 的创建、借用、callback、删除和释放必须闭环。
- `FreeRTOSConfig.h` 和实际构建入口必须证明条件编译 API 可用。
- 没有完整构建入口时，静态源码映射只能证明文档/源码观察，不能替代交叉
  编译、烧录、目标运行或实物时序验收。

## 5. 当前能力与原生能力分离

目标工程当前公开能力必须由公共头、后端实现和测试共同确认。FreeRTOS 原生
Event Group、Task Notification、Stream Buffer 和 Message Buffer 的存在只能
记录为 native capability；在没有完整公共契约前，不得登记为 Platform capability。

## 6. 交接字段

```text
evidence_status: confirmed | user-confirmed | inferred | unverified | nearest | mixed | missing
unresolved_items: <missing files/config/build/test evidence>
owner_lifecycle: <creator/current owner/releaser>
context_rules: <task/ISR/callback/service task>
unit_rules: <ms/tick/bytes/items>
error_mapping: <native result to Platform result>
validation_plan: static | host | build | target | physical
```
