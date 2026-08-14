# RCP：Platform Middleware / Impl Middleware 接入规范更新

## 1. 元数据

| 字段 | 内容 |
|---|---|
| request_id | `REQ-PLATFORM-IMPL-MIDDLEWARE-20260813` |
| 生成日期 | `2026-08-13` |
| 插件仓库 | `C:\Users\zhang\Documents\mcu-workbench` |
| 插件分支/提交 | `host_ai @ a5187a5b264ced8862eb7582d86f0cacda2940e6` |
| 实践工程 | `D:\zhuomian\embedded_framework` |
| 实践工程分支/提交 | `codex/platform-os @ a5187a5b264ced8862eb7582d86f0cacda2940e6` |
| 当前阶段 | `RCP 需求约束` |
| 代码修改授权 | `未授权；本轮只产出 RCP` |
| 必经下游 | `workflow-review-gate` |
| 实现 Skill | `待 workflow-integration-plan 分发；本 RCP 不直接分发` |

## 2. 请求目标

依据已完成目标工程实践，将插件中的两个 canonical Skill 更新为统一的中间件接入规范：

- `skills/platform/platform_middleware/SKILL.md`
- `skills/impl/impl_middleware/SKILL.md`

必要时同步其直接引用的架构契约、示例、测试断言和 catalog 描述，但不得在本 RCP 阶段实施这些修改。

规范基线只覆盖当前已验证的：

```text
Platform Middleware contract ← Impl Middleware → EasyLogger + SEGGER RTT Vendor
```

本需求不扩展到其他中间件、其他输出后端或 OS 接入。

## 3. Agent 分析

| Agent | 结论 | 证据状态 |
|---|---|---|
| `embedded-lead` | 请求属于插件规范更新，必须先固化 Platform Middleware 与 Impl Middleware 的职责、依赖、接入和验收边界，再进入 review gate。 | `confirmed` |
| `system-architect` | 标准调用链为 `App/Service → Platform contract ← Impl → Vendor`。Middleware 允许 Platform→Impl 反向依赖作为受限例外，但公共头仍必须 Vendor/Impl-neutral，具体 Vendor 逻辑不得进入 Platform。 | `user-confirmed` + `confirmed` |
| `firmware-engineer` | 实践工程中 `platform_elog.h`/配置是公共契约；Elog 生命周期、参数校验、格式化、错误映射在 `impl_elog.c`；EasyLogger/RTT Port 逻辑在 `impl_elog_port.c`。 | `confirmed` |
| `toolchain-engineer` | 独立 Elog CMake profile、主机 CTest、ARM GCC、J-Link 烧录和 RTT 实机观测均已通过。 | `confirmed` |
| `verification-engineer` | 插件规范必须区分静态门禁、主机 Fake、交叉构建、烧录运行和 RTT 实机证据，不得以文档或主机测试替代目标证据。 | `confirmed` |
| `knowledge-engineer` | RCP 应成为 review gate 的唯一正式输入；本轮只写 RCP，不提前修改 Skill、测试或架构图谱。 | `confirmed` |

## 4. 已确认约束

### 4.1 `confirmed`

- 插件存在 canonical Skill：`skills/platform/platform_middleware` 和 `skills/impl/impl_middleware`。
- 插件当前 Platform Middleware Skill 已规定：能力接口归 Platform，中间件源码底座归 Vendor，移植适配归 Impl，Platform Skill 目录不承载 `.c` 实现。
- 插件当前 Impl Middleware Skill 已规定：不复制第三方源码到 Impl，Port 使用 `impl_<底座>_port` 命名，App/Service 不直接依赖具体中间件类型和宏。
- 插件 catalog 已登记两个 Skill：`skills/catalog-metadata.js` 中 `platform_middleware` 和 `impl_middleware` 定义存在。
- 实践工程的 Platform Elog 文件为：
  - `D:\zhuomian\embedded_framework\03_Platform\platform_middleware\elog\platform_elog.h`
  - `D:\zhuomian\embedded_framework\03_Platform\platform_middleware\elog\platform_elog_config.h`
- 实践工程当前未保留 `platform_elog.c`；具体实现文件为：
  - `D:\zhuomian\embedded_framework\04_Impl\impl_middleware\elog\impl_elog.c`
  - `D:\zhuomian\embedded_framework\04_Impl\impl_middleware\elog\impl_elog_port.c`
  - `D:\zhuomian\embedded_framework\04_Impl\impl_middleware\elog\impl_elog_port.h`
- `platform_elog.h` 只依赖 `platform_def.h`、`platform_elog_config.h`、`platform_error.h`、`platform_type.h`，不 include EasyLogger、SEGGER RTT、`stdio.h`、FreeRTOS 或 `platform_os`。
- `impl_elog_port.h` 以 `board_types.h` 和 `stdarg.h` 为主要接口依赖；Vendor 头只出现在 `impl_elog_port.c`。
- `impl_elog.c` 承担 Platform Elog API 的初始化、状态、参数检查、格式化入口、错误映射和 Port 调用。
- `impl_elog_port.c` 承担 EasyLogger 生命周期/格式配置、SEGGER RTT Channel 0 输出、raw/hexdump、时间/进程/线程占位信息和 Port 函数实现。
- 当前中间件范围只包括 EasyLogger + SEGGER RTT；ITM/SWO、UART、其他 Backend 和多 Backend 注册策略不在范围内。
- 当前实践工程不引入 OS/FreeRTOS、`platform_os` 或 `impl_os`；本规范不应把 OS 能力写入 Elog 接入基线。
- 已有正式目标 profile：`D:\zhuomian\embedded_framework\06_Toolchain\elog\stm32f411ceu6`。
- 已有主机测试：`D:\zhuomian\embedded_framework\tests\host\elog`。
- 实践工程已完成 CMake configure/build、主机 CTest、ARM GCC 编译/链接、J-Link 烧录运行和 RTT 实机观测；目标输出包含 `EasyLogger V2.2.99 is initialize success.` 与 `STM32F411CEU6 Elog middleware smoke`。
- 实践工程 `D:\zhuomian\embedded_framework\03_Platform\platform_common` 存在用户已有变更；更新插件时不得要求或暗示修改该目录。
- 插件仓库当前工作树存在大量用户已有修改、删除和未跟踪文件；本轮不得覆盖、恢复、清理、暂存或提交这些变更。

### 4.2 `user-confirmed`

- 只覆盖当前已有的 EasyLogger + SEGGER RTT 接入。
- OS/FreeRTOS 不参与本轮中间件接入规范。
- Middleware Platform→Impl 允许反向依赖。
- `impl_elog_port` 以 `board_types.h` 为主要板级类型入口。
- `platform_elog` 不使用 `stdio.h`。
- Platform 只提供抽象接口；具体逻辑不放在 Platform 实现中，当前不需要 `platform_elog.c`。
- 第三方库源码放在 Vendor；Platform/Impl 规范应指导如何接入 Vendor，而不是复制 Vendor 源码。

### 4.3 `inferred`

- 插件规范应把 Middleware 的反向依赖写成“受限例外”，而不是改变总体依赖图：公共 Platform 头仍不依赖 Impl；如未来存在 Platform `.c`，只能做稳定契约转发，不能承载 Vendor 调用、格式化、缓存、状态机或业务策略。
- `platform_middleware` 应以能力契约、统一类型/错误码、配置语义和调用约束为主；具体生命周期、资源、缓冲区、锁、格式化、错误转换和 Vendor 回调由 `impl_middleware` 承担。
- `impl_middleware` 需要区分契约实现层（如 `impl_elog.c`）和 Vendor Port 层（如 `impl_elog_port.c/.h`），避免把所有逻辑堆在一个 Port 文件中。
- 插件 Skill 不能把当前 STM32F411CEU6、CMake 路径、J-Link 序列号或 RTT 输出文本硬编码为所有项目的通用要求；这些只能作为已验证实践样例和证据等级示例。
- 更新 Skill 后，应同步检查 catalog 描述、直接引用的层契约、生成/审查门禁和相关测试，避免正文与自动门禁冲突。

### 4.4 `unverified`

- 其他中间件（FatFs、LVGL、Crypto、通信协议栈等）是否需要完全采用与 Elog 相同的 `contract implementation + vendor port` 两级 Impl 结构，尚未由目标工程逐项验证。
- 未来带 OS 的 Middleware 是否允许在 Impl Port 中接入 OSAL、Mutex、Task 或异步队列，需形成独立需求并审查，不由本 RCP 推导。
- 插件现有 `platform_middleware` 四元组豁免规则是否需要新增 Middleware 专属示例，需由 review gate 根据当前 Skill 和测试证据判定。
- 是否需要新增 Elog 专用 reference 文档和 fixture 测试，需由 review gate 确认，不在本轮自动扩大范围。

## 5. 目标规范约束

### 5.1 Platform Middleware 必须定义

- Vendor-neutral 能力接口；
- `platform_common` 的统一类型、错误码和基础宏；
- 初始化/反初始化契约；
- 输入、输出、所有权、生命周期；
- 阻塞属性、ISR 限制、线程安全和可重入性；
- 同步/异步能力声明；
- 配置策略常量，但不包含 Vendor API 或 Vendor 配置结构体；
- 中间件能力的失败状态和错误语义。

### 5.2 Platform Middleware 禁止

- include EasyLogger、SEGGER RTT、FreeRTOS、HAL 或具体 Vendor 头；
- include `stdio.h` 以实现格式化或输出；
- 在 Platform 文件中实现日志格式化、缓存、RTT 写入、Vendor 生命周期或业务策略；
- 在公共头暴露 Impl/Vendor 类型、宏、句柄或回调；
- 把 `platform_elog.c` 作为当前 Elog 样例的必要组成。

### 5.3 Impl Middleware 必须承担

- Platform 契约的具体符号实现；
- 参数检查、状态和生命周期；
- Platform 错误码到 Port/Vendor 错误的映射；
- `va_list`、固定缓冲区和格式化策略；
- EasyLogger/RTT 等 Vendor 的生命周期和调用绑定；
- Port 的资源、锁、时间戳、线程/进程信息和输出通道适配；
- 失败、降级、重试和不可用能力的明确返回。

### 5.4 Impl Middleware 禁止

- 复制 Vendor 源码；
- 让 App/Service 直接调用 Vendor；
- 把业务日志策略、业务缓存或业务状态机放入 Port；
- 在未确认 OS 条件时引入 FreeRTOS/OSAL；
- 让 Vendor 头文件泄漏到 Platform 公共头或 Service/App；
- 用日志输出替代错误返回。

## 6. 目标文件范围

### 必须审查/更新

- `skills/platform/platform_middleware/SKILL.md`
- `skills/impl/impl_middleware/SKILL.md`
- `skills/catalog-metadata.js` 中两个 Skill 的描述（仅在实际描述与新规范不一致时修改）
- 与上述 Skill 直接冲突的 `skills/workflow/workflow-review-gate/references/software-layer-contract.md` 或其相关中间件条目（仅限必要最小修改）

### 候选、需审查 gate 确认

- `skills/platform/platform_middleware/references/**`
- `skills/impl/impl_middleware/references/**`
- `tests/**` 中针对 Platform/Impl Middleware 边界的断言或 fixture
- `docs/plugin-architecture-io.md`、`docs/architecture-overall-plan.md` 中与新规范直接冲突的描述

### 明确不包含

- `D:\zhuomian\embedded_framework` 任何源码、配置、构建产物或平台公共层文件；
- 插件 `common/`、`claude/`、`opencode/` 内容；
- 任何 OS/FreeRTOS、BSP、MCU、Service、App 或 Vendor Skill 的泛化改造；
- 新增中间件实现、Vendor 源码复制、目标工程重构；
- 本轮代码实现、测试修复、提交、推送或自动同步运行时缓存。

## 7. 优先级与依赖

| 优先级 | 约束/交付 | 前置条件 | 状态 |
|---|---|---|---|
| Must | 固定 Platform Middleware 与 Impl Middleware 的职责、依赖和禁止事项 | 本 RCP 审查通过 | `待审查` |
| Must | 固定 Elog + SEGGER RTT 的实践示例边界，不扩展 OS/其他 Backend | 用户确认已完成 | `user-confirmed` |
| Must | 保留 Platform 公共头 Vendor-neutral，具体逻辑归 Impl | 实践工程源码证据已具备 | `confirmed` |
| Must | 写明 Middleware Platform→Impl 反向依赖的受限例外 | review gate 判定例外表达 | `待审查` |
| Should | 同步直接冲突的层契约、catalog 描述和自动门禁 | 影响面审计 | `待审查` |
| Could | 增加独立 Elog fixture/reference | 需要 review gate 判断维护成本 | `未决定` |

## 8. 验收标准

| 证据等级 | 验收项 | 通过条件 | 当前状态 |
|---|---|---|---|
| 静态 | Platform/Impl/Vendor 依赖方向和反向例外表达一致 | Skill、层契约和测试无互相矛盾的依赖规则 | `待审查` |
| 静态 | Platform 纯度 | 不要求 Platform `.c`；公共头无 Vendor/OS/Impl 类型；不描述具体 Vendor 逻辑 | `实践工程 confirmed；插件待更新` |
| 静态 | Impl Port 边界 | Port 命名、Vendor 头隔离、类型入口和资源职责明确 | `实践工程 confirmed；插件待更新` |
| 主机 | Elog 接入行为 | Fake 验证初始化、重复初始化、格式化、raw、hexdump、错误和反初始化 | `实践工程 pass` |
| 构建 | 正式 profile | CMake profile 能区分 Platform contract、Impl、Port、Vendor，并支持裁剪 | `实践工程 pass；插件规范待更新` |
| 目标 | 目标运行 | ARM GCC 目标构建、J-Link 烧录、reset/go 成功 | `实践工程 pass` |
| 实物 | RTT 观测 | RTT Channel 0 观察到 EasyLogger 初始化和 smoke 输出 | `实践工程 pass` |
| 插件 | 自动门禁 | 相关 Skill/metadata/测试/引用同步后，插件测试、插件校验和 diff 检查通过 | `待审查` |

## 9. 风险与阻塞

- 插件当前部分架构文档仍使用较宽泛的 `Platform → Impl → Vendor` 或“Platform 允许实现”的表述；若不做最小同步，可能与“Platform 只提供抽象、具体逻辑归 Impl”冲突。
- “Platform→Impl 允许反向依赖”若不限定为 Middleware 受限例外，可能被误用为公共头跨层依赖或 Platform 承载 Vendor 逻辑。
- 当前插件工作树已有大量用户变更，必须按路径精确修改；不得清理或恢复工作区。
- 实践工程已验证 STM32F411CEU6/EasyLogger/RTT，但不能把其芯片、路径和工具参数直接固化为所有 Middleware 的通用规范。
- 未经 review gate 放行，不得由本 RCP 直接进入 Skill 实现或测试修改。

## 10. 下游交接提示词

请将本 RCP 作为唯一输入交给 `workflow-review-gate`：

1. 只审查 Platform Middleware / Impl Middleware 的接入规范更新，不实施代码修改。
2. 重点审查：`Platform→Impl` 反向依赖的边界、Platform 无具体逻辑、Impl Port 的 Vendor 隔离、OS 排除和 Elog + RTT 范围。
3. 输出四张审查清单，并按插件要求形成 BRD、PRD、SRSys 和 Review Package；如需修改本 RCP 的范围或新增约束，先回传 Router，不得静默扩大范围。
4. 判定 `ready` 或 `blocked`，并在放行后交给 `workflow-integration-plan` 进行文件级分层审计和唯一实现 Skill 分发。

## 11. 路由单

状态：`可交接`

必经下游：`workflow-review-gate`

实现 Skill：`空；由 workflow-integration-plan 在审查放行后分发`

参与 Agent：`embedded-lead + system-architect + firmware-engineer + toolchain-engineer + verification-engineer + knowledge-engineer`

需求约束包：`C:\Users\zhang\Documents\mcu-workbench\docs\requirements\REQ-PLATFORM-IMPL-MIDDLEWARE-20260813-RCP.md`

已读证据：

- `C:\Users\zhang\Documents\mcu-workbench\skills\platform\platform_middleware\SKILL.md`
- `C:\Users\zhang\Documents\mcu-workbench\skills\impl\impl_middleware\SKILL.md`
- `C:\Users\zhang\Documents\mcu-workbench\skills\catalog-metadata.js`
- `C:\Users\zhang\Documents\mcu-workbench\docs\architecture-overall-plan.md`
- `C:\Users\zhang\Documents\mcu-workbench\docs\plugin-architecture-io.md`
- `C:\Users\zhang\Documents\mcu-workbench\skills\workflow\workflow-review-gate\references\software-layer-contract.md`
- `D:\zhuomian\embedded_framework\03_Platform\platform_middleware\elog\platform_elog.h`
- `D:\zhuomian\embedded_framework\03_Platform\platform_middleware\elog\platform_elog_config.h`
- `D:\zhuomian\embedded_framework\04_Impl\impl_middleware\elog\impl_elog.c`
- `D:\zhuomian\embedded_framework\04_Impl\impl_middleware\elog\impl_elog_port.c`
- `D:\zhuomian\embedded_framework\04_Impl\impl_middleware\elog\impl_elog_port.h`
- `D:\zhuomian\embedded_framework\06_Toolchain\elog\stm32f411ceu6\CMakeLists.txt`
- `D:\zhuomian\embedded_framework\tests\host\elog\CMakeLists.txt`
- `D:\zhuomian\embedded_framework\00_Docs\04_需求文档\REQ-MW-VENDOR-ACCESS-20260813-Phase2-Verification.md`
- 实践工程 `git status --short --branch`、插件工程 `git status --short --branch`

责任边界：

- `workflow-review-gate`：审查 RCP 范围、证据、四张清单和放行/阻塞结论；不实现 Skill。
- `workflow-integration-plan`：仅在放行后做分层审计、文件级修改顺序、迁移设计和唯一实现 Skill 分发。
- 实现 Skill：仅按放行后的计划修改目标 Skill/引用/测试；不得修改实践工程或无关宿主内容。

交接契约：

- 输入：本文件及列出的插件/实践工程证据。
- 输出：Review Package、BRD、PRD、SRSys、门禁判定和必要的 RCP 回传项。
- 资源所有权：插件当前工作树已有修改归用户；后续只可精确修改已放行文件。

验证边界：

- 本 RCP 只声明需要静态、插件自动门禁和必要的文档一致性验证。
- 实践工程的主机、构建、目标和 RTT 证据是规范来源证据，不等同于插件 Skill 本身已经通过验证。
- 插件当前尚未执行本需求对应的 Skill 修改、测试和校验。

下一步：`将本 RCP 交给 workflow-review-gate，执行四张审查清单并判定是否放行。`
