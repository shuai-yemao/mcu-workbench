# Platform OS FreeRTOS 案例参考

## 案例定位

本文件只记录 FreeRTOS 工程的取证方法和典型风险，不把某个工程的目录、
版本、配置或提交号升级为所有项目的默认事实。使用时必须填写目标工程路径、
分支/提交、公共头、实现文件、`FreeRTOSConfig.h`、Port 文件、构建入口和测试。

证据状态至少使用 `confirmed`、`user-confirmed`、`inferred`、`unverified`、
`nearest`、`mixed` 或 `missing`。

## 1. 目录和文件取证

不要只根据目录名称判断层归属。至少检查：

| 证据 | 需要回答的问题 |
|---|---|
| Platform 公共头 | 是否只有 RTOS-neutral 类型、句柄、错误和配置？ |
| Platform `.c` | 是否直接 include FreeRTOS 并调用 native API？ |
| internal 头 | 是否真实存在？是否只声明内部调用？ |
| Impl `.c/.h` | 是否存在 `impl_os_*`？职责是后端绑定还是第二套公共 API？ |
| FreeRTOS 配置 | API 是否由 `FreeRTOSConfig.h` 和端口裁剪证明？ |
| 构建入口 | 这些文件是否实际进入目标构建？ |
| 测试 | 公共能力、失败值、ISR 和释放路径是否被验证？ |

如果只找到相近工程或旧提交，状态为 `nearest`，不能直接写成目标工程
`confirmed`。

## 2. 两种合法调用链

### 2.1 直接 Platform 后端

```text
Caller → platform_os_* → platform_os.c → FreeRTOS native API
```

只有在 Platform `.c`、原生 include、配置和构建入口都被确认时，才能采用
`direct-platform-backend`。此剖面不要求创建 `impl_os_*` 二次桥接；Impl OS
Skill 仍可用于审查 FreeRTOS 上下文、配置、单位、错误和资源生命周期。

### 2.2 显式 Impl 桥接

```text
Caller → platform_os_* → platform_os_internal_*.h
       → impl_os_* → FreeRTOS native API
```

只有在 internal 头、Platform/Impl 实现、配置和测试都能闭合时，才能采用
`explicit-impl-bridge`。internal 头不对 App/Service 输出，`impl_os_*` 不得
复制一套公共 Platform API。

### 2.3 混合或缺失

不同能力族可以采用不同链路。例如任务直接绑定而 Timer 通过 Impl；此时标记
`mixed` 并按能力族建立矩阵。缺少构建入口、配置或测试时标记 `missing` 或
`unverified`，不补写调用链。

## 3. FreeRTOS 能力取证矩阵

| 能力 | 常见 native API | 必须核对的 Platform/Port 语义 |
|---|---|---|
| Task | `xTaskCreate`、delete、suspend/resume、delay、tick | 栈单位、名称长度、优先级、调度器状态、入口参数 |
| Queue | `xQueueCreate`、send/receive、FromISR | 消息复制、缓冲区方向、深度、阻塞、ISR 唤醒 |
| Semaphore | binary/counting create、give/take、FromISR | 初值、最大计数、计数边界、上下文 |
| Mutex | `xSemaphoreCreateMutex`、give/take | mutex 的 ISR 限制、优先级继承、递归规则 |
| Timer | `xTimerCreate`、start/stop/change/delete/reset | service task 上下文、period 单位、Timer ID/record、删除并发 |
| Heap | `pvPortMalloc`、`vPortFree` | heap 实现、分配失败、释放者、调用上下文、对齐 |
| Critical | port critical enter/exit、FromISR token | token 对称、屏蔽状态、嵌套和 ISR 规则 |

FreeRTOS 原生 Event Group、Task Notification、Stream Buffer 和 Message Buffer
不等于 Platform OS 已公开能力。若目标工程确实公开这些能力，必须另有公共头、
实现和测试证据，不能由本案例文件单独放行。

## 4. 必须保留的风险复核

- Queue receive 的输出缓冲区必须是可写方向，不能用错误的 `const` 约束迫使
  Port 强制转换。
- Mutex 不能套用普通 semaphore 的 FromISR 规则；必须按 FreeRTOS mutex
  约束审查。
- native critical enter-from-ISR 返回的屏蔽状态 token 必须原样传给对应 exit；
  无条件传 0 或无条件开中断只能标记为风险。
- Timer callback 如果通过 Timer ID 借用 record，必须闭合 record 创建者、
  释放者、删除时机和 callback 并发关系。
- 创建、分配、启动、停止、删除和 deinit 的失败路径必须记录对象状态和回滚。
- 条件编译 API 必须由 `FreeRTOSConfig.h`、端口和实际构建入口证明；否则使用
  `UNRESOLVED_RTOS_CONFIG` 或 `UNVERIFIED_BUILD_ENTRY`。

## 5. 案例记录模板

```text
project_root: <absolute target firmware path>
branch_commit: <branch @ commit>
rtos_version: <confirmed or unverified>
platform_public_headers: <paths>
platform_sources: <paths>
internal_headers: <paths or missing>
impl_sources: <paths or missing>
rtos_config: <paths or unverified>
build_entry: <command/path or unverified>
capability_profile: direct-platform-backend | explicit-impl-bridge | bare-metal-or-fake | mixed | missing
evidence_status: confirmed | user-confirmed | inferred | unverified | nearest | mixed | missing
validation_levels: static | host | build | target | physical
unresolved_items: <list>
```

## 6. 交接边界

Platform OS reference 负责确认公共能力和调用链剖面；具体 FreeRTOS API、配置、
Port、上下文、单位转换、错误映射和资源生命周期交给
[`impl_os`](../../../impl/impl_os/SKILL.md)。主机/静态结果必须与交叉编译、目标
运行、串口/RTT 或实物时序证据分开记录。
