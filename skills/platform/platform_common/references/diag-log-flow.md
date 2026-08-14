# 日志与检测跨层流转契约（跨 Platform 参考）

> 版本：v1.0（2026-08-09）| 依据：软件层契约 v2.0（Port 注入模型）、ADR-001（platform_common 四子域、P2 断言独立于日志）
> 范围：日志（`platform_middleware/platform_log`）与检测（Common 的 `platform_assert`、MCU 的 `platform_reset_reason` / `platform_hardfault`）在五层之间的流转方式。

## 定位

日志与检测是**横切可观测原语**：日志机制在 `platform_middleware`，断言机制在 `platform_common/diag`，复位原因与 HardFault 契约在 `platform_mcu`；策略在 Service（`service_log` / `service_diagnosis` / `service_watchdog`），落地在 Impl（port 文件）。

## 流转三方向

```text
调用向下：App/Service/Impl ──日志宏──► platform_middleware/platform_log（契约内核）
注入由 Impl：Impl 契约适配/受审查 registry ──► Vendor Port ──► Vendor 底座
输出到底：platform_log 转发 ──► Impl 通道 ──► elog / SEGGER RTT / HAL UART
```

- **调用向下**：日志产生方在各层，统一汇聚到 `platform_log` 契约（无逐层接力）。
- **注入由 Impl**：默认可由 Impl port 直接实现 `platform_log_*`；若工程经 RCP 放行 registry，则
  `platform_log.c` 只保存借用的 Ops/context、做状态校验和转发，`impl_elog_log.c` 注入 Ops，
  `impl_elog_port.c` 负责 Elog→RTT 的 Vendor 回调。Vendor 句柄经 `void *`/backend_context
  隔离，不泄漏进抽象；注册仅限启动/完全停机阶段，不提供运行期通道切换。
- **输出到底**：`platform_log_output` 组帧（级别前缀/时间戳由 Impl 决定）后写 Vendor 底座（elog/RTT/HAL UART）。

## 调用面访问规则（谁用什么）

| 层 | 访问方式 | 说明 |
|---|---|---|
| App | `SERVICE_LOG_*`（经 `service_log` 门面） | 禁 include `platform_log.h`（D8：App 只调 Service） |
| Service 其他 | `PLATFORM_LOG_*` 直调 | 依赖 Platform 接口，合法 |
| Impl | `PLATFORM_LOG_*` 直调 | 依赖 Platform 接口头，合法 |
| Platform 内部 | `PLATFORM_LOG_*` 自用 | 机制日志；日志契约属于 `platform_middleware` |
| Vendor | — | **永不反向**；elog 等中间件自身日志由 Impl port 桥接进平台通道 |

## platform_log.h 契约要点（工程 V1.0 已验证）

- 级别：`PLATFORM_LOG_LVL_ASSERT..VERBOSE`（0..5，**宏常量**，供裁剪 `#if` 使用；enum 仅类型化 API 用）。
- 编译裁剪：`PLATFORM_LOG_LEVEL`（默认 VERBOSE），低于该级别的宏整体编译为空，不占栈。
- API：`platform_log_init/deinit`、`platform_log_output(level, tag, file, func, line, fmt, ...)`、`platform_log_raw_write`（无前缀原始输出，供启动 banner）。
- 宏：`PLATFORM_LOG_A/E/W/I/D/V(tag, fmt, ...)`，调用点捕获 `__FILE__/__FUNCTION__/__LINE__`，显式携带模块 tag。
- 初始化时机：boot 第一步，任何平台对象使用前（platform_common P2）。

## 断言旁路（P2，独立于日志）

```text
任一层 PLATFORM_ASSERT(expr) ──失败──► platform_assert_fail
                                        ├─ 有 hook（platform_assert_set_hook）→ 回调并返回（host 冒烟）
                                        └─ 无 hook → platform_assert_output 原始输出 ──► SEGGER RTT
                                            然后 for(;;) 死循环（配合调试器/看门狗暴露现场）
```

断言**不经过 platform_log**（日志可能未初始化或本身故障，故障路径必须自足）。`platform_assert_output` 由 Impl 实现（`impl_assert_output.c`），独立于日志系统。

## 与 Service 的分工（机制 vs 策略）

| 关注点 | 归属 | 内容 |
|---|---|---|
| 级别/裁剪/组帧/输出通道 | Platform（`platform_log.h`）+ Impl port | 机制，接口永不改 |
| 级别过滤策略、环形缓冲覆盖、按需导出（串口/存储） | `service_log` | 策略，可带产品决策 |
| 故障码登记、自检编排、诊断报告 | `service_diagnosis` | 策略，挂接 assert hook |
| 喂狗、任务存活监控、消费 reset_reason | `service_watchdog` | 策略 |

`service_log` 依赖 `platform_common`（`platform_log.h` 机制契约）+ `platform_bsp` / `platform_mcu`（按需导出通道），不直接触碰 Vendor。

## 注入点实例（与 software-layer-contract v2.0 一致）

| Platform 抽象 | Impl port | Vendor 底座 |
|---|---|---|
| `platform_log` | `platform_log.c` + `impl_middleware/elog/impl_elog_log.c` | easylogger |
| `platform_assert_output` | `impl_middleware/impl_assert_output.c` | SEGGER RTT |
| elog 底层移植 | `impl_middleware/impl_elog_port.c`（Vendor 面向） | easylogger |
| `platform_reset_reason` / `platform_hardfault` | `impl_mcu` 芯片 Port | CMSIS/寄存器 |
