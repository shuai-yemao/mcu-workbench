# Platform OS 公共契约参考

## 适用范围

本文件定义如何审查 `platform_os` 公共头、实现 `.c` 和具体后端之间的
契约。它是规范参考，不是某个 RTOS 工程的公共头，也不自动生成新的 OS
能力。

## 1. 公共接口边界

Platform OS 公共头只暴露项目实际需要且后端与测试已经证明的最小
`platform_os_*` 能力。推荐按任务、队列、二值/计数信号量、互斥锁、软件
定时器、延时、时基、内存和临界区分别记录契约。

公共头不得 include 或暴露 FreeRTOS、RT-Thread、CMSIS-OS、CMSIS compiler、
HAL、芯片寄存器、板级类型或 C 标准库头文件。公共类型和错误码必须从已确认
的 `platform_common` 出口取得；现有工程的真实返回类型和别名必须单独记录。

## 2. 实现剖面判定

| 剖面 | 调用链 | 必须确认的证据 | 不允许的推断 |
|---|---|---|---|
| `direct-platform-backend` | `platform_os_* → platform_os.c → native API` | Platform `.c`、原生 include、配置和构建入口 | 不得因为没有 `impl_os_*` 就判定架构错误 |
| `explicit-impl-bridge` | `platform_os_* → internal header → impl_os_* → native API` | internal 头、Platform/Impl `.c`、配置和测试 | 不得因为存在 `impl_os_*` 就判定所有能力都经过它 |
| `bare-metal-or-fake` | `platform_os_* → timebase/fake backend` | 时基、Fake/Mock、Port 和测试 | 不得把 Fake 结果写成目标板运行证据 |
| `mixed` | 按能力族存在不同链路 | 每个能力族的公共头/实现/测试 | 不得把一个能力族的链路套到全部能力 |
| `missing` | 无法确认链路 | 缺失文件、配置或构建入口记录 | 不得伪称可编译或已验证 |

`platform_os_internal_*.h` 只有在目标工程真实存在并被实现使用时才记录；
它是两层内部边界，不是向 App/Service 输出的第三层 API。`impl_os_*` 也只
在真实头文件、实现和测试共同证明时登记。

## 3. 能力契约检查表

每个公共 API 至少记录以下内容：

| 契约项 | 必须回答的问题 |
|---|---|
| 句柄 | 谁创建、谁拥有、谁销毁；句柄失效后如何处理？ |
| 输入/输出 | 缓冲区由谁提供和释放？是否异步借用？是否允许为空？ |
| 单位 | timeout/period/delay 是毫秒、tick 还是其他单位？转换位于哪里？ |
| 阻塞 | 是否阻塞？最大等待时间如何定义？超时后对象状态是什么？ |
| 上下文 | 是否允许 ISR？是否需要 FromISR 变体？回调运行在哪个上下文？ |
| 并发 | 是否线程安全、可重入？共享状态由谁保护？ |
| 错误 | 原生失败值如何映射到 Platform 错误？创建失败如何回滚？ |
| 生命周期 | init、运行、停止、删除和 deinit 的顺序是什么？ |

## 4. 典型验收矩阵

| 能力族 | Platform 侧必须确认 | 后端侧必须确认 | 关键风险 |
|---|---|---|---|
| Task | 入口、参数、栈单位、优先级、名称、删除规则 | native create/delete、scheduler/config | 栈/优先级/调度器状态 |
| Queue | 深度、单项大小、收发缓冲区方向、timeout | copy 语义、ISR 变体、失败值 | const 方向、阻塞和所有权 |
| Semaphore | 二值/计数、初值、最大计数、ISR 规则 | native give/take 和 config | 计数边界、上下文限制 |
| Mutex | 所有权、递归规则、ISR 禁止规则 | native mutex 规则、优先级继承 | 不能套用普通 semaphore 规则 |
| Timer | period 单位、callback 参数、停止/删除、record 所有权 | timer service task、ID/record、配置 | callback 并发、删除释放 |
| Heap | 分配器、失败结果、释放者、上下文 | RTOS heap、对齐/区域、hook | 碎片、泄漏、实时性 |
| Critical | enter/exit 成对、token 类型、上下文 | native critical API、屏蔽状态 | token 丢失或伪造对称 |

Event Group、Task Notification、Stream Buffer、Message Buffer 和取消语义
不能只凭 RTOS 原生 API 存在就加入公共矩阵；必须同时有公共头、后端实现和
测试证据。

## 5. 验证与证据等级

- `confirmed`：公共头、实现、配置或测试中存在直接证据。
- `user-confirmed`：用户明确确认的工程约束或架构决定。
- `inferred`：由相邻文件推断，但尚未有直接证据；不能作为放行依据。
- `unverified`：缺少构建、配置、运行或实物证据。
- `nearest`：找到最接近的案例或路径，但不能证明目标工程一致。
- `mixed`：不同能力族的证据状态不一致。
- `missing`：关键文件、配置、构建入口或测试缺失。

静态源码映射、主机测试、日志和文档描述不能替代交叉编译、目标运行、串口
/RTT 观测或实物时序证据。

## 6. 交接

Platform OS 先输出公共契约和证据矩阵；只有出现具体 RTOS 配置、原生 API、
单位转换、ISR 规则、错误映射或后端资源生命周期时，才交接
[`impl_os`](../../../impl/impl_os/SKILL.md)。交接必须携带公共头、实现文件、
配置、构建入口、测试和未验证项，不得只携带函数名或目录名。
