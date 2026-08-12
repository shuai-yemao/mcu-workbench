# SRSys：Platform / Impl OS 实践工程对齐

## 1. 系统边界

```text
App → Service → Platform OS → Impl OS Port → FreeRTOS/Vendor
```

Platform OS 公开稳定能力契约；Impl OS 承载具体 RTOS 类型、原生 API、配置、调度和 Port 验证。APP、Service、BSP 和 Middleware 不得直接依赖 FreeRTOS 原生 API。

## 2. 功能需求

### FR-01 命名规范

插件必须能够解释并生成以下实践命名：

- Platform API：`platform_os_<domain>_<action>`
- Platform 内部契约：`platform_os_internal_<domain>`
- Impl Port：`impl_os_<domain>_<action>`
- Impl 文件：`impl_os_<domain>.c`、`impl_os_freertos.h`
- Platform 宏：`PLATFORM_OS_<NAME>`
- Impl 宏：`IMPL_OS_<NAME>`
- include guard：`__PLATFORM_OS_<OBJECT>_H__` 或 `__IMPL_OS_<OBJECT>_H__`

### FR-02 调用链

文档和测试必须能表达：

```text
Service/Port caller → platform_os_* → impl_os_* → native FreeRTOS API
```

旧调用链 `osal_* → os_*_impl()` 不属于受支持契约；仅可在 RCP/破坏性迁移输入记录中用于对照，不得进入 Skill 推荐内容、alias、示例 API、生成输出或测试正向断言。

### FR-03 能力边界

公共能力以当前证据为准，至少覆盖任务、队列、信号量、互斥锁、软件定时器、延时、时基、内存和临界区。事件组、Notify、取消、Tickless、Hook 等只有在目标 Port 和测试证据齐全后才能进入公共契约。

### FR-04 行为保护

更新文档不得改变任何函数动作词、参数顺序、返回类型、错误语义、超时单位、阻塞属性、ISR 可用性、资源所有权和调用控制流。

## 3. 质量需求

- Q-01：新命名为唯一 canonical，旧命名零残留门禁可被 `rg` 和测试自动检查。
- Q-02：所有引用路径有效，graph `.md/.json` 与 catalog 一致。
- Q-03：实践工程证据均带来源路径和证据等级。
- Q-04：主机测试、插件校验、目标构建和目标运行分层记录。
- Q-05：目标构建缺少真实入口时标记 `unverified`，不得以静态通过替代。

## 4. 接口与依赖要求

| 层 | 允许 | 禁止 |
|---|---|---|
| Platform OS | 平台无关类型、错误码、OS 能力契约和内部 Port 头 | FreeRTOS 头、`xTask*`、`xQueue*`、业务状态 |
| Impl OS | FreeRTOS 头、原生 API、配置、Heap、Port 和 ISR 映射 | App/Service 业务策略、反向定义 Platform 契约 |
| Service/App | 业务编排和稳定 Platform/Service API | 直接 include Impl 或 Vendor |

## 5. 验收标准

1. token 对账表覆盖插件当前契约和实践工程实际符号；无未经解释的多对一、一对多和遗漏。
2. canonical Skill、参考资料、graph、catalog、测试对同一命名策略给出一致结论。
3. 旧命名不作为兼容 API；除 RCP/破坏性迁移输入记录外，目标内容零残留。
4. 现有架构门禁测试、Skill 链接测试和插件质量校验通过。
5. 交叉构建、目标运行和实物时序分别记录；缺少工程入口时保持 `unverified`。

## 6. 未验证项与阻塞

- 实践工程与插件符号全集待对账。
- 实践工程候选行为差异不得在本需求中吸收。
- 目标工程构建、FreeRTOS 版本和目标板运行证据待补充。
