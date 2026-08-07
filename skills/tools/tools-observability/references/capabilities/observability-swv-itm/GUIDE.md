---
name: observability-swv-itm
version: "1.0.0"
description: "SWV / ITM / SWO 内核跟踪输出：Cortex-M 内核自带 trace 外设，通过 SWO（PB3/TRACESWO）单线输出，不占 UART、不阻塞 CPU。覆盖 TRACE/DWT 使能、ITM 解锁与刺激端口配置、printf 重定向到 ITM、Keil SWV 视图配置、内核时钟与 TPIU 分频注意、DWT CYCCNT 周期计数器与 PC 采样（Profiling）、时间戳测量、与 RTT/串口的通道组合。当用户提到 SWV、SWO、ITM、ITM_SendChar、Trace 输出、跟踪外设、printf 重定向、DWT 周期计数器、CYCCNT、时间戳测量、SWV 乱码时使用。"
---

# SWV / ITM 调试输出指南

> **SWV（Serial Wire Viewer）** — Cortex-M 内核自带的跟踪外设，通过 **SWO 引脚（PB3 / TRACESWO）** 单线输出 trace 数据，不占用 UART、不阻塞 CPU。与 RTT 复用 SWD 不同，SWO 是独立引脚，ARM 内核原生支持。

## 场景

- **printf 无硬件串口输出** — ITM 通道 0 输出，不需要 UART 引脚
- **DWT 数据观察点与 PC 采样（Profiling）** — 性能分析
- **时间戳测量** — 高频函数耗时，避免串口阻塞影响测量
- **轻量文本 / 结构化事件** — 中等量级；超大量日志用 RTT

## 输入

- MCU 内核（Cortex-M3/M4/M7 均支持 SWV）
- 调试探针（J-Link / ST-Link / DAP 均支持 SWO）
- 内核时钟频率（波特率据此计算）
- 需要输出的数据（printf / 时间戳 / 采样）

## 依赖

- **SWO 引脚** — STM32F411 为 PB3 / TRACESWO，若复用为 GPIO 需改回调试复用功能
- **调试探针** — J-Link / ST-Link 需支持 SWO 采样
- **Keil MDK 或 Ozone** — PC 端 SWV 视图

## 步骤

### Step 1: 目标端使能 TRACE 与 DWT 周期计数器

```c
/* 1. 使能 TRACE 与 DWT 周期计数器 */
CoreDebug->DEMCR |= CoreDebug_DEMCR_TRCENA_Msk;
DWT->CTRL |= DWT_CTRL_CYCCNTENA_Msk;

/* 2. 解锁并配置 ITM（stimulus 端口 0） */
ITM->LAR = 0xC5ACCE55;          /* 写入解锁密钥 */
ITM->TCR = ITM_TCR_ITMENA_Msk;  /* 使能 ITM */
ITM->TER = 0x1;                 /* 使能端口 0 */
```

### Step 2: printf 重定向到 ITM

```c
int fputc(int ch, FILE *f) {
    ITM_SendChar(ch);   /* CMSIS 提供的函数 */
    return ch;
}
```

### Step 3: Keil 侧开启 SWV

1. Options for Target → Debug → Trace 标签
2. 勾选 Trace Enable + Serial Wire Viewer
3. 填对内核时钟（如 100 MHz）——波特率由调试器据此计算
4. 打开 View → Serial Wire Viewer 观察 ITM 输出

### Step 4: DWT 周期计数器测量耗时

```c
/* DWT 周期计数器：us 级精确延时，不受优化等级影响 */
CoreDebug->DEMCR |= CoreDebug_DEMCR_TRCENA_Msk;
DWT->CTRL |= DWT_CTRL_CYCCNTENA_Msk;
uint32_t t0 = DWT->CYCCNT;
while ((DWT->CYCCNT - t0) < us * (SystemCoreClock / 1000000U));

/* 测量 ISR 耗时 */
uint32_t t_start = DWT->CYCCNT;
/* ... ISR 体 ... */
uint32_t isr_cycles = DWT->CYCCNT - t_start;  /* 周期数 */
```

## 通道组合与选型

| 手段 | 串口 (UART) | RTT | ITM / SWV | 组合建议 |
|---|---|---|---|---|
| ELOG / EasyLogger | ✅ 可配置 | ✅ 默认 | ✅ 可配置 | 开发期走 RTT，量产走串口 |
| SystemView | ❌ | ✅ 必需 | ⚠️ 部分 | 独占 RTT Channel 1 |
| Letter Shell | ✅ 常用 | ⚠️ 可 | ❌ | 挂串口做交互终端 |
| 面包屑崩溃采集 | ✅ | ✅ | ❌ | 与 CmBacktrace 同通道导出 |
| SWV / ITM | ❌ | ❌ | ✅ 专用 | 轻量 printf / 时间戳 / PC 采样 |

组合原则：

- **RTT** 承担高频日志与事件追踪（SystemView），但依赖 J-Link 常驻
- **串口** 承担量产诊断、Letter Shell 交互与脱离调试器场景
- **ITM / SWV** 承担轻量 printf 与时间戳，独立引脚不占 UART
- 三者可同时开启：ELOG → RTT、Shell → 串口、SWV → ITM，互不干扰

## 错误

| 错误现象 | 根因 | 解决 |
|---------|------|------|
| SWV 输出乱码或丢包 | 内核时钟配错，TPIU 分频不对 | 核对 Keil Trace 标签里的内核时钟与 SysClock 一致 |
| SWV 无输出 | SWO 引脚（PB3）被复用为 GPIO | 改回调试复用功能（AF5 调试） |
| ITM 写不进 | `ITM->LAR` 未解锁或 `TER` 未使能端口 | 按 Step 1 顺序使能 DEMCR/ITM/TER |
| DWT->CYCCNT 不计数 | `TRCENA` 未置位 | `CoreDebug->DEMCR |= TRCENA` 后再使能 CYCCNT |

## 边界

- **带宽有限** — SWV 适合中等量级文本/结构化事件；超大量日志用 RTT
- **不替代 RTT** — 依赖 SWO 引脚 + 探针支持，脱离调试器场景用串口
- **内核时钟必须准确** — ITM 输出经 TPIU 分频，配错即乱码
- **观测 ≠ 验证** — 连接观测工具只证明通道可用，不能替代业务或实物验证

## 交接

- **高频/大量日志** → `observability-elog` + `observability-rtt-porting`
- **事件时序分析** → `observability-systemview`
- **崩溃现场导出** → `debug-crash-backtrace`（可配 ITM/SWO 输出）
- **时间戳/Profiling 后续分析** → `debug-diagnostic-framework`
- **寄存器级原理** → `core-mcu` 的 `platform-cortex-registers` 能力

## 参考资料

- **ARM Cortex-M3 Devices Generic User Guide**: https://developer.arm.com/documentation/dui0552/latest/ — SWV / ITM / DWT 内核跟踪外设
- **STM32F411 Reference Manual (RM0383)**: https://www.st.com/resource/en/reference_manual/rm0383-stm32f411xce-advanced-armbased-32bit-mcus-stmicroelectronics.pdf — Debug 章节 SWV/ITM/DWT 寄存器
- **SEGGER J-Link 官方文档**: https://www.segger.com/products/debug-probes/j-link/ — SWO 支持与 RTT 对比
- **Memfault: Cortex-M Debug Connections**: https://interrupt.memfault.com/blog/cortex-m-debug-connections — 探针连接最佳实践
