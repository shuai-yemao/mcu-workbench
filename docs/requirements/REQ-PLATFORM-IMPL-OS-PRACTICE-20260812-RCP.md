# RCP：Platform / Impl OS 实践工程对齐

## 1. 元数据

| 字段 | 内容 |
|---|---|
| request_id | `REQ-PLATFORM-IMPL-OS-PRACTICE-20260812` |
| 生成日期 | `2026-08-12` |
| 插件仓库 | `C:\Users\zhang\Documents\mcu-workbench` |
| 插件分支/提交 | `host_ai @ 07bef278b353821651ab9da9c69332038fc35220` |
| 实践工程 | `D:\zhuomian\embedded_framework` |
| 实践工程分支/提交 | `codex/platform-os @ abcb8327bca16ea5621e2a9de91bba1c1f464d76` |
| 当前阶段 | `RCP 与方案审查` |
| 代码修改授权 | `未授权；本轮只产出约束和审查文档` |
| 证据等级 | 以本地源码、Skill、测试和 Git 状态为主；不等同于目标板验证 |

## 2. 请求目标

根据实践工程更新插件中的 `platform_os` 与 `impl_os` 两个 canonical Skill，使插件能够指导以下实际边界：

```text
App → Service → Platform OS 契约 → Impl OS Port → FreeRTOS/Vendor
```

更新对象包括 Skill 正文、OSAL/FreeRTOS 参考资料、架构知识图谱、catalog/metadata、测试断言和必要的破坏性迁移文档。旧命名不提供兼容别名、不作为插件当前规范继续支持。实现阶段不得把实践工程的行为缺陷、类型冲突或未验证构建结果写成插件规范。

## 3. 约束状态

### 3.1 confirmed

- 插件 canonical Skill 已固定为 `skills/platform/platform_os` 与 `skills/impl/impl_os`，catalog 及 Skill 路由别名已存在：`skills/catalog.js:71-115`、`skills/catalog-metadata.js:23-27`；这不代表旧 OS 符号继续兼容。
- 插件当前 OS 规范使用 `osal_*` 作为 Platform API、`os_*_impl()` 作为 Impl Port：`skills/platform/platform_os/SKILL.md:7-40`、`skills/impl/impl_os/SKILL.md:6-20`。
- 插件当前测试显式锁定旧契约，包括 `osal_task_create → os_task_create_impl → xTaskCreate`，并禁止 `os_impl_task_create`：`tests/embedded-architecture-skills.test.js:43-53`。
- 实践工程当前已使用 `platform_os_*`、`platform_os_internal_*`、`impl_os_*`、`IMPL_OS_*` 和双下划线 include guard：`D:\zhuomian\embedded_framework\03_Platform\platform_os`、`D:\zhuomian\embedded_framework\04_Impl\impl_os`。
- 实践工程的 Impl 源文件通过 `platform_os_internal_*.h` 和 `impl_os_freertos.h` 连接 FreeRTOS，形成 Platform 内部契约到 Impl 的 include 映射。
- 插件架构契约要求依赖方向为 `App → Service → Platform → Impl → Vendor`，且原生 RTOS API 不得越过 Impl Port：`skills/workflow/workflow-review-gate/references/software-layer-contract.md:3-47`。
- 当前插件工作区已有用户未提交修改；本轮不得覆盖、暂存或重写这些修改。

### 3.2 user-confirmed

- 用户要求“更新嵌入式插件的 platform 和 impl 的 os 部分”。
- 用户要求“根据实践工程，先做需求约束和 RCP 以及方案审查”。
- 用户要求继续任务；当前仍处于审查阶段，不等同于批准代码实现。
- 用户明确确认旧命名不兼容；更新后旧命名不再作为插件 canonical、alias、示例 API 或生成输出。

### 3.3 inferred

- 插件 canonical 文档必须以实践工程的 `platform_os_*` / `impl_os_*` 作为唯一命名，旧 `osal_*` / `os_*_impl()` 只允许出现在审查输入和破坏性迁移映射中，不进入 Skill 推荐内容或 alias。
- Skill 更新需要同步测试和架构知识图谱，否则会出现正文与自动门禁相互矛盾。
- `platform_os` 的公共接口应继续保持 RTOS 无关；`impl_os` 才能出现 FreeRTOS 类型和原生 API。

### 3.4 unverified

- 实践工程中的返回类型、错误码、ISR 汇编实现和配置宏是否达到可作为插件规范的质量标准。
- 实践工程是否存在可复现的正式目标构建入口；当前静态扫描未发现可确认的构建工程入口。
- FreeRTOS 具体版本、`FreeRTOSConfig.h`、Heap、Port 与中断优先级是否应进入 canonical Skill 的固定证据。

## 4. 范围

### 包含

- `skills/platform/platform_os/SKILL.md`
- `skills/platform/platform_os/references/osal-contract.md`
- `skills/platform/platform_os/references/osal-freertos-case.md`
- `skills/impl/impl_os/SKILL.md`
- `skills/impl/impl_os/references/freertos-source-map.md`
- `skills/impl/impl_os/references/freertos-api-quickref.md`
- `skills/workflow/workflow-review-gate/references/software-architecture-knowledge-graph.md/.json`
- 受影响的 OS 相关测试、catalog metadata 和迁移说明

### 不包含

- 不复制实践工程源码进入插件。
- 不修改 `D:\zhuomian\embedded_framework` 的固件代码。
- 不改变 OSAL 函数参数、返回类型、错误语义、阻塞属性、ISR 规则、资源所有权或调用控制流，除非另行形成新的需求包并审查放行。
- 不新增 Event Group、Task Notify、取消、Tickless、Hook 等未被目标证据确认的公共能力。
- 不修改插件其他 Platform/Impl Skill 的职责边界。

## 5. 命名迁移约束

| 旧命名（迁移输入） | 新命名（唯一支持） | 规则 |
|---|---|---|
| `osal_*` | `platform_os_*` | 只改模块前缀，动作词、参数顺序和后缀不改；旧名迁移后禁止使用 |
| `osal_internal_*` | `platform_os_internal_*` | 只改模块前缀，继续保持 Platform/Impl 内部契约；不提供旧名 alias |
| `os_*_impl()` | `impl_os_*()` | 只重排层前缀，不重排动作词；旧函数名不再支持 |
| `os_impl_*.c` | `impl_os_*.c` | 文件名前缀跟随 Impl 唯一命名，旧文件名不再保留 |
| `OSAL_*` | `PLATFORM_OS_*` | 只改宏前缀，宏体、值、展开条件不改；不提供旧宏兼容 |
| `OS_MS_TO_TICKS` | `IMPL_OS_MS_TO_TICKS` | 只改宏名，不改换算公式；旧宏名不再支持 |
| `__OSAL_X_H__` | `__PLATFORM_OS_X_H__` | 头尾双下划线，guard 与文件名一一对应；旧 guard 不保留 |
| `__OS_FREERTOS_H__` | `__IMPL_OS_FREERTOS_H__` | 头尾双下划线，Impl 专属；旧 guard 不保留 |

类型和宏原则：类型只改前缀并保留 `_t`、`_entry`、`_function_t` 等后缀；宏只改前缀；局部变量只在能够证明是模块命名 token 时修改。禁止把命名迁移扩展成类型重定义、错误码重编号或控制流重排。

## 6. 关键审查阻塞

1. **命名全集已对账**：实践工程 `HEAD` 与当前 OS 工作区确认 38 个 Platform 函数、37 个 Impl 函数、14 个类型和 20 个文件/局部标识；完整映射见 [`Naming-Map`](REQ-PLATFORM-IMPL-OS-PRACTICE-20260812-Naming-Map.md)。
2. **现有插件契约与实践工程命名冲突**：插件测试明确要求 `osal_* → os_*_impl()`，实践工程使用 `platform_os_* → impl_os_*()`。用户已确认旧命名不兼容，因此必须执行破坏性替换并同步清理旧 alias、示例和测试断言。
3. **行为混入风险**：实践工程候选变更包含返回类型、错误码、ISR、配置和队列接口差异，不能直接作为命名更新依据。
4. **验证边界不足**：当前没有确认的目标构建、烧录和目标板运行证据，插件文档只能声明静态/主机/目标验证层级，不能宣称硬件通过。

## 7. 路由与交接

- 必经审查：`workflow-review-gate`
- 审查放行后规划：`workflow-integration-plan`
- 推荐实现 Skill：`platform_os` 或 `impl_os`，由 integration-plan 按单一实现层原则分发
- 代码完成后的独立门禁：`workflow-final-review`
- 当前判定：`implemented; static and plugin checks passed; target build unverified`

## 8. 用户决策记录

用户已确认：旧 `osal_*` / `osal_internal_*` / `os_*_impl()` / `os_impl_*.c` / `OSAL_*` 命名不兼容。更新后只支持 `platform_os_*` / `platform_os_internal_*` / `impl_os_*` / `impl_os_*.c` / `PLATFORM_OS_*` / `IMPL_OS_*`。
