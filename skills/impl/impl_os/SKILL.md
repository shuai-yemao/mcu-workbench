---
name: impl_os
description: Impl 落地：具体 RTOS（尤其 FreeRTOS）或裸机的 impl_os_*() 后端实现、配置审查、调度诊断和迁移验收。用户提到 OSAL、任务/队列/同步、Timer、heap、FreeRTOSConfig、FromISR、tick、临界区或 RTOS Port 时使用本 Skill。
---

# Impl OS（具体运行时 · 后端绑定）

## 边界

Impl OS 负责具体 RTOS 或裸机运行时的原生配置、资源绑定、单位转换、错误
映射、上下文限制、生命周期、回滚和验证。稳定的项目接口由
[`platform_os`](../../platform/platform_os/SKILL.md) 定义；本层不承载 Service
策略、设备协议、业务缓存或 Handler 工作循环。

不要把 `impl_os_*` 自动理解为每个工程都必须存在的第二套 Adapter。先读取
Platform 公共头、实现 `.c`、internal 头（如有）、配置、构建入口和测试，再
判断下列实现剖面。

## 实现剖面

| 剖面 | 典型调用链 | Impl OS 的职责 |
|---|---|---|
| `direct-platform-backend` | `platform_os_* → platform_os.c → native API` | 审查 Platform `.c` 的 RTOS 绑定、配置、单位、错误和资源语义；不新增二次桥接 |
| `explicit-impl-bridge` | `platform_os_* → internal header → impl_os_* → native API` | 实现或审查真实存在的 `impl_os_*` 后端函数和内部契约 |
| `bare-metal-or-fake` | `platform_os_* → timebase/fake backend` | 审查裸机时基、Fake/Mock 和可测试替代后端 |
| `mixed` | 按能力族使用不同链路 | 每个能力族单独记录实现和验证证据 |
| `missing` | 关键文件/配置/构建入口缺失 | 输出未解析标记，不声称可编译或可运行 |

## 规则

FreeRTOS 类型和 `xTask*`、`xQueue*`、`xSemaphore*`、`xTimer*` 等原生 API
只能出现在真实 Impl/Port 实现和明确标注的 RTOS reference 中。APP、Service
和 Platform 公共头使用 `platform_os_*`，不直接 include RTOS。

先从当前 Platform 公共头和实现确认 period、timeout、delay 和 tick 的单位，
再在后端转换；不能仅凭参数名或注释猜测 ms/ticks。每个 API 必须单独记录：

- 任务/ISR 上下文、是否阻塞、最大等待和超时单位；
- 句柄、缓冲区、Timer record、回调参数和堆内存的所有权；
- 线程安全性、可重入性、异步借用期限和释放时机；
- 原生失败值到 Platform 错误码的映射；
- 初始化失败回滚、重复 deinit 和删除后的对象状态。

`FromISR` 分支只证明调用了 ISR 变体，不自动证明对象类型、优先级、临界区
或调度语义安全。

## 当前能力审查矩阵

| 能力 | FreeRTOS 观察对象 | 必须审查 |
|---|---|---|
| Task | create/delete、挂起/恢复、delay、scheduler、tick | 栈单位、名称、优先级、入口参数、scheduler 前后状态 |
| Queue | create、send/receive、FromISR、waiting count | 消息大小、复制语义、深度、阻塞、可写输出方向 |
| Semaphore | binary/counting create、give/take、FromISR | 初值、最大计数、边界、ISR 适用性 |
| Mutex | create、give/take、递归（如有） | FreeRTOS mutex 的 ISR 限制、优先级继承、所有权 |
| Timer | create、start/stop/change/delete/reset、callback | service task 上下文、period 单位、ID/record 生命周期 |
| Heap | `pvPortMalloc`、`vPortFree` 或替代分配器 | heap 实现、失败策略、释放者、上下文、对齐 |
| Critical | native critical enter/exit、FromISR token | token 对称、屏蔽状态、嵌套和 ISR 规则 |

Event Group、Task Notification、Stream Buffer、Message Buffer 和取消语义即使
在 FreeRTOS 原生存在，也不能写成当前 Platform OS 已公开能力，除非公共头、
后端实现和测试共同证明。

## 必须触发的风险门禁

- **Mutex ISR**：核对 FreeRTOS mutex 的 ISR 限制；不能因代码存在
  `xSemaphoreGiveFromISR`/`xSemaphoreTakeFromISR` 就放行。
- **Critical token**：native enter-from-ISR 返回屏蔽状态 token 时，接口必须
  返回并在 exit 使用同一 token；无条件传 0 或无条件开中断只能标为风险。
- **Timer record**：callback 通过 Timer ID 借用 record 时，必须闭合创建者、
  释放者、删除时机和 callback 并发关系。
- **失败回滚**：检查空指针、分配失败、创建失败、输出句柄初始化、重复 deinit
  和资源泄漏；静态检查不能证明无泄漏。
- **配置裁剪**：每个条件编译 API 必须由 `FreeRTOSConfig.h`、Port 和目标构建
  入口证明；未证明时标记 `UNRESOLVED_RTOS_CONFIG`。
- **构建入口**：缺少目标构建入口时标记 `UNVERIFIED_BUILD_ENTRY`，不能把源码
  映射或主机测试写成目标通过。

## 证据与工作流

1. 读取 Platform 公共头、对应 `.c`、internal 头（如有）、Impl/Port、
   `FreeRTOSConfig.h`、Vendor RTOS 和构建入口。
2. 输出按能力族划分的剖面和调用链，标记 `confirmed`、`user-confirmed`、
   `inferred`、`unverified`、`nearest`、`mixed` 或 `missing`。
3. 对单位、所有权、阻塞/ISR、错误码、配置裁剪和资源回收做反猜测审查。
4. 先用 Fake/Mock 覆盖成功、失败、超时、ISR 投递和释放；再分别规划交叉编译、
   目标运行、串口/RTT 和实物时序验证。
5. 不同能力族证据不一致时使用 `mixed`，不能用一个最完整能力族代表整个 Port。

源码映射见 [`freertos-source-map.md`](references/freertos-source-map.md)，原生
API 速查见 [`freertos-api-quickref.md`](references/freertos-api-quickref.md)。

## 生成与审查禁止事项

- 不为 FreeRTOS 复制一套没有公共头/测试依据的第二套 Adapter。
- 不把 RTOS 原生能力自动升级为 Platform 公共能力。
- 不把某个工程路径、版本、配置值或提交号当作所有项目默认事实。
- 不把静态检查、主机测试、日志或文档描述写成目标构建、烧录或板上运行通过。
- 不把任务看门狗、故障恢复和系统重启策略放入 OS Port；这些属于系统服务策略。
