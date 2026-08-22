---
name: observability-breadcrumb
version: "1.0.0"
description: "面包屑（Breadcrumb）崩溃前状态记录与启动报告：用环形覆写槽位在运行期无感记录程序阶段足迹，崩溃时靠 naked 汇编 Handler 把 CPU 现场（PC/LR/CFSR/R4~R11）与最后一个面包屑固化到复位保留内存（.noinit/备份寄存器/Flash），启动最早阶段用 magic+CRC 校验后打印崩溃报告并消费。覆盖写入宏、崩溃快照结构体、三档存储介质、启动报告校验顺序、EXC_RETURN 选栈、Handler 最小工作原则、离线 addr2line 解析。当用户提到面包屑、breadcrumb、崩溃前记录、启动报告、崩溃自述、postmortem、crash report、上次崩溃、崩溃现场固化时使用。"
---

# 面包屑崩溃前状态记录与启动报告

> **面包屑（Breadcrumb）** — 程序运行期周期性地把"我在哪、我在做什么"（代码位置 ID、状态机状态、关键变量）写入一块复位后仍保留的内存区域；崩溃时再叠加一份异常现场快照；复位重启后在启动早期读取校验并打印上一轮崩溃报告。用于量产无人值守、偶发故障、无调试器场景的故障复盘。

## 场景

- **量产设备接不了调试器** — JTAG/SWD 被固件占用或外壳封闭，崩溃只能靠日志，但日志易失
- **偶发故障难复现** — 跑一两个月出现一次，仿真器一断开就复现不了，必须让设备自己"记下来"
- **区分两类信息** — 崩溃**时**状态（PC/LR/栈帧）→ 告诉你崩在哪；崩溃**前**轨迹（面包屑）→ 告诉你为什么走到这一步
- **看门狗反复复位** — 记录复位原因 + 复位前最后一个面包屑，区分"任务卡死"还是"逻辑走飞"
- **OTA 升级后启动即死** — 启动报告确认"新固件崩溃"还是"跳转异常"，避免误判回滚策略

## 输入

- MCU 平台（STM32F411 等 Cortex-M4F）
- 存储介质选择（.noinit / 备份寄存器 / Flash 专用页）
- 串口或 RTT 输出通道
- 需要记录的代码节点（状态机状态、模块阶段、关键分支）

## 依赖

- **naked 汇编 Handler** — `__attribute__((naked))` 在 C 代码运行前保存 R4~R11
- **复位保留内存** — `.noinit`（软复位保留）/ RTC 备份寄存器（断电保留）/ Flash 页（跨掉电）
- **CRC32 校验** — 防掉电随机值撞上 magic 的误报
- 与 `debug-crash-backtrace`（CmBacktrace）互补：CmBacktrace 管"崩溃瞬间"，面包屑管"崩溃之前"

## 核心逻辑

面包屑机制是三个模块的接力：**撒痕迹（运行时）→ 留快照（崩溃时）→ 做报告（启动时）**。存储介质贯穿三者，必须"复位不清零"。

```
① 运行期：执行到关键节点 → breadcrumb() → 环形覆写保留最近 N 步
② 崩溃瞬间：硬件自动压栈 8 字 → 提取 PC/LR/CFSR → 保存 R4~R11 + 最后一个面包屑
            → 写入 noinit 区 magic + CRC → 软件复位
③ 启动后：读取 noinit 区 → magic+CRC 校验通过 → 打印崩溃报告 → 消费（清 magic）
```

### ① 撒面包屑：崩溃前的周期性状态痕迹

面包屑是一组极轻量的状态标签，不是完整日志。写入要求：**快**（几个 word）、**循环**（固定 N 槽位写满覆写最旧）、**有语义**（id 映射到代码节点）。

```c
#define CRUMB_MAX 6
typedef struct {
    uint32_t seq;   /* 单调递增序号：判断写入先后、是否回绕 */
    uint32_t id;    /* 代码位置 ID（查表 → 字符串） */
    uint32_t param; /* 附加参数：状态值 / 计数值 / 传感器原始值 */
} breadcrumb_t;

volatile breadcrumb_t g_crumbs[CRUMB_MAX];
volatile uint32_t     g_crumb_idx;
volatile uint32_t     g_crumb_seq;

#define breadcrumb(_id, _param) do {                         \
    uint32_t i = g_crumb_idx;                                \
    g_crumbs[i].seq   = ++g_crumb_seq;                       \
    g_crumbs[i].id    = (_id);                               \
    g_crumbs[i].param = (uint32_t)(_param);                  \
    g_crumb_idx = (i + 1) % CRUMB_MAX;                       \
} while (0)
```

关键技巧：`seq` 单调递增，即使槽位被覆写也能分辨哪条最新（`seq` 最大者）。Teensy `CrashReport.breadcrumb(n, value)` 是同款思路。

### ② 留快照：崩溃瞬间的异常现场捕获

崩溃时 Cortex-M **硬件自动压栈 8 个字**（SP+0 R0 / +4 R1 / +8 R2 / +12 R3 / +16 R12 / +20 LR / +24 PC / +28 xPSR）。面包屑在此基础上多保存 R4~R11（callee-saved，硬件不压栈，常藏循环计数、缓冲指针、`this`）和崩溃前最后一个面包屑。

```c
/* crash_dump 结构体，存放在 noinit 区 */
typedef struct {
    uint32_t magic;          /* CRASH_MAGIC 常量，标记记录有效 */
    uint32_t crc;            /* CRC32(从 version 到 param2) */
    uint32_t version;        /* 结构体版本号，兼容升级 */
    uint32_t pc;             /* 出错指令地址（异常帧 +24） */
    uint32_t lr;             /* 返回地址（异常帧 +20） */
    uint32_t psr;            /* xPSR（异常帧 +28） */
    uint32_t cfsr;           /* SCB->CFSR：故障细分原因 */
    uint32_t bfsr;           /* SCB->BFAR：总线错误地址 */
    uint32_t r[8];           /* R4~R11（汇编保存） */
    uint32_t sp;             /* 崩溃时栈指针（MSP/PSP） */
    uint32_t exc;            /* 低 9 位 = IPSR，崩溃发生在哪个异常上下文 */
    breadcrumb_t last_crumb; /* 最后一个面包屑快照 */
    uint32_t reset_reason;   /* RCC->CSR：复位源 */
} crash_dump_t;

extern crash_dump_t g_crash_dump;   /* 声明在 noinit 段 */
```

Handler 必须用 `__attribute__((naked))` 汇编开头，在 C 代码运行前保存 R4~R11（C 编译器自动压栈时机不可控，无法保证现场被破坏前捕获；ARMv6-M 下 R8~R11 需先移入低寄存器）。

**EXC_RETURN 判断用哪个栈**（崩溃 Handler 里）：

| EXC_RETURN | 模式 | 栈 |
|-----------|------|-----|
| `0xFFFFFFF1` | Handler 模式 | MSP |
| `0xFFFFFFF9` | Thread 模式 | MSP（裸机主循环） |
| `0xFFFFFFFD` | Thread 模式 | PSP（RTOS 任务） |

判据：`EXC_RETURN & (1<<2) == 0` → MSP；`!= 0` → PSP。汇编即 `TST LR, #4` / `MRSEQ R0, MSP` / `MRSNE R0, PSP`。

### ③ 持久化：三类"复位不清零"的存储介质

| 存储介质 | 抗复位能力 | 容量 | 适用场景 | STM32F411 例子 |
|---------|-----------|------|---------|---------------|
| `.noinit` SRAM 段 | 软复位/看门狗复位保留；**掉电丢失** | 大 | 常规崩溃记录，主推 | GCC `NOLOAD` / Keil `UNINIT` |
| 备份寄存器（RTC BKP） | 断电保留（VBAT）；软件可读 | 小（20 × 32bit） | 只存 magic + PC + 原因 | `RTC->BKPxR` |
| Flash 专用页 | 掉电保留 | 大 | 跨掉电追溯正式崩溃日志 | 启动后从良好状态写入 |

GCC `.noinit` 声明 + 链接脚本：

```c
__attribute__((section(".noinit"), used, aligned(4)))
crash_dump_t g_crash_dump;
```

```ld
.noinit (NOLOAD) :
{
    . = ALIGN(4);
    *(.noinit)
    . = ALIGN(4);
} > RAM
```

Keil/ARMCC 等价写法：`__attribute__((zero_init)) crash_dump_t g_crash_dump;` + 分散加载 `RW_NOINIT 0x20001000 UNINIT 0x200`。

> `NOLOAD`/`UNINIT` 语义：链接器保留地址，但启动文件 `.bss` 清零循环跳过它——这是"复位后数据仍在"的根本原因。

### ④ 做报告：启动早期的校验与消费

启动报告放 `main()` **最早期**（任何可能覆写这块内存的初始化之前）。校验用 **magic + CRC32 双重保险**（先查 magic 再算 CRC，两步都过才算有效，防掉电随机值撞 magic）。

```c
#define CRASH_MAGIC 0xA5A55A5A

bool crash_report_on_boot(void)
{
    if (g_crash_dump.magic != CRASH_MAGIC)
        return false;
    if (crc32_calc((uint8_t *)&g_crash_dump.version,
                   sizeof(g_crash_dump) - 8) != g_crash_dump.crc)
    {
        g_crash_dump.magic = 0;   /* CRC 不过 = 数据被踩 → 标记无效 */
        return false;
    }

    /* ★ 先报告 */
    printf("*** CRASH DETECTED ON PREVIOUS BOOT ***\r\n");
    printf("  PC=0x%08X LR=0x%08X xPSR=0x%08X\r\n",
           g_crash_dump.pc, g_crash_dump.lr, g_crash_dump.psr);
    printf("  CFSR=0x%08X Reason: %s\r\n",
           g_crash_dump.cfsr, cfsr_decode(g_crash_dump.cfsr));
    printf("  Last crumb: id=0x%02X param=%lu\r\n",
           g_crash_dump.last_crumb.id, g_crash_dump.last_crumb.param);
    printf("  addr2line -e firmware.elf -a -f 0x%08X 0x%08X\r\n",
           g_crash_dump.pc, g_crash_dump.lr);

    /* ★ 后消费：清 magic，防止下次启动重复打印 */
    g_crash_dump.magic = 0;
    return true;
}
```

离线解析：

```bash
arm-none-eabi-addr2line -e firmware.elf -a -f 0x08001111 0x08002222
```

## 步骤

### Step 1: 建立面包屑槽与写入宏

按第①点定义 `breadcrumb_t`、槽位数组与 `breadcrumb()` 宏。在关键任务边界、状态机转移、错误分支调用。注意优化编译（-O2）下对关键路径加 `__attribute__((noinline))`，面包屑写的是阶段/状态而非精确指令，语义上容忍轻微漂移。

### Step 2: 定义 crash_dump 并放 noinit 段

按第②③点定义结构体并声明到 `.noinit`（或备份寄存器/Flash）。确认链接脚本 `NOLOAD`/`UNINIT` 生效（`readelf -S` 或 Keil map 检查段落在预期 RAM 地址）。

### Step 3: 编写 naked 汇编 Handler

```c
__attribute__((naked)) void HardFault_Handler(void)
{
    __asm volatile (
        "TST LR, #4\n"        /* 判断 MSP/PSP */
        "MRSEQ R0, MSP\n"
        "MRSNE R0, PSP\n"
        "B HardFault_Handler_C\n"
    );
}

void HardFault_Handler_C(uint32_t *sp)
{
    g_crash_dump.pc    = sp[6];    /* 异常帧 +24 */
    g_crash_dump.lr    = sp[5];    /* 异常帧 +20 */
    g_crash_dump.psr   = sp[7];    /* 异常帧 +28 */
    g_crash_dump.cfsr  = SCB->CFSR;
    g_crash_dump.bfsr  = SCB->BFAR;
    /* 保存 R4~R11 与 last_crumb ... */
    g_crash_dump.magic = CRASH_MAGIC;
    g_crash_dump.crc   = crc32_calc((uint8_t *)&g_crash_dump.version,
                                    sizeof(g_crash_dump) - 8);
    NVIC_SystemReset();           /* Handler 只存现场 + 复位 */
}
```

**Handler 最小工作原则**：崩溃 Handler 里不做打印/Flash 擦写/延时等重操作，只填结构体 + 复位，IO 全部推迟到启动报告（崩溃时 UART/堆可能已损坏）。Flash 方案在 Fault 场景强制不擦除，避免崩溃上下文做危险操作。

### Step 4: 启动早期打印报告

main() 最早期调 `crash_report_on_boot()`（先 Report 后 Clear 的消费模式），确保上电瞬间串口/RTT 能收到（先开监听再复位）。

### Step 5: 验证

触发一次除零/非法指针 → 复位 → 看到崩溃报告 → 复制 addr2line 命令离线解析函数名 + 行号。

## 错误

| 错误现象 | 根因 | 解决 |
|---------|------|------|
| 复位后什么都没打印但确实崩过 | magic 被启动代码清零（.noinit 没生效 / 链接脚本漏 NOLOAD） | 确认 `.noinit` 段被 `.bss` 清零循环跳过 |
| PC 是乱值（不在 Flash 代码区） | 选错栈指针（裸机中断按 PSP 读 / 任务按 MSP 读） | 用 EXC_RETURN 判别 MSP/PSP |
| seq 全 0 或乱序 | `g_crumb_idx` 指"下一个写的位置"，最后有效值是 `idx-1`，应按 seq 取最大 | 按 `seq` 取最新，而非数组末尾 |
| 掉电后报告丢失（软复位在） | `.noinit` 掉电即失 | 跨掉电改用备份寄存器或 Flash 专用页 |
| 掉电后误报崩溃 | RAM 随机值恰好撞上 magic | magic + CRC32 双重校验，加 version 字段 |

## 边界

- **Handler 不做重操作** — 崩溃上下文里 UART/堆可能已损坏，禁止 printf/FreeRTOS API/Flash 擦写
- **存储介质必须复位保留** — 软复位用 `.noinit`；断电保留用 BKP/Flash
- **面包屑 ≠ 日志** — 固定槽位环形覆写只留最近 N 步；日志是追加全量
- **不替代崩溃瞬间定位** — PC/栈帧的精确解析交给 `debug-crash-backtrace`（CmBacktrace）

## 交接

- **崩溃瞬间定位（崩在哪）** → `debug-crash-backtrace`（CmBacktrace 与面包屑共享同一块 noinit 区可互相补全）
- **栈帧/回溯原理** → `debug-diagnostic-framework`（五层诊断模型 / HardFault 模式）
- **RTOS 任务栈场景** → `debug-rtos`（PSP/栈水位）
- **输出通道（RTT/串口）** → `observability-elog` / `observability-rtt-porting`
- **目标端源码基线** → `upstream-source-baseline.md`

## 参考资料

- **PJRC Teensy CrashReport and Breadcrumbs**: https://www.pjrc.com/teensy/td_crashreport.html
- **Memfault Firmware SDK log.h**（trail of breadcrumbs 设计）: https://github.com/memfault/memfault-firmware-sdk
- **armink/CmBacktrace**: https://github.com/armink/CmBacktrace
- **adamgreen/CrashCatcher**: https://github.com/adamgreen/CrashCatcher
- **esphome crash handler across reboots (PR #14709)**: https://github.com/esphome/esphome/pull/14709
- **Memfault: Cortex-M Fault Debug**: https://interrupt.memfault.com/blog/arm-cortex-m-fault-debug
- 参考案例工程（STM32F411 + FreeRTOS，Flash 扇区环形槽 64 条）：`stmf411_crumbsv10`
