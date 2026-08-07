# 当前插件架构 → 目标架构：转化实施方案（实施篇）

> 状态：**待审查** | 日期：2026-08-07 | 修订 v2（2026-08-07）
> 前置：`docs/architecture-evolution-plan.md`（总纲，含决策 D1-D10）
> 本文是执行细则：技能级转化矩阵、新技能定义、catalog 改造、目录重排、分阶段动作。
> **v2 修正**：① `bsp-wrapper` 归 **platform-bsp**（非 platform-common）；② 技能跟随现有归属，**不为凑齐子域强行造技能**——无来源的层级（platform-common/platform-middleware/impl-mcu/impl-middleware）不建独立技能，能力并入相邻技能或头文件规范承载。

---

## 0. 转化总览

```text
当前（13 层技能 + 33 active）                目标（5 层运行时 + 3 横切）
─────────────────────────────              ─────────────────────────────
workflow(5)  ──────────────── 保留 →        workflow(5) 横切
app(1)       ──────────────── 保留 →        app(1)
os(2)        ──────────────── 拆 →          platform-os + impl-os
bsp(4)       ──────────────── 拆 →          platform-bsp + impl-board/impl-bsp
core(1)      ──────────────── 归位 →        platform-mcu
mcu(1)       ──────────────── 改名 →        vendor-stm32
middleware(7)────────────── 归位 →        vendor-*（源码底座知识）
system(1)    ──────────────── 升格 →        service-system
（无）       ──────────────── 新增 →        service-*（10 个业务服务，按业务域）
tools(9)     ──────────────── 保留 →        tools(9) 横切
hardware(2)  ──────────────── 保留 →        hardware(2) 横切
```

**三个原则**：① 技能跟随现有归属，**不为凑层强造技能**；② Service 按**业务域**组织；③ 机制归 Impl、策略归 Service。

---

## 1. 技能级转化矩阵（33 个 active 逐一）

| # | 当前 id（层） | 目标层 | 新 id（建议） | 动作 |
|---|---|---|---|---|
| 1 | `app-architecture` (app) | **App** | `app-architecture` | 保留；依赖规则改"只调 Service" |
| 2 | `os-adapter` (os) | **Platform** | `platform-os` | 改名+迁移；osal_* 契约并入 platform_os 接口（thread/mutex/sem/queue/event/timer/delay/critical/memory） |
| 3 | `os-runtime` (os) | **Impl** | `impl-os` | 改名+迁移；FreeRTOS 绑定落 impl_os/freertos_* |
| 4 | `bsp-wrapper` (bsp) | **Platform** | `platform-bsp` | 改名+迁移（v2 修正）；函数表/注册机制为 platform_bsp 的对象协议（registry/object） |
| 5 | `bsp-port` (bsp) | **Impl** | `impl-board` | 改名+迁移；组合根：board_resource_config + board_bsp_register |
| 6 | `bsp-hal-driver` (bsp) | **Impl** | `impl-bsp` | 改名+迁移；器件驱动实现落 impl_bsp/bsp_* |
| 7 | `bsp-handler` (bsp) | **Impl** | `impl-bsp`（Handler 机制） | 改名+迁移；多实例/生命周期/缓存/重试为 impl_bsp 内机制子层（D5） |
| 8 | `core-mcu` (core) | **Platform** | `platform-mcu` | 改名+迁移；MCU 能力接口（io/i2c/spi/uart/adc/timer/pwm/dma/rtc/power/watchdog/interrupt）定义留 Platform，实现细节并入 platform-mcu 的 Impl 说明或 vendor 底座 |
| 9 | `mcu-platform` (mcu) | **Vendor** | `vendor-stm32` | 改名+迁移（D3）；vendor_mapping.md 登记 CMSIS/HAL/CubeMX |
| 10 | `middleware-lvgl` (middleware) | **Vendor** | `vendor-lvgl` | 改名+迁移；LVGL 源码/移植/知识整体归底座（v2：不强制三段切） |
| 11 | `middleware-communication` (middleware) | **Vendor** | `vendor-stack` | 改名+迁移；MQTT/BLE/CAN 等协议栈源码与知识归底座 |
| 12 | `middleware-storage` (middleware) | **Vendor** | `vendor-fatfs` | 改名+迁移；FatFs/SFUD 源码与知识归底座 |
| 13 | `middleware-fal` (middleware) | **Vendor** | `vendor-fal` | 改名+迁移；FAL 源码与知识归底座 |
| 14 | `middleware-flashdb` (middleware) | **Vendor** | `vendor-flashdb` | 改名+迁移；FlashDB 源码与知识归底座 |
| 15 | `middleware-letter-shell` (middleware) | **Vendor** | `vendor-letter-shell` | 改名+迁移；letter_shell 源码与知识归底座 |
| 16 | `middleware-algorithms` (middleware) | **Vendor** | `vendor-dsp` | 改名+迁移；CMSIS-DSP/算法库源码与知识归底座 |
| 17 | `software-system` (system) | **Service** | `service-system` | 升格；Bootloader/低功耗/看门狗/安全策略按业务域归 service-system/power/watchdog（安全接口并入 platform-bsp 或 service-system 说明，不另造技能） |
| 18-26 | `tools-build/flash/linker/debug/observability/quality/git/release/learning-tutor` (tools) | **Tools 横切** | 不变 | 保留（对应范本 06_Toolchain） |
| 27-28 | `hardware-pcb-analysis` / `hardware-visa-debug` (hardware) | **Hardware 横切** | 不变 | 保留 |
| 29-33 | `workflow-*`（5 个） | **Workflow 横切** | 不变 | 保留 |

> 归档技能（platform/interface/security 旧层 76 条）不动，继续作为 legacy 依据；转化只处理 active 33。

### 转化后技能分布（目标态）

| 层 | 技能 | 数量 |
|---|---|---|
| workflow | requirements-router / claude-layering / review-gate / integration-plan / final-review | 5 |
| app | app-architecture | 1 |
| service | service-system（由 software-system 升格）+ battery / backlight / calendar / diagnosis / log / ota / power / sensor / storage / watchdog | 11 |
| platform | platform-mcu / platform-os / platform-bsp | 3 |
| impl | impl-os / impl-board / impl-bsp（含 Handler 机制） | 3 |
| vendor | vendor-stm32 + vendor-lvgl / vendor-stack / vendor-fatfs / vendor-fal / vendor-flashdb / vendor-letter-shell / vendor-dsp | 8 |
| tools | build / flash / linker / debug / observability / quality / git / release / learning-tutor | 9 |
| hardware | pcb-analysis / visa-debug | 2 |
| **合计** | | **42** |

> v2 说明：platform-common、platform-middleware、impl-mcu、impl-middleware **不建独立技能**——统一错误码/类型/对象协议作为 `platform-bsp`（或新增头文件规范章节）承载；中间件移植知识随 vendor 技能保留；芯片实现知识并入 platform-mcu / vendor-stm32。**有技能才建层，无技能不凑层。**

---

## 2. 新增 Service 技能定义（11 个，按业务域）

对应范本 `02_Service/`。每个 service 交付：`.c/.h` + `_model.h`（数据模型）+ `_state.h`（状态机）+ `_fault_code.h`（故障码）。

| 新 id | 业务域 | 职责（带策略） | 依赖 Platform 接口 | 供谁用 |
|---|---|---|---|---|
| `service-system` | 系统 | 启动编排、健康状态、系统诊断汇总（含 Bootloader/安全策略） | platform_os/mcu/bsp | app_main/app_init |
| `service-battery` | 电池 | 电量计算、电压/充电状态、低电量告警策略 | platform_bsp/battery | app_system/app_hmi |
| `service-backlight` | 背光 | 亮度调节、自动亮度/超时策略 | platform_bsp/backlight | app_hmi |
| `service-calendar` | 日历 | 时间管理、闹钟、日程策略 | platform_mcu/rtc | app_ble/app_hmi |
| `service-diagnosis` | 诊断 | 故障码管理、自检、诊断报告 | platform_mcu/os | app_system/app_ota |
| `service-log` | 日志 | 分级日志、环形缓冲、导出策略 | platform_bsp（log 规范） | 全 App |
| `service-ota` | OTA | 固件下载、校验、跳转、回滚策略 | platform_mcu/fs+comm 规范 | app_ota |
| `service-power` | 电源 | 待机/休眠/唤醒、功耗档位策略 | platform_mcu/power | app_system |
| `service-sensor` | 传感器 | 多传感器汇聚、滤波、单位转换、上报策略 | platform_bsp(imu/airpressure/…) | app_system/app_ble |
| `service-storage` | 存储 | 参数存取、KV、分区管理、掉电安全 | platform_mcu/flash+fs 规范 | 全 App |
| `service-watchdog` | 看门狗 | 喂狗策略、任务存活监控、复位诊断 | platform_mcu/watchdog | app_main/app_init |

---

## 3. Platform / Impl / Vendor 技能结构（跟随现有归属）

### Platform —— 3 个技能（v2：不为空层造技能）

| 技能 | 来源 | 内容 |
|---|---|---|
| `platform-mcu` | core-mcu | MCU 能力接口（io/i2c/spi/uart/adc/timer/pwm/dma/rtc/power/watchdog/interrupt）+ 统一错误码/类型/对象协议规范 |
| `platform-os` | os-adapter | OS 能力接口（thread/mutex/sem/queue/event/timer/delay/critical/memory） |
| `platform-bsp` | bsp-wrapper | 板级器件能力接口（board/battery/backlight/charge/display/touch/imu/…）+ 函数表/注册/对象协议 |

### Impl —— 3 个技能

| 技能 | 来源 | 内容 |
|---|---|---|
| `impl-board` | bsp-port | 板级组合根：board_resource_config + board_bsp_register |
| `impl-os` | os-runtime | RTOS 绑定：freertos_* |
| `impl-bsp` | bsp-hal-driver + bsp-handler | 器件驱动实现 + **Handler 机制子层**（多实例/生命周期/缓存/重试，D5） |

### Vendor —— 8 个技能（含 middleware 归位）

| 技能 | 来源 | 内容 |
|---|---|---|
| `vendor-stm32` | mcu-platform | CMSIS + HAL/LL + CubeMX + 原厂 SDK 登记 |
| `vendor-lvgl` | middleware-lvgl | LVGL 源码登记 + 移植/知识 |
| `vendor-stack` | middleware-communication | MQTT/BLE/CAN/Modbus 等协议栈登记 |
| `vendor-fatfs` | middleware-storage | FatFs/SFUD 源码登记 |
| `vendor-fal` | middleware-fal | FAL 源码登记 |
| `vendor-flashdb` | middleware-flashdb | FlashDB 源码登记 |
| `vendor-letter-shell` | middleware-letter-shell | letter_shell 源码登记 |
| `vendor-dsp` | middleware-algorithms | CMSIS-DSP/算法库登记 |

管理：`vendor_mapping.md` 登记来源/版本/路径 + `patch/` 补丁，**源码不复制**（D7 实证）。

---

## 4. catalog 改造设计

### 4.1 `catalog-metadata.js`

- `ARCHIVED_SOFTWARE_LAYERS`：更新为旧层集合（os/bsp/core/mcu/middleware/system 退役后加入归档集合）；
- `CANONICAL_DEFINITIONS`：重写为 5 层 —— app(1) / service(11) / platform(3) / impl(3) / vendor(8)；
- `TOOL_CANONICAL_DEFINITIONS`：不变（tools 9）；
- 新增 `SERVICE_DEFINITIONS`（11 条，见第 2 节表）；
- 新增 `VENDOR_DEFINITIONS`（8 条，见第 3 节表）。

### 4.2 `catalog.js`

- `CANONICAL_ORDER` 重排：workflow → app → service → platform → impl → vendor → hardware → tools；
- `MIGRATION_MAP` 扩充（旧 id → 新 id）：

```js
'os-adapter'             : 'platform-os',
'os-runtime'             : 'impl-os',
'bsp-wrapper'            : 'platform-bsp',        // v2 修正：platform-bsp 而非 platform-common
'bsp-port'               : 'impl-board',
'bsp-hal-driver'         : 'impl-bsp',
'bsp-handler'            : 'impl-bsp',
'core-mcu'               : 'platform-mcu',
'mcu-platform'           : 'vendor-stm32',
'middleware-lvgl'        : 'vendor-lvgl',
'middleware-communication': 'vendor-stack',
'middleware-storage'     : 'vendor-fatfs',
'middleware-fal'         : 'vendor-fal',
'middleware-flashdb'     : 'vendor-flashdb',
'middleware-letter-shell': 'vendor-letter-shell',
'middleware-algorithms'  : 'vendor-dsp',
'software-system'        : 'service-system',
// 旧 legacy/别名全部保留，resolveSkillId 兼容
```

### 4.3 职责边界

`registry.js` 只做兼容转发不动；`loader.js` 按新路径加载；`resolveSkillId()` 依赖 MIGRATION_MAP 自然兼容旧调用名。

---

## 5. 目录物理重排（git mv 清单）

```bash
# Platform
git mv skills/os/os-adapter           skills/platform/platform-os
git mv skills/core/core-mcu           skills/platform/platform-mcu
git mv skills/bsp/bsp-wrapper         skills/platform/platform-bsp
# Impl
git mv skills/os/os-runtime           skills/impl/impl-os
git mv skills/bsp/bsp-port            skills/impl/impl-board
git mv skills/bsp/bsp-hal-driver      skills/impl/impl-bsp
git mv skills/bsp/bsp-handler         skills/impl/impl-bsp/handler    # 机制子层（或独立 impl-bsp-handler）
# Vendor
git mv skills/mcu/mcu-platform        skills/vendor/vendor-stm32
git mv skills/middleware/middleware-lvgl       skills/vendor/vendor-lvgl
git mv skills/middleware/middleware-communication skills/vendor/vendor-stack
git mv skills/middleware/middleware-storage   skills/vendor/vendor-fatfs
git mv skills/middleware/middleware-fal       skills/vendor/vendor-fal
git mv skills/middleware/middleware-flashdb   skills/vendor/vendor-flashdb
git mv skills/middleware/middleware-letter-shell skills/vendor/vendor-letter-shell
git mv skills/middleware/middleware-algorithms skills/vendor/vendor-dsp
# Service（software-system 升格 + 新服务）
git mv skills/system/software-system  skills/service/service-system
mkdir -p skills/service skills/platform skills/impl skills/vendor
```

> 建议：一个技能一次 `git mv` + SKILL.md 头部改写 + references 内相对路径修正，分批提交。

---

## 6. 分阶段执行计划（文件级）

| 阶段 | 目标 | 动作（文件级） | 验证 | 状态 |
|---|---|---|---|---|
| **0** | 定稿 | 本文档 + evolution-plan 审查通过；D2/D4/D8 拍板 | 用户确认 | 进行中 |
| **1** | Vendor 归位 | `mcu-platform`→`vendor-stm32` + 7 个 `middleware-*`→`vendor-*`（git mv）；新建 `vendor_mapping.md` 模板 + `patch/`；catalog：vendor 层定义 + MIGRATION_MAP | catalog 解析、validate:plugin、validate:links | 待执行 |
| **2** | Platform 契约化 | `core-mcu`→`platform-mcu`、`os-adapter`→`platform-os`、`bsp-wrapper`→`platform-bsp`；Platform 头文件规范（错误码/类型/对象协议并入）；Platform 零 `.c` 静态门禁 | Platform 头文件可编译；旧技能引用兼容 | 待执行 |
| **3** | Impl 落地 | `os-runtime`→`impl-os`、`bsp-port`→`impl-board`、`bsp-hal-driver`/`bsp-handler`→`impl-bsp` | 一个示例芯片完整跑通 Platform→Impl→Vendor | 待执行 |
| **4** | Service 组合 | `software-system`→`service-system` + 新增 10 个 `service-*`（第 2 节表） | Service 不 include Vendor 静态检查；跨芯片复用演示 | 待执行 |
| **5** | App 收敛 | `app-architecture` 依赖规则改"只调 Service"；App 禁 include Platform 实现/Vendor 门禁 | App 依赖检查 + 换芯片零改动演示 | 待执行 |

### 每阶段通用收尾

```bash
npm test                    # jest 全量（36 suites）
npm run validate:plugin     # 技能/agent/层校验
npm run validate:links      # 链接检查
npm run build:codex-compat && git diff --exit-code   # codex 同步防漂移
```

---

## 7. 联动与回归

| 对象 | 动作 |
|---|---|
| `codex/AGENTS.md`（源头）+ `AGENTS.override.md` | 分层描述同步，`npm run build:codex-compat` 重生成 |
| `tests/skills.test.js` 等 | 层/技能数断言更新（33 active → 42） |
| `lib/agent-domains.js` DOMAINS.layers | 层清单同步（影响 agent 技能派生） |
| `docs/plugin-boundaries.md` / `plugin-execution-flow.md` | 层边界矩阵、流程层表述重写 |
| `skills/workflow/*/references/software-layer-contract.md` 等 | 改写为 5 层 + 范本结构 |
| `commands/mcu-new.js` / `lib/generator.js` 等 Node CLI | 工程骨架生成器对齐范本目录（01_App…99_Utils） |

---

## 8. 决策点汇总

| # | 决策 | 状态 |
|---|---|---|
| D1 物理重排 | ✅ 已定 |
| D2 横切层保留 | 待定（建议：保留） |
| D3 vendor-stm32 改名 | ✅ 已定 |
| D4 Platform 错误码基线 | 待定（建议：并入 platform-mcu 头文件规范，不另设技能） |
| D5 handler 是 Impl 的一层 | ✅ 已定 |
| D6 分阶段实施 | ✅ 已定 |
| D7 Vendor 只登记不复制 | ✅ 已定（范本实证） |
| D8 App 门禁阶段 5 收紧 | 待定（建议：B） |
| D9 中间件归 Vendor | ✅ 已定（v2：整体归位，不强制三段切） |
| D10 Service=业务抽象 | ✅ 已定 |
| D11 新技能命名连字符 | 建议 `service-battery`（与现有 id 一致） |
| **D12** 技能跟随归属、不凑层 | ✅ 已定（v2：platform-common/middleware、impl-mcu/middleware 不建独立技能） |

---

## 9. 验收标准

1. 任一技能能明确说出归属层且符合依赖铁律；
2. Platform 目录零 `.c`（静态检查）；
3. Vendor 目录零上层符号（grep）+ 源码不复制只登记；
4. App 目录零 Vendor/Impl 符号（grep）；
5. 同一 Service 在两个不同芯片 Impl 上复用（示例验证）；
6. 生成工程目录与范本（01_App…99_Utils）对齐；
7. 旧调用名全部经 MIGRATION_MAP 可解析（回归测试覆盖）；
8. **不为空层造技能**：每个技能都有真实来源或真实业务需求（v2）。
