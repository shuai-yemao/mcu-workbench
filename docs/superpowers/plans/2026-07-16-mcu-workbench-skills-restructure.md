# MCU-Workbench Skills 重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有嵌入式 skills 变为可发现、边界清晰、可验证的 Claude Code 插件。

**Architecture:** 以根 `.claude-plugin/plugin.json` 定义唯一插件入口，以 `skills/catalog.js` 为命名、层级、旧名迁移和分类事实源，`scripts/validate-plugin.js` 以文件系统为最终验证对象。79 个 skill 移入按架构层划分的目录并由 manifest 显式加载；旧 Node 原型转为 `legacy/` 文档化兼容资产。

**Tech Stack:** Claude Code Plugin manifest、Markdown Agent Skills、Node.js 内置模块、Jest。

---

### Task 1: 建立正式插件入口与遗留边界

**Files:**
- Create: `.claude-plugin/plugin.json`
- Create: `legacy/README.md`
- Modify: `README.md`

- [ ] 创建包含 `name`、`description`、`version` 和 `skills: ["./skills/embedded/"]` 的根 manifest。
- [ ] 明确根 `commands/` 和 `index.js` 属于 legacy Node 原型，Claude Code 不加载它们。
- [ ] 在 README 写入 Claude Code 本地验证与命名空间调用方式。

### Task 2: 建立单一 catalog 与结构校验

**Files:**
- Create: `skills/catalog.js`
- Create: `docs/skills-migration.md`
- Create: `scripts/validate-plugin.js`
- Modify: `skills/registry.js`
- Modify: `skills/loader.js`
- Test: `tests/skills.test.js`

- [ ] 将 79 个目录和 frontmatter 统一为 `层级-领域[-具体对象]`，写出旧名迁移表。
- [ ] 修正 registry 的 3 项缺失与 3 项幽灵条目，并从 catalog 导出 registry，避免第二份手工列表。
- [ ] 校验 manifest、SKILL frontmatter、唯一名称、命名规则、registry/磁盘一致性、相对引用以及绝对路径禁令。
- [ ] 为校验器和 loader 写回归测试。

### Task 3: 重建导航与重点 skill 边界

**Files:**
- Create: `skills/README.md`
- Modify: `skills/embedded/embedded/SKILL.md`
- Modify: `skills/embedded/peripheral-driver/SKILL.md`
- Modify: `skills/embedded/bsp-peripheral-driver/SKILL.md`
- Modify: `skills/embedded/bsp-peripheral-handler/SKILL.md`
- Modify: `skills/embedded/embedded-adapter/SKILL.md`
- Modify: `skills/embedded/embedded-unity-testing/SKILL.md`

- [ ] 写分类导航矩阵和按任务选择主 skill 的规则。
- [ ] 将 `embedded` 改为只做分诊和工作流编排。
- [ ] 删除 `peripheral-driver` 中的绝对路径、失效流水线与强制 OOP 表述，改为可验证的设备适配流程。
- [ ] 让 BSP Driver、Handler、Adapter 和 Unity 测试互相引用清晰的输入、输出与禁止事项。

### Task 4: 验证与文档审查

**Files:**
- Modify: `package.json`

- [ ] 增加 `npm run validate:plugin`。
- [ ] 安装开发依赖，不写入 lockfile。
- [ ] 运行 `npm test -- --runInBand`、`npm run validate:plugin`、`claude plugin validate .` 和本地 `--plugin-dir` 加载检查。
- [ ] 检查 diff，确保没有未说明的删除或遗留绝对路径。
