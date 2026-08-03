# MCU-Workbench Agent Team

插件根目录的 `agents/*.md` 同时面向 OpenCode 和 Claude Code。OpenCode 通过 `opencode.mjs` 将 agent 暴露为可调用工具；Claude Code 自动发现 `agents/` 目录。

当前团队由名册 `lib/agent-domains.js` 中的 `AGENT_ROSTER` 定义；没有默认主 agent，调用由用户或任务编排决定。

## 领域绑定与技能派生

每个 agent 在 frontmatter 只声明稳定的身份信息：`name` / `description` / `domain` / `scope` / `model` / `effort` / `maxTurns`。**不手写 `skills` 清单**。

- `domain` 声明所属领域，领域定义（layer 聚合 + 额外技能 + 路由词汇）位于 `lib/agent-domains.js` 的 `DOMAINS`。
- 有效技能集由 `domainSkills(domain)` 从 `skills/catalog.js` 自动派生，经 `resolveSkillId` 归一化。
- 技能目录增删/改名后，只需维护 `lib/agent-domains.js`（或依赖 layer 自动聚合），**agent 文件零改动**，不产生功能退化。
- `scope` 是机器可读的写入范围，供 OpenCode 工具与生成器使用。

## OpenCode 调用

在 OpenCode 中，每个 agent 以独立 tool 形式暴露：

| Agent | 领域 | 工具 ID |
|---|---|---|
| `embedded-lead` | 项目协调 | `mcu_agent_embedded_lead` |
| `system-architect` | 分层架构 | `mcu_agent_system_architect` |
| `firmware-engineer` | 固件实现 | `mcu_agent_firmware_engineer` |
| `hardware-integration` | 硬件集成 | `mcu_agent_hardware_integration` |
| `toolchain-engineer` | 工具链 | `mcu_agent_toolchain_engineer` |
| `verification-engineer` | 验证质量 | `mcu_agent_verification_engineer` |
| `knowledge-engineer` | 知识沉淀 | `mcu_agent_knowledge_engineer` |

路由工具 `mcu_workbench_agent_route` 可根据需求推荐最合适的 agent。`mcu_workbench_requirements_router`（兼容旧名 `mcu_workbench_route`）做首阶段需求分诊。

`.opencode/commands/mcu-*.md` 与 `mcu-team.md` 由 `scripts/build-opencode-commands.js` 从 agent 定义自动生成，`tests/opencode-commands.test.js` 保证同步，**请勿手工编辑**。

## Claude Code 调用

```powershell
claude --plugin-dir .
```

在 Claude Code 中可使用 `@mcu-workbench:embedded-lead`、`@mcu-workbench:system-architect` 等显式调用；通过 `/context` 检查 Custom Agents 是否已加载，插件更新后可执行 `/reload-plugins`。

## 角色交接

| Agent | 领域 | 写入范围 |
|---|---|---|
| `embedded-lead` | 项目协调 | `.mcu-workbench/`、`docs/devlog/` |
| `system-architect` | 分层架构 | `docs/architecture/` |
| `firmware-engineer` | 固件实现 | 项目固件目录与配置 |
| `hardware-integration` | 硬件集成 | `hardware/`、`docs/verification/` |
| `toolchain-engineer` | 工具链 | 工具配置、`docs/verification/` |
| `verification-engineer` | 验证质量 | 测试目录、`docs/verification/` |
| `knowledge-engineer` | 知识沉淀 | `docs/devlog/`、`docs/notes/` |

每次交接都必须给出 Summary、Evidence、Changed files、Tests、Artifacts、Blockers 和 Next handoff。专用 agent 不覆盖其他领域文件；Lead 负责最终汇总。所有记录使用唯一时间戳，禁止覆盖已有 run。

## 稳定产物

项目初始化：

```powershell
node scripts/agent-artifacts.js init --project . --project-id gr5526-lvgl --mcu GR5526 --toolchain Keil
```

写入运行记录：

```powershell
node scripts/agent-artifacts.js record --project . --agent system-architect --task "audit layers" --status completed --evidence docs/architecture/layers.md --artifact docs/architecture/layers.md
```

协议目录为 `.mcu-workbench/project.json`、`.mcu-workbench/runs/*.json`、`docs/architecture/`、`docs/verification/`、`docs/devlog/` 和 `docs/notes/`。Obsidian 写入必须经过用户确认。

## 领域与校验

`scripts/validators/agents.js` 与名册 `AGENT_ROSTER` 交叉校验：每个名册 agent 必须有对应文件、每个文件必须登记在名册；`domain` 必须可解析到 `DOMAINS`；`scope` 必须非空；`skills` 字段已被禁止（防内容绑定漂移）。`npm run validate:plugin` 统一执行。

本实现遵循 Claude Code 官方插件约定：插件根目录使用 `agents/`，不在 `plugin.json` 增加未经支持的 agents 字段，也不启用 hooks、MCP 或默认 settings agent。参见 [Plugins reference](https://code.claude.com/docs/en/plugins-reference) 与 [Create plugins](https://code.claude.com/docs/en/plugins)。
