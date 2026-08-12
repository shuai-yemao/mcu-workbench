# 嵌入式插件架构统一 PRD

## 1. 产品范围与优先级

| 优先级 | 需求 |
|---|---|
| P0 | 固定 `App → Service → Platform ← Impl → Vendor` 为唯一规范调用链 |
| P0 | App 禁止直接调用 Platform、Wrapper、Port、Impl、Vendor、HAL 和 RTOS |
| P0 | `platform_common` 统一 Platform 基础类型、错误码、对象、生命周期和 Ops/Context |
| P1 | Wrapper/Port 仅保留为 OS/BSP 内部适配角色 |
| P1 | Driver/Handle 仅保留为 BSP Impl 内部角色 |
| P1 | 同步更新知识图谱、架构文档、App 证据、Review 规则和测试 |

## 2. 文件施工清单

| 文件/目录 | 动作 | 内容 |
|---|---|---|
| `skills/workflow/workflow-review-gate/references/software-architecture-knowledge-graph.*` | 修改 | 更新主链、节点和边 |
| `docs/plugin-boundaries.md` | 修改 | 更新层责任矩阵 |
| `docs/architecture-overall-plan.md` | 修改 | 更新总体图和历史问题说明 |
| `docs/architecture-evolution-plan.md` | 修改 | 更新进化背景和旧链状态 |
| `skills/app/app-architecture/references/app-architecture-evidence.md` | 修改 | App 只经 Service 获取能力 |
| `skills/workflow/workflow-*/SKILL.md` 与集成指南 | 修改 | 更新 Router/Review/Integration 约束 |
| `tests/*architecture*.test.js` | 修改 | 增加唯一调用链门禁 |

## 3. 需求约束与禁止事项

- Service 可以调用 `platform_common`、`platform_os`、`platform_bsp`、`platform_mcu` 和 `platform_middleware`。
- Platform 不得依赖 Impl 或 Vendor。
- Impl 可以依赖 Platform 接口和 Vendor 底座，但不得被 App/Service 直接调用。
- BSP Wrapper 不持有具体 Driver/Handle；BSP Port 负责构造、注入、注册和失败回滚。
- BSP Driver 不承载任务、队列、业务缓存和业务策略；Handle/Handler 负责运行机制。
- 不新增未经确认的 `impl_mcu` 或其他顶层层级。

## 4. 范围外

目标固件的构建、烧录、串口/RTT、逻辑分析仪和实机行为不属于本轮插件架构文档施工范围。
