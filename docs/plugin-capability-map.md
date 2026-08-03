# 嵌入式插件功能清单（草案）

> 状态：待评审。本文只记录当前仓库的实际能力，不代表下一轮重构方案。

## 1. 插件组成

除 Skills 和 Node CLI 外，插件根目录 `agents/` 提供按职责调用的 Claude Code Custom Agents（名册由 `lib/agent-domains.js` 定义）。每个 agent 声明稳定的 `domain` 与 `scope`，技能集由领域注册表从 canonical Skills 自动派生，不手写技能清单。Agent 负责把输入、证据、变更、测试和交接写入稳定产物协议。详见 [Agent team](agents.md)。

当前插件由两条相互独立的能力链组成：

| 能力链 | 入口 | 主要内容 | 当前定位 |
|---|---|---|---|
| Skills 链 | `.claude-plugin/plugin.json` → `skills/` | 架构知识、工作流、参考资料和工具脚本 | 当前主要插件能力 |
| Node CLI 链 | `bin/mcu-workbench.js` → `lib/cli.js` → `commands/` → `lib/` | 项目生成、模板生成、命令计划和显式工具执行 | 正式 CLI；与 Skills 链独立 |

归档内容位于 `archive/` 和 `legacy/`，不属于 active manifest。

## 2. Skills 能力地图

当前 catalog 为 **109 catalog / 27 canonical**：

- 27 个 canonical skills；
- 80 个软件和工具归档入口；
- 2 个硬件 active 入口。

### 2.1 Workflow 请求路由与项目集成

| Skill | 功能 | 典型输出 |
|---|---|---|
| `workflow-requirements-router` | 需求分析、约束补证、Agent 分配和需求约束包 | 需求约束包 → workflow-project-integration（必经） |
| `workflow-project-integration` | 分层设计、工程审计、集成路线 | 架构图、工程改造计划 |
| `workflow-ai-collab` | 最终代码、补丁或 diff 的独立 Review 编排 | 按严重级别分组的审查报告与阻塞项 |
| `workflow-claude-layering` | 目标工程 Claude 分层规则的扫描、同步与校验 | 受管 CLAUDE.md 区块、路径规则、漂移报告 |
### 2.2 APP 软件架构

| Skill | 功能 | 典型输出 |
|---|---|---|
| `app-architecture` | APP 的 main、manager、task、logic、UI、profile 边界 | APP 目录和调用关系 |

### 2.3 OS、BSP、Core、Driver

| 层级 | Canonical skills | 主要职责 |
|---|---|---|
| OS | `os-adapter`、`os-runtime` | OSAL、Wrapper、Port、任务、队列、同步和 Runtime 实现 |
| BSP | `bsp-wrapper`、`bsp-port`、`bsp-hal-driver`、`bsp-handler` | Wrapper/Port、器件 HAL Driver、Handler 生命周期和资源管理 |
| Core | `core-mcu` | MCU 内部外设初始化、中断和 DMA |
| MCU | `mcu-platform` | CMSIS、厂商 HAL/LL/SPL、寄存器和 SDK |

当前架构约束：Adapter 只存在于 OS 和 BSP；Core、Middleware、Driver 不设置 Adapter。

### 2.4 Middleware 与跨层系统能力

| Skill | 功能 |
|---|---|
| `middleware-lvgl` | LVGL 核心、显示和输入接入 |
| `middleware-communication` | MQTT、BLE、CAN、Modbus、WiFi、USB 等通信能力 |
| `middleware-storage` | FatFs、SFUD、Flash 和文件系统接入 |
| `middleware-algorithms` | DSP、FFT、电机控制和通用算法 |
| `software-system` | Bootloader、低功耗、看门狗、固件安全等跨层能力 |

### 2.5 工具方向

| Skill | 汇总职责 | 主要交接 |
|---|---|---|
| `tools-build` | CMake、ESP-IDF、IAR、Keil、PlatformIO 构建 | 输出 ELF、HEX、BIN、MAP 等产物 |
| `tools-flash` | J-Link、OpenOCD、ESP-IDF、Keil、批量烧录 | 接收构建产物，写入并校验目标板 |
| `tools-linker` | SCT、LD、ICF、内存布局和链接错误 | 为构建和 Map 分析提供布局依据 |
| `tools-debug` | GDB、OpenOCD、Ozone、RTOS、HardFault | 接收运行失败证据，输出根因和修复建议 |
| `tools-observability` | ELOG、RTT、串口、SystemView | 采集日志、追踪和运行时证据 |
| `tools-quality` | 代码审查、Map、静态分析、Unity | 输出质量问题、证据和回归结果 |
| `tools-git` | 分支、Jira 提交、worktree、同步和受控恢复 | 记录变更、提示提交并交接验证证据 |
| `tools-release` | OTA 打包、升级、回滚和发布验证 | 接收构建产物和质量结果 |
| `tools-learning-tutor` | 基于项目代码提问、理解检查和 Obsidian 笔记生成 | 接收项目路径、模块范围和用户回答 |

推荐工具交接顺序：

```text
tools-build
    ↓
tools-flash / tools-debug
    ↓
tools-observability
    ↓
tools-quality
    ↓
tools-release
```

### 2.5 硬件方向（暂不重构）

| Skill | 当前功能 | 状态 |
|---|---|---|
| `hardware-pcb-analysis` | LCEDA Pro 原理图、BOM、电源树、引脚和网络分析 | active，暂时闲置 |
| `hardware-visa-debug` | VISA/SCPI、GPIB/USB/TCP/串口仪器通信 | active，暂时闲置 |

## 3. Node CLI 能力地图

### 3.1 Commands

| Command | 实现位置 | 当前行为 |
|---|---|---|
| `mcu-new` | `commands/mcu-new.js` | 创建 App/BSP/System/Core/CMake 项目骨架 |
| `core` | `commands/mcu-core.js` | 根据平台生成一类 Core 外设的一对 `.c/.h`；`iic` 归一化为 `i2c` |
| `driver` | `commands/mcu-driver.js` | 根据设备类别、设备、Core 和平台生成 Driver/Handle/Port/Wrapper；不生成 `System/**` |
| `build` / `mcu-build` | `commands/mcu-build.js` | 默认生成构建计划；`--execute` 时执行 |
| `flash` / `mcu-flash` | `commands/mcu-flash.js` | 默认生成烧录计划；`--execute` 时执行 |
| `mcu-debug` | `commands/mcu-debug.js` | 生成 OpenOCD/GDB 命令，不启动真实会话 |
| `mcu-monitor` | `commands/mcu-debug.js` | 返回串口监控参数，不启动真实监控 |
| `claude-layer` | `commands/mcu-claude-layer.js` | 扫描/同步/校验目标工程的 Claude 分层规则；init/sync 需 `--write` 才写入 |

### 3.2 Libraries and templates

| 模块 | 功能 |
|---|---|
| `lib/platform.js` | 平台配置、平台查询和简单平台检测 |
| `lib/builder.js` | CMake/ESP-IDF 构建命令拼接 |
| `lib/flasher.js` | ST-Link/OpenOCD/esptool 命令拼接 |
| `lib/generator.js` | BSP 模板读取和文件内容生成 |
| `templates/` | CLI 使用的 C/H 模板 |

## 4. 校验与维护能力

| 文件 | 功能 |
|---|---|
| `skills/catalog.js` | canonical、旧名称、别名、层级和归档路径事实源 |
| `skills/loader.js` | 加载 canonical Skill 内容 |
| `skills/registry.js` | 兼容旧 Node API 的 Skill registry 包装 |
| `scripts/validate-plugin.js` | manifest、catalog、frontmatter、目录和链接校验 |
| `scripts/sync-codex-skills.js` | 同步 canonical Skills，并处理旧目录迁移和冲突 |
| `tests/skills.test.js` | catalog、路由、加载和适配层约束测试 |
| `tests/sync-codex-skills.test.js` | Codex 同步、别名迁移和冲突测试 |

## 5. 当前未决问题

1. CLI 是否需要继续扩展真实调试和串口监控进程管理。
2. `catalog.js`、`registry.js`、`loader.js` 的最终职责边界。
3. 旧 `embedded-ai-collab` 已归档；后续 workflow 扩展遵循 [workflows.md](workflows.md)。
4. Node 生成器的目录结构是否需要完全对齐当前 APP/OS/BSP/Middleware 架构。

CLI 使用说明见 [docs/node-cli.md](node-cli.md)。
