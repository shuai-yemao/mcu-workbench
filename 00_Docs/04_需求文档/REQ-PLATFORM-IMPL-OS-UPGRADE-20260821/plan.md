# 集成实施计划：platform_os 与 impl_os Skill 架构规则升级

## 1. 元数据与状态

| 字段 | 内容 |
|---|---|
| request_id | `REQ-PLATFORM-IMPL-OS-UPGRADE-20260821` |
| 生成时间 | `2026-08-21T14:35:00+08:00` |
| 计划版本 | `v1.0` |
| 计划状态 | `approved` |
| 项目路径 | `C:\\Users\\zhang\\Documents\\mcu-workbench` |
| 分支/提交 | `host_ai @ 10770f4de82e7486908843a961dbfcaa6e65d865` |
| 输入 spec.md | `C:\\Users\\zhang\\Documents\\mcu-workbench\\00_Docs\\04_需求文档\\REQ-PLATFORM-IMPL-OS-UPGRADE-20260821\\spec.md` |
| 输入 Review-Package | `内部状态：REQ-PLATFORM-IMPL-OS-UPGRADE-20260821` |
| Spec 力度 | `full` |
| 风险叠加门禁 | `versioned` |
| 选定方案 | `方案 B：剖面化契约升级` |
| 方案选择人 | `user` |
| 用户审查状态 | `approved` |
| 方案审查结论 | `通过` |

## 2. 一句话说明

- 要解决的问题：现有 OS Skill 将一个具体 FreeRTOS 工程的二次桥接调用链表达得过于固定，无法准确覆盖 Platform `.c` 直接绑定 RTOS 的工程。
- 计划做什么：在既有文件范围内重组规范规则、实现剖面、FreeRTOS 案例和验证证据，并让测试覆盖直接后端与显式 Impl 桥接两种合法剖面。
- 明确不做什么：不新增 OS 能力、代码生成模板、固件实现、FreeRTOS/HAL/BSP/Vendor 内容，不改变 canonical 名称和 alias。
- 预期结果：Skill 能根据目标工程证据判断 OS 实现剖面，而不是强制某一种目录或调用链。

## 3. 输入依据与工程事实

| ID | 事实或约束 | 证据 | 可信等级 | 对计划的影响 |
|---|---|---|---|---|
| E-01 | 插件仓库位于 `C:\\Users\\zhang\\Documents\\mcu-workbench`，当前分支为 `host_ai` | Git 元数据 | `confirmed` | 计划只作用于该仓库 |
| E-02 | 当前 HEAD 为 `10770f4de82e7486908843a961dbfcaa6e65d865` | `git rev-parse HEAD` | `confirmed` | 记录版本基线 |
| E-03 | 工作区已有其他修改和未跟踪目录 | `git status --short` | `confirmed` | 只按路径修改和验证本请求文件 |
| E-04 | `platform_os` 与 `impl_os` canonical Skill、reference 和 Jest 契约已存在 | 目录扫描、`tests/embedded-architecture-skills.test.js` | `confirmed` | 采用原文件内升级，不新增 Skill |
| E-05 | 当前 OS reference 把 `platform_os_* → impl_os_* → native API` 写成主要示例 | OS reference 文件 | `confirmed` | 改成剖面化条件规则 |
| E-06 | 用户确认不强制 OSAL 增加二次 `impl_os_*` 桥接 | 当前会话 | `user-confirmed` | 方案 B 必须保留直接 Platform 后端 |
| E-07 | catalog 已登记 canonical 名称和 alias | `skills/catalog.js`、`skills/catalog-metadata.js` | `confirmed` | 不修改 catalog |
| E-08 | 目标固件的具体构建入口和 RTOS 配置不在本插件仓库中 | 当前仓库扫描 | `unverified` | 计划只定义取证规则，不声称固件构建/运行通过 |

## 4. 两个候选方案与用户选择记录

### 方案 A：保守兼容升级

- 适用场景：需要最小文档差异和快速兼容现有使用者。
- 做什么：在现有章节中补充直接后端规则，将二次桥接标记为条件示例，最小调整测试。
- 主要改动：六个 OS Skill/reference 文件和一个 Jest 测试文件。
- 优点：改动小、回滚简单、现有阅读路径变化少。
- 缺点：旧案例结构保留较多，长期扩展到多种实现剖面时仍需继续整理。
- 成本：低文档成本、低测试成本。
- 风险：未来维护者仍可能从旧章节误读出二次桥接为默认要求。
- 验收方式：静态文本契约、插件校验、链接检查、Jest 和差异检查。
- 回滚方式：按文件回退本请求差异，保留其他工作区变更。

### 方案 B：剖面化契约升级（已选择）

- 适用场景：需要将当前 OS 架构规则作为长期、多工程、多 RTOS 的插件基线。
- 做什么：把规范规则、实现剖面、FreeRTOS 案例和验证证据分区，明确 `direct-platform-backend`、`explicit-impl-bridge`、`bare-metal-or-fake`、`mixed`、`missing` 五种状态。
- 主要改动：重组六个 OS Skill/reference 文件；更新 Jest 契约以覆盖剖面、公共头禁依赖、能力边界和证据标记。
- 调用链：按证据选择 `platform_os_* → platform_os.c → native API` 或 `platform_os_* → internal header → impl_os_* → native API`。
- 优点：边界更清晰，避免把某一工程的路径/桥接方式升级成普遍规则，便于后续 RTOS/裸机扩展。
- 缺点：文档差异和审查成本高于方案 A；测试断言需要同步重构。
- 成本：中等文档重组成本、中等主机回归成本；不增加固件运行时成本。
- 风险：重组过程中可能遗漏现有 FreeRTOS 风险条目；通过逐条迁移和测试契约复核控制。
- 验收方式：静态剖面矩阵、证据状态检查、公共头边界检查、Jest、插件/链接校验和 `git diff --check`。
- 回滚方式：按 F-01～F-07 文件单独回退；不回退其他 Skill、插件元数据或未跟踪目录。

### 方案对比

| 维度 | 方案 A | 方案 B | 结论依据 |
|---|---|---|---|
| 易理解程度 | 短期容易 | 初次阅读需要理解剖面 | 方案 B 增加状态模型 |
| 改动范围 | 小 | 中等 | 同一 Spec 文件范围 |
| 实现复杂度 | 低 | 中等 | 方案 B 重组 reference 和测试 |
| 运行时资源 | 无变化 | 无变化 | 本请求只改插件文档/测试 |
| 架构风险 | 保留旧误读风险 | 重组遗漏风险可测试 | 方案 B 有显式矩阵 |
| 可验证性 | 基础文本断言 | 剖面和证据状态可断言 | 方案 B 更强 |
| 回滚难度 | 低 | 中等 | 方案 B 文档差异较大 |
| 后续扩展性 | 中等 | 高 | 方案 B 的剖面可扩展 |

### 用户选择

```text
selected_option: B
decision_owner: user
decision_rationale: 用户选择方案 B；未额外提供理由
rejected_option: A
new_constraints: none
```

## 5. 选定方案概览

- 选定方案：`方案 B：剖面化契约升级`。
- 选定原因：用户明确选择；工程上适合将 OS Skill 从单一案例规则提升为可按证据识别的长期基线。
- 与 `spec.md` 的一致性：只修改 F-01～F-07，保留现有能力范围、canonical 名称、alias 和非目标。
- 施工边界：两个 OS Skill 目录、其 reference 文件和 `tests/embedded-architecture-skills.test.js`。
- 非目标：catalog、其他层 Skill、宿主适配、固件工程、RTOS 源码、生成模板和新增 OS 能力。
- 主要风险：文档重组遗漏现有风险条目；通过建立迁移清单和逐项测试控制。

## 6. 分层、调用链与接口边界

```text
App → Service → Platform OS public contract ← Impl OS/backend → Vendor RTOS/HAL
```

- 目标调用链一：`caller → platform_os_* → platform_os.c → native RTOS API`，仅在目标工程公共头、实现和构建证据确认时成立。
- 目标调用链二：`caller → platform_os_* → platform_os_internal_*.h → impl_os_* → native RTOS API`，仅在 internal/Impl 证据确认时成立。
- Platform OS：定义稳定能力、公共类型、错误语义、句柄和生命周期契约；不定义业务策略。
- Impl OS：绑定具体 RTOS/裸机、执行单位转换、错误映射、上下文限制、资源回收和后端验证。
- Vendor：提供 FreeRTOS 或其他底座原生 API/源码；不被 Platform 公共头直接依赖。
- 允许依赖：Platform public `.h` → `platform_common` 公共类型；实现 `.c` → 已由目标工程确认的 RTOS backend；Impl → Vendor/RTOS。
- 禁止依赖：App/Service/Platform public header 直接 include RTOS/HAL/芯片/C 标准库；以目录名推断桥接关系；从 RTOS 原生能力推断公共能力。
- Wrapper/Port/Driver/Handle/Handler：本请求不新增这些角色；OS Skill 只描述 OS 内部边界，任务入口、业务循环和设备生命周期仍归调用方对应 Handler/Service。
- 所有权：句柄、Timer record、缓冲区、回调参数、堆内存必须在目标公共头/实现/测试中逐项确认。
- 阻塞与并发：每个 API 记录任务/ISR 上下文、超时单位、阻塞上限、线程安全、可重入性、FromISR 规则和失败后的状态。

## 7. 文件施工顺序

| ID | 阶段 | 动作 | 文件或目录 | 所属层 | 施工内容与理由 | 责任 Skill | 前置条件 | 生成/覆盖边界 | 状态 |
|---|---|---|---|---|---|---|---|---|---|
| P-01 | 规范基线 | 修改 | `skills/platform/platform_os/SKILL.md` | Platform | 重组公共契约、公共头禁依赖、实现剖面、证据等级和交接规则 | `platform_os` | Plan 批准 | 只改 Markdown | ready |
| P-02 | Platform reference | 修改 | `skills/platform/platform_os/references/platform-os-contract.md` | Platform | 定义直接后端/显式桥接两种调用链及句柄、单位、ISR、所有权契约 | `platform_os` | P-01 | 只改 Markdown | ready |
| P-03 | 案例证据 | 修改 | `skills/platform/platform_os/references/platform-os-freertos-case.md` | Platform reference | 将特定工程路径改为有来源、有适用范围的案例与风险矩阵 | `platform_os` | P-02 | 只改 Markdown | ready |
| P-04 | Impl 规范 | 修改 | `skills/impl/impl_os/SKILL.md` | Impl | 重组后端剖面、FreeRTOS 配置、ISR/并发/生命周期/错误回滚规则 | `impl_os` | P-03 | 只改 Markdown | ready |
| P-05 | Impl reference | 修改 | `skills/impl/impl_os/references/freertos-api-quickref.md` | Impl reference | 区分原生能力、公开能力和当前 Port，保留 token/上下文/失败风险 | `impl_os` | P-04 | 只改 Markdown | ready |
| P-06 | 来源映射 | 修改 | `skills/impl/impl_os/references/freertos-source-map.md` | Impl reference | 改为证据映射模板和 `confirmed/nearest/mixed/missing` 状态 | `impl_os` | P-05 | 只改 Markdown | ready |
| P-07 | 测试契约 | 修改 | `tests/embedded-architecture-skills.test.js` | 插件验证 | 用剖面和边界断言替换唯一二次桥接断言，保持 canonical/alias 兼容测试 | `tools-quality` + `tools-verification` | P-01～P-06 | 只改测试 | ready |
| P-08 | 回归审查 | 不修改其他文件 | 仓库整体 | 工具验证 | 执行插件、链接、全量测试和差异检查，确认无新增基线问题 | `tools-verification` | P-07 | 只产出命令结果 | ready |

## 8. 阶段计划与交接

| 阶段 | 目标 | 输入 | 输出 | 完成条件 | 交接对象 |
|---|---|---|---|---|---|
| 1 | 建立 Platform 规范剖面 | Spec、现有 Platform Skill/reference | 更新后的 Platform 文档 | 直接后端与显式桥接均有明确证据条件 | `impl_os` |
| 2 | 建立 Impl/FreeRTOS 剖面 | Spec、Platform 文档、现有 Impl reference | 更新后的 Impl 文档/reference | 原生能力、公开能力、Port 能力分层清晰 | `tools-quality` |
| 3 | 更新回归契约 | P-01～P-06 | Jest 断言更新 | 测试不再强制二次桥接且保留旧命名边界 | `tools-verification` |
| 4 | 全量质量验证 | P-07、package.json scripts | 测试/校验运行记录 | T-08～T-11 通过，零新增基线问题 | `workflow-final-review` |

## 8A. 下游执行 Agent 与 Skill 基线

| 阶段/ID | 主 Agent | 协作 Agent | 主实现 Skill | 辅助 Skill | 分配理由与证据 | 状态 |
|---|---|---|---|---|---|---|
| P-01～P-03 | `embedded-lead` | `system-architect` | `platform_os` | `workflow-final-review` | Platform 公共契约与 reference 需保持层边界；依据 Spec F-01～F-03 | ready |
| P-04～P-06 | `embedded-lead` | `firmware-engineer` | `impl_os` | `platform_os` | 具体 RTOS/Port 规则和证据映射归 Impl；依据 Spec F-04～F-06 | ready |
| P-07 | `embedded-lead` | `verification-engineer` | `tools-quality` | `tools-verification` | 更新 Jest 文本契约并验证无新增回归 | ready |
| P-08 | `embedded-lead` | `verification-engineer` | `tools-verification` | `tools-quality` | 执行插件结构、链接、全量测试和差异检查 | ready |

## 9. 资源、并发与生命周期约束

- 任务、优先级、栈和周期：本请求不改变固件运行时资源；Skill 文档必须要求目标工程自行取证。
- 队列、通知、信号量和互斥量：仅规范现有公开能力判定；不新增 Event Group/Task Notification。
- ISR 允许/禁止调用：由目标公共头、Impl 和 RTOS 配置共同证明；mutex ISR、critical token 和 FromISR 变体继续作为风险门禁。
- DMA 缓冲区、Cache、对齐和所有权：本请求不实现 DMA；若 OS API涉及缓冲区，reference 必须要求记录所有权和上下文。
- 静态分配、内存池或堆：必须区分静态、堆和 RTOS heap；记录创建者、释放者、失败策略和上下文限制。
- 初始化、运行、错误恢复和释放顺序：必须覆盖句柄创建失败、重复释放、Timer record、callback 并发和 deinit。
- 超时、重试、降级和取消：保持现有 OS 能力契约；取消不因 RTOS 原生存在而自动成为公共能力。

## 10. 代码生成约束

| ID | 约束类别 | 必须遵守 | 禁止事项 | 证据 | 状态 |
|---|---|---|---|---|---|
| G-01 | Platform header | 只暴露稳定 Platform 类型和能力 | include/暴露 RTOS、CMSIS、HAL、芯片或 C 标准库 | Spec 4.1 | ready |
| G-02 | Backend profile | 按公共头、实现、配置和测试选择直接后端或显式桥接 | 将二次 `impl_os_*` 作为所有工程必需层 | Spec 4.4 | ready |
| G-03 | API contract | 记录所有权、单位、阻塞、ISR、线程安全、错误和释放 | 仅凭函数名/注释推断 ms/tick 或 ISR 安全 | Spec 4.2 | ready |
| G-04 | Evidence | 案例路径和符号必须有来源和适用范围 | 将外部工程案例写成通用事实 | Spec 2、4.4 | ready |
| G-05 | Capability | 原生能力、公开能力和当前 Port 分开 | 从 FreeRTOS 原生存在推断公共 API | Spec 4.3 | ready |
| G-06 | Scope | 只修改 F-01～F-07 | 修改 catalog、其他宿主、固件或新增模板 | Spec 3 | ready |

## 11. 验收与验证计划

| ID | 证据等级 | 验收项 | 命令/条件 | 预期结果 | 责任 Skill | 产物 | 状态 |
|---|---|---|---|---|---|---|---|
| V-01 | 静态 | 两种实现剖面均被定义 | 阅读 P-01～P-06 | 直接 Platform 后端和显式 Impl 桥接均有条件和证据要求 | `platform_os`/`impl_os` | 文档 diff | not-run |
| V-02 | 静态 | 公共头依赖边界 | `rg` 检查 OS 文档契约 | 明确禁止 RTOS/CMSIS/HAL/芯片/C 标准库泄漏 | `tools-quality` | 检查记录 | not-run |
| V-03 | 静态 | FreeRTOS 风险完整性 | 对照 Timer、ISR、token、配置、回滚清单 | 既有风险条目未丢失 | `impl_os` | 风险矩阵 | not-run |
| V-04 | 主机 | OS Skill Jest 契约 | `npm test -- --runInBand tests/embedded-architecture-skills.test.js` | 通过，且不再硬编码唯一二次桥接 | `tools-verification` | Jest 输出 | not-run |
| V-05 | 静态 | 插件结构 | `npm run validate:plugin` | 通过 | `tools-verification` | 校验输出 | not-run |
| V-06 | 静态 | 文档链接 | `npm run validate:links` | 通过 | `tools-verification` | 链接输出 | not-run |
| V-07 | 主机 | 全量回归 | `npm test` | 通过；基线失败单独记录 | `tools-verification` | Jest 输出 | not-run |
| V-08 | 静态 | 差异卫生 | `git diff --check` | 通过；仅有本请求批准范围差异 | `tools-quality` | Git 输出 | not-run |
| V-09 | 证据边界 | 固件验证声明 | 不执行目标板命令 | 不将插件/Node 结果表述为固件构建或实机通过 | `workflow-final-review` | 证据边界记录 | not-run |

## 12. 方案审查记录

| 审查项 | 责任 Agent | 结论 | 证据 | 修订或后续动作 |
|---|---|---|---|---|
| 分层和接口 | `system-architect` | `可采用` | Spec 4、6；Platform/Impl 文件现状 | 以剖面化调用链实施，禁止固定二次桥接 |
| 文件和数据流 | `firmware-engineer` | `可采用` | Spec F-01～F-07、现有 Jest 引用 | 按 P-01～P-07 顺序修改，逐项审阅 diff |
| 验收和回归 | `verification-engineer` | `可采用` | Spec T-01～T-12、package.json | 先运行定向 Jest，再运行插件/链接/全量回归 |
| 硬件边界 | `hardware-integration` | `不适用` | 本请求不修改固件/板级资源 | 保留目标固件验证为 `unverified` |
| 工具链和产物 | `toolchain-engineer` | `不适用` | 本请求使用 Node/Jest 插件校验，不涉及 CMake/交叉链接 | 不声称目标构建或实机验证 |

### 审查结论

- 可采用项：方案 B 的剖面化规则、文件顺序、证据状态和测试路径。
- 已完成修订：将固定二次桥接改为条件化实现剖面；将外部工程事实限定为 reference 案例。
- 未关闭阻塞：无方案级阻塞；待用户 H-03 批准 Plan。
- 是否改变 `spec.md`：否。
- 最终结论：`通过，待用户批准 Plan`。

## 13. 回滚与失败处理

- 代码或配置回滚方式：本请求仅回滚 F-01～F-07，按文件恢复；禁止触碰其他工作区变更。
- 中途失败后的保留状态：保留失败测试、命令、退出码和当前文档版本，不覆盖 Spec/Plan 历史状态。
- 验收失败后的定位顺序：先检查新增文本契约 → 再检查链接/结构 → 再检查 Jest 断言 → 最后检查全量基线差异。
- 不可恢复情况：若发现新增 OS 能力、公共接口、目录迁移或验收标准变化，停止执行并回到 Review Gate 更新 Spec。

## 14. 下游交接

- 正式需求/约束输入：[spec.md](C:/Users/zhang/Documents/mcu-workbench/00_Docs/04_需求文档/REQ-PLATFORM-IMPL-OS-UPGRADE-20260821/spec.md)
- 正式实施计划：[plan.md](C:/Users/zhang/Documents/mcu-workbench/00_Docs/04_需求文档/REQ-PLATFORM-IMPL-OS-UPGRADE-20260821/plan.md)
- 阶段级 Agent/Skill 基线：本文件第 8A 节。
- 下一阶段：Plan 批准后交给 `workflow-task-breakdown` 生成 `task.md`。
- 目标文件范围：Spec F-01～F-07。
- 执行前必须确认：Spec/Plan 版本一致、工作区基线未被覆盖、`tools-quality` 最新规则已读取。
- 禁止扩大：不得新增 OS 能力、模板、catalog alias、固件修改或其他宿主变更。
- 实现完成后交接：先最终 Verify，再交 `workflow-final-review`。
- 未验证项：目标固件具体 RTOS 配置、交叉编译、烧录、目标运行和实物时序。
- 回传规则：任何范围/接口/资源/验收变化回到 `workflow-review-gate`；普通测试失败留在当前 Task 修复。

## 15. 当前状态与下一步

- 当前状态：`approved-for-task-breakdown`
- 当前唯一动作：交给 `workflow-task-breakdown` 生成 `task.md`。
- 阻塞项：无；Task 执行前仍不得越出 Spec/Plan 文件范围。
