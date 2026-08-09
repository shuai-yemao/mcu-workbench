# embedded_framework 命名审计最终方案（v2.0 FINAL）

> 审计对象：`D:\zhuomian\embedded_framework`（逐文件读取）
> 对照基准：MCU-Workbench `docs/naming-convention.md` v1.1 + 五层契约（App/Service/Platform/Impl/Vendor）
> 日期：2026-08-07 · 状态：**已定稿，可执行**
> 范围声明：本方案**只审计、不修改参考工程文件**；所有调整项均为可选，由用户按需决定是否执行。

---

## 0. 结论速览

**骨架达标**：目录结构完全按范本搭建（00_Config…99_Utils + cmake），文件命名与类型/函数命名绝大部分符合命名规范。

**设计确认（4 项，保留不改）**：

| # | 项 | 结论 |
|---|---|---|
| D1 | Platform 层含 `platform_object/device/service.c` | ✅ 工程设计如此——对象模型实现属 Platform 层设计决策，保留 |
| D2 | `platform_type.h` 依赖 `board_types.h` | ✅ 工程需要——Platform 层类型出口，保留 |
| D3 | 两套成功/失败码并存（def.h 宏 + error.h 枚举） | ✅ 现状可用，互不冲突，保留（可选后续统一） |
| D4 | `NULL` 重定义（platform_def.h） | ✅ 现状可用，保留（风险提示见 §1.4） |

**可选对齐（6 项 P1 命名 + 5 处 P2 待补）**：见 §2 / §3，均不强制。

---

## 1. 设计确认明细

### 1.1 Platform 层 `.c` 实现 —— ✅ 保留

```
03_Platform/platform_common/platform_object.c
03_Platform/platform_common/platform_device.c
03_Platform/platform_common/platform_service.c
```

对象模型（object/device/service + lifecycle）是第 5 课教学内容。**Platform 层允许承载实现**——插件 `skills/platform` 目录的"零 .c"门禁只约束技能文档目录（.md），不约束生成工程代码。

### 1.2 platform_type.h → board_types.h 依赖 —— ✅ 保留

`board_types.h`（04_Impl/impl_board/）定义板级/编译器基础类型名（`int8`/`uint8`…），`platform_type.h` 作为 Platform 层类型出口将其映射为标准样式（`int8_t`/`float_t`…）。这是**工程需要的类型出口设计**，不是依赖倒挂。

> 风险提示（可选，不强制）：若未来引入 `<stdint.h>`/`<math.h>` 会与 `typedef int8_t` 等产生重定义冲突，届时收敛即可。

### 1.3 两套成功/失败码 —— ✅ 保留（可选收敛）

| 位置 | 定义 |
|---|---|
| `platform_def.h` | `#define PLATFORM_OK 0` / `#define PLATFORM_ERROR 1`（宏） |
| `platform_error.h` | `typedef enum { PLATFORM_ERR_OK=0, … } platform_err_t`（枚举） |

现状互不冲突。若后续收敛，建议统一走 `platform_error.h` 枚举并删除 def.h 宏——列为可选后续项。

### 1.4 NULL 重定义 —— ✅ 保留（风险提示）

`#ifndef NULL #define NULL ((void *)0)` 在未 include 标准头时提供 NULL，工程可用。若未来引入 `<stddef.h>` 需删除该段防重定义。

---

## 2. P1 命名可选对齐清单（对照 naming-convention v1.1）

> 以下均为**命名层面建议**，执行与否由用户决定；执行时每步独立可回滚。

### 2.1 guard 去双下划线（8 个头文件）

MISRA 21.1 禁止双下划线头尾，规范要求 `<模块大写>_<对象大写>_H`。

| 文件 | 现状 | 改为 |
|---|---|---|
| platform_type.h | `__PLATFORM_TYPE_H__` | `PLATFORM_TYPE_H` |
| platform_error.h | `__PLATFORM_ERROR_H__` | `PLATFORM_ERROR_H` |
| platform_def.h | `__PLATFORM_DEF_H__` | `PLATFORM_DEF_H` |
| platform_lifecycle.h | `__PLATFORM_LIFECYCLE_H__` | `PLATFORM_LIFECYCLE_H` |
| platform_object.h | `__PLATFORM_OBJECT_H__` | `PLATFORM_OBJECT_H` |
| platform_device.h | `__PLATFORM_DEVICE_H__` | `PLATFORM_DEVICE_H` |
| platform_service.h | `__PLATFORM_SERVICE_H__` | `PLATFORM_SERVICE_H` |
| 04_Impl/impl_board/board_types.h | `__BOARD_TYPES_H__` | `IMPL_BOARD_TYPES_H` |

### 2.2 lifecycle 回调成员补 pf_ 前缀

```c
platform_err_t (*pf_init)(void *p_self);    /* 原 (*init) */
platform_err_t (*pf_start)(void *p_self);   /* 原 (*start) */
platform_err_t (*pf_process)(void *p_self); /* 原 (*process) */
platform_err_t (*pf_stop)(void *p_self);    /* 原 (*stop) */
platform_err_t (*pf_sleep)(void *p_self);   /* 原 (*sleep) */
platform_err_t (*pf_wakeup)(void *p_self);  /* 原 (*wakeup) */
platform_err_t (*pf_deinit)(void *p_self);  /* 原 (*deinit) */
```
（同步更新 3 个 `.c` 内对该结构体成员的赋值引用。）

### 2.3 platform_object_t 指针成员补 p_ 前缀

```c
void *p_user_data;   /* 原 user_data（p_self/p_parent/p_lifecycle 已符合） */
```

### 2.4 board_types.h 文件名（可选）

`04_Impl/impl_board/board_types.h` → `impl_board_types.h`（对齐 Impl 层 `impl_` 前缀惯例）。保持现名亦可，不强制；改名时同步 `platform_type.h` 的 include 引用。

### 2.5 目录复数 → 单数

`03_Platform/platform_middlewares` → `platform_middleware`（范本与 impl_middleware 均为单数）；同步 `.clangd` 的 `-I` 路径。

### 2.6 无前缀通用宏

| 位置 | 现状 | 建议 |
|---|---|---|
| platform_def.h | `ARRAY_SIZE(arr)` | `PLATFORM_ARRAY_SIZE(arr)` |
| board_types.h | `TRUE` / `FALSE` | 保留工程现状（涉及面广，不强制） |
| platform_def.h | `PLATFORM_TRUE/FALSE` | 保留工程现状 |

---

## 3. P2 待填充（工程开发计划，非命名问题）

| 目录 | 现状 | 应按范本补 |
|---|---|---|
| `00_Config/` | 空 | `app_config.h` / `product_config.h` / `compile_config.h` / `feature_config.h` |
| `05_Vendor/` | 空 | `vendor_mapping.md`（来源/版本/路径/补丁登记）+ `patch/README.md` |
| `06_Toolchain/` | 空 | 工具链说明；顶层 `cmake/`、`install_riscv_toolchain.ps1` 可迁入或文档指路 |
| `99_Utils/` | 空 | `utils_crc/` `utils_ringbuffer/` `utils_filter/` `utils_list/` |
| `01_App/`、`02_Service/` | 仅空目录 | `service_battery/` `service_system/` 各补 `_model/_state/_fault_code` 三件套 |

---

## 4. 可选执行顺序与验证

```
步骤1  P1-2.1  guard 去双下划线（8 个头文件）
步骤2  P1-2.2/2.3  lifecycle pf_ + object p_user_data（同步 3 个 .c）
步骤3  P1-2.4  board_types.h 改名（可选）
步骤4  P1-2.5  platform_middlewares → platform_middleware（同步 .clangd）
步骤5  P1-2.6  ARRAY_SIZE 加 PLATFORM_ 前缀（可选）
步骤6  P2      按范本补建空目录（属开发计划）
```

**每步验证**（工程尚无根 CMakeLists，语法检查为当前最可靠回归手段）：

```bash
clang-format --dry-run 03_Platform/platform_common/*/*.h
gcc -fsyntax-only -std=c11 -I00_Config \
    -I03_Platform/platform_common/core \
    -I03_Platform/platform_common/diag \
    -I03_Platform/platform_common/object \
    -I03_Platform/platform_common/manager \
    -I04_Impl/impl_board 03_Platform/platform_common/*/*.c
grep -rn "__" 03_Platform 04_Impl --include="*.h"   # 步骤1后无双下划线残留
```

---

## 5. 决策记录（2026-08-07）

| 决策 | 结论 |
|---|---|
| 参考工程是否修改 | **不修改**，本方案仅审计 |
| Platform 层 .c 实现 | 保留（工程设计） |
| platform_type.h → board_types.h 依赖 | 保留（工程需要） |
| 两套错误码 | 保留现状；如收敛则统一走 error.h 枚举 |
| P1 命名对齐 | 可选，由用户按需触发 |
| P2 空目录补齐 | 属开发计划，另行安排 |
