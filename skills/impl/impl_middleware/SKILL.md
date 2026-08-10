---
name: impl_middleware
description: Impl 落地：中间件 port 适配——把 easylogger/fatfs/crypto/lvgl/comm 等第三方源码接进 platform_middleware 契约（log/fs/kv/crypto/gui/comm Port）。
---

# Impl Middleware（平台适配 · 中间件 Port）

## 边界

处理第三方中间件到 `platform_middleware` 契约的 Port 适配：IO 层、互斥/调度、时间戳、内存分配等 port 回调，把 easylogger/fatfs/crypto/lvgl/comm 源码接进 log/fs/kv/crypto/gui/comm 能力接口。源码底座由 [`vendor_lvgl`](../../vendor/vendor_lvgl/SKILL.md) 等 vendor_* 技能登记，本层只做接入适配。

## 规则

中间件源码不复制进 Impl（D7，源码只在 Vendor 登记 + patch/）；对源码的改动一律走对应 vendor 技能的 patch 机制。Port 层命名 `impl_<底座>_port`（如 `impl_elog_port.c`，`impl_` 前缀承载层归属），与 vendor 的 patch 协作，避免双份适配。

App、Service 只依赖 `platform_middleware` 接口；具体中间件的类型/宏只出现在 Impl 或 Vendor。接口定义与对象模型见 [`platform_middleware`](../../platform/platform_middleware/SKILL.md)。
