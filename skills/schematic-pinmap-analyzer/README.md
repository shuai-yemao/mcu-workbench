# 原理图功能引脚分析 Skill

`schematic-pinmap-analyzer` 用于把嵌入式硬件原理图 PDF、图片或截图分析成软件开发可用的功能引脚文件。它适合在拿到板级原理图后，快速整理 MCU 引脚、外设连接、电平状态、驱动方式和写驱动前必须确认的业务参数。

## 适用范围

- 原理图 PDF、截图、图片、EDA 导出图
- MCU/IoT/智能硬件/工业控制/传感器板/电机控制板/BMS/数据记录仪/通信网关
- 输出电源架构、主控芯片、完整 IO 分配表、外设驱动逻辑、用户待补充事项

不适合用来做详细硬件设计、器件替代、BOM 成本、PCB 工艺、结构散热或认证分析。

## 输出内容

默认输出 5 个章节：

1. 电源架构分析：输入电源路径
2. 主控芯片分析
3. IO 分配表
4. 驱动逻辑分析
5. 用户待补充事项

IO 表固定表头：

```text
MCU引脚 | 网络名 | 外设功能 | 输入/输出 | 默认状态 | 驱动方式 | 软件配置建议
```

用户待补充事项固定表头：

```text
已连接对象 | 相关 MCU 网络 | 当前已知 | 需要补充后才能写具体驱动代码的事项 | 参考示例
```

## 安装到 Codex

个人 skills 目录：

```text
%USERPROFILE%\.codex\skills\schematic-pinmap-analyzer
```

PowerShell 安装或更新：

```powershell
$src = 'D:\work\embedded_skills\schematic-pinmap-analyzer'
$dst = "$env:USERPROFILE\.codex\skills\schematic-pinmap-analyzer"
New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
Copy-Item -LiteralPath $src\* -Destination $dst -Recurse -Force
```

重启 Codex 会话后使用：

```text
使用 $schematic-pinmap-analyzer 分析我上传的原理图 PDF，输出嵌入式开发用功能引脚文件。
```

## 安装到 Claude Code

个人 skills 目录：

```text
%USERPROFILE%\.claude\skills\schematic-pinmap-analyzer
```

也可以放到项目内：

```text
<project-root>\.claude\skills\schematic-pinmap-analyzer
```

PowerShell 个人安装或更新：

```powershell
$src = 'D:\work\embedded_skills\schematic-pinmap-analyzer'
$dst = "$env:USERPROFILE\.claude\skills\schematic-pinmap-analyzer"
New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
Copy-Item -LiteralPath $src\* -Destination $dst -Recurse -Force
```

Claude Code 中使用：

```text
使用 $schematic-pinmap-analyzer 分析这个原理图 PDF，并输出 MCU IO 分配表、驱动逻辑和用户待补充事项。
```

## 使用示例

```text
使用 $schematic-pinmap-analyzer 分析 ZY_32Function Board_V2.0_2026-03-08.pdf。
请输出电源架构、主控芯片分析、完整 IO 分配表、驱动逻辑分析和用户待补充事项。
```

```text
使用 $schematic-pinmap-analyzer 分析我上传的原理图截图。
如果网络名不可读，请标记 UNKNOWN，不要猜测；用户待补充事项只列出直接影响驱动代码编写的内容。
```

## 维护检查

关键文件：

```text
schematic-pinmap-analyzer/
  SKILL.md
  README.md
  agents/openai.yaml
  references/output-format.md
```

修改后确认：

- `SKILL.md` frontmatter 中 `name` 为 `schematic-pinmap-analyzer`
- `description` 能触发 PDF/图片原理图分析场景
- `references/output-format.md` 的表头和章节顺序与 `SKILL.md` 一致
- `agents/openai.yaml` 的中文展示文案与实际能力一致
