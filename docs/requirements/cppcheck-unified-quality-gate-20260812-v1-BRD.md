# Cppcheck 统一质量门禁 BRD

## 1. 项目背景与目标

嵌入式插件需要在代码进入构建、烧录和目标验证前，统一检查 C/C++ 静态问题与 MISRA 规则。MISRA 不作为第二套独立流程，而是作为 Cppcheck 扫描中的一个 checker，与原生 Cppcheck 结果共享报告和门禁退出码。

目标是建立可复现、可审计的 `tools-quality` 质量门禁：

- 一次扫描同时执行原生 Cppcheck 和可选 MISRA checker；
- 统一输出 XML、JSON、HTML 和终端报告；
- 明确 Mandatory、Required、Advisory、UNMAPPED 的门禁行为；
- 保留指针、返回值、动态内存、栈和并发安全等工程约束；
- 明确静态/主机证据不能替代目标板和实物证据。

## 2. 工程现状

当前 `tools-quality` 已提供统一 Cppcheck 脚本、MISRA 元数据、报告导出和插件回归路径。Cppcheck 2.21.0、MISRA addon、XML/JSON/HTML 导出均已通过本机 smoke 验证；插件校验和 45 个 Jest 套件也已通过。

本 RCP 不包含目标固件工程，因此 MCU、板卡、RTOS、compile_commands.json、交叉编译产物和目标板观测均为未验证项。

## 3. 价值与非功能约束

- 统一执行入口，避免 Cppcheck 与 MISRA 结果分散造成漏判。
- 未知 MISRA 规则必须进入 `UNMAPPED` 并阻断，禁止无依据归入 Required。
- Advisory 结果必须可见、可统计，但不阻断发布门禁。
- 质量工具异常必须阻断，不能以空报告代替成功扫描。
- 质量结论必须标注证据等级，不把静态或主机测试写成目标运行结论。

## 4. 风险与依赖

- MISRA 映射内容已记录 SHA-256；上游正文刷新时仍需补录固定提交或下载快照。
- 抑制项和 baseline 的审批人、复审周期尚未在本 RCP 中指定。
- 目标固件接入需要另行提供工程路径、compile DB、工具链和目标板证据。

## 5. 价值边界

本方案保证插件质量门禁逻辑可执行，不保证任意目标固件的构建、运行、时序、栈峰值或硬件行为。目标证据必须在后续目标工程 RCP 中单独建立。
