# MCU-Workbench 统一命名规范（Naming Convention）

> 版本：v1.2 · 对齐架构 v2.0 五层契约分层（App / Service / Platform / Impl / Vendor）
> v1.1 变更：Platform 层允许 `.c` 实现、允许依赖 Impl 基础类型头（工程需要为准，见 §1.1 / 设计原则 5）
> v1.2 变更：统一命名重构落地——`lib/generator.js` / `templates/` / 分层校验器 / 测试锁步对齐本规范（§8 差距清单已清零）；新增 §9 宿主边界与 JSON 序列化规则；§1.1 目录对齐 `mcu-new` 生成树（00_Config…99_Utils）
> 适用范围：插件生成的嵌入式工程目录、源文件、类型、函数、变量与宏，以及插件自身 JS/CLI 边界（见 §9）。
> 依据：范本目录（01_App…99_Utils）、`docs/architecture-overall-plan.md`（D4/D11）、`platform_mcu` 头文件规范、`skills/service/*` 交付约定。

---

## 0. 设计原则

1. **snake_case 唯一分隔风格**：目录、文件、函数、变量、类型一律小写下划线；全大写仅用于宏与枚举常量。
2. **命名即契约**：符号前缀承载层归属（`app_` / `service_` / `platform_` / `impl_` / `vendor_` / `utils_`），从名字即可读出层、模块、对象、动作。
3. **公开带前缀、私有带 `s_`**：对外符号必带层前缀；文件内 `static` 符号统一 `s_` 前缀。
4. **厂商型号只出现在 Impl 层**：`stm32f411_*`、`freertos_*` 等厂商/底座名仅在 `04_Impl` 出现，禁止上浮到 Platform/Service/App。
5. **Platform 层允许实现**：`03_Platform` 以接口定义为主，但可含 `.c`（如 `platform_common` 的对象模型实现），可依赖 Impl 层基础类型头（工程需要为准）——"零 .c"门禁仅适用于插件 `skills/platform` 技能目录，不约束生成工程。

---

## 1. 目录命名

### 1.1 工程顶层（固定，数字前缀仅表达排序语义）

| 目录 | 内容 | 命名规则 |
|---|---|---|
| `00_Config` | 配置 | 固定名；config 四件套见 §2.2 |
| `01_App` | 产品业务 | 层内子目录用短业务名（`ble`、`hmi`、`ota`、`system`） |
| `02_Service` | 业务服务 | 层内子目录 `service_<域>`（snake_case） |
| `03_Platform` | 接口定义为主，允许承载实现 | 层内子目录 `platform_<子域>`（mcu/os/bsp/middleware/...）。可含 `.c`（如 platform_common 对象模型实现）；允许依赖 Impl 层基础类型头（如 `impl_board_types.h`）——工程需要为准 |
| `04_Impl` | 适配实现 | 层内子目录 `impl_<子域>` 或厂商名（`stm32f411_*`） |
| `05_Vendor` | 第三方底座 | 层内 `vendor_mapping.md` + `patch/`，源码不复制 |
| `06_Toolchain` | 工具链 | 固定名 |
| `99_Utils` | 通用工具 | 层内子目录 `utils_<模块>`（crc/ringbuffer/filter/list） |

### 1.2 层内子目录规则

- 全小写 snake_case：`service_battery`、`platform_mcu`、`impl_bsp`、`utils_crc`。
- 顶层数字前缀（01/02/…/99）**不进入符号命名**，仅目录排序。
- 技能目录（`skills/<layer>/<id>`）与工程目录同规则：D11 已定下划线命名（`service_battery`、`platform_mcu`、`impl_os`、`vendor_stm32`）。

---

## 2. 文件命名

### 2.1 源文件与头文件

- 规则：`<模块>_<对象>.c/.h`（snake_case），同名成对。
- 头文件 guard：**`<模块大写>_<对象大写>_H`，禁用双下划线头尾**（MISRA 21.1 保留给实现）。

| 模块 | 文件名 | Guard |
|---|---|---|
| GPIO Platform 接口 | `platform_gpio.c/.h` | `PLATFORM_GPIO_H` |
| I2C ops 定义 | `platform_i2c_ops.h` | `PLATFORM_I2C_OPS_H` |
| 板级 LED 适配 | `impl_board_led.c/.h` | `IMPL_BOARD_LED_H` |
| CRC 工具 | `utils_crc.c/.h` | `UTILS_CRC_H` |

### 2.2 固定配套文件

| 类别 | 文件 | 说明 |
|---|---|---|
| 配置四件套 | `app_config.h` / `product_config.h` / `compile_config.h` / `feature_config.h` | 00_Config 下，固定名 |
| 平台固定头 | `platform_def.h` / `platform_error.h` / `platform_type.h` / `platform_object.h` / `platform_lifecycle.h` / `platform_device.h` / `platform_service.h` | 固定名（平台对象模型；`platform_registry.h` 已废弃移除） |
| Service 三件套 | `service_<域>_model.h` / `_state.h` / `_fault_code.h` | 每个 service 必配（D10） |
| 单元测试 | `test_<模块>.c` | tests/ 下，如 `test_utils_crc.c` |

---

## 3. 类型命名

| 类别 | 后缀 | 示例 |
|---|---|---|
| 结构体 typedef | `_t` | `platform_gpio_t` |
| 枚举 typedef | `_t`（枚举值全大写） | `platform_err_t` |
| 操作函数表 | `_ops_t` | `platform_i2c_ops_t` |
| 事件 | `_event_t` | `platform_uart_event_t` |
| 状态机 | `_state_t` | `service_battery_state_t` |
| 数据模型 | `_model_t` | `service_battery_model_t` |
| 故障码 | `_fault_code_t`（枚举） | `service_battery_fault_code_t` |

规则：
- typedef 必带层/模块前缀（`platform_`、`service_`、`impl_`、`utils_`），禁止裸名（如 `oled_operations_t` → `impl_oled_ops_t`，OLED 驱动落在 Impl 层）。
- 函数指针成员统一 `pf_` 前缀：`pf_init`、`pf_configure`、`pf_set`、`pf_get`、`pf_toggle`。

---

## 4. 函数命名

### 4.1 通用格式

```
<层前缀>_<模块>_<对象>_<动作>     （snake_case，动作收尾）
```

### 4.2 各层前缀与示例

| 层 | 前缀 | 示例 |
|---|---|---|
| App | `app_` | `app_main()`、`app_ble_start()` |
| Service | `service_` | `service_battery_read_voltage()` |
| Platform | `platform_` | `platform_mcu_gpio_init()`、`platform_i2c_transfer()` |
| Impl | `impl_` | `impl_board_led_init()`、`impl_os_task_create()` |
| Utils | `utils_` | `utils_crc16()`、`utils_ringbuffer_push()` |

### 4.3 动作动词固定表（避免同义混用）

| 动作 | 语义 |
|---|---|
| `init` / `deinit` | 初始化 / 释放 |
| `configure` | 参数配置（可重复） |
| `read` / `write` | 数据读写（事务类） |
| `set_pin` / `get_pin` / `toggle_pin` | GPIO 引脚级操作（GPIO 专用） |
| `transfer` | 通信事务（同步） |
| `start_async` / `cancel` | 异步启停 |
| `create` / `delete` | 对象 / 任务创建销毁 |

---

## 5. 变量命名

| 作用域 | 前缀 | 示例 |
|---|---|---|
| 全局变量 | `g_` | `g_system_state` |
| 文件内静态 | `s_` | `s_battery_instances` |
| 函数局部 | 无前缀 | `uint32_t timeout_ms` |
| 指针（成员） | `p_` | `p_ops` |
| 函数指针（成员） | `pf_` | `pf_init` |
| 句柄/实例 | `h_` / `inst` | `h_uart`、`oled_inst` |
| 参数 | 无前缀（可 `in_`/`out_` 区分方向） | `out_level` |

规则：
- 结构体成员 snake_case，可读缩写（`width`/`height`/`status`），禁止拼音缩写。
- 布尔成员用 `is_` / `has_` / `enabled` 表达：`is_enabled`。
- 指针前缀 `p_` 表示"一级指针成员"；`pp_` 二级指针。

---

## 6. 宏与枚举常量

- 全大写 + 下划线，必带层/模块前缀：`PLATFORM_GPIO_MODE_OUTPUT`、`UTILS_CRC_POLY`。
- 位掩码统一 `(1UL << n)` 写法，禁止裸数字掩码。
- 枚举值全大写：`PLATFORM_ERR_PARAM`（见 §7）。
- 禁止魔法数字：常量先命宏或 `enum`，再引用。

---

## 7. 错误码基线（D4，统一错误码）

`platform_error.h` 定义全局基线（类型 `platform_err_t`），Service/Impl 只在其后扩展、**禁止重复编号**：

```
PLATFORM_ERR_OK / PLATFORM_ERR_GENERAL / PLATFORM_ERR_TIMEOUT / PLATFORM_ERR_PARAM /
PLATFORM_ERR_NO_MEMORY / PLATFORM_ERR_NO_RESOURCE / PLATFORM_ERR_NOT_SUPPORTED /
PLATFORM_ERR_NOT_INITIALIZED / PLATFORM_ERR_ALREADY_INIT / PLATFORM_ERR_BUSY / PLATFORM_ERR_FAIL
```

（`PLATFORM_ERR_RESERVED = 0x7FFFFFFF` 为枚举边界守卫；旧码 `PLATFORM_ERR_IO / PLATFORM_ERR_NO_MEM / PLATFORM_ERR_STATE / PLATFORM_ERR_CRC` 已从基线移除）

扩展格式：`PLATFORM_ERR_<模块>_<原因>`（如 `PLATFORM_ERR_I2C_NACK`）。

---

## 8. 统一命名重构落地记录（v1.2 已清零）

> v1.1 的差距清单（`core_*` 前缀、`__XXX_H__` guard、`templates/bsp-oled` 反例）已在 v1.2 随"生成代码对齐五层分层架构"重构全部落地，生成器 / 模板 / 分层校验器 / 测试锁步对齐本规范。

| 位置 | 落地前 | 落地后 | 状态 |
|---|---|---|---|
| `lib/generator.js`（Core 切片） | `core_<peripheral>_*`、`core_status_t`、`CORE_STATUS_*`、`__CORE_GPIO_H__` | `platform_<peripheral>_*`、`platform_err_t`、`PLATFORM_ERR_OK / PLATFORM_ERR_*`、`PLATFORM_GPIO_H` | ✔ |
| `lib/generator.js`（BSP 切片） | `bsp_<stem>_driver`、`drv_adapter_port_*`、`drv_adapter_wrapper_*` | `impl_<stem>_driver`、`impl_<type>_port`、`platform_<type>_wrapper` | ✔ |
| `templates/bsp-oled` | `oled_operations_t`、`__BSP_OLED_DRIVER_H__`、`oled_driver_inst()` | `impl_oled_ops_t`、`IMPL_OLED_DRIVER_H`、`impl_oled_driver_inst()` | ✔ |
| 类型后缀 | `core_status_t`（事务语义枚举） | `platform_err_t` 对齐 §7 错误码基线 | ✔ |
| guard 风格 | `__XXX_H__`（双下划线，MISRA 21.1 风险） | `XXX_H`（无双下划线头尾） | ✔ |

> 落地依据：`lib/generator.js`（目录/符号）、`commands/mcu-new.js`（编号目录树 + CMake GLOB）、`scripts/validate-layer-contract.js` / `validate-bsp-contract.js`（锁步校验）、`tests/generator.test.js` / `tests/mcu-new.test.js` / `tests/layer-contract.test.js`（断言锁步）、`templates/bsp-oled`（模板符号）。目录映射细节见 `docs/plugin-boundaries.md`。

---

## 9. 宿主边界与 JSON 序列化规则

本规范同时约束插件自身 JS/CLI 代码的命名边界，避免跨层混用：

### 9.1 三段命名风格边界

| 边界 | 风格 | 示例 |
|---|---|---|
| CLI 命令 / 子命令 / 选项 | kebab-case | `mcu-workbench claude-layer sync`、`--device-type` |
| JS 函数 / 变量 / 模块标识符 | camelCase | `runClaudeLayer`、`generateBspDriver` |
| 持久化 JSON（schema / state / 记录） | snake_case | `schema_version`、`architecture_digest`、`unverified_paths` |

风格只在跨层转换点显式映射（CLI 选项解析、JSON 读写），不依赖隐式约定。

### 9.2 skill id 例外

skill id 是**三宿主注册契约**（`opencode.mjs` 派生 `mcu_workbench_<id.replace(/-/g,'_')>`、Codex `@mcu-workbench` 命名空间），一旦变更即破坏已发布工具名。因此：

- skill id 一律保留连字符（如 `workflow-claude-layering`），**不套用** §1.2 的 snake_case 目录规则。
- 技能目录名与 skill id 一致；层归属由 catalog 的 `layer` 字段表达，不由目录前缀决定。
- `claude-layer` 是 CLI 命令名（kebab），其对应 skill id 固定为 `workflow-claude-layering`，两者允许不同——命令名已统一为 `claude-layer`（术语收敛），skill id 保持历史连字符不变。

---

## 10. 快速自查表

```
目录  00_Config / 01_App / 02_Service/service_battery / 03_Platform/platform_mcu /
      04_Impl/impl_bsp / 05_Vendor / 99_Utils/utils_crc
文件  platform_gpio.c/.h + guard PLATFORM_GPIO_H
类型  platform_gpio_t / platform_i2c_ops_t / service_battery_state_t
函数  platform_i2c_transfer() / service_battery_read_voltage() / utils_crc16()
变量  g_全局 / s_静态 / p_指针成员 / pf_函数指针 / is_布尔
错误  PLATFORM_OK / PLATFORM_ERR_<模块>_<原因>
边界  CLI=kebab / JS=camel / JSON=snake；skill id 保持连字符（§9）
```
