# 0005 · bsp-handler 是 Impl 的一层（机制层）

- 状态: accepted
- 日期: 2026-08-07
- 相关决策: D5

## Context

bsp-handler（多实例/生命周期/缓存/重试/串行化）曾被考虑升格 Service。用户修正：这是机制（怎么干），不是策略（何时/如何决策）。

## Decision

bsp-handler 归 impl_bsp，作为 Impl 内的 Handler 机制子层；策略归 Service（如喂狗策略、重试降级策略在 service_watchdog/service_* 中）。

## Consequences

机制与策略分离：Impl 管资源组织，Service 管业务决策；跨芯片复用的是 Service，Impl 随芯片更换。
