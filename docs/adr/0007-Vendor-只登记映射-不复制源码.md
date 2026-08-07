# 0007 · Vendor 只登记映射、不复制源码

- 状态: accepted
- 日期: 2026-08-07
- 相关决策: D7

## Context

用户目标工程范本中 05_Vendor 仅含 README + vendor_mapping.md + patch/，证明源码不复制进仓库。

## Decision

Vendor 层以 vendor_mapping.md 登记来源/版本/路径，改动只进 patch/ 目录打补丁；仓库不复制第三方源码。

## Consequences

仓库体积小、授权清晰；构建/移植依赖外部路径，文档必须完整可复现。
