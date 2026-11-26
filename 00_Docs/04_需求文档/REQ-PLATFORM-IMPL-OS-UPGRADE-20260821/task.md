# 实施任务清单：platform_os 与 impl_os Skill 架构规则升级

## 1. 元数据

| 字段 | 内容 |
|---|---|
| request_id | `REQ-PLATFORM-IMPL-OS-UPGRADE-20260821` |
| 任务清单版本 | `v1.0` |
| 状态 | `完成` |
| 项目路径与提交 | `C:\\Users\\zhang\\Documents\\mcu-workbench @ host_ai/10770f4de82e7486908843a961dbfcaa6e65d865` |
| 输入 spec.md | `C:\\Users\\zhang\\Documents\\mcu-workbench\\00_Docs\\04_需求文档\\REQ-PLATFORM-IMPL-OS-UPGRADE-20260821\\spec.md` |
| 输入 plan.md | `C:\\Users\\zhang\\Documents\\mcu-workbench\\00_Docs\\04_需求文档\\REQ-PLATFORM-IMPL-OS-UPGRADE-20260821\\plan.md` |
| Spec 力度 | `full` |
| 风险叠加门禁 | `versioned` |
| 生成时间 | `2026-08-21T14:42:00+08:00` |
| 阶段级 Agent/Skill 基线 | `plan.md 第 8A 节` |
| 下游执行 Skill | `workflow-task-execution` |

可信等级：`confirmed`、`user-confirmed`、`inferred`、`unverified`。影响任务顺序、范围或验收的 `inferred`/`unverified` 项保持阻塞或只能作为未验证记录。

## 2. 总体任务图

```text
T-001 → T-002 → T-003 → T-004 → T-005 → T-006 → T-007 → T-008
```

- 总体目标：将 OS Skill 从单一 FreeRTOS 二次桥接示例升级为按证据识别实现剖面的长期契约。
- 非目标：新增 OS 能力、代码生成模板、固件/RTOS/HAL/BSP/Vendor 修改、catalog/alias 修改、其他宿主层修改。
- 关键串行链：`T-001 → T-002 → T-003 → T-004 → T-005 → T-006 → T-007 → T-008`。
- 可并行任务组：无。
- 不可并行原因：Platform 和 Impl reference 互相引用同一剖面模型；测试必须在全部文档契约稳定后修改；回归必须等待测试契约完成。

## 3. 任务索引

| 顺序 | task_id | 任务名称 | 前置任务 | 并行组 | 主 Agent | 主实现 Skill | 辅助 Skill | 验证等级 | 状态 |
|---:|---|---|---|---|---|---|---|---|---|
| 1 | T-001 | 重组 Platform OS 主 Skill 剖面规则 | `none` | `none` | `embedded-lead` | `platform_os` | `system-architect` | 静态 | pass |
| 2 | T-002 | 更新 Platform OS 契约与 FreeRTOS 案例 | `T-001` | `none` | `embedded-lead` | `platform_os` | `impl_os` | 静态 | pass |
| 3 | T-003 | 重组 Impl OS 主 Skill 后端规则 | `T-002` | `none` | `embedded-lead` | `impl_os` | `platform_os` | 静态 | pass |
| 4 | T-004 | 更新 FreeRTOS API 与来源映射 reference | `T-003` | `none` | `embedded-lead` | `impl_os` | `tools-quality` | 静态 | pass |
| 5 | T-005 | 更新 OS 架构 Jest 契约 | `T-004` | `none` | `embedded-lead` | `tools-quality` | `tools-verification` | 主机 | pass |
| 6 | T-006 | 执行定向质量与链接验证 | `T-005` | `none` | `embedded-lead` | `tools-quality` | `tools-verification` | 静态/主机 | pass |
| 7 | T-007 | 执行插件全量回归与差异审查 | `T-006` | `none` | `embedded-lead` | `tools-verification` | `tools-quality` | 主机/静态 | pass |
| 8 | T-008 | 对照 Spec 执行最终 Verify | `T-007` | `none` | `embedded-lead` | `workflow-final-review` | `tools-quality`, `tools-verification` | 静态/主机 | in_progress |

## 4. 任务详情

### T-001：重组 Platform OS 主 Skill 剖面规则

| 字段 | 内容 |
|---|---|
| order | `1` |
| parallel_group | `none` |
| source_plan_ids | `P-01` |
| source_spec_ids | `F-01`, `4.1`, `4.4`, `G-01`, `G-02` |
| owner_agent | `embedded-lead` |
| support_agents | `system-architect` |
| owner_skill | `platform_os` |
| supporting_skills | `workflow-review-gate` |
| allocation_evidence | Plan P-01 与 Spec F-01：Platform 公共契约必须先明确剖面与公共头边界 |
| confidence | `confirmed` |
| status | `pass` |

#### 目标

使 `platform_os/SKILL.md` 明确 Platform 公共契约、直接后端/显式桥接判定、禁止依赖和证据分级。

#### 范围

- 包含：边界、公共头依赖、实现剖面、能力范围、句柄/单位/ISR/所有权要求、证据与交接规则。
- 不包含：新增 OS API、代码生成模板、catalog、固件或 Impl 实现代码。
- 文件范围：`skills/platform/platform_os/SKILL.md`。
- 所属层：Platform OS。

#### 前置条件与依赖

- 前置任务：无。
- 外部前提：已批准 Spec v1.0、Plan v1.0。
- 依赖证据：`skills/platform/platform_os/SKILL.md`、Spec F-01、Plan P-01。

#### 执行步骤

1. 保留 `platform_os` canonical 名称和 Platform 公共契约职责。
2. 增加 `direct-platform-backend`、`explicit-impl-bridge`、`bare-metal-or-fake`、`mixed`、`missing` 的判定规则。
3. 将 RTOS/CMSIS/HAL/芯片/C 标准库禁依赖、资源所有权、阻塞/ISR/错误契约写成规范规则。
4. 将原有固定二次桥接描述改为条件化调用链，并保留 `platform_common` 类型出口规则。
5. 审阅 diff，确认只发生 Markdown 规则变更。

#### 输出物

- 文件：`skills/platform/platform_os/SKILL.md`。
- 符号/接口：文档中的 `platform_os_*`、实现剖面和证据状态术语。
- 中间产物：该文件的受限 diff。

#### 约束边界

- 接口和依赖：不得新增公共 API；不得把 `impl_os_*` 作为所有项目强制依赖。
- 资源与生命周期：只写契约要求，不实现句柄或资源。
- 并发、ISR、DMA：保留并细化文档门禁，不声称目标工程验证。
- 内存和生成边界：不新增生成文件，不修改 C/C++ 文件。

#### 验证

| 字段 | 内容 |
|---|---|
| 证据等级 | `static` |
| 命令或条件 | `C:\\Users\\zhang\\Documents\\mcu-workbench` 执行 `rg -n "direct-platform-backend|explicit-impl-bridge|platform_common|C 标准库|ISR" skills/platform/platform_os/SKILL.md` |
| 预期结果 | 关键剖面和公共边界规则均存在；无新增 OS 能力声明 |
| 产物位置 | `C:\\Users\\zhang\\Documents\\mcu-workbench\\skills\\platform\\platform_os\\SKILL.md` |
| 当前状态 | `not-run` |

#### 失败处理与回滚

- 失败现象：剖面缺失、规则互相矛盾或 diff 超出文件范围。
- 定位顺序：检查 Spec/Plan 映射 → 检查原文遗漏 → 审阅 diff。
- 重试/降级：只在本任务文件范围内修订；不得降低 Spec 约束。
- 回滚：回退本任务对 `SKILL.md` 的差异。
- 回传条件：出现新增 API、层归属变化或公共依赖变化时回传 Review Gate。

#### T-001 执行记录

- allocation_id：`T-001-20260821T144500+0800`
- 主 Agent/Skill：`embedded-lead` / `platform_os`
- 协作：`system-architect`
- 测试先行：在实现前运行 `rg -n "direct-platform-backend|explicit-impl-bridge|bare-metal-or-fake|mixed|missing" skills/platform/platform_os/SKILL.md`，预期无匹配，实际无匹配，证据等级 `static`。
- 实现变更：`skills/platform/platform_os/SKILL.md`。
- 实现后检查：`rg` 剖面/边界检查通过；`git diff --check -- skills/platform/platform_os/SKILL.md` 退出码 0。
- 验收结果：Spec F-01、4.1、4.4、G-01、G-02 通过。
- 未验证项：目标固件构建、目标运行和实物证据不在本任务范围。
- 当前状态：`pass`。

### T-002：更新 Platform OS 契约与 FreeRTOS 案例

| 字段 | 内容 |
|---|---|
| order | `2` |
| parallel_group | `none` |
| source_plan_ids | `P-02`, `P-03` |
| source_spec_ids | `F-02`, `F-03`, `4.4`, `T-01`～`T-07` |
| owner_agent | `embedded-lead` |
| support_agents | `system-architect`, `firmware-engineer` |
| owner_skill | `platform_os` |
| supporting_skills | `impl_os` |
| allocation_evidence | Plan P-02/P-03 与 Spec F-02/F-03：Platform reference 需与主 Skill 使用同一剖面模型 |
| confidence | `confirmed` |
| status | `pass` |

#### 目标

使 Platform OS reference 同时表达公共契约、直接后端和显式桥接案例，并将外部 FreeRTOS 工程事实限定为有来源的案例。

#### 范围

- 包含：`platform-os-contract.md`、`platform-os-freertos-case.md` 的契约、案例、风险和证据标注。
- 不包含：新增 Event Group/Task Notification、修改外部固件或新增模板。
- 文件范围：
  - `skills/platform/platform_os/references/platform-os-contract.md`
  - `skills/platform/platform_os/references/platform-os-freertos-case.md`
- 所属层：Platform OS reference。

#### 前置条件与依赖

- 前置任务：`T-001`。
- 外部前提：T-001 已稳定剖面术语。
- 依赖证据：Spec F-02/F-03、现有两份 reference。

#### 执行步骤

1. 将公共头、实现 `.c`、类型出口、错误、句柄、单位、ISR、所有权和生命周期写成验收矩阵。
2. 将调用链改成直接 Platform 后端/显式 Impl 桥接的条件分支。
3. 将 FreeRTOS 路径、符号和提交号标记为案例来源，不作为通用默认事实。
4. 保留 queue receive const、mutex ISR、critical token、Timer record 和失败回滚风险。
5. 审阅交叉引用和 diff。

#### 输出物

- 文件：两份 Platform reference。
- 中间产物：契约矩阵、FreeRTOS 案例剖面和受限 diff。

#### 约束边界

- 接口和依赖：不得出现未证实的公共 API；不得删除现有能力边界规则。
- 资源与生命周期：必须保留 Timer/句柄/缓冲区所有权和释放要求。
- 并发、ISR、DMA：案例只描述静态证据，不转写为目标运行结论。
- 内存和生成边界：只改 Markdown。

#### 验证

| 字段 | 内容 |
|---|---|
| 证据等级 | `static` |
| 命令或条件 | `C:\\Users\\zhang\\Documents\\mcu-workbench` 执行 `rg -n "direct-platform-backend|explicit-impl-bridge|confirmed|unverified|Timer|ISR|所有权" skills/platform/platform_os/references` |
| 预期结果 | 两种剖面、证据状态和关键风险均可定位；无新增公共能力 |
| 产物位置 | 两个 Platform reference 绝对路径 |
| 当前状态 | `not-run` |

#### 失败处理与回滚

- 失败现象：案例被写成通用规则、风险矩阵缺项或链接失效。
- 定位顺序：对照 Spec F-02/F-03 → 检查来源标记 → 执行链接检查。
- 重试/降级：只修正 reference，不改主 Skill 范围。
- 回滚：分别回退两份 reference 文件。
- 回传条件：需要新增能力或改变公共契约时回传 Spec。

#### T-002 执行记录

- allocation_id：`T-002-20260821T145000+0800`
- 主 Agent/Skill：`embedded-lead` / `platform_os`
- 协作：`system-architect`、`firmware-engineer`
- 测试先行：在实现前检查两份 Platform reference 缺少 `direct-platform-backend`/`explicit-impl-bridge`，预期无匹配，实际无匹配，证据等级 `static`。
- 实现变更：`platform-os-contract.md`、`platform-os-freertos-case.md`。
- 实现后检查：剖面/证据/风险 `rg` 检查通过；Impl OS 相对链接存在；`git diff --check` 退出码 0。
- 验收结果：Spec F-02、F-03、T-01～T-07 通过。
- 未验证项：外部固件构建和目标运行未验证。
- 当前状态：`pass`。

### T-003：重组 Impl OS 主 Skill 后端规则

| 字段 | 内容 |
|---|---|
| order | `3` |
| parallel_group | `none` |
| source_plan_ids | `P-04` |
| source_spec_ids | `F-04`, `4.2`, `4.3`, `G-02`, `G-03`, `G-05` |
| owner_agent | `embedded-lead` |
| support_agents | `firmware-engineer`, `system-architect` |
| owner_skill | `impl_os` |
| supporting_skills | `platform_os` |
| allocation_evidence | Plan P-04 与 Spec F-04：Impl 主 Skill 负责具体后端和配置风险 |
| confidence | `confirmed` |
| status | `pass` |

#### 目标

使 `impl_os/SKILL.md` 能按项目证据识别后端剖面，并完整保留 RTOS 配置、ISR、并发、内存、生命周期和错误回滚门禁。

#### 范围

- 包含：Impl 边界、直接后端/显式桥接、FreeRTOS 原生类型、单位转换、配置和风险门禁。
- 不包含：新增 RTOS API、固件实现、FreeRTOS 源码或 Vendor 修改。
- 文件范围：`skills/impl/impl_os/SKILL.md`。
- 所属层：Impl OS。

#### 前置条件与依赖

- 前置任务：`T-002`。
- 外部前提：Platform reference 已表达统一剖面术语。
- 依赖证据：现有 Impl Skill、Spec F-04、Plan P-04。

#### 执行步骤

1. 明确 Impl 负责具体 RTOS/裸机绑定、配置、单位转换、错误映射、资源回收和验证。
2. 将 `impl_os_*` 说明为可选内部桥接，而非所有工程必需二次 Adapter。
3. 保留 Task/Queue/Semaphore/Mutex/Timer/Heap 现有能力和风险门禁。
4. 保留 mutex ISR、critical token、Timer record、失败回滚和 `UNRESOLVED_RTOS_CONFIG` 规则。
5. 明确 Event Group/Task Notification 等不因 RTOS 原生存在而成为公共能力。
6. 审阅与 Platform Skill 的边界和引用。

#### 输出物

- 文件：`skills/impl/impl_os/SKILL.md`。
- 中间产物：Impl 后端剖面规则和受限 diff。

#### 约束边界

- 接口和依赖：原生 RTOS API 仅限 Impl/reference 语境；不得把 native 类型泄漏到 Platform public header。
- 资源与生命周期：记录创建/释放者、Timer record、回调和失败回滚。
- 并发、ISR、DMA：FromISR 不自动放行；保留上下文和 token 审查。
- 内存和生成边界：不修改固件和 C 文件。

#### 验证

| 字段 | 内容 |
|---|---|
| 证据等级 | `static` |
| 命令或条件 | `C:\\Users\\zhang\\Documents\\mcu-workbench` 执行 `rg -n "direct-platform-backend|explicit-impl-bridge|UNRESOLVED_RTOS_CONFIG|Timer record|FromISR|Event Group|Task Notify" skills/impl/impl_os/SKILL.md` |
| 预期结果 | 后端剖面、配置风险、ISR/生命周期风险和能力边界均存在 |
| 产物位置 | `C:\\Users\\zhang\\Documents\\mcu-workbench\\skills\\impl\\impl_os\\SKILL.md` |
| 当前状态 | `not-run` |

#### 失败处理与回滚

- 失败现象：Impl 被写成第二套公共 API、缺少配置门禁或丢失 FreeRTOS 风险。
- 定位顺序：检查 Platform/Impl 依赖 → 对照 Spec 4.2/4.3 → 审阅 diff。
- 重试/降级：保留原有能力矩阵，只做剖面化修订。
- 回滚：回退该主 Skill 文件差异。
- 回传条件：若需要新增公共能力或改变接口层归属，回传 Review Gate。

#### T-003 执行记录

- allocation_id：`T-003-20260821T150000+0800`
- 主 Agent/Skill：`embedded-lead` / `impl_os`
- 协作：`firmware-engineer`、`system-architect`
- 测试先行：在实现前检查 Impl Skill 缺少五种实现剖面，预期无匹配，实际无匹配，证据等级 `static`。
- 实现变更：`skills/impl/impl_os/SKILL.md`。
- 实现后检查：剖面、配置、ISR、Timer record、能力边界 `rg` 检查通过；`git diff --check` 退出码 0。
- 验收结果：Spec F-04、4.2、4.3、G-02、G-03、G-05 通过。
- 未验证项：目标 RTOS 配置和固件构建未验证。
- 当前状态：`pass`。

### T-004：更新 FreeRTOS API 与来源映射 reference

| 字段 | 内容 |
|---|---|
| order | `4` |
| parallel_group | `none` |
| source_plan_ids | `P-05`, `P-06` |
| source_spec_ids | `F-05`, `F-06`, `4.2`, `4.4`, `T-03`, `T-07` |
| owner_agent | `embedded-lead` |
| support_agents | `firmware-engineer` |
| owner_skill | `impl_os` |
| supporting_skills | `tools-quality` |
| allocation_evidence | Plan P-05/P-06 与 Spec F-05/F-06：RTOS 原生 reference 必须与 Impl 剖面一致 |
| confidence | `confirmed` |
| status | `pass` |

#### 目标

将 FreeRTOS 原生 API 速查和源码映射改为“原生能力/公开能力/当前 Port/证据状态”分层的 reference。

#### 范围

- 包含：
  - `skills/impl/impl_os/references/freertos-api-quickref.md`
  - `skills/impl/impl_os/references/freertos-source-map.md`
- 不包含：FreeRTOS 源码、版本升级、构建配置、代码生成和新增 OS 能力。
- 所属层：Impl OS reference。

#### 前置条件与依赖

- 前置任务：`T-003`。
- 外部前提：Impl 主 Skill 剖面规则已稳定。
- 依赖证据：现有两份 reference、Spec F-05/F-06。

#### 执行步骤

1. 重新组织 API 速查，明确 native API 不等于 Platform public API。
2. 保留屏蔽状态 token、FromISR、Mutex、Timer、Heap 和失败语义风险。
3. 将源码路径和符号映射改为案例记录格式，要求来源、适用范围和证据状态。
4. 使用 `confirmed/nearest/mixed/missing` 区分映射完整性，不填补缺失配置。
5. 检查 reference 内路径、符号和调用链与两个主 Skill 一致。

#### 输出物

- 文件：两份 Impl reference。
- 中间产物：API 分层表、来源映射表和受限 diff。

#### 约束边界

- 接口和依赖：不得把 native API 描述成 Platform public API。
- 资源与生命周期：保留 Timer/heap/queue/record 的 owner 和释放审查。
- 并发、ISR、DMA：只记录已证明的上下文和风险；不将静态映射写成目标运行结论。
- 内存和生成边界：只改 Markdown。

#### 验证

| 字段 | 内容 |
|---|---|
| 证据等级 | `static` |
| 命令或条件 | `C:\\Users\\zhang\\Documents\\mcu-workbench` 执行 `rg -n "原生能力|当前 Port|confirmed|nearest|mixed|missing|屏蔽状态 token|FromISR" skills/impl/impl_os/references` |
| 预期结果 | 两份 reference 均具备能力分层、来源状态和关键 RTOS 风险 |
| 产物位置 | 两个 Impl reference 绝对路径 |
| 当前状态 | `not-run` |

#### 失败处理与回滚

- 失败现象：来源状态缺失、原生能力与公开能力混淆或路径断裂。
- 定位顺序：对照 Spec F-05/F-06 → 检查主 Skill 术语 → 链接检查。
- 重试/降级：只修订 reference，不扩大到 Vendor/固件。
- 回滚：分别回退两份 reference 文件。
- 回传条件：需要改变 Platform 公共契约时回传上游。

#### T-004 执行记录

- allocation_id：`T-004-20260821T151000+0800`
- 主 Agent/Skill：`embedded-lead` / `impl_os`
- 协作：`firmware-engineer`
- 测试先行：在实现前检查两份 reference 缺少来源剖面字段 `capability_profile`、`evidence_status` 和 `nearest`，预期缺失，实际缺失，证据等级 `static`。
- 实现变更：`freertos-api-quickref.md`、`freertos-source-map.md`。
- 实现后检查：native/public/Port、证据状态、token/FromISR 风险 `rg` 检查通过；`git diff --check` 退出码 0。
- 验收结果：Spec F-05、F-06、4.2、4.4、T-03、T-07 通过。
- 未验证项：FreeRTOS 具体版本和目标构建未验证。
- 当前状态：`pass`。

### T-005：更新 OS 架构 Jest 契约

| 字段 | 内容 |
|---|---|
| order | `5` |
| parallel_group | `none` |
| source_plan_ids | `P-07` |
| source_spec_ids | `F-07`, `T-01`～`T-08` |
| owner_agent | `embedded-lead` |
| support_agents | `verification-engineer` |
| owner_skill | `tools-quality` |
| supporting_skills | `tools-verification` |
| allocation_evidence | Plan P-07 与 Spec F-07：测试需验证新剖面而非固定二次桥接 |
| confidence | `confirmed` |
| status | `pass` |

#### 目标

让 `tests/embedded-architecture-skills.test.js` 验证剖面化 OS 契约、公共头边界、能力限制、证据标记和 canonical/alias 兼容性。

#### 范围

- 包含：OS 相关测试断言和必要的文本契约检查。
- 不包含：删除其他架构测试、修改 Skill catalog、增加固件测试或伪造目标构建测试。
- 文件范围：`tests/embedded-architecture-skills.test.js`。
- 所属层：插件主机验证。

#### 前置条件与依赖

- 前置任务：`T-004`。
- 外部前提：六个 OS 文档/reference 已完成并通过局部静态检查。
- 依赖证据：现有测试文件、package.json 的 Jest 入口。

#### 执行步骤

1. 删除或改写把唯一 `platform_os_* → impl_os_* → native API` 当作硬性要求的断言。
2. 增加直接后端与显式桥接两种剖面的关键词/结构断言。
3. 增加公共头禁依赖、原生能力不等于公开能力、证据状态和 `UNRESOLVED` 标记断言。
4. 保留 canonical 名称、兼容 alias、关键 FreeRTOS 风险和 reference 存在性检查。
5. 先运行定向 Jest，失败时只在本任务范围内修订测试断言。

#### 输出物

- 文件：`tests/embedded-architecture-skills.test.js`。
- 中间产物：定向 Jest 输出。

#### 约束边界

- 接口和依赖：测试只能断言文档契约，不生成或修改固件接口。
- 资源与生命周期：只验证文档中是否保留约束，不替代运行时测试。
- 并发、ISR、DMA：只做文本契约验证，不声称目标证明。
- 内存和生成边界：不新增生成文件或构建产物。

#### 验证

| 字段 | 内容 |
|---|---|
| 证据等级 | `host` |
| 命令或条件 | `C:\\Users\\zhang\\Documents\\mcu-workbench` 执行 `npm test -- --runInBand tests/embedded-architecture-skills.test.js` |
| 预期结果 | 定向 Jest 通过；不再要求唯一二次桥接，同时保留 OS 命名和能力边界测试 |
| 产物位置 | Jest 控制台输出；无固件产物 |
| 当前状态 | `not-run` |

#### 失败处理与回滚

- 失败现象：断言不匹配、reference 路径错误或误删既有架构保护。
- 定位顺序：读取失败测试 → 对照文档实际术语 → 检查测试 diff。
- 重试/降级：只调整本任务测试断言，不通过放宽断言隐藏文档缺陷。
- 回滚：回退测试文件本任务差异。
- 回传条件：若测试暴露 Spec 未定义的新范围，停止并回传 Review Gate。

#### T-005 执行记录

- allocation_id：`T-005-20260821T152000+0800`
- 主 Agent/Skill：`embedded-lead` / `tools-quality`
- 协作：`verification-engineer`
- 测试先行：先运行旧 OS 架构 Jest，退出码 1，3 项失败，证明旧断言仍强制二次桥接；证据等级 `host`。
- 实现变更：`tests/embedded-architecture-skills.test.js`。
- 实现后检查：`npm test -- --runInBand tests/embedded-architecture-skills.test.js` 退出码 0，16/16 通过。
- 验收结果：Spec F-07、T-01～T-08 通过。
- 未验证项：全量插件回归和目标固件验证尚未执行。
- 当前状态：`pass`。

### T-006：执行定向质量与链接验证

| 字段 | 内容 |
|---|---|
| order | `6` |
| parallel_group | `none` |
| source_plan_ids | `P-08` |
| source_spec_ids | `T-08`、`T-09`、`T-11` |
| owner_agent | `embedded-lead` |
| support_agents | `verification-engineer` |
| owner_skill | `tools-quality` |
| supporting_skills | `tools-verification` |
| allocation_evidence | Plan P-08、package.json 校验脚本和 Spec T-08～T-11 |
| confidence | `confirmed` |
| status | `pass` |

#### 目标

在 OS 文档和定向测试完成后，执行适用的质量、插件结构、链接和差异检查。

#### 范围

- 包含：F-01～F-07 目标文件的质量初检和定向验证。
- 不包含：逻辑修复、接口改造、其他工作区变更处理。
- 文件范围：本请求目标文件；检查范围由实际 diff 确定。
- 所属层：插件质量/验证横切能力。

#### 前置条件与依赖

- 前置任务：`T-005` 通过。
- 外部前提：执行前读取 `tools-quality` 最新 Skill 与适用 reference。
- 依赖证据：package.json 的 `validate:plugin`、`validate:links`、Jest 入口。

#### 执行步骤

1. 记录绝对 cwd、工具版本、检查范围和当前 Git diff。
2. 按 `tools-quality` 执行适用的 Markdown/JavaScript 格式和必要注释检查。
3. 执行 `npm run validate:plugin`。
4. 执行 `npm run validate:links`。
5. 执行 `git diff --check`。
6. 若出现问题，只允许在格式/必要注释范围内整改；逻辑/范围问题回传对应任务。

#### 输出物

- 质量检查记录、插件校验输出、链接检查输出、差异检查输出。
- 不生成固件构建产物。

#### 约束边界

- 接口和依赖：质量整改不得改变 Skill 规则语义、测试逻辑或依赖。
- 资源与生命周期：不适用运行时资源。
- 并发、ISR、DMA：不适用；只保留文档静态检查结果。
- 内存和生成边界：不生成目标固件或 CMake 产物。

#### 验证

| 字段 | 内容 |
|---|---|
| 证据等级 | `static/host` |
| 命令或条件 | cwd `C:\\Users\\zhang\\Documents\\mcu-workbench`：`npm run validate:plugin`; `npm run validate:links`; `git diff --check` |
| 预期结果 | 三项命令退出码均为 0，且 diff 仅包含批准范围 |
| 产物位置 | 控制台运行记录和 Git diff |
| 当前状态 | `not-run` |

#### 失败处理与回滚

- 失败现象：链接断裂、格式/必要注释不合规、结构校验失败或差异越界。
- 定位顺序：先区分基线问题与新增问题，再按工具输出定位文件/行。
- 重试/降级：格式/注释问题可受限整改；语义和范围问题回到 T-001～T-005。
- 回滚：只回滚本任务产生的格式/注释整改。
- 回传条件：工具不可用、检查不可复现或出现行为差异时阻塞交接。

#### T-006 执行记录

- allocation_id：`T-006-20260821T153000+0800`
- 主 Agent/Skill：`embedded-lead` / `tools-quality`
- 协作：`verification-engineer`
- 测试先行：执行定向结构/链接/差异检查，作为 T-006 的当前缺失证明入口，证据等级 `static/host`。
- 实现变更：无逻辑变更；仅记录质量与校验结果。
- 实现后检查：`npm run validate:plugin` 退出码 0；`npm run validate:links` 退出码 0（323 Markdown files）；`git diff --check` 退出码 0。
- 验收结果：Spec T-08、T-09、T-11 通过。
- 未验证项：全量 Jest、最终 Verify 和目标固件验证尚未执行。
- 当前状态：`pass`。

### T-007：执行插件全量回归与差异审查

| 字段 | 内容 |
|---|---|
| order | `7` |
| parallel_group | `none` |
| source_plan_ids | `P-08` |
| source_spec_ids | `T-08`～`T-12` |
| owner_agent | `embedded-lead` |
| support_agents | `verification-engineer` |
| owner_skill | `tools-verification` |
| supporting_skills | `tools-quality` |
| allocation_evidence | Plan P-08、Spec T-10～T-12：全量回归和基线差异必须独立记录 |
| confidence | `confirmed` |
| status | `pass` |

#### 目标

确认 OS Skill 升级没有引入插件其他模块、链接、结构和主机测试回归。

#### 范围

- 包含：全量 Jest、插件校验、链接检查、当前工作区差异审查和基线新增问题统计。
- 不包含：固件交叉编译、烧录、目标板运行、推送或提交。
- 文件范围：全仓库只读验证；仅审阅本请求 diff。
- 所属层：插件主机验证。

#### 前置条件与依赖

- 前置任务：`T-006` 通过。
- 外部前提：工作区其他变更保持原样。
- 依赖证据：T-006 运行记录、Git status、package.json。

#### 执行步骤

1. 记录全量测试前 Git status 和本请求路径范围。
2. 执行 `npm test`。
3. 对失败项区分既有基线失败与本请求新增失败。
4. 执行必要的插件/链接校验复核。
5. 审阅最终 diff，确认没有其他路径被混入。

#### 输出物

- 全量 Jest 输出、校验输出、基线差异表和最终变更范围记录。

#### 约束边界

- 接口和依赖：不修改其他模块以掩盖回归。
- 资源与生命周期：仅主机测试资源，不代表目标固件资源安全。
- 并发、ISR、DMA：不执行硬件/RTOS 运行时验证。
- 内存和生成边界：不生成固件产物。

#### 验证

| 字段 | 内容 |
|---|---|
| 证据等级 | `host/static` |
| 命令或条件 | cwd `C:\\Users\\zhang\\Documents\\mcu-workbench`：`npm test`；随后 `git status --short` 与 `git diff --check` |
| 预期结果 | 全量测试通过或所有失败均有基线证据；无新增越界差异 |
| 产物位置 | 控制台输出、Git diff/status 记录 |
| 当前状态 | `not-run` |

#### 失败处理与回滚

- 失败现象：全量测试失败或发现其他目录差异。
- 定位顺序：测试失败文件 → 最近相关变更 → 基线对比 → 本请求 diff。
- 重试/降级：只修复本请求新增问题；既有失败记录为基线，不擅自扩大范围。
- 回滚：按失败来源回到 T-005/T-006；不清理用户已有变更。
- 回传条件：若失败需要新增需求、接口或文件范围，回到 Spec/Plan。

#### T-007 执行记录

- allocation_id：`T-007-20260821T154500+0800`
- 主 Agent/Skill：`embedded-lead` / `tools-verification`
- 协作：`verification-engineer`
- 测试先行：复核全量回归入口和当前工作区状态；既有工作区差异已记录，未清理，证据等级 `static`。
- 实现变更：无逻辑变更；只执行全量回归和范围审查。
- 实现后检查：`npm test` 退出码 0；50 suites、313 tests 全部通过；`git diff --check` 退出码 0。
- 基线审查：其他既有修改保持原样；本请求目标文件为 7 个已修改文件和 2 个请求专属未跟踪目录。
- 验收结果：Spec T-10～T-12 通过。
- 未验证项：目标固件构建、烧录、运行和实物时序未验证。
- 当前状态：`pass`。

### T-008：对照 Spec 执行最终 Verify

| 字段 | 内容 |
|---|---|
| order | `8` |
| parallel_group | `none` |
| source_plan_ids | `P-01`～`P-08` |
| source_spec_ids | `T-01`～`T-12`、`G-01`～`G-06` |
| owner_agent | `embedded-lead` |
| support_agents | `verification-engineer`, `system-architect` |
| owner_skill | `workflow-final-review` |
| supporting_skills | `tools-quality`, `tools-verification` |
| allocation_evidence | Spec 验收清单与 Plan 第 11/12 节：所有 Task 完成后统一对照 Spec 验收 |
| confidence | `confirmed` |
| status | `pass` |

#### 目标

在 T-001～T-007 全部通过后，统一审查最终变更是否满足批准 Spec，而不是只依据单项任务通过状态。

#### 范围

- 包含：F-01～F-07 文件范围、剖面规则、公共头边界、证据分级、能力限制、FreeRTOS 风险、测试和质量证据。
- 不包含：Verify 阶段直接修改实现、补充新需求、固件目标验证或发布动作。
- 文件范围：最终 Git diff、Spec、Plan、Task 和运行记录。
- 所属层：最终工作流门禁。

#### 前置条件与依赖

- 前置任务：`T-007`。
- 外部前提：所有 Task 记录独立通过，运行记录完整。
- 依赖证据：Spec v1.0、Plan v1.0、Task v1.0、最终 diff 和测试输出。

#### 执行步骤

1. 对照 Spec T-01～T-12 逐项检查最终文档和测试证据。
2. 核对所有 Task 的文件范围、主 Skill、验证结果和回滚记录。
3. 检查没有把静态/主机结果写成固件构建、烧录或实机验证。
4. 执行最终格式、必要注释和 `git diff --check` 复核。
5. 形成通过或回到 Spec 的结构化结论。

#### 输出物

- Final Verify 记录。
- 供 `workflow-final-review` 使用的 Spec/Plan/Task/运行记录/最终 diff 交接包。

#### 约束边界

- 接口和依赖：不改变已批准 Spec、Plan 或 Task。
- 资源与生命周期：只审查文档是否覆盖，不声称目标运行安全。
- 并发、ISR、DMA：仅依据已有证据等级判断。
- 内存和生成边界：不新增文件范围或实现。

#### 验证

| 字段 | 内容 |
|---|---|
| 证据等级 | `static/host` |
| 命令或条件 | 对照 Spec 验收表审查；复核 T-006/T-007 的命令和输出；执行 `git diff --check` |
| 预期结果 | 所有验收项有证据；通过则交接 Final Review，偏差则回到 Spec 并使 Plan/Task 失效 |
| 产物位置 | 内部 Final Review 状态和运行记录 |
| 当前状态 | `pass` |

#### 失败处理与回滚

- 失败现象：验收项缺证据、范围越界、规则冲突或新增需求。
- 定位顺序：Spec 验收项 → Task 记录 → 最终 diff → 运行输出。
- 重试/降级：不得在 Verify 阶段直接修补功能；按规则回到 Spec/Plan/Task。
- 回滚：保留失败证据，旧 Plan/Task 标记失效；不删除用户变更。
- 回传条件：任何 Spec 范围、接口、资源、层归属或验收标准变化。

#### T-008 执行记录

- allocation_id：`T-008-20260821T160000+0800`
- 主 Agent/Skill：`embedded-lead` / `workflow-final-review`
- 协作：`verification-engineer`、`system-architect`
- 测试先行：执行最终 Spec/范围/剖面追踪检查；第一次范围脚本误把测试文件中的旧命名断言当作文档命中，随后缩小为文档/reference 范围并通过，证据等级 `static`。
- 实现变更：无；Verify 不修改功能或架构。
- 验证证据：`npm test` 50 suites/313 tests 通过；`npm run build` 退出码 0；无独立 type-check 配置，记录为不适用；`validate:plugin`、`validate:links`、`git diff --check` 均通过。
- Spec 追踪：范围、非目标、五种剖面、公共头边界、能力边界、FreeRTOS 风险、SOLID 和验证等级均通过。
- 质量 final-gate：Markdown/JavaScript 变更范围通过；C/C++ 插件硬门禁不适用；无 Cppcheck/MISRA 入口。
- 未验证项：目标固件交叉编译、烧录、目标运行、串口/RTT 和实物时序。
- 当前状态：`pass`。

## 5. 任务级验收汇总

| task_id | 验收项 | 证据等级 | 命令/条件 | 预期结果 | 产物 | 状态 |
|---|---|---|---|---|---|---|
| T-001 | Platform 主 Skill 剖面和公共头规则 | 静态 | Plan/Task T-001 rg 检查 | 规则完整且无新增 API | Skill diff | pass |
| T-002 | Platform reference 契约和案例证据 | 静态 | Plan/Task T-002 rg/链接检查 | 两种剖面、来源和风险完整 | 两份 reference diff | pass |
| T-003 | Impl 后端和配置风险 | 静态 | Plan/Task T-003 rg 检查 | 不强制二次桥接，风险保留 | Impl Skill diff | pass |
| T-004 | FreeRTOS reference 分层 | 静态 | Plan/Task T-004 rg 检查 | native/public/Port 和证据状态分离 | 两份 Impl reference diff | pass |
| T-005 | Jest 架构契约 | 主机 | `npm test -- --runInBand tests/embedded-architecture-skills.test.js` | 定向测试通过 | Jest 输出 | pass |
| T-006 | 定向质量与链接 | 静态/主机 | `npm run validate:plugin`; `npm run validate:links`; `git diff --check` | 全部退出码 0 | 校验输出 | pass |
| T-007 | 全量回归 | 主机/静态 | `npm test`、Git status/diff | 无新增基线失败和越界差异 | 回归记录 | pass |
| T-008 | 最终 Spec Verify | 静态/主机 | 对照 Spec 验收表 | 通过或回到 Spec | Final Review 状态 | pass |

较低等级证据不能替代目标工程构建、目标运行或实物证据。本请求不包含固件目标验证。

## 6. 阻塞与未验证项

| ID | 类型 | 内容 | 影响任务 | 证据/补证动作 | 状态 |
|---|---|---|---|---|---|
| B-01 | 未验证 | 目标固件的具体 RTOS 版本、配置、构建入口和板级运行证据不在插件仓库 | `T-001`～`T-008` | 本请求只验证插件文档/主机契约；具体固件使用时重新取证 | open |
| B-02 | 未验证 | `tools-quality` 最新规则需在执行阶段读取 | `T-006`、`T-008` | 执行前读取 canonical Skill 和适用 reference | open |

上述未验证项不阻塞本插件文档任务，但禁止将结果表述为固件编译或实机通过。

## 7. 下游交接

- 需求/约束输入：[spec.md](C:/Users/zhang/Documents/mcu-workbench/00_Docs/04_需求文档/REQ-PLATFORM-IMPL-OS-UPGRADE-20260821/spec.md)
- 实施路线输入：[plan.md](C:/Users/zhang/Documents/mcu-workbench/00_Docs/04_需求文档/REQ-PLATFORM-IMPL-OS-UPGRADE-20260821/plan.md)
- 任务清单：[task.md](C:/Users/zhang/Documents/mcu-workbench/00_Docs/04_需求文档/REQ-PLATFORM-IMPL-OS-UPGRADE-20260821/task.md)
- 阶段级 Agent/Skill 基线：`plan.md` 第 8A 节。
- 任务级分配：每项任务均设置一个唯一主实现 Skill；辅助 Skill 只提供审查/验证约束。
- 执行规则：按 T-001～T-008 顺序执行，不跳过前置任务；每项任务独立实现、审查和验证。
- 代码完成后：先执行 T-008 Final Verify，再交接 `workflow-final-review`。
- 新事实回传：不改变范围时回填 Task 证据；改变 Spec/Plan 范围时回传 `workflow-review-gate`/`workflow-integration-plan`。
