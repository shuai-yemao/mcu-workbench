---
name: tools-observability
description: 负责 ELOG、SEGGER RTT、串口监控、SystemView 和运行时日志追踪；当用户需要抓取、过滤、记录或分析嵌入式运行时数据时使用。
---

# 运行时观测

## 职责

统一处理目标端日志输出、PC 端采集、过滤、时间戳、缓冲溢出和任务/中断追踪。先确认输出通道与数据格式，再加载对应 reference。

## 变体

ELOG、RTT 移植/监控、串口监控和 SystemView 的资料按旧入口放在 `references/observability-*/GUIDE.md` 下；重复脚本按原入口放在各自的 reference 命名空间中。

官方目标端源码和 commit 基线见 [`upstream-source-baseline.md`](references/upstream-source-baseline.md)。

## 输出

给出采集命令、通道配置、过滤规则、日志证据和丢包/溢出判断。需要根因定位时交接 [`tools-debug`](../tools-debug/SKILL.md)。
