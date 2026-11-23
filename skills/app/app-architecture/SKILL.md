---
name: app-architecture
description: 设计嵌入式 APP 的 main、Manager、Task、Logic、UI 与 Profile 边界和启动流程；App 只调 Service，不碰 HAL/Impl/Vendor（D8）。
---

# APP 架构

## 结构

- `main`：只做启动编排、时钟/平台初始化和 OS 启动。
- `manager`：拥有应用状态、资源策略和跨任务协调。
- `task`：拥有任务入口、队列消费和周期调度。
- `logic`：实现业务规则，不直接碰 HAL 或 RTOS 原生 API。
- `ui`：页面、事件和人机交互；通过 Logic/Manager 获取状态。
- `profile`：BLE、微信小程序或产品连接配置，隔离协议细节。

## 规则（D8 依赖铁律）

**App 只调 Service**：`main`/`manager`/`task`/`logic`/`ui`/`profile` 一律通过 `service_*` 获取业务能力（电池、传感器、日志、OTA、存储、看门狗等），不直接调用 Platform 接口、Impl 或 Vendor 任何符号。

禁止：

- 直接调用 `xTask*`、厂商 HAL、`HAL_*`、寄存器；
- include Platform 实现 / Impl（`impl_*`）/ Vendor（`vendor_*`）头文件；
- 绕过 Service 直连 `platform_os` / `platform_mcu` / `platform_bsp` 的具体调用（能力定义只经 Service 编排）。

若某个业务尚无对应 Service，先沉淀 Service 或经 `workflow-integration-plan` 规划，不允许在 App 内临时直连底层。

## 设备服务边界

设备服务统一由 Service 层承接（`service_sensor`/`service_storage` 等），App 只调用 Service 公开 API。启动文件只编排服务初始化，不能调用 impl 的测试入口。设备回调只发布拥有明确生命周期的快照或系统事件；UI 只能由其所有者任务消费事件后更新。

## 工作流

1. 从 `main` 还原启动链和初始化顺序（各 service 初始化由 `service_system` 编排）。
2. 为每个 Manager/Task 标注状态、消息和资源所有权，明确其依赖的 Service。
3. 把 UI 事件转换为 Logic 命令，把 Service 事件转换为 Manager 状态。
4. 输出任务表、状态流和可测试的函数边界，标注每个 App 模块依赖的 Service id。

## 证据与产物

先读取 [`app-architecture-evidence.md`](references/app-architecture-evidence.md)，再判断项目是否真的存在 `manager/`、`task/`、`logic/`、`ui/` 和 `profile/`。插件生成器默认只提供 `App/main.c`、`BSP/`、`System/`、`Core/` 和 `cmake/`，不得把规划目录当成现成实现。

最小产物包括：APP 层目录图、启动链、组件职责表、**App→Service 依赖审计**（确认无 Vendor/Impl/HAL 引用）、测试入口和未决风险。需要完整分层证据时交接 [`software-architecture-knowledge-graph.md`](../../workflow/workflow-review-gate/references/software-architecture-knowledge-graph.md)。

## GR5526 交接

验收 `Src/app/main.c`、`manager/`、`task/`、`ux_logic/` 与 `lv_user_task_create()`；OS 并发接口经 `service_system` 编排，界面能力经 `service_*`（UI 服务）承接——`app-architecture` 不直接引用 [`platform_os`](../../platform/platform_os/SKILL.md) 或 [`vendor_lvgl`](../../vendor/vendor_lvgl/SKILL.md) 的实现细节。

共享层契约见 [`software-layer-contract.md`](../../workflow/workflow-review-gate/references/software-layer-contract.md)。
