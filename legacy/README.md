# Legacy Node Runtime

根目录的 `index.js`、`commands/`、`lib/` 和 `templates/` 起源于早期 Node.js 原型；当前正式 CLI 入口为 `bin/mcu-workbench.js`，通过 `lib/cli.js` 复用这些兼容 API。它们仍然**不是** Claude Code Skills 组件。

Claude Code 只通过根目录 `.claude-plugin/plugin.json` 加载 `skills/<layer>/<skill>/SKILL.md`。因此：

- 不要把 `commands/*.js` 当作 Claude Code `/命令`；Claude Code 命令应是 Markdown skill 或 command 文件。
- `skill-bundle-manifests/` 中的 `plugin.json` 与相邻 `index.js` 是早期分类元数据，不是可独立安装的子插件；分类与选择规则以 `skills/README.md`、`skills/catalog.js` 和 `skills/registry.js` 为准。
- CLI 用法见 [`docs/node-cli.md`](../docs/node-cli.md)；CLI 与 Claude Code 插件入口保持独立，不要将 `commands/*.js` 当作 Claude Code `/命令`。
