# platform_mcu 接入架构设计（形态定稿）

> 版本：v1.0 | 日期：2026-08-10 | 状态：**待用户确认**
> 范围：把已就绪的 platform_mcu 4 能力（irq/tick/gpio/uart + impl_mcu 实现）**接入上层**，实现本课产物"上层脱离 HAL 调用"。
> 关联：审查包 `platform-mcu-advance-review-package.md`；依赖铁律（App→Service→Platform←Impl→Vendor）；P3（顺序策略归 Service）。

## 0. 目标

1. 上层（Service/App）经 `platform_*` 接口使用 MCU 能力，App 代码零 HAL 符号。
2. 接入点符合依赖铁律（**App 不直调 platform_mcu**，D8）。
3. 同一份上层代码换芯片只换 Impl（验证分层红利）。

## 1. 形态定稿（两个产物，职责分离）

| 产物 | 位置 | 性质 | 职责 |
|---|---|---|---|
| **正式接入** | `service_system` 扩展 boot 序列 | 参与正式启动链 | MCU 基础设施初始化（tick→uart→gpio）编排 |
| **教学演示** | `00_Docs/lesson10_platform_mcu_smoke.c` | 独立演示（对齐 lesson08/09 模式） | 展示上层经 platform_* 接口操作 MCU（GPIO 翻转/UART 打印/tick 延时），不参与正式 boot |

**为什么正式接入放 service_system 而非别处**：
- App（app_init）直调 platform_mcu → **违反 D8**（App 只调 Service）。
- board_manager（platform_common/manager）→ 它编排的是 **device/service 四元组对象**；MCU 能力是平台基础设施，不是 device，混入会污染对象模型。
- service_system 已是"启动编排门面"，MCU 初始化属 boot 基础设施编排——**归它天然**，且与 P3（顺序策略归 Service）一致。

## 2. 分层与依赖（谁调谁）

```text
App（app_init 四阶段）──► Service（service_system）──► Platform 契约（platform_mcu/*.h）
                                        │                      │
                                        └──► 原 board_manager 编排（device/service）
                                                          Platform ←Impl─►（impl_mcu 符号实现）
```

- App：只调 `service_system`（不触碰 platform_mcu 符号）。
- Service：`service_system` 调 `platform_tick_init/uart_init/gpio_init`——**依赖 Platform 接口，合法**。
- Platform：契约头零芯片依赖（已门禁守护）。
- Impl：符号实现（链接期注入），换芯片换 impl_mcu 整层。

## 3. boot 序列定稿

`app_init` 四阶段不变，**boot 阶段扩展**：

```text
plat_boot_init():
  1. service_log_init()                 // 日志最先（P2：任何平台对象使用前）
  2. service_system_mcu_init()          // ★新增：MCU 基础设施
        platform_tick_init()            //    时基先行（impl_uart 超时判定依赖 tick）
        platform_uart_init(0, 115200)   //    串口 USART1（8N1）
        platform_gpio_init(LED, OUT)    //    LED（如 PA5）
  3. service_log_print_banner()         // banner 最后（此时基础设施已就绪）
→ plat_board_init → plat_service_init → plat_app_init（原样）
```

顺序依据：`impl_uart.c` 的 write 超时判定调用 `platform_tick_get_ms()`——**tick 必须先于 uart**；日志与 tick 无硬依赖（elog 时间戳未启用），但保持"日志最先"契约不变。

## 4. 演示内容（lesson10，教学）

```c
/* 00_Docs/lesson10_platform_mcu_smoke.c —— 上层视角，零 HAL 符号 */
platform_tick_init();                     // 或经 service 门面
platform_uart_init(0, &(platform_uart_cfg_t){ .baudrate = 115200 });
platform_gpio_init(&LED_PIN, PLATFORM_GPIO_DIR_OUT, PLATFORM_GPIO_PULL_NONE);
for (;;) {
    platform_gpio_toggle(&LED_PIN);       // LED 翻转
    platform_uart_write(0, (const uint8_t *)"tick\r\n", 6, 100);
    /* 延时：差值比较语义 */
    uint32_t t0 = platform_tick_get_ms();
    while ((platform_tick_get_ms() - t0) < 500u) { }
}
```

- 演示"同一份代码换芯片只换 impl"：代码里无 `HAL_`/寄存器符号。
- 验证分级：host 编译（守卫分支，验证调用形态）+ `-DSTM32F411xE` 目标端语法编译；板上行为由用户烧录验证（本阶段无构建系统，不做运行验证——与既有 lesson 模式一致）。

## 5. 验证与门禁

| ID | 验证 | 条件 |
|---|---|---|
| V-1 | service_system 扩展语法 | gcc -fsyntax-only（目标 + host 双分支） |
| V-2 | App 零 platform_mcu include | baseline 断言（App 只调 service_*） |
| V-3 | 快照同步 | 实仓改动回写插件 fixtures + baseline 7/7 + 全量测试 |
| V-4 | demo 编译 | gcc -fsyntax-only（host 分支） |

## 6. 决策记录（ADR 要点）

- **D-1 MCU 初始化归 service_system**：机制在 Platform/Impl，顺序编排在 Service（P3 一致）；不新建 service_mcu（YAGNI——MCU 是基础设施非业务服务）。
- **D-2 初始化不走 board_manager**：MCU 能力非 device 四元组对象，避免污染对象模型；基础设施初始化在 manager 编排前完成。
- **D-3 demo 放 00_Docs 非 App**：教学代码不参与正式构建，避免依赖铁律争议（demo 直调 platform_* 仅为展示，正式代码经 service 门面）。
- **D-4 符号实现不改为 ops 表**：4 能力单后端，保持链接期注入（上一课决策，本次接入不动）。

## 7. 不做（本阶段）

- 不新建 service_mcu / service_gpio 等业务服务。
- 不引入构建系统/烧录链（板上验证由用户后续进行）。
- 不扩 UART rx / 多串口 / i2c/spi/timer/power（审查包后续项）。
- 不改 board_manager 编排逻辑。
