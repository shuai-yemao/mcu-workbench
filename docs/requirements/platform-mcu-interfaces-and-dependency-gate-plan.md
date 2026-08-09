# 方案：Platform 层依赖纪律门禁 + platform_mcu 外设接口补齐

> 版本：v1.1 | 日期：2026-08-09 | 状态：**方案 B 暂缓**（用户决定，2026-08-09）
> 关联：用户 5.3 Platform 层定义（Platform 只定义能力，不绑定具体芯片）；ADR-001（四子域契约）

## 0. 背景与目标

用户确认 Platform 层定义："统一接口、统一错误码、统一数据结构、统一 ops 函数指针、统一 ctx 上下文；不能包含 HAL 头/HAL 函数；Platform 只定义能力，不绑定具体芯片"。

工程现实核对：
- ✅ Platform 层零反向依赖（03_Platform 无 include 指向 Impl）
- ✅ Platform 层零芯片符号（门禁已验证）
- ❌ **platform_mcu 空目录**：用户 5.3 期望的外设接口（gpio/i2c/spi/uart/timer/power）全部缺失
- ❌ **依赖纪律无门禁守护**：Platform 反向 include impl_* 不会被测试拦截

本方案两个子目标：
- **A. 依赖纪律门禁**：用测试固化"Platform 禁反向依赖 Impl；Impl 只依赖 Platform 接口头" —— **本轮执行**
- **B. platform_mcu 外设接口**：按 5.3 清单补齐 6 个能力接口头（实现后端留 Impl）—— **暂缓（用户决定）**

## 1. 方案 A：依赖纪律门禁（小改动）

### A1. baseline 测试新增断言（tests/embedded-framework-baseline.test.js）

| 断言 | 规则 | 覆盖 |
|---|---|---|
| Platform 零反向 | 03_Platform 下所有 .c/.h 的 include 不得含 `impl_` 前缀或指向 `04_Impl` 路径 | 防反向依赖（③） |
| Impl 仅接口依赖 | 04_Impl 下 include `platform_*` 只允许 `.h`（接口头），禁止 include platform 的 `.c` | 防实现依赖（②） |
| 接口头白名单 | Impl include 的 platform_* 头须存在于 03_Platform（防幽灵依赖） | 防漂移 |

### A2. 插件验证器可选强化

`scripts/validators/skill-catalog.js` 的 Platform 门禁（现有零芯片符号检查）可扩展：
- Platform 技能目录文档/代码禁出现 `impl_*` 符号（与 App 门禁对称）

**工作量**：baseline +1~2 个 test，验证器 +3 行。风险：低。

## 2. 方案 B：platform_mcu 外设接口补齐（大头）

### B1. 设计原则（对齐 platform_mcu/SKILL.md 生成契约）

每个外设接口：
- 平台无关类型 + `platform_<name>_ops_t`（`pf_*` 首参 `void *context`）
- `void *backend_context` 隔离芯片细节（HAL 句柄藏 Impl）
- 错误码统一 `platform_err_t`/`PLATFORM_ERR_*`
- **零芯片符号**（stm32/HAL/CMSIS 不出现在头文件）
- 对象四元组判定：纯行为函数表（pf_* + context）→ 豁免，头注释声明「纯转发、不承载对象身份」

### B2. 接口清单与 ops 骨架

| 接口头 | 能力（ops 骨架） | 关键契约点 |
|---|---|---|
| `platform_gpio.h` | pf_init / pf_deinit / pf_set_direction / pf_read / pf_write / pf_toggle | 引脚号平台无关（uint32 抽象）；方向（in/out）+ 上下拉可选 |
| `platform_i2c.h` | pf_init / pf_deinit / pf_read / pf_write / pf_mem_read / pf_mem_write | **事务级**：地址+长度+超时单位；禁止注入 START/STOP/ACK/SDA 方向/软件 IIC 细节（后端私有） |
| `platform_spi.h` | pf_init / pf_deinit / pf_transfer / pf_read / pf_write | 模式(CPOL/CPHA)/速率/位宽进 cfg；transfer 收发一体 |
| `platform_uart.h` | pf_init / pf_deinit / pf_write / pf_read /（可选 pf_set_callback） | 波特率/数据位/停止位/校验进 cfg；rx 回调语义可选 |
| `platform_timer.h` | pf_init / pf_start / pf_stop / pf_set_period /（PWM：pf_set_duty） | MCU 定时器外设（时基/PWM/捕获）；与 osal 软件定时器区分 |
| `platform_power.h` | pf_set_mode（run/sleep/stop/standby）/ pf_get_voltage / pf_get_mode | 电源模式平台无关枚举；低功耗策略归 service_power |

**文件形态**：`03_Platform/platform_mcu/Inc/platform_<name>.h`（纯契约，零 .c——外设接口无"无芯片依赖的公共实现"，实现全部在 impl_mcu）。iic→i2c 归一化（CLI 别名不产生 iic.h）。

### B3. 与 osal 的边界（重要）

- `platform_timer.h`：**硬件定时器外设**（PWM/时基/捕获）——MCU 能力
- `platform_os` 的 osal 软件定时器：OS 调度能力
- 两者不混：硬件能力归 mcu，调度抽象归 os

### B4. 施工顺序（每接口独立可交付）

1. `platform_gpio.h`（最简单，先立范式）
2. `platform_i2c.h`（最复杂，事务级契约重点）
3. `platform_spi.h` / `platform_uart.h`（同族，可并行）
4. `platform_timer.h` / `platform_power.h`

## 3. 施工清单

| ID | 动作 | 文件 | 内容 | 前置 |
|---|---|---|---|---|
| W-A1 | 修改 | `tests/embedded-framework-baseline.test.js` | Platform 零反向 + Impl 仅接口头断言 | F-03（现状已满足） |
| W-A2 | 修改 | `scripts/validators/skill-catalog.js` | Platform 技能目录禁 `impl_*` 符号 | 无 |
| W-B1 | 新增 | `03_Platform/platform_mcu/Inc/platform_gpio.h` | GPIO 能力接口 | 无 |
| W-B2 | 新增 | `.../platform_i2c.h` | I2C 事务级接口 | W-B1 范式 |
| W-B3 | 新增 | `.../platform_spi.h` | SPI 接口 | 同族 |
| W-B4 | 新增 | `.../platform_uart.h` | UART 接口 | 同族 |
| W-B5 | 新增 | `.../platform_timer.h` | 定时器接口 | 无 |
| W-B6 | 新增 | `.../platform_power.h` | 电源接口 | 无 |
| W-B7 | 新增 | `00_Docs/lesson10_platform_mcu_interfaces.md` | 课程讲解（可选） | W-B1~B6 |
| W-B8 | 同步 | 快照重新复制 + 全量验证 | 一致性 | 全部 |

**不做（本阶段）**：外设接口的 Impl 后端（impl_mcu 的 stm32f411 实现）——那是下一课，先立契约。

## 4. 验收测试

| ID | 证据等级 | 验收项 | 命令/条件 | 预期 |
|---|---|---|---|---|
| V-A1 | 静态 | Platform 零反向断言通过 | `npx jest tests/embedded-framework-baseline.test.js` | 全绿（含新断言） |
| V-A2 | 主机 | 全量测试 | `npm test` | 45 套件 / 268+ 全绿 |
| V-B1 | 静态 | 6 个接口头存在 | `ls 03_Platform/platform_mcu/Inc/` | 6 个 .h |
| V-B2 | 静态 | 接口头零芯片符号 | `grep -rn "stm32\|HAL_\|CMSIS" 03_Platform/platform_mcu/` | 无命中 |
| V-B3 | 静态 | 接口头无 .c（纯契约） | `find 03_Platform/platform_mcu -name "*.c"` | 无 |
| V-B4 | 主机 | 接口头语法编译 | `gcc -fsyntax-only -I... platform_mcu/Inc/*.h 的引例` | 通过 |
| V-B5 | 一致性 | 快照同步后 baseline 全绿 | 快照重新复制 + jest | 全绿 |

## 5. 风险与 trade-off

| 项 | 风险/代价 | 缓解 |
|---|---|---|
| 接口头设计过度（YAGNI） | 6 个接口一次性全设计，可能过度抽象 | 每接口最小 ops 集；gpio 先立范式，其余按需演化 |
| 事务级 i2c 契约复杂 | 超时/错误码/内存读写语义要精确 | 参考 platform_mcu/SKILL.md 现有 i2c 后端边界章节 |
| 门禁误伤 | Platform 禁 impl_* 符号可能误伤文档示例 | 剥离反引号/禁止描述行后检查（同 App 门禁） |
| 无后端接口空转 | 接口无实现，无法运行验证 | 本阶段验收限静态 + 语法编译；后端为下一课 |

**建议**：A（门禁）+ B 一起做；B 按 W-B1→B6 顺序，每完成一个接口头即语法编译验证一次。
