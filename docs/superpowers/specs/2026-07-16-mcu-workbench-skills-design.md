# MCU-Workbench Skills 重构设计

## 目标

把仓库整理为可被 Claude Code 官方插件机制发现、校验和稳定使用的嵌入式 skills 插件，同时保留现有 79 个 skill 的名称与知识资产。

## 当前问题

- 根目录缺少 `.claude-plugin/plugin.json`，不是完整的 Claude Code 插件入口。
- skill 实体位于 `skills/embedded/<name>/SKILL.md`，需要通过 manifest 显式声明；7 个同级 `plugin.json` 是旧分类资料，不是可安装子插件。
- `skills/registry.js` 与文件系统各有 3 个不一致条目，且手工双维护没有校验。
- README、根 Node 包、JS 命令和 Claude Code 插件模型没有边界说明；旧 Node 命令不能作为 Claude Code 命令加载。
- 通用入口、BSP Driver、Handler、Adapter、HAL 与 Unity 测试的职责边界不够明确；`peripheral-driver` 含机器绝对路径和不存在的工作流引用。

## 命名与架构分类

命名采用 `层级-领域[-具体对象]`，只用小写 ASCII 字母、数字和连字符；目录名、frontmatter `name` 与 catalog `id` 必须一致。禁止泛化后缀（如 `-module`）和单词入口（如 `embedded`）。

| 架构层/横切面 | 命名前缀 | 示例 |
|---|---|---|
| 工作流与分诊 | `workflow-` | `workflow-router` |
| MCU/芯片/工具链基础 | `platform-` | `platform-stm32-hal` |
| 外设接口 | `bus-`、`peripheral-`、`protocol-` | `bus-i2c`、`peripheral-adc` |
| BSP | `bsp-` | `bsp-device-adaptation` |
| RTOS 与中间件 | `rtos-`、`middleware-` | `rtos-freertos` |
| 系统能力 | `system-` | `system-bootloader` |
| 工程操作 | `tool-`、`debug-`、`observability-`、`quality-` | `tool-build-keil` |
| 安全、发布与硬件 | `security-`、`release-`、`hardware-` | `security-firmware-signing` |

重命名会同步改变 Claude Code 的调用名；仓库提供旧名到新名的迁移表，Node catalog 查询也接受旧名解析。Claude Code 原生不提供 skill alias，因此用户需要将旧 `/mcu-workbench:<旧名>` 更新为新名称。

## 目标结构

```text
.claude-plugin/plugin.json       # 唯一的 Claude Code 插件 manifest
skills/<layer>/<skill>/SKILL.md  # 按架构层分类，由 manifest 显式加载
skills/catalog.js                # 从 registry 导出的目录、分类和边界信息
skills/README.md                 # 用户可查阅的技能导航与选择规则
scripts/validate-plugin.js       # 无第三方依赖的结构与引用校验器
tests/skills.test.js             # catalog、loader、校验器的回归测试
legacy/                          # 旧 Node 插件运行时与过时子插件声明，明确不由 Claude Code 加载
```

## 边界模型

| 层级 | 负责内容 | 不负责内容 |
|---|---|---|
| `embedded` | 意图分诊与选择最小 skill 集合 | 重复输出 HAL、Driver 或测试实现细节 |
| `stm32-hal-development` | CubeMX/HAL、MCU 内置外设和工程集成 | 器件协议与多实例服务管理 |
| `peripheral-driver` | 外部器件选型、开源驱动评估和受控适配 | 强制 OOP、硬编码工程路径、不可复现流水线 |
| `bsp-peripheral-driver` | 平台解耦的单器件协议、生命周期和错误语义 | RTOS 调度与多个器件实例编排 |
| `bsp-peripheral-handler` | 多实例、队列/线程/事件、资源所有权 | 直接访问总线或重复设备协议 |
| `embedded-adapter` | 把 Driver/Handler 依赖绑定至 HAL/RTOS/时间基准 | 设备业务逻辑 |
| `embedded-unity-testing` | Fake/Mock、目标板日志与测试入口隔离 | 替代生产入口或直接修改业务需求 |

## 迁移策略

1. 新增根 manifest，并显式加载每个架构层的 skill 目录；移动 79 个 skill 到对应层级，统一目录名、frontmatter `name` 与 catalog `id`。
2. 将旧子插件 JSON 与 Node 命令运行时移入 `legacy/`，保留历史资产但不让 Claude Code 误发现它们。
3. 将 registry 修正为与磁盘一致，并提供 `catalog.js` 和校验器，禁止再次出现不匹配。
4. 重写通用入口和外设 Driver skill 的触发条件、边界、流程与过时引用；其余 skills 先由全量结构校验保护，再以独立主题逐步内容升级。
5. 文档以导航矩阵替代“所有 skill 都能做所有事”的描述；README 清楚区分 Claude Code 插件与遗留 Node 原型。

## 验收标准

- `claude plugin validate .` 能验证根 manifest 和所有可加载 skills。
- 校验器证明磁盘 skill、registry、catalog 一一对应；每个 skill 均有合法 frontmatter、非空描述且不含失效本地绝对路径。
- 所有名称符合 `层级-领域[-具体对象]` 规则，且有旧名迁移表。
- 自动化测试覆盖 loader、registry/catalg 一致性和结构校验。
- README 与 skills 导航能让用户针对构建、烧录、调试、外设、BSP、RTOS、中间件和系统设计选择一个主 skill。
- 重点边界 skill 不再含过时流水线、机器私有路径或与其他 skill 矛盾的职责。
