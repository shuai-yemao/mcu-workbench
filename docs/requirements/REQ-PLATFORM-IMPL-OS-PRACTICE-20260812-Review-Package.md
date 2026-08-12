# Review-Package：Platform / Impl OS 实践工程对齐

## 审查结论

**命名-only 实施已完成；静态、插件结构、链接与相关测试门禁通过。**

采用“实践命名作为唯一 canonical，旧命名执行破坏性迁移并清零残留”。109 个 token 已完成静态对账，完整映射见 [`Naming-Map`](REQ-PLATFORM-IMPL-OS-PRACTICE-20260812-Naming-Map.md)。审查依据是插件源码与测试、实践工程当前源码和 Git 状态；不包含目标板证据。

## 0. 输入和证据

| 项目 | 证据 |
|---|---|
| 插件 | `C:\Users\zhang\Documents\mcu-workbench @ host_ai / 07bef278b353821651ab9da9c69332038fc35220` |
| 实践工程 | `D:\zhuomian\embedded_framework @ codex/platform-os / abcb8327bca16ea5621e2a9de91bba1c1f464d76` |
| 现有插件入口 | `skills/platform/platform_os/SKILL.md`、`skills/impl/impl_os/SKILL.md` |
| 现有测试 | `tests/embedded-architecture-skills.test.js:43-53, 134-143` |
| 架构契约 | `skills/workflow/workflow-review-gate/references/software-layer-contract.md:3-47` |
| 实践工程 OS 目录 | `D:\zhuomian\embedded_framework\03_Platform\platform_os`、`04_Impl\impl_os` |
| 证据边界 | 静态源码/文档/测试断言；目标构建、烧录、运行未确认 |

## 1. 工程现状表

| ID | 事实 | 状态 | 影响 |
|---|---|---|---|
| F-01 | canonical Skill 已归属 Platform/Impl 两层 | confirmed | 目录归属可保留 |
| F-02 | 插件正文和测试曾使用 `osal_*` 与 `os_*_impl()` | confirmed | 已完成破坏性重命名和测试同步 |
| F-03 | 实践工程使用 `platform_os_*` 与 `impl_os_*` | confirmed | 可作为推荐命名证据 |
| F-04 | 实践工程使用 `platform_os_internal_*` 和 `impl_os_freertos.h` | confirmed | 可作为跨层 include 映射证据 |
| F-05 | 插件要求 Platform 不暴露原生 RTOS 类型，Impl 承载 Port | confirmed | 不能因命名更新改变层边界 |
| F-06 | 实践工程存在 `PLATFORM_OS_*` 与 `IMPL_OS_*` 宏 | confirmed | 宏只改前缀的规则有实践依据 |
| F-07 | 旧计数差异已由 HEAD 与当前工作区逐项对账 | confirmed | 38/37/14/20 映射已固化 |
| F-08 | 实践工程候选代码包含非命名差异 | confirmed | 禁止直接复制行为 |
| F-09 | 插件当前工作区有未提交变更 | confirmed | 实施时必须隔离路径、避免全量修改 |
| F-10 | 正式目标构建入口未确认 | unverified | 只能设计分层验收，不得宣称目标通过 |

## 2. 文件施工清单

| ID | 动作 | 文件/目录 | 施工内容 | 前置条件 | 状态 |
|---|---|---|---|---|---|
| W-01 | 修改 | `skills/platform/platform_os/SKILL.md` | 更新唯一 canonical 命名、职责和破坏性迁移说明 | token 对账完成 | completed |
| W-02 | 重命名/修改 | `skills/platform/platform_os/references/platform-os-contract.md` | 更新 Wrapper/Port 调用链和新术语 | token 对账完成 | completed |
| W-03 | 重命名/修改 | `skills/platform/platform_os/references/platform-os-freertos-case.md` | 用实践工程静态证据更新命名/边界案例 | 证据分级 | completed |
| W-04 | 修改 | `skills/impl/impl_os/SKILL.md` | 更新 Impl 文件、函数、宏和 FreeRTOS 边界 | token 对账完成 | completed |
| W-05 | 修改 | `skills/impl/impl_os/references/freertos-source-map.md` | 更新调用链和源文件命名规则 | token 对账完成 | completed |
| W-06 | 修改 | `skills/impl/impl_os/references/freertos-api-quickref.md` | 保留原生 API 速查，新增 Port 归属和未验证标记 | 不扩展公共能力 | ready-after-review |
| W-07 | 修改 | `skills/workflow/workflow-review-gate/references/software-architecture-knowledge-graph.md/.json` | 同步 OS 节点、边和唯一命名 | W-01/W-04 完成 | completed |
| W-08 | 修改 | `tests/embedded-architecture-skills.test.js` 及相关 fixture | 删除旧命名正向断言，增加新命名和旧命名零残留门禁 | 新契约冻结 | completed |
| W-09 | 不修改 | `D:\zhuomian\embedded_framework` | 仅作为证据，不复制源码 | 全程 | ready |

## 3. 代码/文档生成约束清单

| ID | 约束 | 必须满足 | 禁止事项 | 状态 |
|---|---|---|---|---|
| G-01 | 分层 | `App → Service → Platform → Impl → Vendor` | App/Service 直接调用 FreeRTOS | ready |
| G-02 | Platform | 只描述能力契约、RTOS 无关类型和错误语义 | 在 Platform Skill 中写入 `xTask*` 等实现细节 | ready |
| G-03 | Impl | 只负责具体 RTOS Port、配置、调度与验证 | 把业务策略或 Handler 状态放入 Impl OS | ready |
| G-04 | 函数命名 | `osal_* → platform_os_*`、`os_*_impl → impl_os_*` 仅做前缀映射 | 重排动作词、参数顺序、控制流或返回语义 | verified-static |
| G-05 | 类型 | 只改前缀，保留后缀和底层含义 | 改 typedef 底层类型或新增类型 | verified-static |
| G-06 | 宏 | 只改前缀，宏体和值不变 | 重算错误码、修改条件表达式或换算公式 | verified-static |
| G-07 | 文件/guard | 文件名、include、双下划线 guard 一一对应 | 只改单侧、引入旧 include 残留 | verified-static |
| G-08 | 案例 | 实践工程只用于证实命名、依赖方向和 Port 边界 | 复制未经验证行为、构建结论或源码 | ready |
| G-09 | 破坏性迁移 | 新命名是唯一支持；旧命名只能作为迁移输入记录 | 旧命名 alias、示例 API、生成输出、测试正向断言或并行规范 | verified-static |
| G-10 | 工作区 | 只修改 OS Skill、其引用、测试和必要索引 | `git add -A`、触碰固件仓库 | ready |

## 4. 验收测试清单

| ID | 证据等级 | 验收项 | 命令/条件 | 预期 | 当前状态 |
|---|---|---|---|---|---|
| V-01 | 静态 | canonical Skill 和 references 只使用新命名 | `rg -n "osal_|os_.*_impl|os_impl_|OSAL_|OS_MS_TO_TICKS|__OSAL_|__OS_FREERTOS_" skills/platform/platform_os skills/impl/impl_os`; 再检查 `platform_os_|impl_os_|PLATFORM_OS_|IMPL_OS_` | 旧命名零残留；新命名完整 | passed |
| V-02 | 静态 | 命名映射完整 | 从实践工程 HEAD 与当前切片提取符号，生成 old→new 对账表 | 无遗漏、重复和一对多 | passed |
| V-03 | 静态 | 架构图与 Skill 一致 | 检查 graph `.md/.json`、catalog、metadata | 节点、边和 alias 一致 | passed |
| V-04 | 静态 | 禁止跨层调用 | 运行现有 architecture contract 测试 | APP/Service 不出现原生 RTOS | not-run |
| V-05 | 主机测试 | Skill 文档/链接/目录完整 | Jest：architecture Skill、Skill catalog、architecture graph；`node scripts/validate-skill-links.js` | 相关测试通过 | passed |
| V-06 | 插件质量 | 插件整体校验 | `node scripts/validate-plugin.js` | catalog、links、skill 结构通过 | passed |
| V-07 | 交叉构建 | 实践工程或目标工程可编译 | 需真实工程入口、工具链和配置 | 交叉编译通过 | unverified |
| V-08 | 目标运行 | Platform OS 调用链行为与实践一致 | 需目标板、串口/RTT、FreeRTOS 配置和测试固件 | 运行证据可追溯 | unverified |

## 5. 方案对比

| 方案 | 内容 | 优点 | 风险 | 结论 |
|---|---|---|---|---|
| A 直接全量替换 | 所有正文、案例、测试和图谱都只保留 `platform_os_*`/`impl_os_*` | 最接近实践工程，符合旧命名不兼容决策 | 破坏既有旧案例和测试，需要完整 token 对账 | 推荐 |
| B canonical + legacy 兼容 | 实践命名作为推荐规范；旧命名在迁移表、历史案例和兼容断言出现 | 可保留历史检索路径 | 与旧命名不兼容决策冲突，旧术语可能重新成为 API | 禁止采用 |
| C 保持旧规范，只补实践案例 | 不改 canonical 术语，仅增加实践工程说明 | 变更小 | 无法指导当前实践工程命名，继续产生用户侧歧义 | 不满足目标 |

## 6. 审查结论与下一步

- 已采用：A 的方向、Platform/Impl 分层、文件与 include 映射、双下划线 guard 规则、只改前缀规则。
- 已完成：109 token 映射、插件测试和 graph 的新调用链、实践案例的静态证据边界。
- 未验证：实践工程行为质量、目标构建与目标板运行。
- 下一步：代码变更集交给 `workflow-final-review`；如需声明固件可编译，再补真实工程入口、工具链和构建日志。
