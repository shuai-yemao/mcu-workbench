# PRD 转硬件方案

把 PRD 转换成硬件方案文档的 skill。适合智能硬件、IoT、嵌入式设备、USB 外设、无线音频、传感器、键盘、可穿戴和 FOC/电机控制板等产品。

本目录就是可直接安装的 skill 包，根目录必须保留 `SKILL.md`。`README.md` 只给人类维护者使用；真正被 Codex 和 Claude Code 执行的是 `SKILL.md` 和 `references/`。

## 适用边界

- 产出硬件架构、候选器件对比、采购证据、价格评估、接口规划、电源预算、BOM 估算、PCB/结构约束、风险和验证计划。
- 必须先做候选方案方向对比，并暂停等待用户确认方向。
- 用户确认方向后，才输出最终单文件硬件方案。
- 器件型号、价格、库存、采购链接、认证和供应商信息必须来自当前可查证来源。

## 目录结构

```text
prd-to-hardware-solution/
  SKILL.md
  README.md
  agents/openai.yaml
  references/
    workflow.md
    output-template.md
    evidence-rules.md
    category-checklists.md
```

## 输出文件

默认写入：

```text
docs/hardware/[product]-hardware-solution.md
```

最终文档应是一个 Markdown 文件，包含候选方向比较、用户确认的方向、器件证据、价格与库存日期、BOM 估算、风险和验证计划。

## 安装到 Codex

个人 skill 路径：

```text
%USERPROFILE%\.codex\skills\prd-to-hardware-solution
```

PowerShell 安装或更新：

```powershell
$src = 'N:\AI\embedded_skill\prd-to-hardware-solution'
$dst = "$env:USERPROFILE\.codex\skills\prd-to-hardware-solution"
New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
Copy-Item -LiteralPath $src\* -Destination $dst -Recurse -Force
```

示例：

```text
$prd-to-hardware-solution docs/prd/foc-driver-prd.md 先比较成熟均衡量产方案、国产低成本方案、快速 EVT 打样方案，等待我确认后再生成最终硬件方案。
```

## 安装到 Claude Code

个人 skill 路径：

```text
%USERPROFILE%\.claude\skills\prd-to-hardware-solution
```

项目内路径：

```text
<project-root>\.claude\skills\prd-to-hardware-solution
```

PowerShell 个人安装或更新：

```powershell
$src = 'N:\AI\embedded_skill\prd-to-hardware-solution'
$dst = "$env:USERPROFILE\.claude\skills\prd-to-hardware-solution"
New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
Copy-Item -LiteralPath $src\* -Destination $dst -Recurse -Force
```

示例：

```text
使用 $prd-to-hardware-solution 处理 docs/prd/foc-driver-prd.md。先调研当前器件和采购证据，暂停等待方案方向确认，再写入最终单文件硬件方案。
```

## 维护检查

```powershell
$env:PYTHONUTF8='1'
python C:\Users\kemp\.codex\skills\.system\skill-creator\scripts\quick_validate.py `
  N:\AI\embedded_skill\prd-to-hardware-solution
```

检查要点：

- `SKILL.md` 保持两阶段流程和暂停规则。
- `references/evidence-rules.md` 维护查证规则。
- `references/category-checklists.md` 维护产品类别器件清单。
- `references/output-template.md` 维护最终单文件结构。
- 修改后同步到 `.codex\skills` 和 `.claude\skills`。

## 故障排查

- agent 直接输出最终方案：检查 `SKILL.md` 中的 pause rules 是否仍在。
- 器件价格或库存无来源：要求重新联网查证，或标注 `未找到可靠来源`。
- 输出拆成多个文件：提醒最终只允许一个 `docs/hardware/[product]-hardware-solution.md` 文件。
