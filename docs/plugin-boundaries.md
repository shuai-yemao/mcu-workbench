# 嵌入式插件边界与责任矩阵（草案）

> 状态：当前实现。本文用于确定“谁负责什么”，不提前决定下一轮重构方式。

## 1. 顶层边界

插件 Agent 是独立于 Skills 的协作入口：定义位于根目录 `agents/`，不加入 `.claude-plugin/plugin.json`；Agent 只能按角色写入指定产物目录，并通过 `.mcu-workbench/runs/` 交接证据。角色矩阵见 [agents.md](agents.md)。

| 区域 | 负责内容 | 不负责内容 | 当前入口 |
|---|---|---|---|
| Plugin manifest | 声明 active skill 层级 | 不实现业务逻辑 | `.claude-plugin/plugin.json` |
| Canonical Skills | AI 指令、选择流程、领域约束 | 不充当通用 Node CLI | `skills/<layer>/<skill>/SKILL.md` |
| References | 技术变体、案例、厂商差异 | 不替代主 Skill 的核心流程 | `references/` |
| Scripts | 可重复的检查、分析、生成或采集 | 不隐藏关键决策和权限 | 各 Skill 的 `scripts/` |
| Node CLI | 项目生成、模板渲染、命令计划和显式工具执行 | 不自动代表 Claude Code command | `bin/`、`lib/cli.js`、`commands/`、`lib/` |

## 2. 软件架构层边界

| 层 | 可以调用 | 不应调用 | 责任 |
|---|---|---|---|
| APP | Service 公共接口 | Platform、Wrapper、Port、Impl、Vendor、HAL、RTOS | 业务逻辑、UI、Manager、Task、Profile |
| Service | Platform 公共接口、其他 Service | Impl、Vendor、HAL、RTOS 和具体 Driver | 业务策略、业务状态和跨能力编排 |
| Platform | `platform_common` 及自身公共契约 | Impl、Vendor、HAL、RTOS、具体 Driver | 能力接口、错误码、对象、生命周期和 Ops |
| Impl | Platform 接口、Vendor 底座 | 反向定义 Platform、被 App/Service 直调、承载业务策略 | 具体绑定、资源装配和实现注入 |
| BSP Handle | OS Wrapper、Driver Ops | 直接访问 HAL、复制 Port 状态 | 多实例、生命周期、缓存、事件和资源所有权 |
| BSP Driver | Core/Platform MCU 事务接口 | OS 调度、APP/Service 逻辑、原生 HAL | 器件初始化、协议、读写和睡眠唤醒 |
| OS/BSP Wrapper | 自身 Platform 公共契约 | 具体 Impl、HAL、RTOS、Driver/Handle 对象 | 函数表、注册槽位和稳定转发 |
| OS/BSP Port | Platform 接口、具体 Impl/Vendor 依赖 | 业务策略、协议状态机、重复缓存 | 具体对象构造、Ops 注入、注册和回滚 |
| Middleware | Service 或 Platform Middleware 公共接口 | 直接依赖具体平台实现 | 通用 GUI、通信、存储和算法 |

核心规则：

```text
App → Service → Platform ← Impl → Vendor 是唯一规范调用链。
OS 只能通过 OS Adapter 的 Wrapper/Port 解耦。
BSP 只能通过 BSP Adapter 的 Wrapper/Port 解耦。
Core、Middleware、Driver 不设置 Adapter。
```

## 3. 工具方向边界

| Skill | 输入 | 输出 | 交接对象 |
|---|---|---|---|
| `tools-build` | 工程文件、工具链、构建配置 | ELF/HEX/BIN/MAP、构建日志 | `tools-flash`、`tools-linker`、`tools-quality` |
| `tools-flash` | 固件产物、探针、目标板 | 烧录结果、校验结果 | `tools-debug`、`tools-observability` |
| `tools-linker` | SCT/LD/ICF、链接错误 | 内存布局和修复建议 | `tools-build`、`tools-quality` |
| `tools-debug` | 回溯、寄存器、GDB/OpenOCD 信息 | 根因、修复和回归建议 | `tools-observability`、软件架构 Skill |
| `tools-observability` | RTT/ELOG/串口/SystemView 数据 | 运行时证据和时间线 | `tools-debug`、`tools-quality` |
| `tools-quality` | 源码、Map、静态分析、测试结果 | 缺陷、等级、证据和回归结果 | `tools-build`、`tools-release` |
| `tools-git` | 仓库状态、分支、差异、Jira 和用户确认 | 变更集、提交/标签证据、风险与验证交接 | `tools-quality`、`tools-build`、`tools-release` |
| `tools-release` | 构建产物、签名信息、质量结果 | OTA 包、升级、回滚和发布记录 | `software-system`、项目集成 |
| `tools-learning-tutor` | 项目代码、已有笔记和用户回答 | 学习笔记、Q&A、薄弱点和未验证项 | `workflow-integration-plan` 或对应软件层 Skill |

工具 Skill 不负责定义软件架构层，只负责工具链工作流和验证证据。

源码仓库、项目文件和层间调用证据统一登记在[软件分层知识图谱](../skills/workflow/workflow-review-gate/references/software-architecture-knowledge-graph.md)；逐层 Skill 只引用对应证据，不复制上游源码。

## 4. Catalog、Registry、Loader 边界

| 模块 | 应承担的唯一责任 | 当前状态 |
|---|---|---|
| `catalog.js` | canonical、legacy、alias、layer、archive 和路径事实源 | 主事实源 |
| `registry.js` | 保留旧 Node API 的兼容查询 | 纯兼容 facade，不维护独立元数据 |
| `loader.js` | 读取 canonical `SKILL.md` 并提供内容 | active loader |
| `resolveSkillId()` | 将 canonical、legacy 和 alias 解析到主 Skill | 当前已支持工具别名 |
| `sync-codex-skills.js` | 将 canonical Skill 同步到 Codex，并处理旧目录冲突 | active sync |

约束：`registry.js` 只做兼容转发，禁止新增独立 Skill 元数据或解析逻辑。

## 5. Node CLI 边界(已移除)

> Node CLI(`bin/`、`commands/`、`lib/cli.js`)已删除(2026-08-08)——交互统一走 Skill + lib Programmatic API(与 harness 同模式,ADR H13)。`lib/` 共享引擎保留,可经 Skill/API 接入;`scripts/claude-layer-api.js` 是分层能力的确定性入口。

历史对应关系(供理解 lib 与 Skills 的分工):

| lib 模块 | 历史责任 | 与 Skills 的关系 |
|---|---|---|
| `lib/generator.js` | 生成项目骨架/Core/BSP 切片 | 不等同于 `workflow-integration-plan` 的项目集成规划 |
| `lib/builder.js` | 生成构建命令 | 不等同于 `tools-build` 的完整工具链路 |
| `lib/flasher.js` | 生成烧录命令 | 不等同于 `tools-flash` 的完整校验流程 |
| `lib/platform.js` | 原型平台配置 | 不等同于 `driver-vendor` 或 `core-mcu` |
| `lib/claude-layer.js` | 分层扫描/同步/校验 | 由 `workflow-claude-layering` skill 经 `scripts/claude-layer-api.js` 驱动 |

## 6. 当前需要避免的混淆

1. “Skill 已加载”不代表 Node command 已执行。
2. “命令已生成”不代表构建、烧录或调试已经真实完成。
3. “架构文档已输出”不代表代码已经满足层间依赖规则。
4. “工具分析通过”不代表目标硬件已完成板级验证。
5. “归档入口可解析”不代表归档内容仍属于 active plugin。

## 7. Workflow 生命周期

当前 active workflow 为 `workflow-requirements-router`、`workflow-review-gate`、`workflow-integration-plan`、`workflow-claude-layering` 和 `workflow-final-review`；旧 `workflow-router` 位于兼容边界，`embedded-ai-collab` 工作流已移除归档。新增 workflow 必须遵循 [workflows.md](workflows.md) 的职责、权限、产物和校验约束。
