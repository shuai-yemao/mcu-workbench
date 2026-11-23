---
name: workflow-project-integration
description: 依据项目证据设计软件分层、审计工程集成关系并给出可验证的迁移路线。
---

# 软件项目集成

## 适用范围

处理跨层架构、既有工程审计、目录映射、依赖方向和分阶段集成计划。先识别 APP、Middleware、OS、BSP、Core、Driver，再把实现交接给唯一的下游 skill。

## 工作流

1. 读取工程文件、构建日志、启动流程和现有笔记，记录可复现证据。
2. 画出调用链，确认上层只依赖下层公开契约。
3. 根据职责选择一个主 skill，最多追加两个交接 skill。
4. 输出文件级改造顺序、验收点和未决风险；不在本 skill 内实现具体驱动。

## 分层证据图

先读取 [`software-architecture-knowledge-graph.md`](references/software-architecture-knowledge-graph.md) 和对应 JSON，再按 APP → Middleware → OS → BSP → Core → Driver → Tools 的顺序审计。图谱中的源码仓库只作为版本化证据，不把上游实现复制进插件。

## 硬边界

- Adapter 只属于 OS 和 BSP，且每个 Adapter 由 Wrapper 与 Port 组成。
- Core、Middleware、Driver 不创建 Adapter；它们分别提供 MCU 能力、通用能力和厂商底层实现。
- 上层调用下层时，调用下层 Adapter 的 Wrapper；Middleware 仅通过公共 API 使用 OS/BSP 能力。
- 本 skill 只输出项目审计、分层设计、迁移路线和下游交接，不直接执行代码移植、AI 协作流程、Prompt 模板生成或具体驱动实现。
- 命中上述具体能力时，只引用 `references/capability-index.md` 中的证据和产物要求，再交给对应软件层、工具层 skill 或 agent 执行。

## 交接

- APP 结构交给 [`app-architecture`](../app-architecture/SKILL.md)。
- OSAL/RTOS 交给 [`os-abstraction`](../../rtos/os-abstraction/SKILL.md)。
- 器件链路交给 [`bsp-adapter`](../../bsp/bsp-adapter/SKILL.md)、[`bsp-hal-driver`](../../bsp/bsp-hal-driver/SKILL.md) 或 [`bsp-handler`](../../bsp/bsp-handler/SKILL.md)。
- MCU/厂商库交给 [`core-mcu`](../../platform/core-mcu/SKILL.md) 或 [`driver-vendor`](../../platform/driver-vendor/SKILL.md)。

## 参考

- [软件层契约](references/software-layer-contract.md)
- [GR5526 LVGL 验收映射](references/gr5526-lvgl-mapping.md)
- [集成、移植与 AI 协作能力](references/capability-index.md)
