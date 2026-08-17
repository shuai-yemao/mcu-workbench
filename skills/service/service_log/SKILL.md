---
name: service_log
description: Service 业务服务：分级日志与业务过滤策略（可选环形缓冲/导出），以 service 对象管理生命周期，非驱动或 Vendor 封装。
---

# Service 日志业务

## 边界

Service 是 **App 常见业务抽象**（D10）：把产品业务中可沉淀、可复用的能力组织成服务，**带业务策略**，不是驱动的简单封装，也不是中间件封装。本服务只依赖 Platform 接口：`platform_common` 的 `platform_log.h`（级别/格式/裁剪**机制契约**，日志流转见 [`diag-log-flow.md`](../../platform/platform_common/references/diag-log-flow.md)）+ `platform_bsp` / `platform_mcu`（按需导出通道：串口/存储）；不 include Vendor / Impl / HAL 任何符号。

最低实现可以是单个静态 `service_log_t` 对象和 `service_log.c/.h`：对象首字段为
`platform_service_t`，由 Service 自己拥有策略状态、固定缓冲区和生命周期回调。服务类别
暂用 `PLATFORM_SERVICE_CLASS_SYSTEM` 时，必须在 RCP 中记录该选择及后续拆分类别的迁移点。
App 只调用兼容门面（`SERVICE_LOG_*`/`service_log_*`），不接触 manager、Platform registry
或 Impl 注册符号；是否纳入 Service Manager 由工程启动证据决定，不能同时保留第二条并行
`debug_init()`/直接 backend 初始化路径。

## 业务策略

级别过滤（DEBUG/INFO/WARN/ERROR）是默认策略；环形缓冲覆盖、按需导出（串口/存储）和
故障码只有在产品需求真正纳入时才生成。同步日志 V1 默认仅允许任务上下文，ISR 直接
返回不支持；格式化、缓冲区容量、超长行为和 tag 生命周期必须是公开契约。超长输入必须
显式选择 `PLATFORM_ERR_NO_RESOURCE`/截断并可观测，不能静默截断；tag 要么固定容量复制，
要么明确为调用期间有效的借用指针。

## 交付物（范本对齐 02_Service/）

| 文件 | 内容 |
|---|---|
| `service_log.c/.h` | 服务实现与公开 API |
| `service_log.h` | 公开 API、日志数据类型、状态和故障码（按需定义） |
| `service_log_config.h` | 仅在存在独立、稳定的日志配置边界时生成 |

## 工作流

1. 先确认对象所有权、生命周期、固定缓冲区、tag 借用/复制规则和超长返回策略；只有确实需要时再定义数据模型与状态机（_model/_state/_fault_code）；
2. 通过 Platform 接口采集/下发底层能力，施加业务策略（阈值、超时、降级、重试）；
3. 输出可观测的验收证据（状态迁移、策略触发、故障码上报）。

## 禁止

- 不得 include Vendor / Impl / HAL 头文件或直接碰寄存器；
- 不得把器件协议、时序、寄存器语义下沉到本服务（那是 impl 层职责）；
- 不得包含具体产品 UI/业务流程（那是 app 层职责）。
- 不得在 `deinit` 与输出并发时释放 backend；必须有停止输出、引用计数或等价的 quiesce 约束。
- 不得保存临时 tag/格式化缓冲区指针；借用指针必须声明调用者生命周期，复制则必须使用固定容量。

交接：级别/格式/裁剪机制契约经 [`platform_common`](../../platform/platform_common/SKILL.md)（`platform_log.h`）获取；按需导出通道经 [`platform_bsp`](../../platform/platform_bsp/SKILL.md) / [`platform_mcu`](../../platform/platform_mcu/SKILL.md) 接口获取；底层输出通道（elog/RTT）由 Impl 符号实现注入，实现落地在 impl 层。
