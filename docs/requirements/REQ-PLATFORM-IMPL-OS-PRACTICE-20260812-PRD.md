# PRD：Platform / Impl OS 实践工程对齐

## 1. 产品范围与优先级

| 优先级 | 需求 | 说明 |
|---|---|---|
| P0 | 冻结唯一新命名策略 | 旧命名不兼容，决定所有后续文档和测试方向 |
| P0 | 完成实践工程与插件符号对账 | 解决 39/37/13 与既有 38/37/14/20 差异 |
| P0 | 更新 Platform/Impl OS 规范和引用 | 保持分层、include 和 Port 边界 |
| P1 | 更新 graph、catalog 说明和测试 | 消除旧调用链与新调用链冲突 |
| P1 | 补充 FreeRTOS 证据边界 | 固定版本/配置/Port 证据，区分未验证项 |

## 2. 施工要求

1. `platform_os` 负责 Platform OS 能力契约，不出现 FreeRTOS 原生类型/API。
2. `impl_os` 负责具体 RTOS Port、原生 API 绑定、调度与配置证据。
3. 唯一支持命名采用 `platform_os_*`、`platform_os_internal_*`、`impl_os_*`、`IMPL_OS_*`。
4. 旧 `osal_*`、`osal_internal_*`、`os_*_impl()`、`os_impl_*.c` 不提供兼容，不得出现在 Skill 推荐内容、alias、示例 API、生成输出或测试正向断言中；仅可在破坏性迁移记录中作为输入对照。
5. 函数动作词、参数顺序、返回类型、错误语义、阻塞和 ISR 约束不得因命名更新改变。
6. 类型只改前缀；宏只改前缀；include guard 采用 `__<MODULE>_<OBJECT>_H__`。
7. 实践工程中的额外函数或缺失类型必须先进入差异表，不能直接扩充插件公共能力。

## 3. 禁止事项

- 禁止把 `os_*_impl()` 和 `impl_os_*()` 写成同时推荐的两个 canonical 形式。
- 禁止把 FreeRTOS 的 Event Group/Notify 能力从原生 API 推导为 OSAL 已有能力。
- 禁止复制 `D:\zhuomian\embedded_framework` 源码进入 Skill。
- 禁止在没有目标工程入口时宣称交叉构建或目标运行通过。

## 4. 交付物

- 更新后的 Platform OS canonical Skill 与两份参考资料。
- 更新后的 Impl OS canonical Skill、FreeRTOS 源码映射与 API 速查。
- 更新的架构图谱、catalog/metadata 说明和测试断言。
- 命名 token 对账表、破坏性迁移说明和验证记录。
