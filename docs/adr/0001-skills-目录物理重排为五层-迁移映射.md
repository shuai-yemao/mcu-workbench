# 0001 · skills 目录物理重排为五层 + 迁移映射

- 状态: accepted
- 日期: 2026-08-07
- 相关决策: D1

## Context

当前技能按 13 层物理目录组织（os/bsp/core/mcu/middleware/system…），与目标五层契约分层不一致，契约分散、粒度不一。

## Decision

将 skills/ 目录真正拆为 app/service/platform/impl/vendor 五层，旧 id 全部经 catalog.js 的 MIGRATION_MAP 映射到新 id，旧调用名不失效。

## Consequences

目录与契约一致，可增量迁移；MIGRATION_MAP 需长期维护，旧名兼容由 resolveSkillId 自动完成。
