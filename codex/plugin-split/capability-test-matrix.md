# 插件拆分后的能力与测试手段对齐矩阵

状态：`draft / awaiting_user_review`

本矩阵先于插件目录迁移，用来回答两个问题：拆分后每个插件实际能做什么，以及每项能力需要什么级别的证据。静态、主机和宿主加载结果不能替代目标板或真实仪器证据。

## 1. 能力边界矩阵

| 插件 | 拆分后应实现的功能 | 不负责的内容 | 主要输出 |
|---|---|---|---|
| Workflow | Router-first、RCP、Challenge、Review Gate、Spec/Plan/Task 交接、任务状态、最终 Review 编排、工作流 Dashboard | 不实现 HAL、驱动协议、具体构建或调试命令 | RCP 状态、Spec/Plan/Task、交接记录、门禁结论 |
| Architecture | App/Service/Platform/Impl/Vendor 分层审计；四元组对象约束；设备 profile；架构生成和迁移指导 | 不直接执行构建、烧录、调试；不代替目标工程的真实 API 证据 | 架构图、依赖图、profile、生成约束、架构审计报告 |
| Verification | Unity/Fake 主机测试编排；测试矩阵；Map/RAM/ROM/栈分析；质量和代码审查门禁 | 不把主机测试写成目标板通过；不替代构建、烧录和实时观测 | 测试报告、质量报告、验证矩阵、Final Review 结论 |
| DevOps | CMake/Keil/IAR/PlatformIO/ESP-IDF 构建；链接分析；烧录；Git 交接；CI/CD 和发布产物 | 不解释业务逻辑根因；不负责日志语义和代码质量判定 | 构建日志、产物清单、SHA-256、Flash/Release 记录 |
| Observability | 串口/RTT/SWV/ITM 日志采集；GDB/OpenOCD/Ozone 调试；崩溃诊断；上位机协议和采集器 | 不把通道连通写成业务验收；不替代代码审查和构建 | 原始日志、解析事件、调试现场、诊断报告、上位机会话 |
| Plugin Runtime / Contracts | descriptor、依赖、profile/bundle、注册/撤销、事件、版本兼容、四元组对象生命周期 | 不承载具体领域业务；不变成新的业务“大插件” | 插件清单、注册句柄、生命周期状态、兼容矩阵 |

## 2. 测试手段矩阵

| 能力 | 单元测试 | 主机集成测试 | 宿主测试 | 构建/静态 | 目标/实物 |
|---|---|---|---|---|---|
| Workflow 状态机 | 状态迁移、阻塞、回传、幂等 | 真实 fixture：RCP→Spec→Plan→Task | 四宿主 Skill/命令可发现 | schema、链接、生成产物校验 | 不需要目标板 |
| Architecture 审计 | 依赖图、四元组、profile 解析 | 正/反例工程 fixture、快照报告 | Skill 加载与引用解析 | `validate:architecture`、`validate:layer`、链接检查 | 不需要目标板；目标工程 API 仍需工程侧验证 |
| Verification | Unity/Fake、测试发现、报告合并 | 完整 fixture 回归、失败注入 | 工具入口和 Final Review 交接 | `tools-quality`、Cppcheck/MISRA（可用时） | 只在验证目标固件时需要目标板 |
| DevOps | 参数解析、路径、哈希和错误分类 | fixture 工程 dry-run、产物复现 | 构建/烧录 Skill 可发现 | CMake/Keil/PlatformIO 配置校验 | Flash、下载校验、真实探针连接必须目标/实物 |
| Observability | 日志解析、过滤、事件重放、GDB 脚本生成 | fake serial/RTT/TCP、离线日志回放 | 串口/调试命令入口和权限检查 | 脚本 lint、配置 schema、工具版本检查 | 真实串口、RTT、SWV、GDB、波形和故障现场必须目标/实物 |
| Plugin Runtime | descriptor 校验、注册/撤销、幂等、依赖排序 | profile/bundle 组合、冲突和失败回滚 | Claude/Codex/Cursor/OpenCode capability probe | manifest/schema/version 校验 | 不需要目标板 |

## 3. Harness/四元组专项测试

### 3.1 Plugin descriptor

每个插件 descriptor 至少包含：

- `id`、`version`、`apiVersion`
- `capabilities`
- `dependencies` 与版本范围
- `events` / `subscriptions`
- `profiles` / `bundles`
- `register()`、`dispose()` 生命周期入口
- 宿主适配能力声明

测试要求：缺字段、重复 ID、循环依赖、版本不兼容、未知事件和重复注册都必须得到确定性错误。

### 3.2 四元组对象

有身份或生命周期的插件对象统一检查：

```text
base  → 对象身份、类型、生命周期状态
cfg   → 静态配置和版本化参数
ctx   → 运行上下文、依赖和宿主绑定
data  → 运行时数据、缓存和诊断快照
ops   → 行为接口、注册动作和撤销动作
```

测试要求：

- `base` 未初始化时不能调用 `ops`；
- `cfg` 不得被运行时偷偷改写；
- `ctx` 注入失败时必须回滚注册；
- `data` 生命周期由对象所有者明确管理；
- `dispose()` 必须幂等，重复调用不能残留订阅或全局注册；
- 纯函数表若不使用四元组，必须在契约中显式声明“无对象身份、无生命周期”。

### 3.3 Profile / Bundle

至少准备三种 fixture：

1. `minimal`：只加载 workflow + contracts；
2. `embedded-default`：加载五个正式插件；
3. `extension-demo`：加入一个不修改旧插件源码的示例扩展。

每种 fixture 都要测试加载顺序、依赖解析、冲突处理、失败回滚和最终能力集合。

## 4. 端到端验收场景

| 场景 | 操作 | 必须观察到的结果 | 证据等级 |
|---|---|---|---|
| T-01 新需求 | 输入一个嵌入式需求 | workflow 生成 RCP，并正确交接到门禁 | 主机/宿主 |
| T-02 架构审计 | 对 fixture 工程执行五层审计 | 输出依赖、越层和四元组问题 | 主机/静态 |
| T-03 单元验证 | 对 fixture 运行 Fake/Unity 测试 | 通过、失败、跳过和证据等级可区分 | 主机 |
| T-04 DevOps | 对 fixture 执行构建 dry-run | 产物、命令、版本和失败原因可追溯 | 主机/构建 |
| T-05 日志调试 | 回放离线串口/RTT 日志 | 过滤、事件重建和诊断交接稳定 | 主机 |
| T-06 扩展插件 | 加入 `extension-demo` | 不修改旧插件核心即可增加新能力 | 主机/宿主 |
| T-07 真实板卡 | 连接目标板并执行烧录/串口/调试 | 真实运行证据独立记录，不由主机结果替代 | 目标/实物 |

## 5. 首期通过标准

在真正拆目录前，至少需要：

1. 五个插件的能力清单与非目标确认；
2. Plugin descriptor、四元组和 profile/bundle 的 schema 草案；
3. 每个插件至少一个主机 fixture；
4. Plugin Runtime 的注册、撤销、重复加载和失败回滚测试设计；
5. 四宿主 capability probe 方案；
6. 旧单插件入口的兼容验收场景；
7. 上位机首期范围：先支持协议/采集/解析契约，不提前绑定具体 PC 产品。

## 6. MCP 扩展面

### 6.1 MCP：外部能力接入层

本设计中的 MCP 不属于 Skill，也不属于 Hook。MCP 是把外部工具、资源和上下文接入 Plugin Runtime 的适配层。

```text
Skill / Agent
      ↓
MCP Capability Adapter
      ↓
MCP Server / Tool / Resource
      ↓
外部工具、上位机、仪器、数据库或项目服务
```

MCP 适合承载：

- 上位机串口、USB、TCP、仪器和日志服务；
- 构建服务器、CI、制品库和版本服务；
- 外部文档、知识库、项目管理和代码托管系统；
- 需要独立进程、权限隔离或不同生命周期的工具。

MCP Adapter 必须声明：

```text
server_id
transport
tools / resources / prompts
input_schema / output_schema
required_permissions
timeout / cancellation
evidence_level
health_check
dispose
```

MCP 的调用边界：

- Skill 通过 capability id 调用 MCP，不直接依赖某个 MCP Server 名称；
- MCP Server 不知道 Workflow、Agent 或业务规则；
- MCP 返回原始结果、结构化结果和证据元数据；
- 外部写操作必须由 policy 和用户授权控制；
- MCP 不自动等价于真实硬件验证，必须由调用方声明证据等级。

MCP 测试：

| 测试 | 目标 |
|---|---|
| Schema test | 工具输入输出、错误码和版本兼容 |
| Fake server test | 无外部服务时验证调用、超时、取消和重试 |
| Contract test | 对真实 MCP Server 验证 capability 契约 |
| Permission test | 读/写、烧录、调试和外部发布权限边界 |
| Evidence test | 返回结果不能丢失来源、时间、命令和退出码 |
| Lifecycle test | `connect → use → cancel → dispose` 无残留 |

### 6.2 关系与调用路径

```text
Plugin      = 稳定领域能力边界
MCP         = 外部工具/资源/服务适配
Hook        = 生命周期事件触发器
Skill       = 可调用能力描述
Agent       = 领域决策角色
Runtime     = 注册、依赖、生命周期和组合
```

推荐调用路径：

```text
Agent
  → Skill
    → MCP Adapter（需要外部能力时）
      → MCP Server / 外部工具
```

这样新增一个上位机协议时，新增 Observability 插件内的 MCP Adapter 或独立 MCP 能力包，不修改 Workflow 核心；新增一个 MCU 族时，扩展 Architecture 插件的 Skill、Profile 和测试 fixture，不引入第二套扩展模型。
