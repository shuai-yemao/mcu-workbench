# Legacy Node Runtime

根目录的 `index.js`、`commands/`、`lib/` 和 `templates/` 是早期的 Node.js 原型接口；它们服务于本仓库的 Jest 测试，**不是** Claude Code 插件组件。

Claude Code 只通过根目录 `.claude-plugin/plugin.json` 加载 `skills/<layer>/<skill>/SKILL.md`。因此：

- 不要把 `commands/*.js` 当作 Claude Code `/命令`；Claude Code 命令应是 Markdown skill 或 command 文件。
- `skill-bundle-manifests/` 中的 `plugin.json` 与相邻 `index.js` 是早期分类元数据，不是可独立安装的子插件；分类与选择规则以 `skills/README.md`、`skills/catalog.js` 和 `skills/registry.js` 为准。
- 若未来需要将 Node 原型发布为 CLI，应单独创建 CLI 包，而不要再与 Claude Code 插件入口混用。
