---
name: platform-stm32-hal
description: 在 CubeMX 生成的 HAL 工程上开发 STM32 固件。涵盖外设配置、BSP 驱动架构、中断安全代码、硬件感知故障排查。覆盖 UART DMA+IDLE 不定长接收、SPI/I2C 时序、ADC 校准、FreeRTOS 集成。当用户需要 STM32 HAL 实现指导（而非通用 C 语言建议）时使用。触发词：STM32、HAL、CubeMX、STM32Cube、外设初始化、HAL库、STM32开发、STM32外设配置、MX_Init、HAL_Init、STM32项目、stm32工程、HAL实现、HAL配置、STMCube、生成代码、HAL驱动、STM32驱动、STM32F1、STM32F4、STM32H7、STM32G4。
version: "1.0.0"
---

# STM32 HAL Development

Treat this skill as the working playbook for CubeMX-based STM32 projects.

## Workflow

1. Read [references/core-guidelines.md](references/core-guidelines.md) first.
2. Keep all custom code inside `USER CODE` regions unless the project has an explicit non-CubeMX extension point.
3. Configure peripherals in CubeMX, regenerate code, then add application or BSP logic.
4. Read additional references only as needed:
   - [references/peripheral-driver-guide.md](references/peripheral-driver-guide.md) for sensor and bus drivers
   - [references/hal-quick-reference.md](references/hal-quick-reference.md) for API lookups
   - [references/troubleshooting-guide.md](references/troubleshooting-guide.md) for failure analysis
   - [references/usage-examples.md](references/usage-examples.md) for implementation patterns
5. Reuse [assets/bsp-template.c](assets/bsp-template.c) and [assets/bsp-template.h](assets/bsp-template.h) when starting a new BSP module.

## Notes

- Prioritize hardware constraints, interrupt safety, and regeneration safety over local code convenience.
- Do not modify CubeMX-generated initialization files directly when the same change belongs in the `.ioc` configuration.

## 边界定义

### 不该激活
- 用户的目标芯片不是 STM32 系列（ESP32、nRF、GD32、NXP i.MX RT 等）→ 查找对应平台的开发指南
- 用户需要的是寄存器操作或 LL 库开发（非 HAL）
- 用户的项目未使用 CubeMX 生成代码
- 用户只需要查阅特定 HAL API 的参考手册（使用 hal-quick-reference.md 即可）

### 不该做
- **禁止**修改 CubeMX 生成的非 USER CODE 区域代码（会被 CubeMX 重新生成覆盖）
- **禁止**在中断回调中调用阻塞式 HAL 函数：包括但不限于 `HAL_Delay`、`HAL_UART_Transmit`（含 `HAL_MAX_DELAY`）、`HAL_I2C_Master_Transmit` 等。ISR 内只允许置标志位，实际通信必须在任务/主循环中执行。违反此规则将导致 HAL 状态机卡死（xState/RxState 永久锁定在 BUSY 状态），且同优先级 ISR 内轮询 TXE/TC 可能永久阻塞
- **禁止**建议使用 `HAL_Init()` 以外的时钟配置方式（时钟树通过 CubeMX 管理）
- **禁止**绕过 HAL 直接操作外设寄存器（除非在 critical section 中有性能硬需求，或 STM32F1 的 GPIO PULLUP 在 HAL 中无法生效必须直接写 CRL/BSRR）

### 不该碰
- **不触碰** `.ioc` 文件：只建议配置项，不直接修改 XML
- **不触碰** CubeMX 生成的非 USER CODE 区域
- **不触碰** CMSIS Core 文件（core_cm4.h 等系统头文件）
