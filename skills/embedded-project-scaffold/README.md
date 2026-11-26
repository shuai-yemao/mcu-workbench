# embedded-project-scaffold 使用说明

## 用途

`embedded-project-scaffold` 用于基于厂商手册、SDK 示例、启动文件、链接脚本和板级约束创建最小可编译嵌入式工程。它优先生成小而可检查的 bring-up 工程，而不是完整 SDK 导入器。

## 安装到 Codex

个人安装路径：

```text
%USERPROFILE%\.codex\skills\embedded-project-scaffold
~/.codex/skills/embedded-project-scaffold
```

PowerShell 安装示例：

```powershell
$src = 'N:\AI\embedded_skill\embedded-project-scaffold'
$dst = "$env:USERPROFILE\.codex\skills\embedded-project-scaffold"
New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
Copy-Item -LiteralPath $src -Destination $dst -Recurse -Force
```

Codex 调用：

```text
$embedded-project-scaffold
```

## 安装到 Claude Code

个人安装路径：

```text
%USERPROFILE%\.claude\skills\embedded-project-scaffold
~/.claude/skills/embedded-project-scaffold
```

项目本地安装路径：

```text
.claude/skills/embedded-project-scaffold
```

PowerShell 安装示例：

```powershell
$src = 'N:\AI\embedded_skill\embedded-project-scaffold'
$dst = "$env:USERPROFILE\.claude\skills\embedded-project-scaffold"
New-Item -ItemType Directory -Force -Path (Split-Path $dst) | Out-Null
Copy-Item -LiteralPath $src -Destination $dst -Recurse -Force
```

Claude Code 调用：

```text
/embedded-project-scaffold
```

## 典型输入

- MCU、芯片或开发板型号。
- 目标功能，例如 blink、UART hello、传感器 WHOAMI、bootloader 或 RTOS demo。
- 厂商资料、SDK 示例、启动文件、链接脚本、工具链和调试器信息。

## 典型输出

- 最小项目目录。
- startup、linker、drivers、BSP、构建入口和必要脚本。
- 来源映射、构建/烧录说明、bring-up checklist 和待确认问题。

## 推荐使用流程

- 先阅读 `SKILL.md`。
- 先确认会影响芯片型号、内存布局、时钟、引脚、构建或烧录安全的信息。
- 优先裁剪官方示例，而不是凭空写 startup、linker 或 clock 代码。
- 先生成最小可验证功能，再扩展可选模块。
- 可用时运行构建或静态检查。

## 常用命令

```bash
node <skill-dir>/scripts/detect_environment.mjs
node <skill-dir>/scripts/project_inventory.mjs <source-dir>
node <skill-dir>/scripts/check_scaffold.mjs <project-dir>
```

## 安全与证据边界

- 不猜 MCU、Flash/RAM、振荡器、引脚、probe 或 boot mode。
- 不自动安装工具链、SDK、驱动或 IDE。
- 保留厂商 license header 和来源说明。

## 故障排查

- 如果 Codex 没有发现 skill，确认 `%USERPROFILE%\.codex\skills\embedded-project-scaffold\SKILL.md` 存在，然后重启会话。
- 如果 Claude Code 没有发现 skill，确认 `%USERPROFILE%\.claude\skills\embedded-project-scaffold\SKILL.md` 或 `.claude\skills\embedded-project-scaffold\SKILL.md` 存在，然后重启会话。
- 如果脚本不可用，先确认 Node.js 是否安装，并从项目根目录执行命令。
