# parsed-chip-datasheet 使用说明

## 用途

`parsed-chip-datasheet` 用于从已解析的芯片 datasheet 资料包中高效回答问题。资料包通常包含 `full.md`、`layout.json`、content JSON、`images/` 和原始 PDF。

## 安装到 Codex

个人安装路径：

```text
%USERPROFILE%\.codex\skills\parsed-chip-datasheet
~/.codex/skills/parsed-chip-datasheet
```

PowerShell 安装示例：

```powershell
$src = 'N:\AI\embedded_skill\parsed-chip-datasheet'
$dst = "$env:USERPROFILE\.codex\skills\parsed-chip-datasheet"
New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
Copy-Item -LiteralPath $src -Destination $dst -Recurse -Force
```

Codex 调用：

```text
$parsed-chip-datasheet
```

## 安装到 Claude Code

个人安装路径：

```text
%USERPROFILE%\.claude\skills\parsed-chip-datasheet
~/.claude/skills/parsed-chip-datasheet
```

项目本地安装路径：

```text
.claude/skills/parsed-chip-datasheet
```

PowerShell 安装示例：

```powershell
$src = 'N:\AI\embedded_skill\parsed-chip-datasheet'
$dst = "$env:USERPROFILE\.claude\skills\parsed-chip-datasheet"
New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
Copy-Item -LiteralPath $src -Destination $dst -Recurse -Force
```

Claude Code 调用：

```text
/parsed-chip-datasheet
```

## 典型输入

- 已解析 datasheet bundle 根目录。
- 查询问题，例如 pinout、I2C/SPI 命令、寄存器、时序、电气参数或封装。
- 必要时提供原 PDF 或图片用于核验。

## 典型输出

- 带页码、章节或图片引用的紧凑答案。
- 关键事实的提取证据。
- OCR、表格或图片不确定性说明。

## 推荐使用流程

- 先阅读 `SKILL.md`。
- 先搜索 `full.md` 和 content JSON，不整篇加载。
- 用 `scripts/query_bundle.mjs` 获取紧凑命中。
- 关键表格、时序图、pinout 和电气限制要回看 PDF 或图片。

## 常用命令

```bash
node <skill-dir>/scripts/query_bundle.mjs <bundle-root> "Page Write"
node <skill-dir>/scripts/query_bundle.mjs <bundle-root> "WP Pin Status" --json
```

## 安全与证据边界

- 不要只依赖 OCR 文本判断高风险驱动参数。
- 页码按 `page_idx + 1` 报告。
- 解析质量差时回退到原 PDF，并说明不确定性。

## 故障排查

- 如果 Codex 没有发现 skill，确认 `%USERPROFILE%\.codex\skills\parsed-chip-datasheet\SKILL.md` 存在，然后重启会话。
- 如果 Claude Code 没有发现 skill，确认 `%USERPROFILE%\.claude\skills\parsed-chip-datasheet\SKILL.md` 或 `.claude\skills\parsed-chip-datasheet\SKILL.md` 存在，然后重启会话。
- 如果查询脚本不可用，确认 Node.js 已安装，并从 bundle 根目录执行命令。
