# MCU-Workbench 软件架构进化方案（最终版）

> 版本：v4.0 FINAL | 日期：2026-08-07 | 状态：**已批准，可执行**
> 目标：把当前"13 层物理分层"进化为"**App / Service / Platform / Impl / Vendor** 五层契约分层"，与用户目标工程目录范本（01_App…99_Utils）对齐。
> 决策记录：D1-D12 全部确认，每条对应一条 ADR（`docs/adr/0001-0012`）；领域上下文见 `CONTEXT.md`；工程技能配置见 `docs/agents/`。
> 支撑文档：`docs/architecture-transformation-plan.md`（实施细则）、`docs/architecture-evolution-plan.md`（总纲演进记录）。

---

## 1. 两套分层体系（D2）

| 体系 | 含义 | 层 | 作用对象 | ADR |
|---|---|---|---|---|
| **软件架构分层** | 目标工程代码如何组织 | App / Service / Platform / Impl / Vendor | 生成的嵌入式工程 | 0001 |
| **插件技能分层** | 插件自身如何组织 AI 能力 | workflow（流程编排）、tools（工程操作）、hardware（硬件分析） | 插件 skills 目录 | 0002 |

> workflow/tools/hardware 是**插件的分层**，不是软件架构分层，保留不入 5 层。插件技能目录 = 5 个软件架构层技能 + 3 个插件层技能。

## 2. 为什么改：现状痛点

```text
APP → Service ──┬─ platform_os → OS Wrapper (osal_*) → OS Port → OS Runtime
                ├─ platform_bsp → BSP Wrapper → BSP Port → Handle → Driver → platform_mcu
                ├─ platform_middleware
                └─ platform_common

Platform ← Impl → Vendor
```

| # | 痛点 | 表现 |
|---|---|---|
| P1 | 契约三套分散 | `osal_*` / BSP 函数表 / Core 事务 API 各成体系，错误码/ctx/ops 无统一基线 |
| P2 | 中间件源码与能力混放 | LVGL/FatFS/FlashDB 的"源码底座"与"能力"在同一技能，无法区分拿来与沉淀 |
| P3 | 历史上 APP 允许直连 Wrapper | 已由目标架构收敛为 App → Service；施工阶段需同步清理残留规范文字 |
| P4 | 分层粒度不一 | BSP 细到 4 层，OS/Middleware 只有粗粒度 |
| P5 | Platform 与 Vendor 未切开 | Core 与 MCU 边界靠约定，Impl 层缺位 |
| P6 | 缺 Service 业务层 | 电池/背光/日志/OTA 等"App 常见业务"无归属 |

## 3. 改到哪：目标五层架构

| 层 | 职责 | 依赖 | 禁止 | 换芯片 |
|---|---|---|---|---|
| **App** | 产品业务流程：编排、状态机、交互（app_ble/app_hmi/app_ota/app_init/app_system） | **只调 Service** | HAL/Platform 实现/Impl/Vendor 符号 | 零改动 |
| **Service** | **App 常见业务抽象**（带策略）：battery/backlight/log/ota/power/sensor/storage/watchdog…，各带 `_model/_state/_fault_code` | Platform 接口 + 其他 Service | Vendor 头文件、寄存器/HAL | 零改动 |
| **Platform** | 平台抽象：统一接口/错误码/数据结构/对象协议/ctx（**技能目录允许无芯片/RTOS/厂商依赖的公共实现**；`platform_common` 四子域 core/object/manager/diag，manager 为内置生命周期驱动、diag 只声明接口，见 ADR-001） | 仅标准类型 | 芯片头文件、厂商类型 | 接口永不改 |
| **Impl** | Platform→Vendor 适配落地：board/mcu/os/bsp 实现 + Handler 机制 | Platform 接口 + Vendor 底座 | 反向定义接口、被 App 直调、含业务策略 | 换整套 Impl |
| **Vendor** | 厂家/第三方底座：HAL/CMSIS/CubeMX/FreeRTOS/LVGL/FatFS/算法库/SDK | — | **不反向调用任何上层** | — |

**依赖铁律**：

```text
App → Service → Platform ← Impl → Vendor
Vendor 不得 include 上层任何符号；App 不得 include Vendor/Impl/HAL；
Platform 技能目录允许无芯片/RTOS/Vendor 依赖的公共 `.c`（包括 Platform Model、registry 或稳定转发）；机制在 Impl/Handler，策略在 Service。`platform_mcu` 的设备 Model 源文件与公共头同名，硬件生命周期仍在 Impl。
```

**目标工程目录范本（用户权威参照）**：

```text
00_Docs / 00_Config(app|product|compile|feature_config.h)
01_App        app_main|init|system|ble|hmi(ui/ui_task)|ota
02_Service    service_system|battery|backlight|calendar|diagnosis|log|ota|power|sensor|storage|watchdog
03_Platform   platform_common(core|object|manager|diag 四子域) | mcu | os | bsp | middleware（common 含 10 个 .c 实现：object 3 + manager 4 + diag 3；core 纯头契约）
04_Impl       impl_board | mcu(stm32f411_*) | os(freertos_*) | bsp | middleware(easylogger/fatfs/crypto/lvgl/comm port)
05_Vendor     README + vendor_mapping.md + patch/（源码不复制）
06_Toolchain / 99_Utils(crc|ringbuffer|filter|list)
```

## 4. 技能级转化矩阵（33 个 active 逐一）

> 原则：技能跟随现有归属，不为凑层强造技能（D12）；中间件整体归 Vendor（D9）；Service 按业务域（D10）；下划线命名（D11）。

| # | 当前 id（层） | → 目标层 | 新 id | 动作 |
|---|---|---|---|---|
| 1 | `app-architecture` (app) | App | `app-architecture` | 保留；依赖规则改"只调 Service" |
| 2 | `os-adapter` (os) | Platform | `platform_os` | 改名迁移；osal_* 契约并入 platform_os 接口 |
| 3 | `os-runtime` (os) | Impl | `impl_os` | 改名迁移；FreeRTOS 绑定 |
| 4 | `bsp-wrapper` (bsp) | Platform | `platform_bsp` | 改名迁移；函数表/注册机制为 platform_bsp 对象协议 |
| 5 | `bsp-port` (bsp) | Impl | `impl_board` | 改名迁移；组合根 board_resource_config + board_bsp_register |
| 6 | `bsp-hal-driver` (bsp) | Impl | `impl_bsp` | 改名迁移；器件驱动实现 |
| 7 | `bsp-handler` (bsp) | Impl | `impl_bsp`（Handler 机制） | 改名迁移；多实例/生命周期/缓存/重试为机制子层（D5） |
| 8 | `core-mcu` (core) | Platform | `platform_mcu` | 改名迁移；MCU 能力接口 + 错误码/类型/对象协议规范（D4） |
| 9 | `mcu-platform` (mcu) | Vendor | `vendor_stm32` | 改名迁移（D3）；vendor_mapping.md 登记 |
| 10 | `middleware-lvgl` (middleware) | Vendor | `vendor_lvgl` | 整体归位（D9） |
| 11 | `middleware-communication` (middleware) | Vendor | `vendor_stack` | 整体归位（协议栈源码与知识） |
| 12 | `middleware-storage` (middleware) | Vendor | `vendor_fatfs` | 整体归位 |
| 13 | `middleware-fal` (middleware) | Vendor | `vendor_fal` | 整体归位 |
| 14 | `middleware-flashdb` (middleware) | Vendor | `vendor_flashdb` | 整体归位 |
| 15 | `middleware-letter-shell` (middleware) | Vendor | `vendor_letter_shell` | 整体归位 |
| 16 | `middleware-algorithms` (middleware) | Vendor | `vendor_dsp` | 整体归位 |
| 17 | `software-system` (system) | Service | `service_system` | 升格；Bootloader/低功耗/看门狗/安全策略归入 |
| 18-26 | `tools-*`（9 个） | Tools（插件层） | 不变 | 保留（D2） |
| 27-28 | `hardware-*`（2 个） | Hardware（插件层） | 不变 | 保留（D2） |
| 29-33 | `workflow-*`（5 个） | Workflow（插件层） | 不变 | 保留（D2） |

> 归档 76 条（platform/interface/security 旧层）不动，继续作为 legacy 依据。

## 5. 新增 Service 技能（11 个，按业务域）

每个 service 交付：`.c/.h` + `_model.h` + `_state.h` + `_fault_code.h`（对应范本 02_Service/）。

| 新 id | 业务域 | 职责（带策略） | 依赖 Platform 接口 |
|---|---|---|---|
| `service_system` | 系统 | 启动编排、健康状态、系统诊断汇总（含安全） | platform_os/mcu/bsp |
| `service_battery` | 电池 | 电量计算、电压/充电状态、低电量告警策略 | platform_bsp/battery |
| `service_backlight` | 背光 | 亮度调节、自动亮度/超时策略 | platform_bsp/backlight |
| `service_calendar` | 日历 | 时间管理、闹钟、日程策略 | platform_mcu/rtc |
| `service_diagnosis` | 诊断 | 故障码管理、自检、诊断报告 | platform_mcu/os |
| `service_log` | 日志 | 分级日志、环形缓冲、导出策略 | platform_bsp（log 规范） |
| `service_ota` | OTA | 固件下载、校验、跳转、回滚策略 | platform_mcu/fs+comm 规范 |
| `service_power` | 电源 | 待机/休眠/唤醒、功耗档位策略 | platform_mcu/power |
| `service_sensor` | 传感器 | 多传感器汇聚、滤波、单位转换、上报策略 | platform_bsp(imu/airpressure/…) |
| `service_storage` | 存储 | 参数存取、KV、分区管理、掉电安全 | platform_mcu/flash+fs 规范 |
| `service_watchdog` | 看门狗 | 喂狗策略、任务存活监控、复位诊断 | platform_mcu/watchdog |

## 6. 目标态：46 个技能全景

| 层 | 数量 | 技能 |
|---|---|---|
| workflow（插件层） | 5 | requirements-router / workflow-claude-layering / review-gate / integration-plan / final-review |
| app（软件架构层） | 1 | app-architecture |
| service（软件架构层） | 11 | system + battery / backlight / calendar / diagnosis / log / ota / power / sensor / storage / watchdog |
| platform（软件架构层） | 5 | platform_common / platform_mcu / platform_os / platform_bsp / platform_middleware |
| impl（软件架构层） | 4 | impl_os / impl_board / impl_bsp（含 Handler 机制）/ impl_middleware |
| vendor（软件架构层） | 8 | vendor_stm32 + lvgl / stack / fatfs / fal / flashdb / letter_shell / dsp |
| tools（插件层） | 9 | build / flash / linker / debug / observability / quality / git / release / learning-tutor |
| hardware（插件层） | 2 | pcb-analysis / visa-debug |
| **合计** | **45** | 平台层 5 技能（D12 反转后） |

## 7. 落地：catalog 改造 + 目录重排

### 7.1 catalog 改造

- `catalog-metadata.js`：`ARCHIVED_SOFTWARE_LAYERS` 更新；`CANONICAL_DEFINITIONS` 重写为 5 层；新增 `SERVICE_DEFINITIONS`（11）+ `VENDOR_DEFINITIONS`（8）；`TOOL_CANONICAL_DEFINITIONS` 不变；
- `catalog.js`：`CANONICAL_ORDER` 重排（workflow→app→service→platform→impl→vendor→hardware→tools）；`MIGRATION_MAP` 扩充 16 条旧 id→新 id 映射；
- `registry.js` / `loader.js` 不动，`resolveSkillId()` 自动兼容旧调用名。

### 7.2 目录重排（git mv 清单，下划线命名）

```bash
git mv skills/os/os-adapter           skills/platform/platform_os
git mv skills/core/core-mcu           skills/platform/platform_mcu
git mv skills/bsp/bsp-wrapper         skills/platform/platform_bsp
git mv skills/os/os-runtime           skills/impl/impl_os
git mv skills/bsp/bsp-port            skills/impl/impl_board
git mv skills/bsp/bsp-hal-driver      skills/impl/impl_bsp
git mv skills/bsp/bsp-handler         skills/impl/impl_bsp/handler
git mv skills/mcu/mcu-platform        skills/vendor/vendor_stm32
git mv skills/middleware/middleware-lvgl       skills/vendor/vendor_lvgl
git mv skills/middleware/middleware-communication skills/vendor/vendor_stack
git mv skills/middleware/middleware-storage   skills/vendor/vendor_fatfs
git mv skills/middleware/middleware-fal       skills/vendor/vendor_fal
git mv skills/middleware/middleware-flashdb   skills/vendor/vendor_flashdb
git mv skills/middleware/middleware-letter-shell skills/vendor/vendor_letter_shell
git mv skills/middleware/middleware-algorithms skills/vendor/vendor_dsp
git mv skills/system/software-system  skills/service/service_system
mkdir -p skills/service skills/platform skills/impl skills/vendor
```

MIGRATION_MAP 扩充（旧连字符 → 新下划线）：

```js
'os-adapter': 'platform_os', 'os-runtime': 'impl_os',
'bsp-wrapper': 'platform_bsp', 'bsp-port': 'impl_board',
'bsp-hal-driver': 'impl_bsp', 'bsp-handler': 'impl_bsp',
'core-mcu': 'platform_mcu', 'mcu-platform': 'vendor_stm32',
'middleware-lvgl': 'vendor_lvgl', 'middleware-communication': 'vendor_stack',
'middleware-storage': 'vendor_fatfs', 'middleware-fal': 'vendor_fal',
'middleware-flashdb': 'vendor_flashdb', 'middleware-letter-shell': 'vendor_letter_shell',
'middleware-algorithms': 'vendor_dsp', 'software-system': 'service_system',
```

## 8. 分阶段执行计划

| 阶段 | 目标 | 主要动作 | 验证 |
|---|---|---|---|
| 0 | ✅ 定稿 | 本方案审查通过（已完成） | 用户确认 |
| 1 | Vendor 归位 | vendor_stm32 + 7 个 vendor_* 迁移；vendor_mapping.md 模板 + patch/；catalog vendor 层 | catalog 解析、validate:plugin、validate:links |
| 2 | Platform 契约化 | platform_mcu/os/bsp 三技能 + 头文件及无底层依赖公共实现规范 | 头文件和允许的公共 `.c` 可检查、旧引用兼容 |
| 3 | Impl 落地 | impl_os/board/bsp 三技能（含 Handler 机制） | 示例芯片跑通 Platform→Impl→Vendor |
| 4 | Service 组合 | software-system→service_system + 新增 10 个 service_* | Service 不 include Vendor 检查、跨芯片复用 |
| 5 | App 收敛 | app-architecture 只调 Service；App 禁 Vendor/Impl 门禁 | App 依赖检查、换芯片零改动演示 |

每阶段收尾：`npm test` + `validate:plugin` + `validate:links` + `build:codex-compat && git diff --exit-code`。

## 9. 影响面与联动

| 对象 | 动作 |
|---|---|
| codex/AGENTS.md + AGENTS.override.md | 分层同步，build:codex-compat 重生成 |
| tests/skills.test.js 等 | 层/技能数断言（33→42） |
| lib/agent-domains.js DOMAINS.layers | 层清单同步 |
| docs/plugin-boundaries.md / plugin-execution-flow.md | 层边界、流程表述重写 |
| software-layer-contract.md / knowledge-graph.md | 改写为 5 层 + 范本结构 |
| commands/mcu-new.js / lib/generator.js | 工程骨架对齐范本目录 |

## 10. 决策总表（D1-D12，全部已定）

| # | 决策 | 状态 | ADR |
|---|---|---|---|
| D1 | 物理重排 + 迁移映射 | ✅ | 0001 |
| D2 | workflow/tools/hardware 是插件分层，不入软件架构五层 | ✅ | 0002 |
| D3 | mcu-platform 改名 vendor_stm32 | ✅ | 0003 |
| D4 | 错误码基线位于 `platform_common/platform_error.h`（`platform_err_t`） | ✅ | 0004 |
| D5 | bsp-handler 是 Impl 的一层（机制层） | ✅ | 0005 |
| D6 | 分阶段实施、每阶段独立验证可回滚 | ✅ | 0006 |
| D7 | Vendor 只登记映射不复制源码 | ✅ | 0007 |
| D8 | App 依赖门禁阶段 5 收紧 | ✅ | 0008 |
| D9 | 中间件整体归 Vendor（不强制三段切） | ✅ | 0009 |
| D10 | Service = App 常见业务抽象 | ✅ | 0010 |
| D11 | 新技能下划线命名 | ✅ | 0011 |
| D12 | 技能跟随归属，不为凑层强造技能 → **后被反转**：平台层定为 5 技能（见 CONTEXT.md） | ✅ | 0012 |

## 11. 验收标准

1. 任一技能能明确说出归属层且符合依赖铁律；
2. Platform 技能目录 `.c` 不依赖芯片/RTOS/厂商符号（允许无芯片依赖的公共实现）；
3. Vendor 目录零上层符号（grep）+ 源码不复制只登记；
4. App 目录零 Vendor/Impl 符号（grep）；
5. 同一 Service 在两个不同芯片 Impl 上复用（示例验证）；
6. 生成工程目录与范本（01_App…99_Utils）对齐；
7. 旧调用名全部经 MIGRATION_MAP 可解析（回归测试覆盖）；
8. 不为空层造技能：每个技能都有真实来源或真实业务需求。
