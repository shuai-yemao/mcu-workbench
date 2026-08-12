# Cppcheck 统一质量门禁 RCP 审查包

> request_id：`cppcheck-unified-quality-gate-20260812-v1`
> 审查日期：2026-08-12
> 审查范围：`tools-quality` 的统一 Cppcheck/MISRA 静态质量门禁
> 审查状态：**已执行，可交接最终 Review**（目标固件验证保持范围外）

## 元数据与输入

| 字段 | 内容 |
|---|---|
| 项目路径与提交 | `C:\Users\zhang\Documents\mcu-workbench @ host_ai / 18e966829b3408a07227ac9decfd559c6ddab228` |
| 输入 RCP | 本轮用户确认的统一 Cppcheck 门禁决策；此前不存在独立质量门禁 RCP |
| 既有方案 | `skills/tools/tools-quality/references/capabilities/quality-static-analysis/` 下的静态分析脚本、指南和 MISRA 元数据 |
| 质量规则来源 | `skills/tools/tools-quality/SKILL.md` 及其 `references/` |
| 参与审查角色 | `embedded-lead`、`system-architect`、`firmware-engineer`、`verification-engineer`、`toolchain-engineer`、`knowledge-engineer` |
| 审查结论 | 统一 Cppcheck/MISRA 方案可交接；不宣称目标固件、交叉编译或实机通过 |

## 0. 用户决策记录

| 补证项 | 决策 | 可信等级 | 影响 |
|---|---|---|---|
| MISRA 与 Cppcheck 的关系 | MISRA 纳入 Cppcheck，MISRA 只是统一 Cppcheck checkers 的一部分 | `user-confirmed` | 一次扫描、同一 XML/JSON/HTML、同一退出码 |
| MISRA Mandatory/Required/UNMAPPED | 阻断门禁 | `user-confirmed` | 统一门禁必须将这些等级转换为失败退出码 |
| MISRA Advisory | 不阻断，仅报告 | `user-confirmed` | 进入报告和趋势统计，不改变退出码 |
| 指针判空、返回值检查、禁止动态内存 | 保持原规则，不修改 | `user-confirmed` | 继续作为独立代码审查硬约束 |
| 栈余量 | 保留 20% | `user-confirmed` | 需要 Map、HighWaterMark、峰值路径和异常路径证据 |
| 并发约束 | `volatile` 不等于原子性或线程安全；多字节、复合状态、读改写必须同步 | `user-confirmed` | 作为代码审查和并发门禁约束 |
| 分层约束 | `App → Service → Platform ← Impl → Vendor` | `user-confirmed` | 作为架构静态审查边界 |

## 1. 工程现状表

| ID | 已知事实 | 证据 | 可信等级 | 影响范围 | 待确认项或补证动作 |
|---|---|---|---|---|---|
| F-01 | `tools-quality` 是质量规则、静态分析和 MISRA 的 canonical 来源 | `skills/tools/tools-quality/SKILL.md:3,14,80` | `confirmed` | 规则路由 | 无 |
| F-02 | MISRA 是统一 Cppcheck 扫描中的可选 checker | `skills/tools/tools-quality/references/quality-static-analysis/GUIDE.md:95-111` | `confirmed` | 扫描流程 | 无 |
| F-03 | 原生 Cppcheck 与 MISRA 结果进入同一 XML | `static_analysis.py:154-193`；端到端 smoke XML 中同时存在 `arrayIndexOutOfBounds` 与 `misra-c2012-*` | `confirmed` | 报告和门禁 | 无 |
| F-04 | 结果对象区分 `Cppcheck`/`MISRA`，MISRA 结果保存等级 | `static_analysis.py:253-263` | `confirmed` | 结果解析 | 无 |
| F-05 | Cppcheck ERROR、MISRA Mandatory/Required/UNMAPPED 会阻断；Advisory 不阻断 | `static_analysis.py:304-332,388-396`；合成门禁测试 | `confirmed` | 退出码 | 无 |
| F-06 | MISRA 元数据覆盖 175 条规则/指令映射，映射内容 SHA-256 已记录 | `misra-rule-metadata.json`；JSON 解析结果 `guidelines=175`；`mapping_sha256=d26867538994234e70defe695f85378d6faa12caddc32fd7eb3e72fb056c5367` | `confirmed` | 规则分级 | 上游正文来源仍需在刷新时记录提交 |
| F-07 | Cppcheck 工具环境可执行，MISRA addon 版本已固定 | `C:\Program Files\Cppcheck\cppcheck.exe --version` → `Cppcheck 2.21.0`；`misra-rule-metadata.json:cppcheck_addon_revision=e73bf44c3e49686b7495fab352d03a6c6075516b` | `confirmed` | 本机执行 | CI 环境需单独配置 |
| F-08 | HTML/JSON/XML 可生成；HTML 产物缺失会阻断 | `C:\Users\zhang\.local\mcu-quality-tools\smoke-test\wrapper-html\index.html`、`wrapper.json`、`unified-after-change.xml`；`static_analysis.py:413-441` | `confirmed` | 报告交付 | 无 |
| F-09 | 插件校验和主机回归通过 | `C:\Users\zhang\Documents\mcu-workbench`：`pnpm run validate:plugin`；`pnpm exec jest --runInBand` | `confirmed` | 插件质量 | 无 |
| F-10 | 目标固件路径、MCU、板卡、RTOS、compile_commands.json 未在本 RCP 中指定 | 本轮没有目标固件工程输入 | `unverified` | 目标扫描/构建 | 目标工程接入时补充独立 RCP |
| F-11 | 目标交叉编译、烧录、RTT/串口和实机行为未验证 | 当前证据仅为静态/主机/工具链 smoke | `unverified` | 目标验收 | 不得写成通过 |

## 2. 文件施工清单

| ID | 动作 | 文件或目录 | 所属层 | 施工内容与理由 | 生成覆盖 | 前置事实 | 责任 Agent | 状态 |
|---|---|---|---|---|---|---|---|---|
| W-01 | 修改 | `skills/tools/tools-quality/references/capabilities/quality-static-analysis/static_analysis.py` | Tools | 统一解析 Cppcheck/MISRA 来源、映射等级并计算退出码 | 否 | F-02~F-05 | `firmware-engineer` | ready |
| W-02 | 新增 | `skills/tools/tools-quality/references/capabilities/quality-static-analysis/misra-rule-metadata.json` | Tools | 保存完整规则元数据；未知规则只能 `UNMAPPED` | 否 | F-06 | `knowledge-engineer` | ready |
| W-03 | 修改 | `skills/tools/tools-quality/references/quality-static-analysis/GUIDE.md` | Tools | 说明 MISRA 属于统一 Cppcheck checker 和阻断策略 | 否 | F-02、F-05 | `knowledge-engineer` | ready |
| W-04 | 修改 | `skills/tools/tools-quality/references/capabilities/quality-static-analysis/GUIDE.md` | Tools | 同步 capability 级使用、错误处理和报告规则 | 否 | F-02、F-05 | `knowledge-engineer` | ready |
| W-05 | 修改 | `skills/tools/tools-quality/SKILL.md` | Tools | 将静态分析路由表述为统一 Cppcheck（可选 MISRA checker） | 否 | F-01、F-02 | `system-architect` | ready |
| W-06 | 不建议动 | 用户未提交的 `lib/generator.js`、`scripts/validate-layer-contract.js`、`tests/generator.test.js` | 其他 | 与本 RCP 无关，保护用户已有修改 | 否 | 工作区状态 | `embedded-lead` | excluded |
| W-07 | 后续新增 | 目标固件 CI/工程配置 | Firmware/CI | 目标工程接入时提供 compile DB、include、define、第三方库边界和产物路径 | 不确定 | F-10 | `toolchain-engineer` | blocked-out-of-scope |

## 3. 代码生成与执行约束清单

| ID | 约束类别 | 已确认约束 | 证据 | 禁止事项 | 未决项 | 状态 |
|---|---|---|---|---|---|---|
| G-01 | 执行模型 | 一次 Cppcheck 扫描同时运行原生 checker 和可选 MISRA checker | F-02、F-03 | 禁止把 MISRA 拆成第二套独立门禁 | 无 | ready |
| G-02 | 报告模型 | 所有结果进入统一 XML/JSON/HTML；结果保留 checker 来源 | F-03、F-04 | 禁止只看 Cppcheck severity 而忽略 MISRA 等级 | 无 | ready |
| G-03 | 阻断模型 | Cppcheck ERROR、MISRA Mandatory/Required/UNMAPPED 阻断；Advisory 不阻断 | F-05、用户确认 | 禁止将 Required style 当作非阻断；禁止未知规则默认 Required | 无 | ready |
| G-04 | 元数据 | 使用完整 MISRA 规则元数据；无法确认时标记 `UNMAPPED`；当前映射内容带 SHA-256 | `misra-rule-metadata.json`、`static_analysis.py:220-234` | 禁止缺失元数据后继续放行 | 上游正文刷新时需记录 commit | ready-with-maintenance |
| G-05 | 代码质量硬约束 | 所有指针判空、所有返回值检查、禁止动态内存 | `style-profile.md:硬性约束`、用户确认 | 禁止以 Advisory 或 baseline 绕过 | 无 | ready |
| G-06 | 栈 | RTOS 任务栈保留 20%，结合 HighWaterMark、峰值路径和异常路径 | `style-profile.md:293`、用户确认 | 禁止只凭“能运行”判定栈安全 | 目标工程数据未提供 | blocked-for-target |
| G-07 | 并发/ISR | `volatile` 只解决编译器优化；多字节变量、复合状态、读改写必须使用同步机制 | `style-profile.md:301-302`、用户确认 | 禁止把 volatile 当原子性/线程安全 | 目标工程共享对象未提供 | blocked-for-target |
| G-08 | 架构 | 依赖方向统一为 `App → Service → Platform ← Impl → Vendor` | `tools-quality/SKILL.md:80`、用户确认 | 禁止 App 直连 Impl/Vendor/HAL/RTOS | 目标工程架构需另行扫描 | ready-for-plugin |
| G-09 | 抑制和基线 | 抑制项必须显式记录规则、文件/范围、原因和复审依据；增量只阻断新增问题 | 静态分析 GUIDE 的抑制/基线章节 | 禁止自动扩大 baseline 或自动删除 suppress | baseline 管理责任人未指定 | needs-follow-up |
| G-10 | 证据边界 | 静态、主机、构建、目标运行、实物证据分开记录 | `tools-quality/SKILL.md:三级验证闭环` | 禁止把 smoke 或插件测试写成目标板通过 | 无 | ready |

## 4. 验收测试清单

| ID | 证据等级 | 验收项 | 命令/条件 | 预期结果 | 责任 Agent | 当前状态 | 产物或阻塞项 |
|---|---|---|---|---|---|---|---|
| V-01 | 工具链 | Cppcheck 版本可用 | cwd=`C:\Users\zhang\Documents\mcu-workbench`；`C:\Program Files\Cppcheck\cppcheck.exe --version` | `Cppcheck 2.21.0` | `toolchain-engineer` | pass | 本机工具版本 |
| V-02 | 静态 | Python 脚本语法和元数据可解析 | cwd=`C:\Users\zhang\Documents\mcu-workbench`；Python 3.13 `-m py_compile`；JSON parse | 均返回 0；元数据 175 条 | `verification-engineer` | pass | 脚本/JSON |
| V-03 | 静态 | 混合扫描结果统一 | smoke 源码启用 `--misra` 并导出 XML | 同一 XML 同时存在原生 Cppcheck ID 和 `misra-c2012-*` | `verification-engineer` | pass | `C:\Users\zhang\.local\mcu-quality-tools\smoke-test\unified-after-change.xml` |
| V-04 | 主机 | 原生 Cppcheck ERROR 阻断 | smoke 中数组越界/空指针样例 | 退出码 1，报告为 BLOCKED | `verification-engineer` | pass | 统一终端报告 |
| V-05 | 主机 | MISRA Required 阻断 | 仅保留 MISRA Required 结果的合成门禁测试 | 退出码 1 | `verification-engineer` | pass | 合成输出 |
| V-06 | 主机 | MISRA Advisory 不阻断 | 仅 Advisory 结果的合成门禁测试 | 退出码 0 | `verification-engineer` | pass | 合成输出 |
| V-07 | 主机 | MISRA UNMAPPED 阻断 | 仅 UNMAPPED 结果的合成门禁测试 | 退出码 1 | `verification-engineer` | pass | 合成输出 |
| V-08 | 报告 | XML/JSON/HTML 导出 | smoke 执行 `--export xml/json/html` | 三种产物存在且非空；HTML 缺失/失败返回非零 | `verification-engineer` | pass | smoke 报告目录 |
| V-09 | 插件 | 插件结构校验 | cwd=`C:\Users\zhang\Documents\mcu-workbench`；`pnpm run validate:plugin` | 45 skills、7 agents、8 层校验通过 | `verification-engineer` | pass | 命令日志 |
| V-10 | 回归 | 全量主机测试 | cwd=`C:\Users\zhang\Documents\mcu-workbench`；`pnpm exec jest --runInBand` | 45 suites / 272 tests 全部通过 | `verification-engineer` | pass | Jest 日志 |
| V-11 | 静态 | 差异格式检查 | cwd=`C:\Users\zhang\Documents\mcu-workbench`；`git diff --check -- skills/tools/tools-quality` | 返回 0 | `verification-engineer` | pass | Git 输出 |
| V-12 | 构建 | 目标固件交叉编译 | 需要目标固件根目录、工具链和 compile DB | 目标构建通过 | `toolchain-engineer` | blocked-out-of-scope | F-10 |
| V-13 | 目标运行/实物 | 栈、并发、ISR、时序 | 需要目标板、RTT/串口、逻辑分析仪或 DWT | 按目标需求完成验证 | `verification-engineer` | blocked-out-of-scope | F-11 |

## 审查结论与下一轮交接

| 分类 | 方案项 | 审查结论 | 证据或风险 | 所需动作 |
|---|---|---|---|---|
| 可采用 | MISRA 纳入统一 Cppcheck | 一次扫描、统一报告、统一退出码，符合用户决策 | F-02~F-05、V-03~V-08 | 交给 `workflow-integration-plan` 维护插件质量能力 |
| 可采用 | Mandatory/Required/UNMAPPED 阻断，Advisory 不阻断 | 已落地并通过合成门禁验证 | F-05、V-05~V-07 | 保持规则；加入 CI 回归样例 |
| 可采用 | 未知规则 `UNMAPPED` | 防止无依据归入 Required | G-04、V-07 | 固定元数据版本/哈希 |
| 需修订 | 元数据来源可复现性 | 映射内容已固定 SHA-256；上游正文地址仍是浮动 `main` | F-06、G-04 | 下次刷新时补录上游 commit/下载快照 |
| 需修订 | 抑制/基线治理 | 规则已写入指南，但责任人、审批和复审周期未指定 | G-09 | 后续 CI/RCP 补充治理字段 |
| 阻塞风险 | 目标固件结论 | 当前没有 MCU、板卡、RTOS、compile DB 和目标产物 | F-10、F-11、V-12、V-13 | 不得将本次插件验证扩展为目标验证；目标接入时补充 RCP |

**代码阶段判定：** `可交给 workflow-integration-plan`，但仅限 `tools-quality` 插件能力；目标固件实施和实机验收不得由本 RCP 放行。

## 下一轮交接

- 下游 Skill：`workflow-integration-plan`。
- 交接范围：统一 Cppcheck/MISRA checker 的插件文档、脚本、元数据和回归测试。
- 不交接范围：目标固件修改、交叉编译、烧录、目标板调试和实机验收。
- 最终代码变更集完成后：交给 `workflow-final-review`，按本审查包的 V-01~V-11 复核。
