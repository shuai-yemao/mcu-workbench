# Cppcheck 统一质量门禁 PRD

## 1. 产品范围与优先级

| 优先级 | 需求 |
|---|---|
| P0 | Cppcheck 作为唯一静态分析执行入口，MISRA 作为可选 checker |
| P0 | 原生 Cppcheck 与 MISRA 共用一次扫描、同一报告和同一退出码 |
| P0 | Cppcheck ERROR、MISRA Mandatory/Required/UNMAPPED 阻断；Advisory 不阻断 |
| P0 | 未知 MISRA 规则标记 `UNMAPPED`，禁止自动归入 Required |
| P1 | 支持 XML、JSON、HTML 报告和增量 baseline |
| P1 | 保留指针判空、返回值检查、禁止动态内存、20% 栈余量和并发同步约束 |
| P2 | 固定 MISRA 元数据上游提交/下载快照和团队级抑制审批流程；当前映射 SHA-256 已记录 |

## 2. 文件施工清单

| ID | 文件 | 动作 | 内容 | 状态 |
|---|---|---|---|---|
| W-01 | `skills/tools/tools-quality/references/capabilities/quality-static-analysis/static_analysis.py` | 修改 | 统一结果模型和门禁判定 | ready |
| W-02 | `skills/tools/tools-quality/references/capabilities/quality-static-analysis/misra-rule-metadata.json` | 新增 | MISRA 规则/指令等级映射 | ready |
| W-03 | `skills/tools/tools-quality/references/quality-static-analysis/GUIDE.md` | 修改 | 统一 Cppcheck/MISRA 使用说明 | ready |
| W-04 | `skills/tools/tools-quality/references/capabilities/quality-static-analysis/GUIDE.md` | 修改 | capability 级流程、异常和导出说明 | ready |
| W-05 | `skills/tools/tools-quality/SKILL.md` | 修改 | 质量路由和静态分析边界 | ready |
| W-06 | 目标固件 CI 配置 | 后续新增 | compile DB、include/define、第三方库和产物归档 | blocked-out-of-scope |

## 3. 需求约束与禁止事项

- `--misra` 只控制是否启用 MISRA checker，不启动第二套独立报告流程。
- 结果必须保留 `Cppcheck` 或 `MISRA` 来源标识。
- 请求 HTML 导出时，`cppcheck-htmlreport` 缺失、执行失败或 `index.html` 为空必须阻断。
- MISRA 级别必须从完整元数据映射；无法确认时为 `UNMAPPED`。
- Cppcheck severity 与 MISRA level 独立判断，不能以 `style` 覆盖 Required 的阻断行为。
- 禁止将历史 baseline 自动扩张为豁免。
- 禁止未经记录的 MISRA suppress。
- 不修改被扫描固件源码，不自动修复问题。
- 不把静态分析、主机测试或 HTML 报告生成写成目标板验证。
- App/Service/Platform/Impl/Vendor 相关工程审查必须遵守 `App → Service → Platform ← Impl → Vendor`。
- 所有指针判空、所有返回值检查、禁止动态内存保持不变。
- `volatile` 不得替代原子性或线程安全；共享多字节/复合状态/读改写操作必须同步。

## 4. 范围外与已知未决项

- 目标 MCU、板卡、RTOS、交叉编译和目标构建。
- 目标板烧录、RTT/串口、逻辑分析仪和 DWT 证据。
- MISRA 元数据来源长期固定和组织级偏差审批流程。
- 目标固件第三方库的扫描白名单与排除策略。
