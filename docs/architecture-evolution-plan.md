# 嵌入式软件架构进化方案：13 层 → 5 层契约分层

> 状态：**已确认 D1/D3/D5/D6 + 用户提供目标工程目录范本（新文件2.txt）** | 日期：2026-08-07
> 依据：`software-layer-contract.md`、`software-architecture-knowledge-graph.md`、`docs/plugin-boundaries.md`、用户目标工程目录范本
> 目标：把"物理目录分层 + 契约分散"进化为"**App / Service / Platform / Impl / Vendor** 五层契约分层"

### 已确认决策（2026-08-07）

| # | 决策 | 结论 |
|---|---|---|
| D1 | 落地方式 | **物理重排 + 迁移映射**：skills 目录真正拆成 5 层，旧 id 走 MIGRATION_MAP 兼容 |
| D3 | mcu-platform 命名 | **改名 vendor-stm32 等**：归 Vendor 层并按厂商命名，旧名保留为别名 |
| D5 | bsp-handler 定位 | **handler 是 Impl 的一层**：归 Impl 层（机制层），非 Service |
| D6 | 迁移节奏 | **分阶段实施**，每阶段独立验证可回滚 |
| D9 | Middleware 定位 | **中间件源码归 Vendor**；能力接口归 Platform（platform_middleware）；移植归 Impl（impl_middleware） |
| D10 | Service 定位 | **Service = App 常见业务抽象**（battery/backlight/log/ota/power/sensor/storage/watchdog…），非技术能力组合 |

---

## 1. 进化背景：为什么改

### 1.1 现状（11 层契约 / 13 个技能层）

```text
APP ──┬─ OS Wrapper (osal_*) → OS Port → OS Runtime
      ├─ BSP Wrapper → BSP Port → BSP Handler → BSP HAL Driver → Core → MCU
      └─ Middleware Public API
横切：workflow（AI 流程）、tools（工程操作）、hardware（PCB/VISA）
```

### 1.2 现状痛点

| # | 痛点 | 具体表现 |
|---|---|---|
| P1 | **契约三套体系分散** | `osal_*`（OS）、BSP Wrapper 函数表（板级）、Core 事务 API（MCU）各成体系，错误码、ctx、ops 没有统一基线 |
| P2 | **Middlewares 源码与能力混放** | LVGL/FatFS/FlashDB/letter_shell 的"源码底座"与"能力接口/移植"在同一个技能里，无法区分"拿来"与"沉淀" |
| P3 | **APP 允许直连 Wrapper** | 当前 APP 可直接调 OS Wrapper、BSP Wrapper——"怎么干"泄漏到业务层，换板/换芯片时 App 跟着动 |
| P4 | **分层粒度不一** | BSP 内部细到 4 层（Wrapper/Port/Handler/Driver），OS 与 Middleware 只有粗粒度，抽象粒度不齐 |
| P5 | **Platform 与 Vendor 未切开** | Core（抽象能力）与 MCU（CMSIS/HAL/寄存器）边界靠约定，代码上无强约束，Impl 层缺位 |
| P6 | **缺 Service 业务层** | 现有技能没有"从 App 常见业务抽象出的服务"这一层——电池/背光/日志/OTA 等业务能力无归属 |

### 1.3 进化目标（一句话）

> **App 编排产品业务，Service 沉淀 App 常见业务，Platform 只定义能力契约（接口/错误码/数据结构/ops/ctx），Impl 负责落地，Vendor 垫底（源码只登记映射不复制）。**

---

## 2. 目标架构定义（5 层）

### 2.1 目标工程目录全景（用户范本：新文件2.txt）

```text
项目根
├─ 00_Docs        文档：资源分配表 / 架构设计（五层职责/依赖方向/对象模型/生命周期）/ 接口协议
├─ 00_Config      配置：app_config / product_config / compile_config / feature_config
├─ 01_App         产品业务流程：app_main / app_init / app_system / app_ble / app_hmi(ui+ui_task) / app_ota
├─ 02_Service     App 常见业务抽象：service_system / battery / backlight / calendar / diagnosis / log
│                 / ota / power / sensor / storage / watchdog（各带 _model.h/_state.h/_fault_code.h）
├─ 03_Platform    平台抽象（纯头文件）：
│   ├─ platform_common     platform_def / error / type / object / registry
│   ├─ platform_mcu        io / i2c / spi / uart / adc / timer / pwm / dma / rtc / power / watchdog / interrupt
│   ├─ platform_os         thread / mutex / sem / queue / event / os_timer / delay / critical / memory
│   ├─ platform_bsp        board / battery / backlight / charge / display / touch / imu / airpressure
│   │                      / temperature_humi / hartrate / magnetic / speaker / motor / storage_device
│   └─ platform_middleware  log / fs / kv / crypto / gui / comm
├─ 04_Impl         平台适配（具体实现）：
│   ├─ impl_board          board_resource_config / board_bsp_register
│   ├─ impl_mcu            stm32f411_io/i2c/spi/uart/adc/timer/pwm/power/rtc/watchdog…
│   ├─ impl_os             freertos_thread/mutex/sem/queue/event/timer/delay…
│   ├─ impl_bsp            bsp_battery/backlight/charge/display/touch/imu/airpressure/…
│   └─ impl_middleware     easylogger_port / rtt_log_port / fatfs_port / crypto_port / lvgl_port / comm_port
├─ 05_Vendor        底座登记：README / vendor_mapping.md / patch（源码不复制，只登记映射 + 补丁）
├─ 06_Toolchain     MDK / IAR / CMake / scripts
└─ 99_Utils         通用工具：utils_crc / ringbuffer / filter / list
```

### 2.2 逐层职责与约束

#### App 层 — 产品业务流程

| 属性 | 内容 |
|---|---|
| 职责 | 产品要干什么：业务流程编排、状态机、交互（范本：app_ble / app_hmi / app_ota / app_system / app_init） |
| 依赖 | **只调 Service** |
| 禁止 | 直接操作 HAL / Platform / Impl / Vendor 任何符号；不得 include 具体芯片头文件 |
| 换芯片 | **零改动**（前提：所需业务 Service 已沉淀） |
| 交付物 | `01_App/` 按业务域分模块 |

#### Service 层 — App 常见业务抽象（带业务策略）

| 属性 | 内容 |
|---|---|
| 职责 | **把 App 常见业务抽象成可跨产品复用的服务**：电池、背光、日历、诊断、日志、OTA、电源、传感器、存储、看门狗、系统 |
| 关键定位 | **不是驱动封装，也不是中间件**——是"业务服务"：每个 service 带业务模型（`_model.h`）、状态机（`_state.h`）、故障码（`_fault_code.h`），封装业务策略（电量计算、低电量告警、背光自动调节、喂狗策略、OTA 回滚策略） |
| 依赖 | Platform 接口（platform_mcu/os/bsp/middleware）与 ops；可组合其他 Service |
| 禁止 | include Vendor 头文件、直接碰寄存器/HAL、直接依赖具体中间件源码 |
| 换芯片 | **零改动**（Platform 接口不变，Impl 换实现即可） |
| 交付物 | `02_Service/` 每个服务一个模块（.c/.h + 模型头） |

#### Platform 层 — 平台抽象层（纯定义）

| 属性 | 内容 |
|---|---|
| 职责 | 定义统一能力契约，不绑定任何具体芯片（范本：platform_common/mcu/os/bsp/middleware 五个子域）；**技能目录允许无芯片/RTOS/厂商依赖的公共实现**，`platform_common` 含对象模型实现 |
| 五大统一 | ① **统一接口**：`platform_*_api.h` 能力接口 ② **统一错误码**：`platform_error.h`（`platform_err_t`）③ **统一数据结构**：`platform_type.h` ④ **统一对象协议**：`platform_object.h`（对象身份/状态）+ `platform_lifecycle.h`（生命周期回调）⑤ **统一 ctx 上下文**：对象自携带 `p_self`/`p_parent` 关系（`platform_registry.h` 注册表已废弃） |
| 子域 | `platform_mcu`（外设能力）/ `platform_os`（OS 能力）/ `platform_bsp`（板级器件能力）/ `platform_middleware`（中间件能力接口：log/fs/kv/crypto/gui/comm）/ `platform_common`（公共定义与对象模型） |
| 禁止 | 任何芯片头文件、任何厂商类型；实现代码仅限技能目录之外（`platform_common` 对象模型实现为例外） |
| 换芯片 | 接口永不因芯片改变 |
| 交付物 | `03_Platform/` **头文件集** |

#### Impl 层 — 平台适配层（Platform → Vendor）

| 属性 | 内容 |
|---|---|
| 职责 | 把 Platform 抽象接口**落到具体平台**（范本：impl_board/mcu/os/bsp/middleware 五个子域） |
| 内部子域 | ① **impl_board**：板级资源配置 + BSP 注册（组合根）② **impl_mcu**：芯片后端（stm32f411_*）③ **impl_os**：RTOS 绑定（freertos_*）④ **impl_bsp**：器件驱动实现（bsp_*）⑤ **impl_middleware**：中间件移植（lvgl_port/fatfs_port/easylogger_port…） |
| Handler 机制 | **bsp-handler 是 Impl 的一层**（已确认 D5）：多实例、生命周期、缓存、重试、请求串行化属机制层，落在 impl_bsp 内 |
| 依赖 | Platform 接口 + Vendor 底座；Handler 只用注入的 Ops |
| 禁止 | 反向定义接口；被 App 直接调用；含业务策略（策略在 Service） |
| 换芯片 | **换整套 Impl**（一个芯片 = 一个 Impl 变体），App/Service 不动 |
| 交付物 | `04_Impl/<子域>/` 实现代码 |

#### Vendor 层 — 厂家与第三方底座

| 属性 | 内容 |
|---|---|
| 职责 | 只提供底座能力：STM32 HAL 库、CMSIS、CubeMX 生成代码、FreeRTOS 源码、LVGL 源码、FatFS 源码、EasyLogger、FlashDB、letter_shell、CMSIS-DSP、芯片原厂 SDK |
| 管理方式 | **源码不复制进仓库**：`vendor_mapping.md` 登记来源/版本/路径；改动只进 `patch/` 目录打补丁（范本已实证） |
| 原则 | **不反向调用 App / Service / Platform / Impl**；不理解产品业务 |
| 交付物 | `05_Vendor/` README + vendor_mapping.md + patch/ |

### 2.3 依赖铁律

```text
App → Service → Platform ← Impl → Vendor
                 （Service 只依赖 Platform 接口）

Vendor 不得 include/调用  App / Service / Platform / Impl 任何符号
App 不得 include/调用      HAL / Platform 实现 / Impl / Vendor 任何符号
Platform 技能目录不得包含实现（头文件契约；platform_common 对象模型实现除外）
中间件源码在 Vendor；Platform 只见其中间件能力接口；Impl 做移植
```

---

## 3. 现状 → 目标映射表（技能级）

| 当前层 / 技能 | 进化去向 | 说明 |
|---|---|---|
| `app-architecture` | **App**（保留） | 依赖规则改写为"只调 Service"；按业务域分模块（范本 app_ble/app_hmi/app_ota） |
| **新增** | **Service** | 新增 `service-*` 技能族：battery/backlight/log/ota/power/sensor/storage/watchdog/diagnosis/calendar/system（对应范本 02_Service） |
| `os-adapter`（osal_* 契约） | **Platform** | OS 能力接口并入 platform_os（thread/mutex/sem/queue/event/timer/delay/critical/memory） |
| `bsp-wrapper`（函数表/注册） | **Platform** | 归 **platform-bsp**（v2 修正）：函数表/注册机制为 platform_bsp 的对象协议（registry/object） |
| `core-mcu`（总线/GPIO/DMA/IRQ 事务 API） | **Platform** | 接口定义进 platform_mcu（io/i2c/spi/uart/adc/timer/pwm/dma/rtc/power/watchdog/interrupt） |
| `mcu-platform`（CMSIS/HAL/LL/SPL/寄存器/SDK） | **Vendor** | 改名 vendor-stm32 等（已确认 D3）；vendor_mapping.md 登记 |
| `os-runtime`（FreeRTOS 绑定） | **Impl** | `os_*_impl()` 落 impl_os/freertos_*（已确认 D5 同类） |
| `bsp-port`（平台对象绑定/组合根） | **Impl** | 平台绑定与资源注入落 impl_board（board_resource_config + board_bsp_register） |
| `bsp-hal-driver`（器件协议） | **Impl** | 器件驱动实现落 impl_bsp/bsp_* |
| `bsp-handler`（多实例/生命周期/缓存/重试） | **Impl** | **Handler 机制子层**（已确认 D5），落 impl_bsp |
| `software-system`（bootloader/低功耗/看门狗/安全） | **Service** | 升格 service-system；安全接口并入 platform-bsp 或 service-system 说明，不另造技能 |
| `middleware-communication`（MQTT/BLE/CAN…） | **Vendor** | 归位 vendor-stack（协议栈源码与知识整体归底座，v2 不强制三段切） |
| `middleware-storage`（FatFs/SFUD） | **Vendor** | 归位 vendor-fatfs |
| `middleware-fal` / `flashdb` | **Vendor** | 归位 vendor-fal / vendor-flashdb |
| `middleware-lvgl` | **Vendor** | 归位 vendor-lvgl |
| `middleware-letter-shell` | **Vendor** | 归位 vendor-letter-shell |
| `middleware-algorithms` | **Vendor** | 归位 vendor-dsp |
| `workflow-*`（5 个） | 横切保留 | AI 流程层，不入 5 层 |
| `tools-*`（9 个） | 横切保留 | 工程操作层，不入 5 层；对应范本 06_Toolchain |
| `hardware-*`（2 个） | 横切保留 | 硬件分析层，不入 5 层 |

### 映射原则

> ~~**技能跟随现有归属，不为凑层强造技能**（v2）~~ **已被后续决策反转**（见 CONTEXT.md）：平台层定为 5 技能 `platform_common` / `platform_mcu` / `platform_os` / `platform_bsp` / `platform_middleware`，公共定义与中间件能力接口独立成技能。
> **中间件归 Vendor**：middleware-* 整体归位 vendor-*（源码/移植/知识随底座保留，不强制三段切）。
> **业务抽象**：App 里重复出现的业务（电池/背光/日志/OTA/存储/看门狗…）抽象为 Service，按业务域组织。
> **机制与策略分离**：机制（多实例/缓存/重试）在 Impl/Handler；策略（何时/如何决策）在 Service。

---

## 4. 关键设计：Platform 五大统一的 C 语言落地

### 4.1 统一接口（能力接口）

```c
/* 03_Platform/platform_middleware/platform_fs.h —— 存储能力接口（仅声明） */
typedef struct platform_fs platform_fs_t;
platform_err_t platform_fs_open(platform_fs_t *fs, const platform_fs_cfg_t *cfg);
platform_err_t platform_fs_read(platform_fs_t *fs, const char *path, void *buf, uint32_t *len);
platform_err_t platform_fs_write(platform_fs_t *fs, const char *path, const void *buf, uint32_t len);
```

### 4.2 统一错误码

```c
/* 03_Platform/platform_common/platform_error.h —— 全局错误码基线（唯一事实源，类型 platform_err_t） */
typedef enum {
    PLATFORM_ERR_OK              = 0,
    PLATFORM_ERR_GENERAL         = 1,
    PLATFORM_ERR_TIMEOUT         = 2,
    PLATFORM_ERR_PARAM           = 3,
    PLATFORM_ERR_NO_MEMORY       = 4,
    PLATFORM_ERR_NO_RESOURCE     = 5,
    PLATFORM_ERR_NOT_SUPPORTED   = 6,
    PLATFORM_ERR_NOT_INITIALIZED = 7,
    PLATFORM_ERR_ALREADY_INIT    = 8,
    PLATFORM_ERR_BUSY            = 9,
    PLATFORM_ERR_FAIL            = 10,
    PLATFORM_ERR_RESERVED        = 0x7FFFFFFF
    /* Service/Impl 可在其后扩展，禁止重复编号 */
} platform_err_t;
```

### 4.3 统一数据结构 / 统一 ctx

```c
/* 03_Platform/platform_common/platform_object.h —— 对象协议（身份 + 生命周期，取代注册表） */
typedef struct {
    uint32_t                        magic;       /* 运行时身份校验值      */
    const char                     *name;        /* 对象名，如 display0    */
    platform_object_type_t          type;        /* 对象高层类型          */
    platform_object_state_t         state;       /* 对象生命周期状态      */
    uint32_t                        flags;       /* 扩展标志位            */
    void                           *p_self;      /* 指向具体拥有者        */
    void                           *p_parent;    /* 指向父对象/管理器     */
    const platform_lifecycle_ops_t *p_lifecycle; /* 生命周期回调表        */
    void                           *user_data;   /* 用户扩展指针          */
} platform_object_t;

/* 03_Platform/platform_common/platform_lifecycle.h —— 生命周期回调表 */
typedef struct {
    platform_err_t (*init)(void *p_self);    /* 对象初始化            */
    platform_err_t (*start)(void *p_self);   /* 对象启动入口          */
    platform_err_t (*process)(void *p_self); /* 周期处理（可选）      */
    platform_err_t (*stop)(void *p_self);    /* 对象停止入口          */
    platform_err_t (*sleep)(void *p_self);   /* 低功耗入口（可选）    */
    platform_err_t (*wakeup)(void *p_self);  /* 唤醒入口（可选）      */
    platform_err_t (*deinit)(void *p_self);  /* 对象资源释放          */
} platform_lifecycle_ops_t;
```

### 4.4 统一 ops 函数指针（对象协议）

```c
/* 03_Platform/platform_bsp/platform_battery.h —— 电池能力 ops */
typedef struct platform_battery_ops {
    platform_err_t (*init)(platform_object_t *obj);
    platform_err_t (*read_voltage)(platform_object_t *obj, uint32_t *mv);
    platform_err_t (*read_level)(platform_object_t *obj, uint8_t *percent);
    platform_err_t (*deinit)(platform_object_t *obj);
} platform_battery_ops_t;
```

### 4.5 落地方式

- Platform 目录允许**无芯片/RTOS/厂商依赖**的公共实现（静态门禁校验；绑定硬件/OS 的实现必须在 Impl）；
- 错误码单一事实源：现有 `bsp/references/common-error-patterns.md` 升级为 Platform 错误码规范；
- 现状 `osal_*` / BSP 函数表 / Core 事务 API 三套契约**归一**到 Platform，旧符号走兼容别名过渡；
- Vendor 源码不复制：`vendor_mapping.md` 登记 + `patch/` 打补丁。

---

## 5. 迁移路线（分阶段，可回滚）

> 原则：**契约先行、目录渐进、兼容过渡**。每阶段独立可验证。

| 阶段 | 目标 | 主要动作 | 验证 | 可回滚性 |
|---|---|---|---|---|
| **阶段 0** | 方案定稿 | 本文档审查通过，决策点全部拍板 | 用户确认 | — |
| **阶段 1** | Vendor 归位 | `mcu-platform` → vendor-stm32（改名+迁移）；新建 Vendor 规范：`vendor_mapping.md` 模板 + patch 目录；中间件源码登记（LVGL/FatFS/FreeRTOS/EasyLogger/FlashDB…） | catalog 解析、validate:plugin、链接检查 | 高（纯目录迁移 + MIGRATION_MAP） |
| **阶段 2** | Platform 契约化 | 新建 `03_Platform` 范本五个子域头文件（platform_common/mcu/os/bsp/middleware）；osal_*/BSP 函数表/Core 事务 API 归一；补静态门禁（Platform 目录零 `.c`） | Platform 头文件可编译；旧技能引用兼容 | 中（新增为主） |
| **阶段 3** | Impl 落地 | `os-runtime`/`bsp-port`/`bsp-hal-driver`/`bsp-handler` → impl 子域（board/mcu/os/bsp/middleware）；中间件移植（lvgl_port/fatfs_port/easylogger_port…）→ impl_middleware | 一个示例芯片完整跑通 Platform→Impl→Vendor | 中 |
| **阶段 4** | Service 组合 | 新增 `service-*` 技能族（battery/backlight/log/ota/power/sensor/storage/watchdog/diagnosis/calendar/system）；`software-system` 能力归入；示例服务跨芯片复用 | Service 不 include Vendor 静态检查；跨芯片复用演示 | 中 |
| **阶段 5** | App 收敛 | `app-architecture` 依赖规则改为"只调 Service"；按业务域分模块；补门禁（App 目录禁 include Platform 实现/Vendor） | App 依赖检查门禁 + 换芯片零改动演示 | 高（规则收紧） |

### 阶段间兼容

- `catalog.js` 的 `MIGRATION_MAP` 保留全部旧 id → 新 id 映射；
- 技能 id 沿用当前命名（如 `bsp-handler` 阶段 3 归 impl，语义不变）；
- 每阶段结束跑：`npm test` + `validate:plugin` + `validate:links` + `validate:layer`，与 CI 对齐。

---

## 6. 影响面与联动成本

| 对象 | 影响 |
|---|---|
| `skills/catalog-metadata.js` / `catalog.js` | layer 集合收敛为 5 层 + 横切；新增 `service`、`impl`、`vendor` 层；CANONICAL_ORDER 重排；MIGRATION_MAP 扩充 |
| 技能 SKILL.md（约 16 个涉迁移 + 新增 11 个 service） | 层归属、目录、命名；职责描述按新层改写 |
| `references/` 目录 | 按新层归位；`software-layer-contract.md` / `layered-architecture-model.md` / 知识图谱改写为 5 层 + 范本结构 |
| `docs/plugin-boundaries.md` | 层边界矩阵重写 |
| `codex/AGENTS.md` 源头 + `AGENTS.override.md` | 分层描述同步（`npm run build:codex-compat` 重生成） |
| `tests/skills.test.js` 等 | 层/技能数断言更新 |
| `lib/agent-domains.js` DOMAINS.layers | 层清单同步（影响 agent 技能派生） |
| `docs/plugin-execution-flow.md` 等 | 流程文档中的层表述 |
| Node CLI（commands/mcu-new.js 等） | 工程骨架生成器需对齐新目录范本（01_App…99_Utils） |

---

## 7. 决策点（D1-D10）

| # | 决策点 | 结论 / 选项 | 状态 |
|---|---|---|---|
| **D1** | 目录物理重排 | 物理重排 + catalog 迁移映射 | ✅ 已定 |
| **D2** | 横切层（workflow/tools/hardware） | 保留现状不入 5 层（对应范本 06_Toolchain 另立） | 待定（建议保留） |
| **D3** | `mcu-platform` 命名 | 改名 `vendor-stm32` 等，旧名别名 | ✅ 已定 |
| **D4** | 错误码基线 | Platform 定义全局错误码（platform_error.h） | 待定（建议 A） |
| **D5** | `bsp-handler` 定位 | Handler 是 Impl 的一层（机制层） | ✅ 已定 |
| **D6** | 迁移节奏 | 分阶段实施 | ✅ 已定 |
| **D7** | Vendor 源码管理 | **只登记映射不复制源码**（vendor_mapping.md + patch，用户范本实证） | ✅ 已定 |
| **D8** | App 依赖门禁 | 阶段 5 统一收紧"App 只调 Service" | 待定（建议 B） |
| **D9** | Middleware 定位 | 中间件源码与知识**整体归 Vendor**（vendor-*），不强制三段切 | ✅ 已定 |
| **D10** | Service 定位 | App 常见业务抽象，带 _model/_state/_fault_code | ✅ 已定 |
| **D12** | 技能跟随归属 | ~~不为凑层强造技能~~ → **已反转**：平台层定为 5 技能（platform_common/mcu/os/bsp/middleware），见 CONTEXT.md | ✅ 已定（后被反转） |

---

## 8. 验收标准（方案层面）

1. 任一技能都能明确说出归属层，且符合该层依赖铁律；
2. Platform 技能目录实现不依赖芯片/RTOS/厂商符号（静态检查可验证；允许无芯片依赖的公共实现）；
3. Vendor 目录零上层符号（grep 可验证），源码不复制只登记；
4. App 目录零 Vendor/Impl 符号（grep 可验证）；
5. 同一个 Service 可在两个不同芯片 Impl 上复用（示例验证）；
6. 生成的新工程目录与用户范本（01_App…99_Utils）对齐；
7. 旧调用名全部经 MIGRATION_MAP 可解析（回归测试覆盖）。
