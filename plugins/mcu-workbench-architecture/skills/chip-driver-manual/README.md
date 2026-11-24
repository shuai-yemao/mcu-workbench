# chip-driver-manual 使用说明

## 用途

`chip-driver-manual` 用于从芯片 datasheet、reference manual、programming manual、厂商 SDK 示例、寄存器头文件和相关资料中提取驱动开发事实，避免在寄存器、命令、时序、初始化顺序上凭经验猜测。

## 安装到 Codex

个人安装路径：

```text
%USERPROFILE%\.codex\skills\chip-driver-manual
~/.codex/skills/chip-driver-manual
```

PowerShell 安装示例：

```powershell
$src = 'N:\AI\embedded_skill\chip-driver-manual'
$dst = "$env:USERPROFILE\.codex\skills\chip-driver-manual"
New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
Copy-Item -LiteralPath $src -Destination $dst -Recurse -Force
```

Codex 调用：

```text
$chip-driver-manual
```

## 安装到 Claude Code

个人安装路径：

```text
%USERPROFILE%\.claude\skills\chip-driver-manual
~/.claude/skills/chip-driver-manual
```

项目本地安装路径：

```text
.claude/skills/chip-driver-manual
```

PowerShell 安装示例：

```powershell
$src = 'N:\AI\embedded_skill\chip-driver-manual'
$dst = "$env:USERPROFILE\.claude\skills\chip-driver-manual"
New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
Copy-Item -LiteralPath $src -Destination $dst -Recurse -Force
```

Claude Code 调用：

```text
/chip-driver-manual
```

## 典型输入

- 芯片型号、板级上下文和驱动任务。
- datasheet、reference manual、errata、application note、SDK 示例、SVD、寄存器头文件或现有驱动。
- 需要确认的问题，例如总线地址、寄存器字段、命令字节、复位时序、IRQ 行为或初始化顺序。

## 典型输出

- 已确认事实摘要。
- 寄存器、命令、时序、引脚和初始化序列的结构化提取。
- 来源映射、冲突列表、开放问题和驱动检查清单。

## 推荐使用流程

- 先阅读 `SKILL.md`。
- 按文档类型读取 `references/datasheet-triage.md`。
- 生成结构化输出前读取 `references/extraction-schema.md`。
- 只加载当前芯片类别需要的 reference。
- 关键参数要用原文、SDK 或头文件交叉核验。

## 常用命令

```bash
node <skill-dir>/scripts/extract_pdf_text_node.mjs <manual.pdf> <out.txt>
node <skill-dir>/scripts/detect_document_quality.mjs <extracted.txt>
```

## 安全与证据边界

- 不编造寄存器位、命令、地址、时序或初始化步骤。
- OCR 或表格提取结果必须视为可疑，关键参数要核验。
- 保留 reserved bit、W1C、read-to-clear、write-only 等访问风险。

## 故障排查

- 如果 Codex 没有发现 skill，确认 `%USERPROFILE%\.codex\skills\chip-driver-manual\SKILL.md` 存在，然后重启会话。
- 如果 Claude Code 没有发现 skill，确认 `%USERPROFILE%\.claude\skills\chip-driver-manual\SKILL.md` 或 `.claude\skills\chip-driver-manual\SKILL.md` 存在，然后重启会话。
- 如果 PDF 提取或质量检测脚本不可用，先确认 Node.js 是否安装，并从项目根目录执行命令。
