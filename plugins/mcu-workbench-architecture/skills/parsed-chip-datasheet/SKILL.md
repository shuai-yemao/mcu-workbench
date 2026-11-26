---
name: parsed-chip-datasheet
description: >-
  高效回答已解析芯片 datasheet bundle 中的问题；bundle 通常包含原始 PDF、提取出的 Markdown、JSON layout/content 文件和图片。用于 agent
  需要从包含 full.md、layout.json、*_content_list.json、*_content_list_v2.json、*_model.json、images/、*_origin.pdf 等文件的目录中定位芯片手册细节，例如 pinout、I2C/SPI
  命令、寄存器表、时序、电气限制、存储组织、封装图或驱动相关事实。兼容 Codex skills 和 Claude Code skills。
---

# Parsed Chip Datasheet

使用此 skill 在处理已解析芯片 datasheet bundle 时减少上下文占用。将提取文件视为索引，将原始 PDF/图片视为核验来源。

在 Codex 中显式调用 `$parsed-chip-datasheet`，在 Claude Code 中显式调用 `/parsed-chip-datasheet`。

## Agent 兼容性

Codex 和 Claude Code 使用同一个 skill 文件夹。保持文件夹名为 `parsed-chip-datasheet`，并保持此 `SKILL.md` 作为入口。

- Codex 调用：`$parsed-chip-datasheet`
- Claude Code 调用：`/parsed-chip-datasheet`
- Codex 个人安装路径：`%USERPROFILE%\.codex\skills\parsed-chip-datasheet` 或 `~/.codex/skills/parsed-chip-datasheet`
- Claude Code 个人安装路径：`%USERPROFILE%\.claude\skills\parsed-chip-datasheet` 或 `~/.claude/skills/parsed-chip-datasheet`
- 项目局部 Claude Code 安装路径：`.claude/skills/parsed-chip-datasheet`

安装、打包、共享或向另一个 AI agent 解释用法时，阅读 `README.md`。

## 资源

- `README.md`：Codex 和 Claude Code 安装、调用示例、典型输入/输出、工作流和证据边界。
- `INSTALL.md`：复制/安装命令示例。

## 核心工作流

1. 确认 bundle 根目录。它通常包含 `full.md`、`images/`、一个 `*_origin.pdf`、`layout.json` 和 content JSON 文件。
2. 先搜索再阅读。优先使用 `rg`，不要直接打开整个文件。先查 `full.md` 和 `*_content_list.json`。
3. 使用 `scripts/query_bundle.mjs` 获取紧凑的搜索命中：

```bash
node <skill-dir>/scripts/query_bundle.mjs <bundle-root> "query words"
```

4. 只阅读回答所需的附近 Markdown 行或 JSON 对象。
5. 对 pinout、时序图、封装尺寸、状态机、命令序列、表格和电气限制，需对照原始 PDF 或相关 `images/*.jpg` 核验。
6. 当 JSON 使用从 0 开始的 `page_idx` 时，报告页码用 `page_idx + 1`。
7. 当文本包含 OCR/编码异常、畸形表格、缺失单位或含糊的图引用时，说明提取不确定性。

## 文件角色

- `full.md`：第一轮人类可读文本和图片引用。最适合关键词搜索和局部上下文。
- `*_content_list.json`：扁平块索引。最适合页码查找、`bbox` 和低 token 文本片段。
- `*_content_list_v2.json`：按页分组的结构化内容。最适合章节/表格/列表关系。
- `layout.json`：空间布局图。最适合关联标题、表格、图和附近文本。
- `*_model.json`：低层提取细节。仅当其他 JSON 文件不足时使用。
- `images/`：提取出的图/表。用于目视确认 pinout、时序和封装。
- `*_origin.pdf`：关键技术事实的最终权威来源。

## 回答纪律

- 对高风险驱动参数，绝不要只依赖 OCR 文本。
- 优先提供简洁证据：章节/小节、页码、准确参数和相关注意事项。
- 如果用户请求实现指导，先核验寻址、事务顺序、页边界、ACK/NACK 行为、时序和保护引脚，再将 datasheet 事实转换为驱动步骤。
- 如果 bundle 缺少解析文件或解析质量很差，退回直接读取 PDF，并说明解析索引不可靠。

## 高效搜索模式

- Addressing：`address`、`device address`、`slave address`、`A0`、`A1`、`A2`
- Memory：`organization`、`page`、`word address`、`roll-over`
- Bus protocol：`write operation`、`read operation`、`random read`、`sequential read`、`acknowledge`
- Protection：`write protect`、`WP`、`protected`
- Timing/electrical：`AC characteristics`、`DC characteristics`、`tWR`、`VCC`、`clock`
- Packaging：`package`、`pin configuration`、`pinouts`、`dimensions`

## 使用辅助脚本

辅助脚本会从 `full.md`、JSON 文本块和附近图片引用中打印紧凑命中，不会加载整个 bundle。

示例：

```bash
node C:\Users\Admin\.codex\skills\parsed-chip-datasheet\scripts\query_bundle.mjs . "Page Write"
node C:\Users\Admin\.codex\skills\parsed-chip-datasheet\scripts\query_bundle.mjs . "Random Read"
node C:\Users\Admin\.codex\skills\parsed-chip-datasheet\scripts\query_bundle.mjs . "WP Pin Status"
```

当另一个脚本需要消费结果时，使用 `--json`：

```bash
node <skill-dir>\scripts\query_bundle.mjs <bundle-root> "query" --json
```
