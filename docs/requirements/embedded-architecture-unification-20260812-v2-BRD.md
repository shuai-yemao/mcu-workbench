# 嵌入式插件架构统一 BRD

## 1. 项目背景与目标

当前插件同时保留 Platform/Impl 与 Wrapper/Port、Driver/Handle 多套术语。它们原本承担不同粒度的职责，但旧资料仍允许 App 直接调用 OS/BSP Wrapper，导致规范调用链不唯一。

本需求将唯一规范调用链固定为：

```text
App → Service → Platform ← Impl → Vendor
```

App 只负责产品业务编排；Service 负责业务策略并调用 Platform；Platform 通过 `platform_common` 统一类型、错误码、对象、生命周期和 Ops/Context；Impl 负责具体绑定；Vendor 提供底座。

## 2. 工程现状

| 事实 | 证据 | 等级 |
|---|---|---|
| 主契约已定义五层调用链 | `skills/workflow/workflow-review-gate/references/software-layer-contract.md` | confirmed |
| Platform 已含 common/mcu/bsp/middleware/os 子域 | `tests/embedded-framework-baseline.test.js` | confirmed |
| Impl 已含 board/bsp/middleware/os 子域 | `tests/embedded-framework-baseline.test.js` | confirmed |
| 知识图谱和部分文档仍描述 App 直连 Wrapper | `skills/workflow/workflow-review-gate/references/software-architecture-knowledge-graph.md`、`docs/plugin-boundaries.md` | confirmed，已列入施工 |

## 3. 价值与非功能约束

- App 与底层平台解耦，业务层不随 OS、板卡或芯片实现变化。
- Platform 子域共享 `platform_common`，避免错误码、对象和生命周期协议分裂。
- Wrapper/Port、Driver/Handle 继续保留，但仅作为 OS/BSP 内部角色。
- 规范、知识图谱、Skill 证据和自动化测试必须使用同一调用链。

## 4. 风险与依赖

本轮仅修改插件规范、文档和门禁测试，不涉及具体固件、芯片、板卡、构建或实机验证。
