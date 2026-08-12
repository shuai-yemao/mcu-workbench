# Cppcheck 统一质量门禁 SRSys

## 1. 系统规格概述

系统边界为 `mcu-workbench` 插件的 `tools-quality` 静态分析能力。执行入口是 Cppcheck 2.21.0；MISRA addon 作为同一次 Cppcheck 扫描中的可选 checker。系统输出统一 XML、JSON、HTML 和终端报告。

本系统不直接依赖具体 MCU、板卡或 RTOS。目标固件参数通过 compile_commands.json、include、define 和后续目标 RCP 注入。

## 2. 功能需求

1. 系统必须能够执行原生 Cppcheck checker。
2. 启用 `--misra` 时，系统必须在同一次 Cppcheck 执行中加载 MISRA addon。
3. 系统必须将原生 Cppcheck 和 MISRA 结果写入同一 XML；JSON/HTML 必须基于该统一结果生成。
4. 系统必须为 MISRA 结果保存 checker 来源和等级。
5. 系统必须把未知规则标记为 `UNMAPPED`。
6. 系统必须在 Cppcheck ERROR、MISRA Mandatory/Required/UNMAPPED 或工具异常时返回非零退出码。
7. 系统不得因 MISRA 结果的 Cppcheck severity 为 `style` 而放行 Required 规则。
8. 系统应对 Advisory 结果生成报告，但返回零退出码。
9. 请求 HTML 导出时，HTML 工具缺失、执行失败或 `index.html` 为空必须返回非零退出码。

## 3. 非功能需求

- 可复现：工具版本、addon 路径、Python 解释器和元数据映射 SHA-256 必须可记录；上游正文刷新时记录固定提交或下载快照。
- 可审计：每次结果包含报告路径、扫描目录、工具版本和门禁结论。
- 安全：不能以缺失元数据、扫描超时、addon 失败或空报告伪装成功。
- 可维护：原生 Cppcheck 与 MISRA 的结果格式统一，避免维护两套解析路径。
- 架构：质量规则继续由 `tools-quality` canonical Skill 承担。
- 工程代码约束：保留所有指针判空、返回值检查、禁止动态内存、栈余量 20% 和并发同步规则。

## 4. 接口需求

| 接口 | 输入 | 输出 | 失败行为 |
|---|---|---|---|
| CLI | `--src`、include、define、标准、`--misra`、baseline、export | 终端报告和可选 XML/JSON/HTML | 工具异常或阻断问题返回非零 |
| Cppcheck | 源码目录或 compile DB | 统一 XML v2 | Cppcheck 执行失败阻断 |
| MISRA addon | Cppcheck dump/扫描上下文和 addon JSON | XML 中的 `misra-*` 结果 | addon 找不到/失败阻断 |
| 元数据 | MISRA guideline ID | Mandatory/Required/Advisory/UNMAPPED | 缺失或非法时阻断 |
| baseline | 已批准问题集合 | 新增问题集合 | 不得自动扩大基线 |

## 5. 验收标准与测试方法

| ID | 证据等级 | 验收标准 | 方法/预期 |
|---|---|---|---|
| V-01 | 工具链 | Cppcheck 可执行 | `Cppcheck 2.21.0` |
| V-02 | 静态 | 脚本和元数据合法 | Python compile、JSON parse 返回 0 |
| V-03 | 主机 | 原生与 MISRA 进入同一结果 | 统一 XML 同时存在两类 ID |
| V-04 | 主机 | Cppcheck ERROR 阻断 | 退出码 1 |
| V-05 | 主机 | MISRA Required 阻断 | 即使 severity 为 style，退出码 1 |
| V-06 | 主机 | MISRA Advisory 不阻断 | 退出码 0 |
| V-07 | 主机 | MISRA UNMAPPED 阻断 | 退出码 1 |
| V-08 | 报告 | XML/JSON/HTML 生成 | 产物存在且非空 |
| V-09 | 插件 | 结构校验通过 | `pnpm run validate:plugin` 返回 0 |
| V-10 | 主机 | 回归测试通过 | `pnpm exec jest --runInBand`：45/45 suites、272/272 tests |
| V-11 | 静态 | 差异格式检查通过 | `git diff --check` 返回 0 |
| V-12 | 目标构建 | 目标固件构建通过 | 本 RCP 范围外，待目标工程补证 |
| V-13 | 目标运行/实物 | 栈、并发、ISR 和时序通过 | 本 RCP 范围外，待目标板补证 |

## 6. 交付物与未验证项

交付物为统一 Cppcheck/MISRA 脚本、MISRA 元数据、两份静态分析指南、tools-quality 路由更新、审查包和本 BRD/PRD/SRSys。

未验证项包括目标固件工程、目标工具链、compile DB、第三方库边界、交叉编译、Map/栈峰值、目标板运行和实物时序。它们不影响本插件能力交接，但不能被本审查结论覆盖。
