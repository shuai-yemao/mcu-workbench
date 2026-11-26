# Vendor Minimal Firmware Skill

## 这个 Skill 做什么

这个 skill 用来把芯片厂商官方例程、SDK demo、EVT 工程裁剪成一个最小可编译固件工程。

核心原则：

- 只基于厂商官方工程和源码复制/裁剪
- 保留厂商目录风格、工程设置、启动文件、链接/内存配置
- 只删除无关外设示例、测试逻辑、业务功能
- 不重新设计工程架构，不迁移构建系统，不手写 startup/linker

它适合这类请求：

- 基于官方例程生成某个 MCU 的最小工程
- 从厂商 SDK 裁一个空框架
- 保留 Keil/IAR/Make/CMake 等原工程风格，只做最小化
- 修复裁剪后工程打不开、编不过、include 路径不对等问题

不适合这类请求：

- 从零设计一个新固件架构
- 把 Keil 工程迁移成 CMake
- 写外设驱动或业务功能
- 自己猜寄存器初始化
- 替代厂商 startup、链接脚本、芯片头文件

## 目录结构

```text
vendor-minimal-firmware/
  SKILL.md                    # Codex/OpenAI Skills 主入口
  README.zh-CN.md             # 中文说明
  agents/openai.yaml          # Codex/OpenAI UI 元数据
  references/checklist.md     # 详细裁剪与验收清单
```

项目根目录还提供了 Claude Code 项目级入口：

```text
.claude/skills/vendor-minimal-firmware/SKILL.md
```

这个 Claude Code 入口会指向 `skills/vendor-minimal-firmware/SKILL.md`，避免维护两份不同规则。

## Codex 使用方式

当前工程内可直接显式调用：

```text
Use $vendor-minimal-firmware to create a minimal MCU firmware project from vendor examples.
```

如果要让 Codex 全局自动发现，可以把整个目录复制到：

```text
%USERPROFILE%\.codex\skills\vendor-minimal-firmware
```

或你的 `CODEX_HOME/skills` 目录。

## Claude Code 使用方式

Claude Code 项目级 skill 放在：

```text
.claude/skills/vendor-minimal-firmware/SKILL.md
```

在 Claude Code 中可以这样调用：

```text
Use the vendor-minimal-firmware skill to create a minimal firmware project from the vendor SDK examples.
```

如果要全局使用，可按 Claude Code 的用户级 skill 目录规则复制到用户级 skills 目录。

## 使用时应提供的信息

尽量提供：

- 目标芯片型号
- 厂商 docs/SDK/EVT 路径
- 原始例程库类型，如果知道
- IDE 或构建系统，如果知道
- 期望输出目录名
- 是否必须保留某些文件或目录风格

## 交付结果应包含

- 全套源码与工程文件说明
- 环境依赖和软件搭建编译环境说明
- 如何编译说明
- 来源工程说明
- 删除/裁剪内容说明
- 芯片适配说明
- 编译或静态验证结果
