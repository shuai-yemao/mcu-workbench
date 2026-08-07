# 0010 · Service = App 常见业务抽象

- 状态: accepted
- 日期: 2026-08-07
- 相关决策: D10

## Context

用户范本 02_Service 显示 service_battery/backlight/calendar/diagnosis/log/ota/power/sensor/storage/watchdog，每个带 _model/_state/_fault_code。

## Decision

Service 层是 App 常见业务抽象（业务服务，带业务策略），不是驱动封装也不是中间件封装；按业务域组织。

## Consequences

Service 跨芯片/跨产品复用；App 通过 Service 表达业务，不关心硬件。
