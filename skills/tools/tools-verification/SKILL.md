---
name: tools-verification
description: 负责嵌入式项目级验证：链接 Map 文件、Flash/RAM/ROM/栈占用分析、Unity/Fake 主机测试、测试矩阵和静态/构建/目标板证据编排。代码注释、格式、Cppcheck、MISRA 和代码审查交给 tools-quality。
---

# 项目验证工具

## 职责

统一编排代码质量门禁之外的项目级验证，覆盖：

- 链接产物的 Map、Flash/ROM、RAM、栈、堆和段布局分析；
- Unity/Fake/Mock 主机测试、错误注入、边界条件和回归矩阵；
- 项目分层、依赖方向、生成切片和架构基线的验证入口；
- 静态检查、主机测试、交叉编译、烧录、目标板运行、串口/RTT 和硬件测量的证据分级；
- 工程级验证命令、基线差异、产物路径、哈希、退出码和阻塞项的可复现记录。

## 路由边界

本 Skill 不执行代码注释、格式、公开 API Doxygen、Cppcheck、MISRA 或代码审查规则；这些统一交给 [`tools-quality`](../tools-quality/SKILL.md)。本 Skill 也不替代 `tools-build`、`tools-flash`、`tools-debug` 和 `tools-observability` 的专业操作，而是消费它们的证据并形成项目验证结论。

不能把 Map 解析、主机测试、交叉编译或静态检查表述为目标板运行或实物验证。每项结论必须标注 `static`、`host`、`cross-build`、`target-runtime`、`measurement` 等证据等级。

## 输入

开始前声明：固件工程绝对根目录、工具链/测试仓库绝对根目录、分支/提交、验证目标、Map/ELF/HEX/BIN 产物、Unity/Fake 入口、架构/分层校验入口、目标板和观测通道。缺少关键入口时标记 `unverified` 或阻塞，不自行创建未确认的测试命令。

## 执行流程

### 1. 产物与内存验证

确认 ELF、Map 和尺寸工具来自同一次构建，记录产物绝对路径和 SHA-256。分析 Flash/ROM、RAM、`.data`、`.bss`、堆、栈、DMA/Cache 专用区域和容量余量；报告既有基线、当前值和新增差异。Map 文件缺失或不是当前构建产物时不得给出容量结论。

### 2. Unity/Fake 主机验证

根据项目真实测试入口运行 Unity/Fake/Mock 测试，覆盖正常路径、边界、错误注入、资源耗尽、超时、重试、状态恢复和并发约束。记录测试文件、用例、命令、绝对 `cwd`、工具版本、退出码和未覆盖项。主机测试只证明可模拟逻辑，不证明真实寄存器、时序或电气行为。

### 3. 分层证据闭环

按需要组合：主机测试验证协议和错误逻辑；交叉编译验证目标配置下的编译和链接；目标板串口/RTT 验证真实运行；逻辑分析仪/DWT 验证时序、IRQ、DMA 和耗时。任一层通过都不能自动证明其他层通过。

### 4. 架构与工程门禁

在项目已有入口可复现时运行 `npm run validate:architecture -- --root <firmware-root>`、`npm run validate:layer -- --root <firmware-root> --core <core> --device-type <type> --device <device>` 或等效工程检查。按 `App → Service → Platform 接口 ← Impl → Vendor` 核对依赖方向、生成文件边界、BSP Driver/Handle/Port、OSAL/RTOS 隔离和既有架构基线；报告基线数、当前数和新增差异。无参数的层级检查不能替代目标切片校验。

### 5. 结果与阻塞

输出测试矩阵、Map/内存表、命令证据、产物哈希、基线差异、失败复现、未验证项和阻塞原因。若 Spec 缺少关键决定、验证入口与要求矛盾或证据等级不足，停止并交回上游，不自行扩大范围。

## 固定输出

- 验证范围和目标环境；
- Map/Flash/RAM/ROM/栈分析表及产物证据；
- Unity/Fake 测试矩阵及主机结果；
- 构建、目标运行和硬件测量证据的分级记录；
- 架构/分层门禁、基线数量和新增差异；
- 基线数、当前数、新增差异、未验证项和 `通过`/`阻塞` 结论。

## 参考资料

- [`capability-index.md`](references/capability-index.md)
- [`quality-map-analysis`](../tools-quality/references/capabilities/quality-map-analysis/GUIDE.md)
- [`quality-unity-testing`](../tools-quality/references/quality-unity-testing/GUIDE.md)
- [`upstream-source-baseline.md`](../tools-quality/references/upstream-source-baseline.md)
