---
name: tools-release
description: 负责 OTA 固件打包、升级流程、回滚和发布验证；当用户提到 OTA、A/B 分区、差分包、签名发布或升级失败恢复时使用。
---

# 发布与 OTA 工具

## 职责

统一处理固件包生成、版本元数据、差分/压缩/分片、传输、校验、升级状态机和回滚验证。

## 变体

- 打包与测试工具：[`release-ota-package`](references/release-ota-package/GUIDE.md)
- OTA 系统架构与策略：[`release-ota-update`](references/release-ota-update/GUIDE.md)

## 输出

明确包格式、版本兼容矩阵、升级前置条件、失败恢复路径和验收日志。签名/加密实现交接 [`software-system`](../../system/software-system/SKILL.md)。
