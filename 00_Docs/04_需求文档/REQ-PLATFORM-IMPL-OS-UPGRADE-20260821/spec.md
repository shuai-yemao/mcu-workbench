# Spec：platform_os 与 impl_os Skill 架构规则升级

## 元数据与状态

| 字段 | 内容 |
|---|---|
| request_id | `REQ-PLATFORM-IMPL-OS-UPGRADE-20260821` |
| Spec 版本 | `v1.0` |
| Spec 状态 | `approved-for-integration-plan` |
| Spec 力度 | `full` |
| Spec 叠加门禁 | `versioned` |
| 项目路径 | `C:\\Users\\zhang\\Documents\\mcu-workbench` |
| 分支/提交 | `host_ai @ 10770f4de82e7486908843a961dbfcaa6e65d865` |
| 目标交付物 | `platform_os` 与 `impl_os` canonical Skill 内容、参考资料和插件测试契约 |
| 用户确认 | 已确认第一版只升级规则/参考资料/证据分级/测试契约 |
| 用户审查状态 | `approved` |

## 1. RCP、Challenge 与 Review Gate 结论

### 1.1 需求结论

升级嵌入式插件中 `platform_os` 与 `impl_os` 的架构指导，使其能够准确指导以下工作：

- Platform OS 公共头文件与实现文件的职责划分；
- FreeRTOS、其他 RTOS 或裸机后端的证据化识别；
- `platform_os` 与 `impl_os` 是否存在内部桥接的按项目判定；
- 公共接口、RTOS 原生类型、C 标准库、CMSIS/HAL 依赖的边界审查；
- 任务、队列、同步、定时器、时基、内存和临界区的资源/并发/ISR 契约；
- 插件测试对架构规则的可回归验证。

### 1.2 用户确认范围

本 Spec 第一版只升级 Skill 规则、参考资料、证据分级和插件测试契约。明确不新增：

- Event Group、Task Notification、Stream Buffer、Message Buffer 等 OS 能力；
- 代码生成模板、固件实现、FreeRTOS 源码、HAL、BSP 或 Vendor 内容；
- 插件目录结构、Skill catalog、alias 和其他宿主适配层的行为变化；
- CMake、烧录、目标板运行或实机验证流程。

### 1.3 Challenge 目的质疑

| 项目 | 结论 | 证据等级 |
|---|---|---|
| 当前需求是否只是新增 API | 否，核心是架构规则与证据模型升级 | `user-confirmed` + 当前 Skill 内容 |
| 当前问题的工程影响 | 现有 canonical Skill 将一个特定工程的两层调用链描述得过于固定，可能把直接绑定 RTOS 的 `platform_os.c` 错判为必须存在的二次桥接 | `confirmed`（Skill 文本）+ `inferred`（影响判断） |
| 更小范围是否可达成目标 | 可以，只改两个 Skill 目录及其测试契约，不扩展 OS 能力 | `user-confirmed` |
| 成功标准 | 规则与真实工程证据分离、两种实现剖面可判定、旧别名保持、测试可检测关键边界 | `user-confirmed` + 本 Spec |

### 1.4 Challenge 可行性质疑

| 前提/风险 | 结论 | 证据等级 |
|---|---|---|
| 插件仓库存在 canonical `platform_os`/`impl_os` Skill 与参考资料 | 已确认 | `confirmed` |
| 当前两部分 Skill 有对应 Jest 架构契约测试 | 已确认 | `confirmed`，`tests/embedded-architecture-skills.test.js` |
| 当前 Skill 参考了外部 FreeRTOS 工程路径与静态映射 | 已确认 | `confirmed`，两部分 reference 文件 |
| 外部工程路径、版本、配置是否可作为所有项目事实 | 不可直接作为通用事实 | `confirmed`/`inferred` |
| 本仓库是否包含目标固件的可复现构建和目标板验证入口 | 未发现；本请求不要求补充 | `unverified` |
| 直接绑定 RTOS 与内部 Impl 桥接是否都需要被支持 | 需要通过本 Spec 固定为按项目证据判定 | `user-confirmed` + 当前需求上下文 |

### 1.5 Review Gate 判定

- `spec_rigor`: `full`。原因：跨两个 canonical Skill、影响公共架构契约、涉及 RTOS/ISR/并发/内存边界并需要回归测试。
- `spec_overlays`: `[versioned]`。原因：canonical Skill 长期维护，且工作区存在其他未提交变更。
- `human_review`: 不追加为强制叠加门禁；本 Spec 仍必须经过用户 H-02 审查批准后才能进入 Plan。
- Challenge 状态：`可交接`。
- Review Gate 状态：`通过，待用户批准 Spec`。
- 代码阶段判定：在 Spec 批准前禁止修改 Skill、测试和其他实现文件。

## 2. 工程现状表

| ID | 工程事实 | 证据 | 可信等级 | 处理结论 |
|---|---|---|---|---|
| E-01 | 当前仓库为 `mcu-workbench` 插件仓库，分支为 `host_ai` | Git 仓库状态 | `confirmed` | 只修改本请求范围 |
| E-02 | 当前 HEAD 为 `10770f4de82e7486908843a961dbfcaa6e65d865` | `git rev-parse HEAD` | `confirmed` | 记录版本基线 |
| E-03 | 当前工作区已有其他 Skill、测试、插件元数据和未跟踪工作流目录变更 | `git status --short` | `confirmed` | 不覆盖、不清理、不混入提交 |
| E-04 | canonical 文件位于 `skills/platform/platform_os/` 与 `skills/impl/impl_os/` | 仓库目录扫描 | `confirmed` | 作为主要施工范围 |
| E-05 | `platform_os` 当前强调公共契约、RTOS-neutral 类型和 `platform_common` 类型出口 | `skills/platform/platform_os/SKILL.md` | `confirmed` | 保留并细化 |
| E-06 | `impl_os` 当前强调具体 RTOS、FreeRTOS 原生 API、配置和 Port 风险 | `skills/impl/impl_os/SKILL.md` | `confirmed` | 保留并泛化 |
| E-07 | 当前 reference 将 `platform_os_* → impl_os_* → native API` 作为调用链示例 | `platform-os-contract.md`、`freertos-source-map.md` | `confirmed` | 改为条件化剖面，不再作为唯一规则 |
| E-08 | 当前测试硬编码上述两层调用链及具体 FreeRTOS 映射 | `tests/embedded-architecture-skills.test.js` | `confirmed` | 测试需改为验证剖面和边界 |
| E-09 | catalog 已登记 canonical Skill 与兼容 alias | `skills/catalog.js`、`skills/catalog-metadata.js` | `confirmed` | 本版不改 catalog/alias |
| E-10 | 外部 FreeRTOS 工程证据仅能说明案例，不自动成为插件通用事实 | `platform-os-freertos-case.md`、`freertos-source-map.md` | `confirmed` | reference 必须显式标注来源、证据级别和适用范围 |
| E-11 | 用户已确认此前 OSAL 架构不应被 Skill 强制增加二次 `impl_os_*` 桥接 | 当前会话上下文 | `user-confirmed` | 作为本版核心规则 |

## 3. 文件施工清单

### 3.1 必须修改

| ID | 文件 | 所属层/职责 | 修改内容 | 主责任 Skill |
|---|---|---|---|---|
| F-01 | `skills/platform/platform_os/SKILL.md` | Platform OS 公共契约指导 | 重写边界、公共头约束、实现剖面判定、依赖禁令、证据分级和交接规则 | `platform_os` |
| F-02 | `skills/platform/platform_os/references/platform-os-contract.md` | Platform OS 契约参考 | 定义公共头、实现 `.c`、类型出口、错误/句柄/单位/ISR/所有权契约；取消唯一二次桥接假设 | `platform_os` |
| F-03 | `skills/platform/platform_os/references/platform-os-freertos-case.md` | FreeRTOS 案例 | 将固定路径和调用链改为带来源、适用范围和证据等级的案例；保留风险清单 | `platform_os` |
| F-04 | `skills/impl/impl_os/SKILL.md` | Impl OS 后端适配 | 明确直接绑定与显式内部桥接两种剖面；保留 RTOS 配置、ISR、并发、内存、回滚和验证边界 | `impl_os` |
| F-05 | `skills/impl/impl_os/references/freertos-api-quickref.md` | FreeRTOS 原生 API 参考 | 按原生能力、项目公开能力和当前 Port 实现三层区分，补充上下文/失败/所有权提醒 | `impl_os` |
| F-06 | `skills/impl/impl_os/references/freertos-source-map.md` | FreeRTOS 证据映射 | 将路径/符号映射改为项目案例模板，要求记录来源和 `confirmed`/`nearest`/`mixed`/`missing` 状态 | `impl_os` |
| F-07 | `tests/embedded-architecture-skills.test.js` | 插件回归契约 | 更新 OS Skill 断言，验证两种实现剖面、公共头禁依赖、别名保持和证据边界 | `tools-quality` + `tools-verification` |

### 3.2 默认不修改

| 范围 | 原因 |
|---|---|
| `skills/catalog.js`、`skills/catalog-metadata.js` | canonical 名称和 alias 不变 |
| `skills/platform/platform_common/**` | 本版只引用其公共类型出口，不改变公共类型定义 |
| `skills/workflow/**` | 本请求使用现有 Spec 工作流，不升级工作流本身 |
| `common/`、`claude/`、`opencode/`、`codex/` | 不属于本请求的宿主适配或公共规则施工范围 |
| 固件工程、FreeRTOS 源码、HAL、BSP、Vendor | 本请求只修改插件指导资料 |
| 根目录既有 `00_Docs/04_需求文档/spec.md`、`plan.md`、`task.md` | 已属于其他请求，必须保留 |

### 3.3 新增文件限制

本版不新增 Skill、不新增 OS 能力 reference、不新增代码生成模板。若实现阶段发现现有 reference 无法承载某项规则，必须先回到本 Spec 重新放行。

## 4. 代码生成约束清单

虽然本版主要修改 Markdown 与测试契约，但下游 Skill 必须固定以下代码边界。

### 4.1 Platform OS 公共头与实现

1. 公共 `platform_os` `.h` 只暴露稳定能力、必要句柄/枚举/配置/错误码和 `platform_common` 出口类型。
2. 公共头不得 include 或暴露 FreeRTOS、RT-Thread、CMSIS-OS、CMSIS compiler、HAL、芯片寄存器或其他 C 标准库头文件。
3. 公共类型优先使用项目已确认的 `platform_common/platform_type.h`、错误码和公共宏出口；不能在 OS Skill 中凭空定义项目私有公共类型。
4. Platform OS 的 `.c` 是否直接 include RTOS 原生头文件，必须由目标工程真实分层和构建入口确认；Skill 不得把“绝不直接绑定”或“必须二次桥接”写成普遍规则。
5. 如果目标工程确有 `impl_os_*` 内部函数或 `platform_os_internal_*.h`，必须以真实头文件、实现和测试证明其存在、职责和调用链；internal 头不是第三层公共 API。
6. `platform_os` 不承载任务入口、业务循环、设备协议、缓存策略、重试策略或 Handler 生命周期。

### 4.2 Impl OS 后端

1. Impl OS 负责具体 RTOS/裸机绑定、原生配置、上下文限制、单位转换、错误映射、资源回收和 Port 级验证。
2. `impl_os` Skill 可以描述 `impl_os_*` 后端，但不得强制每个工程都新增一套二次 Adapter；是否存在桥接按项目证据决定。
3. FreeRTOS 类型和原生 API 只能出现在真实 Impl/Port 实现及明确标注的 RTOS reference 中。
4. 单位、句柄、缓冲区、Timer record、回调参数和内存块的创建者/所有者/释放者必须可追溯。
5. 每个阻塞接口必须说明调用上下文、最大等待/超时单位、ISR 变体、线程安全性、可重入性和失败后的对象状态。
6. `FromISR` 分支不等于接口安全；必须同时审查对象类型、临界区 token、优先级切换和 FreeRTOS 规则。
7. Timer callback 上下文、Timer ID/record 生命周期、删除并发关系和失败回滚必须单独审查。
8. `FreeRTOSConfig.h`、端口文件和构建入口没有证据时使用 `UNRESOLVED_RTOS_CONFIG` 或 `UNVERIFIED_BUILD_ENTRY`，不得声称可编译或已运行。

### 4.3 能力范围

第一版只规范现有任务、队列、二值/计数信号量、互斥锁、软件定时器、延时、时基、内存和临界区等能力的判定方法。Event Group、Task Notification、Stream Buffer、Message Buffer 和取消语义继续保持“不得从 RTOS 原生存在反推为公共能力”。

### 4.4 证据剖面

Skill 必须支持以下实现剖面：

| 剖面 | 最小证据 | 允许的结论 |
|---|---|---|
| `direct-platform-backend` | `platform_os` 公共头、对应 `.c`、RTOS 配置/构建入口 | `platform_os.c` 直接绑定 RTOS；不要求 `impl_os_*` 桥接 |
| `explicit-impl-bridge` | 公共头、internal 头、Platform/Impl `.c`、RTOS 配置/测试 | 可确认 `platform_os_* → impl_os_* → native API` |
| `bare-metal-or-fake` | 真实时基、Fake/Mock 或裸机 Port 证据 | 只能确认已实现的替代后端能力 |
| `mixed` | 不同能力族存在不同映射证据 | 按能力族单独标记，不得整体归类 |
| `missing` | 缺少公共头、实现、配置或构建入口 | 只输出未解析标记，不得生成可编译结论 |

## 5. 验收测试清单

| ID | 证据等级 | 验收项 | 预期结果 |
|---|---|---|---|
| T-01 | 静态 | canonical Skill 仍为 `platform_os`/`impl_os` | 名称、相对链接和 alias 不破坏 |
| T-02 | 静态 | Platform 公共头边界规则 | 文档明确禁止 RTOS/CMSIS/HAL/芯片/C 标准库类型泄漏 |
| T-03 | 静态 | 实现剖面规则 | 文档同时支持直接 Platform 后端和显式 Impl 桥接，不强制二次桥接 |
| T-04 | 静态 | 证据分级 | reference 区分规范、案例、`confirmed`、`inferred`、`unverified` 及 `nearest/mixed/missing` |
| T-05 | 静态 | OS 能力边界 | 不把 Event Group/Task Notification 等原生能力自动写成公共能力 |
| T-06 | 静态 | 资源与并发契约 | 文档覆盖句柄、所有权、生命周期、单位、阻塞、ISR、可重入和错误恢复 |
| T-07 | 静态 | FreeRTOS 风险 | 文档保留 mutex ISR、critical token、Timer record、配置裁剪和失败回滚门禁 |
| T-08 | 主机 | Jest 架构契约 | `tests/embedded-architecture-skills.test.js` 按新规则通过 |
| T-09 | 静态 | 插件链接与结构 | `npm run validate:plugin`、`npm run validate:links` 通过 |
| T-10 | 主机 | 全量回归 | `npm test` 通过；既有失败必须区分基线问题与新增问题 |
| T-11 | 静态 | 差异范围 | `git diff --check` 通过，且只包含本 Spec 文件和下游批准后的目标文件 |
| T-12 | 证据边界 | 目标工程验证 | 不把插件文本/Jest/静态扫描描述为固件交叉编译、烧录或实机通过 |

## 6. 可采用项、需修订项与阻塞风险

### 6.1 可采用项

- 保留 `platform_os` 作为 Platform OS 公共契约 Skill。
- 保留 `impl_os` 作为具体 RTOS/裸机后端 Skill。
- 保留任务、队列、信号量、互斥锁、软件定时器、heap、tick、临界区的风险清单。
- 保留 FreeRTOS 原生能力与当前公开 Platform 能力分离的规则。
- 保留 `platform_common` 类型出口和公共头不泄漏原生类型的规则。

### 6.2 需修订项

- 将唯一调用链改为按项目证据选择的实现剖面。
- 将当前外部工程固定路径、配置和符号映射改为有来源、有适用范围的案例资料。
- 将测试中对 `impl_os_*` 二次桥接的硬编码断言改为剖面与边界断言。
- 补充 Platform `.c` 直接绑定 RTOS 时的合法性判定条件，以及禁止把它误判为越层的规则。

### 6.3 当前阻塞项

- 无影响本 Spec 范围的阻塞项。
- 目标固件的具体公共头、构建入口、FreeRTOS 版本和端口配置未作为本插件仓库事实确认；后续针对具体固件生成/审查时必须重新取证。
- Spec 尚未完成用户 H-02 批准，因此不得进入 Plan、Task 或代码施工。

## 7. 下游交接契约

Spec 批准后才允许进入 `workflow-integration-plan`：

1. 仅按 F-01～F-07 规划文件级修改；不得扩大到 catalog、其他宿主或固件仓库。
2. 先更新 Skill/reference，再更新测试契约；每项修改保持可回滚。
3. 实现阶段必须读取并遵守 `tools-quality` 的最新格式和注释规则，但只对 Markdown/测试文件执行适用检查。
4. 完成后运行 Spec 中 T-08～T-11 的验证，并保留命令、绝对工作目录、退出码和证据等级。
5. 发现新的 OS 能力需求、公共接口变更、目录迁移或桥接规则变化时，停止施工，回到 Router/Challenge 更新 Spec。

## 8. 回滚、兼容与未验证项

- 回滚以文件为单位，仅回退本请求产生的目标文件差异；不得使用 `git reset --hard` 或清理其他工作区变更。
- 保持 `platform_os`、`impl_os` canonical 名称和现有 alias 兼容。
- 不将旧 reference 的具体路径、FreeRTOS 版本或外部工程提交号升级为通用规范。
- 插件测试通过只证明文档/契约和 Node 主机行为；不证明任意目标固件可编译、可烧录或实机运行。

## 9. 用户审查闸门

请用户审查本 Spec，重点确认：

1. 是否接受“直接 Platform 后端”和“显式 Impl 桥接”两种按证据判定的实现剖面；
2. 是否接受本版不新增 Event Group、Task Notification 和代码生成模板；
3. 是否接受只修改 F-01～F-07，并保留现有根目录需求文档与工作区其他变更。

批准后状态改为 `approved-for-integration-plan`，才可生成 `plan.md`。
