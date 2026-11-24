---
name: debug-offline-breakpoint
version: "1.0.0"
description: "离线断点：驻留在芯片调试硬件里的断点，调试器断开后依然生效，专治'只有脱离调试器才复现'的 bug。覆盖 Cortex-M 断点体系五件套——FPB 指令硬件断点（6 个比较器 + set_breakpoint 槽位管理）、DWT 数据观察点（4 个比较器抓'谁改了变量'）、BKPT 内联断点（+DebugMonitor 异常离线安全）、FPB Flash Patch 重映射（32 字节块不重烧改代码）、MPU（'调试正常、离线就崩'头号元凶）。当用户提到离线断点、硬件断点、FPB、DWT 观察点、数据断点、watchpoint、BKPT、Flash Patch、重映射、断点改变时序、离线才复现、DebugMonitor 时使用。"
---

# 离线断点指南

> **离线断点** — 驻留在芯片调试硬件（FPB/DWT）里的断点，**调试器断开连接后依然生效**。它专治"只有脱离调试器才复现"的 bug：目标自由运行时撞上断点自己停住，再接入调试器读取现场。打通 Cortex-M 断点体系五块拼图：FPB（指令断点 + Flash Patch）、DWT（数据观察点）、BKPT（内联断点）、Flash Patch（重映射）、MPU。

## 场景

- **崩溃只在脱离调试器运行时复现** — 目标自由跑，撞断点自停
- **长稳测试让目标在异常点停车**，保留现场供后续接入分析
- **数据被悄悄写坏** — 数组越界、野指针、DMA 与 CPU 竞争同一 buffer，事后找不到写入方
- **现场固件 bug 不想重烧** — Flash 被 RDP 读保护 / 量产远程无法插线 / 只改一两条指令
- **"调试正常、离线就崩"** — 排查 MPU 权限配置错误

## 输入

- MCU 内核（Cortex-M3/M4 等，FPB/DWT 由内核提供）
- 断点类型选择（FPB / DWT / BKPT / Flash Patch / MPU）
- 目标地址 / 变量地址
- 是否已连接过调试器（让 `C_DEBUGEN` 置位，离线断点生效前提）

## 依赖

- **CMSIS 头文件**（`core_cm4.h` 提供 `FPB` / `DWT` / `CoreDebug` 寄存器定义）
- **调试器 GUI**（Ozone / Keil 设置硬件断点，寄存器版用于 Bootloader/诊断固件）
- **DebugMonitor 异常**（BKPT 离线安全的前提）
- 与 `observability-breadcrumb` 互补：离线断点抓现场，面包屑还原"停住前最后动作序列"

## 知识点 1：FPB 指令硬件断点（离线断点的核心载体）

FPB（Flash Patch and Breakpoint Unit）是 Cortex-M 内核自带的一组硬件比较器，把 PC 与预设地址逐周期比较，命中即暂停内核。长在芯片里，不依赖调试器在线。

- FPB 提供 **6 个指令比较器**（COMP0-5），每次取指时硬件并行比较 PC
- 调试器断开后比较器内容仍在寄存器中，SWD 重新连接即可接管现场
- F411（Cortex-M4F）FPB 基地址 `0xE0002000`，附带 2 个 patch 比较器
- **软件断点**由调试器临时改写 Flash 为 BKPT，断开即还原；**硬件断点**状态驻留芯片

```c
#define FPB_MAX_BP 6

int set_breakpoint(uint32_t address)
{
    int slot;
    uint32_t num_code;

    CoreDebug->DHCSR |= CoreDebug_DHCSR_C_DEBUGEN_Msk;  /* 允许内核 halt */
    CoreDebug->DEMCR |= CoreDebug_DEMCR_TRCENA_Msk;     /* 使能 DWT/FPB 调试时钟 */

    num_code = ((FPB->CTRL & FPB_CTRL_NUM_CODE_Msk) >> FPB_CTRL_NUM_CODE_Pos) + 1U;
    if (num_code > FPB_MAX_BP) num_code = FPB_MAX_BP;

    for (slot = 0; slot < (int)num_code; slot++) {
        if ((FPB->COMP[slot] & FPB_COMP_ENABLE_Msk) == 0) break;
    }
    if (slot >= (int)num_code) return -1;   /* 断点已满 */

    FPB->COMP[slot] = (address & ~1UL) | FPB_COMP_ENABLE_Msk;  /* REPLACE=0b00 断点模式 */
    FPB->CTRL |= FPB_CTRL_ENABLE_Msk;
    return slot;
}

void clear_breakpoint(int slot)
{
    if (slot >= 0 && slot < FPB_MAX_BP) FPB->COMP[slot] = 0;
}
```

关键要点：

- **REPLACE 字段**：`0b00` 是断点模式，`0b01` 是重映射（patch）模式——写错会把断点变成无效 remap
- 指令断点地址按**半字（2 字节）对齐**
- 断点配额有限：M4 只有 **6 个**，不够时合并断点或把 DWT 配成 PC 匹配扩充

## 知识点 2：DWT 数据观察点（抓"谁动了我的变量"）

DWT 提供 **4 个数据比较器**，监视某个地址/地址段的读、写访问。FPB 回答"执行到哪"，DWT 回答"谁碰了这个地址"。

```c
#define DWT_ACC_ANY    (0x0UL)
#define DWT_ACC_READ   (1UL << DWT_FUNCTION_DATAVADDR0_Pos)
#define DWT_ACC_WRITE  (1UL << DWT_FUNCTION_DATAVADDR1_Pos)
#define DWT_ACC_RW     (DWT_ACC_READ | DWT_ACC_WRITE)

int dwt_watchpoint_set(uint32_t slot, uint32_t addr, uint32_t mask, uint32_t acc)
{
    if (slot > 3U) return -1;
    CoreDebug->DEMCR |= CoreDebug_DEMCR_TRCENA_Msk;
    DWT->COMP[slot]     = addr;
    DWT->MASK[slot]     = mask;
    DWT->FUNCTION[slot] = (1UL << DWT_FUNCTION_FUNCTION_Pos) | acc;
    return 0;
}

void dwt_watchpoint_clear(uint32_t slot)
{
    if (slot > 3U) return;
    DWT->FUNCTION[slot] = 0;
}
```

关键要点：

- **监视范围 = 2^MASK 字节**，MASK=0 精确单地址
- 数据观察点看数据访问，不占 FPB 指令断点配额
- 写监视最擅长抓"变量被改坏"（野指针 / DMA 竞争 / 越界写）
- DWT 比较器也可配成 PC 比较器，变相增加硬件断点数量
- 典型场景：栈边界哨兵 `dwt_watchpoint_set(0, &guard, 0, DWT_ACC_WRITE)` → 栈踩过边界瞬间 halt，拿到越界写入的 PC

## 知识点 3：BKPT 内联断点（把断点写进代码）

内联断点用 `BKPT` 指令把断点直接写进源码，随固件走，不依赖 ELF 符号。**没有调试器时 BKPT 默认触发 HardFault**，必须配合 DebugMonitor 异常才安全。

```
BKPT 执行
   ├─ 调试器在线       → 暂停内核（当作断点）
   ├─ 无调试器 + DebugMonitor 未使能 → 触发 HardFault ⚠
   └─ 无调试器 + DebugMonitor 使能   → 进入 DebugMon_Handler，可自定义处理
```

```c
__BKPT(0);                        /* CMSIS 内建函数 */

void debug_monitor_enable(void)
{
    SCB->SHCSR |= SCB_SHCSR_DEBUGMONENA_Msk;   /* 使能 DebugMonitor 异常 */
    NVIC_SetPriority(DebugMonitor_IRQn, 15);   /* 最低优先级，避免干扰业务 */
}

/* ⚠ 异常上下文！禁止 printf / FreeRTOS API / elog */
void DebugMon_Handler(void)
{
    static volatile uint32_t last_pc;
    uint32_t *frame = (uint32_t *)__get_PSP();  /* FreeRTOS 任务用 PSP */
    last_pc = frame[6];
    crumb_write(EVT_BP_HIT, last_pc);           /* 面包屑：只写环形缓冲 */
}

/* 发布 / 离线诊断双模式宏隔离 */
#ifdef DEBUG_OFFLINE_BREAK
    #define BP() __BKPT(0)
#else
    #define BP() do {} while (0)
#endif
```

依赖文件清单：`stm32f4xx.h`（`__BKPT`/`SCB->SHCSR`）、启动文件向量表**必须有 `DebugMon_Handler` 弱符号**、`stm32f4xx_it.c` 或自定义文件**必须实现 `DebugMon_Handler`**（否则进 Default_Handler 死循环）。

## 知识点 4：FPB Flash Patch 重映射（不重烧也能改代码）

FPB 第二个身份是 Flash Patch：2 个 patch 比较器把 CPU 对 Flash 特定地址的取指/取字**重定向到 RAM 里的替换代码**。映射单位是 **32 字节块**，补丁区必须 32 字节对齐（低 5 位为 0）。

```c
static uint8_t patch_ram[32] __attribute__((aligned(32)));

void flash_patch_install(uint32_t flash_addr, const void *patch_code, uint32_t len)
{
    if (len > sizeof(patch_ram)) len = sizeof(patch_ram);
    memcpy(patch_ram, patch_code, len);
    FPB->REMAP   = (uint32_t)patch_ram;       /* 32B 对齐基址 */
    FPB->COMP[6] = (flash_addr & ~1UL) | FPB_COMP_ENABLE_Msk;  /* REPLACE=01 remap */
    FPB->CTRL   |= FPB_CTRL_ENABLE_Msk;
}
```

要点：

- 掉电/复位后配置丢失，需由 Bootloader 或调试器每次启动重新加载
- patch 与断点**共用 FPB 硬件**：M4 的"6+2" = 6 个指令断点 + 2 个 patch 比较器
- 与链接期"重定位（relocation）"是两回事：relocation 改 LMA/VMA 搬运代码，remap 是硬件运行时替换取指目标

## 知识点 5：MPU（"调试正常、离线就崩"的头号元凶）

MPU 校验的是**内核总线上的访问**；调试器通过 AHB-AP（DAP）访问内存走调试接口路径，**绕开内核总线，不触发 MPU 违规**。所以 MPU 配置错了，调试器下一切正常，真机一跑就 MemManage Fault / HardFault。

排查"调试正常、离线崩"：

1. 读 `CFSR`（0xE000ED28）的 MMFSR 位（`IACCVIOL` 取指 / `DACCVIOL` 数据 / `MSTKERR` 入栈）确认是 MPU 违规
2. 读 `MMFAR` 拿违规地址
3. 对照 RBAR/RASR 区域表：未配置区域被访问？AP 权限过严？XN 误设？

```c
/* 区域大小 = 2^SIZE（最小 32 字节），基址必须对齐到区域大小 */
MPU->RNR  = 0;
MPU->RBAR = (uint32_t)&g_secret & ~0x1F;
MPU->RASR = MPU_RASR_ENABLE_Msk
          | (1u << MPU_RASR_AP_Pos)    /* AP=0b001：仅特权可读写 */
          | MPU_RASR_XN_Msk            /* 禁止执行 */
          | (5u << MPU_RASR_SIZE_Pos); /* 大小 = 2^5 = 32 B */
MPU->CTRL = MPU_CTRL_ENABLE_Msk;
```

要点：

- 8 个可编程区域（F411），每区域 RBAR + RASR；区域重叠时区域号大者优先
- MemManage 可经 `SCB->SHCSR.MEMFAULTENA` 独立使能；违规详情 MMFSR、地址 MMFAR
- 与 DWT 不同：MPU 违规触发的是 **Fault 不是断点**——程序会直接 HardFault，适合"宁可崩也要暴露"，不能像 DWT 那样停住继续看
- `HAL_MPU_ConfigRegion` + `HAL_MPU_Enable(MPU_PRIVILEGED_DEFAULT)` 配置哨兵区域时，配置前必须先 `__HAL_MPU_DISABLE()`

## 离线断点实操流程

1. **设硬件断点**（Ozone/Keil 右键 → Toggle Breakpoint → 确认类型为 **Hardware**；或代码调 `set_breakpoint`）
2. **断开调试器**让目标自由运行（不要断电——FPB/DWT 靠目标供电维持）
3. **触发后重新接入**，停在断点处读寄存器/调用栈/全局变量，配合面包屑还原"停住前最后动作序列"
4. 先在线确认能停，再断开实测；每次断开会话需重新设置（掉电/复位后配置清空）

## 错误

| 错误现象 | 根因 | 解决 |
|---------|------|------|
| 离线断点设置后目标完全不停 | 设成了软件断点（Flash Breakpoint）/ 目标掉电 FPB 配置丢失 / 地址 2 字节未对齐 | 确认类型 Hardware、保持供电、重新设置后先在线验证 |
| 数据观察点设了但不停 | `TRCENA` 未置位 / FUNCTION 触发类型配错 / 变量被优化没有实际地址 | 使能 TRCENA、Read/Write 都试、`volatile` 修饰、map 确认地址 |
| 代码里有 BKPT 断开后直接 HardFault | DebugMonitor 未使能 / 启动文件无弱符号 / handler 未实现 | 置位 `DEBUGMONENA`、补弱符号与 handler、生产固件宏关掉 BKPT |
| 重映射没生效仍执行 Flash 原指令 | 补丁区未 32B 对齐 / REMAP 低 5 位非 0 / 比较器地址差一 | 检查 `addr & 0x1F`、`addr & ~1`、确认 `FPB->CTRL.ENABLE` |
| 使能 MPU 后程序立刻 HardFault | 未配置区域访问全违规（中断向量表/外设区未配置）/ 区域大小未对齐 2^N | 先配覆盖全地址空间的背景区域，再叠加保护区域，逐步使能 |

## 边界

- **离线断点必须用 FPB 硬件断点，不能用软件断点**（软件断点依赖调试器在线改写 Flash）
- **BKPT ≠ FPB 硬件断点** — 无调试器时 BKPT 默认 HardFault，需 DebugMonitor 才安全
- 断点会改变时序——"断点调试时问题消失"本身就是重要线索，此时交接日志流/SystemView 非侵入手段
- 掉电/复位后 FPB/DWT 配置清空

## 交接

- **崩溃现场自动解析** → `debug-crash-backtrace`（CmBacktrace：抓到的 PC/LR 调用链自动分析）
- **崩溃前轨迹还原** → `observability-breadcrumb`（面包屑环形缓冲，离线断点停住瞬间互补）
- **"断点改变时序"问题** → `observability-systemview` / `observability-serial-monitor`（非侵入观测）
- **寄存器级 CFSR/MMFSR/MMFAR 解析** → `core-mcu` 的 `platform-cortex-registers` 能力
- **RTOS 任务栈场景** → `debug-rtos`（PSP/栈水位/任务列表）
- **五层诊断（供电→物理→波形→寄存器→软件）** → `debug-diagnostic-framework`

## 参考资料

- **ARMv7-M Architecture Reference Manual (DDI 0403E)**: https://developer.arm.com/documentation/ddi0403/latest/ — FPB/DWT/MPU 寄存器权威来源
- **ARM Cortex-M3 权威指南（中文 PDF）** — FPB/DWT/ITM/MPU 全章节
- **STM32F411 Reference Manual (RM0383)**: https://www.st.com/resource/en/reference_manual/rm0383-stm32f411xce-advanced-armbased-32bit-mcus-stmicroelectronics.pdf — Debug/CoreSight/MPU 章节
- **SEGGER Ozone 官方文档**: https://www.segger.com/products/development-tools/ozone-j-link-debugger/ — 硬件断点/数据观察点/Flash Patch GUI 操作
- **Memfault: Cortex-M Fault Debug**: https://interrupt.memfault.com/blog/arm-cortex-m-fault-debug
