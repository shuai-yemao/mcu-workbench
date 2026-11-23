# embedded-change-report 使用说明

`embedded-change-report` 用于为嵌入式固件、单片机、RTOS、BSP、外设驱动、通信协议、硬件验证或版本发布生成规范的工程变更报告。

核心原则是：先收集证据，再写报告；能自动发现的写成事实，只能判断的标成工程推断，需要工程师确认的标成待用户确认。

## 用途

- 嵌入式项目变更报告
- 固件发布变更报告
- 缺陷修复报告
- 代码评审用变更说明
- branch / commit 影响分析
- 上板验证记录整理
- 交付归档报告

## 2. 信息来源分层

| 类型 | 含义 |
| --- | --- |
| 自动发现 | 从 Git、工程文件、构建日志、测试日志、map/ELF、串口/CAN/Modbus 日志中直接提取 |
| 工程推断 | 基于文件路径、模块名称、代码结构和嵌入式经验判断 |
| 用户确认 / 待用户确认 | 需求背景、根因接受、上板验证、客户影响、发布批准等必须由工程师确认的信息 |

报告中不能把 `工程推断` 或 `待用户确认` 写成已验证事实。

## 安装到 Codex

### 个人级安装

将整个 skill 目录复制到 Codex 的个人 skills 目录：

```powershell
Copy-Item -LiteralPath 'N:\AI\embedded_skill\embedded-change-report' `
  -Destination "$env:USERPROFILE\.codex\skills\embedded-change-report" `
  -Recurse -Force
```

安装后目录应类似：

```text
C:\Users\<you>\.codex\skills\embedded-change-report\
  SKILL.md
  README.md
  agents\openai.yaml
  scripts\
  references\
  assets\
```

如果当前 Codex 会话没有自动识别新 skill，重启 Codex 会话后再使用。

### 未安装时的临时使用

也可以不安装，直接在请求中指定路径：

```text
使用 N:\AI\embedded_skill\embedded-change-report 这个 skill，根据当前工程的 git diff 生成一份嵌入式项目变更报告。缺少的构建、上板、测试证据请标成“未提供/待用户确认”。
```

## 安装到 Claude Code

Claude Code 支持个人级和项目级 skills。

### 个人级安装

将整个 skill 目录复制到：

```text
%USERPROFILE%\.claude\skills\embedded-change-report
```

PowerShell 示例：

```powershell
New-Item -ItemType Directory -Force "$env:USERPROFILE\.claude\skills" | Out-Null
Copy-Item -LiteralPath 'N:\AI\embedded_skill\embedded-change-report' `
  -Destination "$env:USERPROFILE\.claude\skills\embedded-change-report" `
  -Recurse -Force
```

安装后可在 Claude Code 中调用：

```text
/embedded-change-report 根据当前 git diff 生成嵌入式变更报告
```

### 项目级安装

进入目标工程根目录后执行：

```powershell
New-Item -ItemType Directory -Force '.claude\skills' | Out-Null
Copy-Item -LiteralPath 'N:\AI\embedded_skill\embedded-change-report' `
  -Destination '.claude\skills\embedded-change-report' `
  -Recurse -Force
```

项目内目录应类似：

```text
<project-root>\.claude\skills\embedded-change-report\
  SKILL.md
  README.md
  scripts\
  references\
  assets\
```

然后在该项目中启动 Claude Code：

```text
/embedded-change-report 生成本次固件修改的评审用变更报告
```

如果 Claude Code 没有识别新 skill，请重启 Claude Code。

## 推荐使用流程

在目标嵌入式工程根目录，先采集证据：

```powershell
python N:\AI\embedded_skill\embedded-change-report\scripts\collect_change_context.py `
  --output change-context.json
```

带构建日志：

```powershell
python N:\AI\embedded_skill\embedded-change-report\scripts\collect_change_context.py `
  --build-log MDK-ARM\build.log `
  --output change-context.json
```

指定 commit / branch 范围：

```powershell
python N:\AI\embedded_skill\embedded-change-report\scripts\collect_change_context.py `
  --base main `
  --head HEAD `
  --build-log build.log `
  --output change-context.json
```

然后让 Codex 或 Claude Code 基于证据生成报告：

```text
使用 embedded-change-report，根据 change-context.json 和当前工程生成一份嵌入式项目变更报告。报告用于代码评审，请突出高风险文件、外设驱动、中断、RTOS、通信协议和未验证项。
```

## 典型输入

```text
使用 embedded-change-report 生成变更报告。
项目路径：
报告类型：评审 / 发布 / 缺陷修复 / 交付
变更范围：当前 diff / main..HEAD / commitA..commitB
项目名称：
MCU / SoC：
目标板 / 硬件版本：
构建日志：
测试日志：
串口日志：
CAN / Modbus / VISA 日志：
map / ELF / 内存报告：
背景说明：
报告语言：中文 / 英文
```

缺少的信息可以留空。skill 会把缺失项标成 `未提供`、`未验证` 或 `待用户确认`。

## 7. 常用示例

### 当前 diff 评审报告

```text
使用 embedded-change-report，根据当前 git diff 生成一份嵌入式项目变更报告。缺少的构建、测试和上板证据请明确标成待用户确认。
```

### Keil 工程缺陷修复报告

```text
使用 embedded-change-report 生成缺陷修复变更报告。
项目：AI3
MCU：STM32F407
工具链：Keil MDK
变更范围：当前工作区修改
构建日志：MDK-ARM\build.log
背景：修复 CAN 接收丢帧问题
重点分析：CAN 驱动、中断、DMA、协议兼容性、上板验证缺口
```

### 固件发布报告

```text
/embedded-change-report 根据 main..release/v1.2.0 生成固件发布变更报告。
目标硬件：xxx
构建日志：build\release.log
串口日志：logs\serial_release_test.log
CAN 日志：logs\can_test.log
缺少的发布批准、客户影响和风险接受项请列为待用户确认。
```

### 只有补丁或文件，没有 Git

```text
使用 embedded-change-report，根据我提供的 patch 和构建日志生成变更报告。没有 Git 证据时，请不要声称这是完整变更范围。
```

## 典型输出

默认报告包含：

- 信息来源分层
- 基本信息
- 变更背景
- 变更范围
- 关键实现说明
- 嵌入式影响分析
- 验证记录
- 风险与回滚
- 结论和后续动作

对于高风险变更，会重点提示：

- 启动文件 / 链接脚本 / Flash 布局
- BSP / 外设驱动
- 中断 / DMA / RTOS 调度
- 通信协议兼容性
- Flash / RAM / 栈 / 堆
- 持久化参数和生产配置
- 上板验证和回滚风险

## 安全与证据边界

- 不要把 `git diff` 为空直接理解为“无变更”；脚本会检查 `ok`、未跟踪文件和错误信息。
- 不要把构建日志里的 `0 errors` 自动理解为构建成功；如果同时有失败线索，脚本会标成 `ambiguous`。
- 串口、CAN、Modbus、客户现场日志可能包含敏感信息。脚本会做基础脱敏，但对外发布前仍需人工复核。
- 没有上板日志或用户确认时，报告不能写“硬件验证通过”。
- 没有内存阈值时，报告只能记录 Flash/RAM 用量或变化，不能判断“内存满足发布要求”。
- 发布批准、客户影响、风险接受、根因关闭结论必须由负责人确认。

## 10. LLM 使用提示

当 LLM 使用此 skill 时，优先执行：

1. 阅读 `SKILL.md`，确认流程和输出规则。
2. 如果用户询问安装或调用方式，阅读本 `README.md`。
3. 如果用户要求生成报告，先运行或请求运行 `scripts/collect_change_context.py`。
4. 根据报告类型选择 `assets/` 下的模板。
5. 根据风险和证据情况读取 `references/` 下的对应规则。
6. 输出报告时严格区分 `自动发现`、`工程推断`、`用户确认 / 待用户确认`。

不要跳过 `ok`、`status`、`warnings`、`evidence_gaps` 字段检查。

## 故障排查

### Codex 没有自动使用 skill

- 确认目录中存在 `%USERPROFILE%\.codex\skills\embedded-change-report\SKILL.md`
- 重启当前 Codex 会话
- 或在提示词中显式写出 skill 路径

### Claude Code 没有显示 `/embedded-change-report`

- 确认目录中存在 `%USERPROFILE%\.claude\skills\embedded-change-report\SKILL.md`
- 项目级安装时确认当前项目有 `.claude\skills\embedded-change-report\SKILL.md`
- 重启 Claude Code
- 确认 `SKILL.md` 文件存在且 YAML frontmatter 有 `description`

### 脚本提示不是 Git 仓库

在工程根目录运行脚本，或用 `--project-root` 指定工程根目录：

```powershell
python N:\AI\embedded_skill\embedded-change-report\scripts\collect_change_context.py `
  --project-root E:\your\firmware\project `
  --output change-context.json
```

### 构建状态是 `ambiguous`

说明日志里同时出现成功和失败线索。报告中应写“构建日志需人工复核”，不能写“编译通过”。

## 常用命令

```bash
python <skill-dir>/scripts/collect_change_context.py --output change-context.json
```
