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
| Archive | 历史入口、迁移和兼容依据 | 不作为 active skill、workflow 或 Agent 加载 | `archive/`、`legacy/` |

## 2. 软件架构层边界

| 层 | 可以调用 | 不应调用 | 责任 |
|---|---|---|---|
| APP | OS Wrapper、BSP Wrapper、Middleware API | Core、Driver、具体寄存器 | 业务逻辑、UI、Manager、Task、Profile |
| OS | BSP Wrapper、Core/Driver 所需的系统适配 | APP 业务逻辑 | 任务、队列、同步、定时和资源调度 |
| BSP Handler | BSP Wrapper、OS Wrapper | 直接访问厂商 Driver | 多实例、生命周期、缓存、事件和资源所有权 |
| BSP Adapter | BSP Port、hal_driver | APP 业务逻辑 | 平台绑定、接口表、Mock 和移植隔离 |
| BSP hal_driver | Core 接口 | OS 调度、APP 逻辑 | 器件初始化、协议、读写和睡眠唤醒 |
| Core | Driver | OS、BSP、APP | MCU 内部外设初始化和中断/DMA组织 |
| Driver | 无上层 Adapter | APP、OS、BSP 业务逻辑 | 厂商 HAL/LL/CMSIS/寄存器和 SDK |
| Middleware | OS Wrapper、BSP Wrapper | 直接依赖具体平台实现 | 通用 GUI、通信、存储和算法 |

核心规则：

```text
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
| `tools-release` | 构建产物、签名信息、质量结果 | OTA 包、升级、回滚和发布记录 | `software-system`、项目集成 |
| `tools-learning-tutor` | 项目代码、已有笔记和用户回答 | 学习笔记、Q&A、薄弱点和未验证项 | `workflow-project-integration` 或对应软件层 Skill |

工具 Skill 不负责定义软件架构层，只负责工具链工作流和验证证据。

## 4. Catalog、Registry、Loader 边界

| 模块 | 应承担的唯一责任 | 当前状态 |
|---|---|---|
| `catalog.js` | canonical、legacy、alias、layer、archive 和路径事实源 | 主事实源 |
| `registry.js` | 保留旧 Node API 的兼容查询 | 纯兼容 facade，不维护独立元数据 |
| `loader.js` | 读取 canonical `SKILL.md` 并提供内容 | active loader |
| `resolveSkillId()` | 将 canonical、legacy 和 alias 解析到主 Skill | 当前已支持工具别名 |
| `sync-codex-skills.js` | 将 canonical Skill 同步到 Codex，并处理旧目录冲突 | active sync |

约束：`registry.js` 只做兼容转发，禁止新增独立 Skill 元数据或解析逻辑。

## 5. Node CLI 边界

| 模块 | 当前责任 | 与 Skills 的关系 |
|---|---|---|
| `commands/mcu-new.js` | 生成项目骨架 | 不等同于 `workflow-project-integration` |
| `commands/mcu-driver.js` | 生成 BSP 模板 | 不等同于 `bsp-hal-driver` 或 `bsp-handler` |
| `lib/builder.js` | 生成构建命令；`--execute` 时运行 | 不等同于 `tools-build` 的完整工具链路 |
| `lib/flasher.js` | 生成烧录命令；`--execute` 时运行 | 不等同于 `tools-flash` 的完整校验流程 |
| `lib/platform.js` | 原型平台配置 | 不等同于 `driver-vendor` 或 `core-mcu` |
| `templates/` | Node 生成器模板 | 不等同于 BSP Skill references |

## 6. 当前需要避免的混淆

1. “Skill 已加载”不代表 Node command 已执行。
2. “命令已生成”不代表构建、烧录或调试已经真实完成。
3. “架构文档已输出”不代表代码已经满足层间依赖规则。
4. “工具分析通过”不代表目标硬件已完成板级验证。
5. “归档入口可解析”不代表归档内容仍属于 active plugin。

## 7. Workflow 生命周期

当前 active workflow 只有 `workflow-router` 和 `workflow-project-integration`；旧 `embedded-ai-collab` 位于 `archive/workflows-legacy/`。新增 workflow 必须遵循 [workflows.md](workflows.md) 的职责、权限、产物和校验约束。
