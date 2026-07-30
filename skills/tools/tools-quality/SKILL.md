---
name: tools-quality
description: 负责嵌入式代码审查、Map 分析、静态分析、MISRA 和 Unity 测试；当用户要求质量门禁、内存占用分析或单元测试时使用。
---

# 质量与验证工具

## 职责

统一处理代码审查、编译产物分析、静态规则、内存占用和目标无关的 Unity 测试。先声明检查范围、基线和输出格式，再选择工具变体。

## 变体

代码审查、Map 分析、静态分析、格式检查和 Unity 的原始资料分别保留在 `references/quality-*` 或 `references/capabilities/*/GUIDE.md` 下；需要脚本时使用对应命名空间中的脚本。

Unity 源码版本和测试证据见 [`upstream-source-baseline.md`](references/upstream-source-baseline.md)。
AI 生成代码审查、嵌入式 C 编码规范与 clang-format 基线由本 Skill 统一承接。
其余质量工具的完整资料见 [`capability-index.md`](references/capability-index.md)。

## 输出

输出可复现命令、问题等级、证据文件、基线差异和修复后的回归结果。构建产物由 [`tools-build`](../tools-build/SKILL.md) 提供，发布验证交接 [`tools-release`](../tools-release/SKILL.md)。

## 多仓库执行规则

质量工具所在仓库与固件仓库可能不同。运行记录必须声明两个绝对根目录，并为每条命令记录绝对 `cwd`；质量命令在工具仓库执行，格式、主机测试和固件构建在固件仓库执行。相对路径解析失败属于流程错误，必须纠正命令上下文后再判断代码质量。

## 软件分层门禁

先运行 `npm run validate:architecture -- --root <firmware-root>`，再运行相关主机 Fake 测试和目标固件构建。门禁按目录角色检查 BSP Driver/Port、Core 公共头、BSP/OS Wrapper 与原生 RTOS 边界，不绑定具体 MCU 或传感器名称。静态门禁不替代目标运行、观测通道和实物验收。

当架构扫描包含已登记基线问题时，退出码非零必须同时报告基线数量、当前数量和新增差异；只有“零新增”才能称为本阶段通过，不能把非零退出码直接改写成全量通过。

对生成外设切片，先执行 `npm run validate:layer -- --root <firmware-root> --core <core> --device-type <type> --device <device>`，再执行 `validate:architecture`、格式检查与主机 Fake 测试。`validate:layer` 只检查该命令参数定位的生成文件，不审计用户工程的其他自定义代码；它检查 Core 公开头泄漏、Wrapper 依赖、Port 单一公开注册函数、Handle ISR 延后与注释分区。
