# MRD 转 PRD

把 MRD、市场分析、产品机会文档或业务需求草稿转换成中文 PRD 的 skill。适合从 `market-mrd-analyst` 的输出继续下钻到可评审、可交付的产品需求。

本目录就是可直接安装的 skill 包，根目录必须保留 `SKILL.md`。`README.md` 只给人类维护者使用；真正被 Codex 和 Claude Code 执行的是 `SKILL.md` 和 `references/`。

## 适用边界

- 产出 MVP 版、完整版、研发交付版 PRD。
- 支持软件、AI 产品、智能硬件、IoT、嵌入式和软硬结合产品。
- 对智能硬件会补充硬件、固件、生产、认证、质量和售后要求。
- 不做详细器件选型、BOM、采购链接或硬件架构；这些交给 `prd-to-hardware-solution`。

## 目录结构

```text
mrd-to-prd/
  SKILL.md
  README.md
  agents/openai.yaml
  references/
    mapping-rules.md
    mrd-checklist.md
    prd-templates.md
    smart-hardware-prd.md
```

## 输出文件

默认写入：

```text
docs/prd/<slug>-prd.md
```

`<slug>` 优先来自源 MRD 文件名或产品名。用户指定输出路径时，以用户路径为准。

## 安装到 Codex

个人 skill 路径：

```text
%USERPROFILE%\.codex\skills\mrd-to-prd
```

PowerShell 安装或更新：

```powershell
$src = 'N:\AI\embedded_skill\mrd-to-prd'
$dst = "$env:USERPROFILE\.codex\skills\mrd-to-prd"
New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
Copy-Item -LiteralPath $src\* -Destination $dst -Recurse -Force
```

示例：

```text
$mrd-to-prd docs/mrd/foc-driver-mrd.md 生成一份中文研发交付版 PRD，默认保存到 docs/prd/<slug>-prd.md。
```

## 安装到 Claude Code

个人 skill 路径：

```text
%USERPROFILE%\.claude\skills\mrd-to-prd
```

项目内路径：

```text
<project-root>\.claude\skills\mrd-to-prd
```

PowerShell 个人安装或更新：

```powershell
$src = 'N:\AI\embedded_skill\mrd-to-prd'
$dst = "$env:USERPROFILE\.claude\skills\mrd-to-prd"
New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
Copy-Item -LiteralPath $src\* -Destination $dst -Recurse -Force
```

示例：

```text
使用 $mrd-to-prd 将 docs/mrd/foc-driver-mrd.md 转换成中文研发交付版 PRD，并保存到 docs/prd/foc-driver-prd.md。
```

## 维护检查

```powershell
$env:PYTHONUTF8='1'
python C:\Users\kemp\.codex\skills\.system\skill-creator\scripts\quick_validate.py `
  N:\AI\embedded_skill\mrd-to-prd
```

检查要点：

- `SKILL.md` 只放转换流程、澄清规则、写作规则和默认输出路径。
- `references/prd-templates.md` 维护 PRD 结构。
- `references/smart-hardware-prd.md` 维护智能硬件增补要求。
- 修改后同步到 `.codex\skills` 和 `.claude\skills`。

## 故障排查

- 输出没有落盘：确认 `SKILL.md` 中仍有 `docs/prd/<slug>-prd.md` 默认保存规则。
- PRD 变成硬件方案：提醒 agent 只写需求和验收，不做器件选型。
- 缺少硬件章节：确认输入被识别为智能硬件/IoT/嵌入式产品，并读取了 `smart-hardware-prd.md`。
