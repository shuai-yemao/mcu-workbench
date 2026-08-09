---
name: service_log
description: Service 业务服务：分级日志、环形缓冲、导出策略（带业务策略，非驱动封装）。
---

# Service 日志业务

## 边界

Service 是 **App 常见业务抽象**（D10）：把产品业务中可沉淀、可复用的能力组织成服务，**带业务策略**，不是驱动的简单封装，也不是中间件封装。本服务只依赖 Platform 接口：`platform_common` 的 `platform_log.h`（级别/格式/裁剪**机制契约**，日志流转见 [`diag-log-flow.md`](../../platform/platform_common/references/diag-log-flow.md)）+ `platform_bsp` / `platform_mcu`（按需导出通道：串口/存储）；不 include Vendor / Impl / HAL 任何符号。

## 业务策略

级别过滤（DEBUG/INFO/WARN/ERROR）、环形缓冲覆盖策略、按需导出（串口/存储）。

## 交付物（范本对齐 02_Service/）

| 文件 | 内容 |
|---|---|
| `service_log.c/.h` | 服务实现与公开 API |
| `service_log_model.h` | 数据模型：log_level_t / log_entry_t / log_export_cfg_t |
| `service_log_state.h` | 状态机：运行 / 缓冲满 / 导出中 |
| `service_log_fault_code.h` | 故障码：LOG_ERR_BUFFER_FULL / LOG_ERR_EXPORT_FAIL |

## 工作流

1. 定义数据模型与状态机（_model/_state/_fault_code），先于实现；
2. 通过 Platform 接口采集/下发底层能力，施加业务策略（阈值、超时、降级、重试）；
3. 输出可观测的验收证据（状态迁移、策略触发、故障码上报）。

## 禁止

- 不得 include Vendor / Impl / HAL 头文件或直接碰寄存器；
- 不得把器件协议、时序、寄存器语义下沉到本服务（那是 impl 层职责）；
- 不得包含具体产品 UI/业务流程（那是 app 层职责）。

交接：级别/格式/裁剪机制契约经 [`platform_common`](../../platform/platform_common/SKILL.md)（`platform_log.h`）获取；按需导出通道经 [`platform_bsp`](../../platform/platform_bsp/SKILL.md) / [`platform_mcu`](../../platform/platform_mcu/SKILL.md) 接口获取；底层输出通道（elog/RTT）由 Impl 符号实现注入，实现落地在 impl 层。
