# platform_mcu 外设接口推进计划（审查包）

> 版本：v1.0 | 日期：2026-08-10 | 状态：待用户审查确认
> 分支：D 盘实仓 `feature/platform-mcu`（由 feature/log-diagnosis-system 切出）
> 前置：platform_common 四子域已就绪；既有方案 v1.1（platform-mcu-interfaces-and-dependency-gate-plan.md）方案 B 升级为执行计划；依赖门禁已落地（baseline 7 断言）
> 流程：四张清单（工程现状 / 差距 / 生成约束 / 文件施工）+ 验收测试 + 不做清单

## 0. 背景与目标

platform_common（core/object/manager/diag）搭建完毕，平台层下一子域：**platform_mcu 外设能力接口**——纯契约、零芯片依赖、零 .c，实现后端留 impl_mcu（下一课）。

目标：按 SKILL 生成契约补齐 6 个接口头（gpio/i2c/spi/uart/timer/power），为换芯片零改动立桩。

## 1. 工程现状清单（盘点结论）

| # | 项 | 现状 | 说明 |
|---|---|---|---|
| S-01 | platform_common core | ✅ 就绪 | `platform_type.h`（int8_t..uint64_t/float_t/double_t/char_t/uchar_t/bool_t）、`platform_error.h`（`platform_err_t` + `PLATFORM_IS_ERR/IS_OK`）、`platform_def.h`（`PLATFORM_TRUE/FALSE/ALIGN/DELAY_MS/US`） |
| S-02 | platform_common 其余 | ✅ 就绪 | object/manager/diag 四子域齐全（断言 P2、日志 P2、生命周期、管理器） |
| S-03 | platform_mcu | ❌ **空目录** | 6 个外设接口头全缺，无 Inc/Src 结构 |
| S-04 | 依赖门禁 | ✅ baseline 7 断言 | Platform 零反向 + Impl 仅接口头 + 接口头白名单已守护 |
| S-05 | 插件 SKILL 契约 | ✅ 完整 | platform_mcu/SKILL.md：生成契约、四元组判定、自检门禁、I2C 后端边界 |
| S-06 | 快照同步 | ⚠️ 手动复制 | 实仓改动需回写 tests/fixtures/embedded-framework |
| S-07 | platform_bsp | ⚠️ WIP | 用户未跟踪 `watch_device.h`，本次不触碰 |
| S-08 | 课程文档位次 | ✅ 空位 | 00_Docs 已有 lesson05/07/08/09，lesson10 可用 |

## 2. 差距清单

| # | 差距 | 目标 |
|---|---|---|
| G-01 | platform_mcu 无目录结构 | 新建 `03_Platform/platform_mcu/Inc/`（纯契约头目录） |
| G-02 | 6 个接口头缺失 | W-B1~W-B6 补齐 |
| G-03 | 无课程讲解文档 | W-B7 lesson10（可选） |
| G-04 | 插件快照未同步 | W-B8 回写 + 全量验证 |

## 3. 生成约束清单（对齐 SKILL + 命名规范）

每个接口头 MUST：

1. **类型**：平台无关类型 + `platform_<name>_ops_t`（`pf_*` 函数指针，首参 `void *context` 或具体句柄按四元组判定）。
2. **backend_context**：`void *backend_context` 隔离芯片细节，HAL 句柄（`I2C_HandleTypeDef`/`GPIO_TypeDef`）禁出现在头。
3. **错误码**：统一 `platform_err_t`/`PLATFORM_ERR_*`（源自 platform_error.h），不压平为 -1；独立可编译单元的枚举编号与 platform_error.h 完全一致（OK=0 / PARAM=3 / NOT_SUPPORTED=6 / BUSY=9）。
4. **零芯片符号**：stm32/HAL/CMSIS/厂商类型禁出现在头（含注释）。
5. **四元组判定**：纯行为函数表（pf_* + context，无身份/生命周期字段）→ 豁免，头注释显式声明「纯转发、不承载对象身份」。
6. **Guard**：`PLATFORM_<NAME>_H`，禁用双下划线头尾（MISRA 21.1）。
7. **文件形态**：`03_Platform/platform_mcu/Inc/platform_<name>.h` 纯契约，**零 .c**（Src 实现留 impl_mcu 后端课；本阶段不生成 Src）。
8. **注释**：完整注释 Profile（`@file`/`@brief`/`@par dependencies`/`@author`/版本 + 六分区）。
9. **iic→i2c**：文件/API/文档一律 `i2c`，不产生 iic.h。

## 4. 文件施工清单

| ID | 动作 | 文件 | 内容要点 | 前置 |
|---|---|---|---|---|
| W-B1 | 新增 | `03_Platform/platform_mcu/Inc/platform_gpio.h` | 引脚号平台无关（uint32 抽象）；方向 in/out + 上下拉可选；pf_init/deinit/set_direction/read/write/toggle；**先立范式** | 无 |
| W-B2 | 新增 | `.../platform_i2c.h` | **事务级**：地址+长度+超时单位；pf_read/write/mem_read/mem_write；禁 START/STOP/ACK/SDA 方向/软件 IIC 细节（后端私有） | W-B1 范式 |
| W-B3 | 新增 | `.../platform_spi.h` | CPOL/CPHA/速率/位宽进 cfg；pf_transfer 收发一体 + read/write | 同族 |
| W-B4 | 新增 | `.../platform_uart.h` | 波特率/数据位/停止位/校验进 cfg；pf_write/read + 可选 pf_set_callback | 同族 |
| W-B5 | 新增 | `.../platform_timer.h` | **硬件定时器外设**（时基/PWM/捕获）；pf_init/start/stop/set_period + 可选 set_duty；与 osal 软件定时器区分（B3 边界） | 无 |
| W-B6 | 新增 | `.../platform_power.h` | 电源模式平台无关枚举（run/sleep/stop/standby）；pf_set_mode/get_mode/get_voltage；低功耗策略归 service_power | 无 |
| W-B7 | 新增 | `00_Docs/lesson10_platform_mcu_interfaces.md` | 课程讲解（可选，全部接口完成后） | W-B1~B6 |
| W-B8 | 修改 | 插件 `tests/fixtures/embedded-framework` 快照 | 复制实仓 platform_mcu → 快照 + baseline 全绿 | W-B1~B6 |

施工顺序：W-B1（立范式）→ W-B2（最复杂，事务级契约重点）→ W-B3/W-B4（同族可并行）→ W-B5/W-B6 → W-B7/W-B8。每完成一个接口头即 gcc 语法编译验证一次。

## 5. 验收测试

| ID | 证据等级 | 验收项 | 命令/条件 | 预期 |
|---|---|---|---|---|
| V-B1 | 静态 | 6 个接口头存在 | `ls 03_Platform/platform_mcu/Inc/` | 6 个 .h |
| V-B2 | 静态 | 零芯片符号 | `grep -rn "stm32\|HAL_\|CMSIS\|_TypeDef" 03_Platform/platform_mcu/` | 无命中 |
| V-B3 | 静态 | 纯契约零 .c | `find 03_Platform/platform_mcu -name "*.c"` | 无 |
| V-B4 | 静态 | Guard 规范 | `grep -rn "__" 03_Platform/platform_mcu/` | 无双下划线 |
| V-B5 | 主机 | 语法编译 | `gcc -fsyntax-only -std=c11 -I00_Config -I03_Platform/platform_common/core -I03_Platform/platform_mcu/Inc <引例>` | 通过 |
| V-B6 | 一致性 | 快照同步后全绿 | 回写快照 + `npx jest tests/embedded-framework-baseline.test.js` | 7/7 全绿 |

## 6. 不做（本阶段）

- 外设接口的 Impl 后端（impl_mcu 的 stm32f411 实现）——**下一课**，先立契约。
- 生成器 `mcu-workbench core` 的 Src 输出——本阶段实仓手写契约头，生成器对接另立任务。
- `platform_bsp` WIP（watch_device.h）与 osal 软件定时器（platform_os 域）。
- 运行期 ops 注册/多通道切换（既有 P 决策：符号实现、禁运行期注册）。

## 7. 风险与缓解

| 项 | 风险 | 缓解 |
|---|---|---|
| 接口过度设计 | 6 个接口一次性全设计可能过度抽象 | 最小 ops 集；gpio 先立范式，其余按需演化 |
| 事务级 i2c 契约复杂 | 超时/错误码/内存读写语义要精确 | 严格对齐 SKILL I2C 后端边界章节 |
| 无后端接口空转 | 接口无实现，无法运行验证 | 本阶段验收限静态 + 语法编译；后端为下一课 |
| 快照同步遗漏 | 实仓/插件双份漂移 | W-B8 最后统一回写 + baseline 守护 |
