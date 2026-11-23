# Embedded Review Dimensions

Use this checklist to avoid shallow project summaries.

## Identity

- MCU/chip family and exact model.
- Board or custom hardware name.
- Vendor SDK/HAL/LL/register style.
- Project purpose and main executable target.
- Whether the repository is firmware, firmware support tooling, documentation tooling, test framework, or a mixed project.

## Software Architecture

- Top-level layers and responsibility boundaries.
- Application entry and module ownership.
- Control flow and data flow.
- Boundary between hardware-facing code and platform/tooling-facing code.
- Public APIs or command interfaces.
- Where feature behavior is implemented.

## Build

- Build system: Keil, IAR, CMake, Make, PlatformIO, west, ESP-IDF, vendor IDE.
- Compiler and defines.
- Source inclusion and include paths.
- Generated artifacts: ELF/AXF/HEX/BIN/MAP.

## Startup And Memory

- Startup/vector table file.
- System init file.
- Linker/scatter/ICF file.
- Flash/RAM regions and stack/heap.
- Bootloader offset or vector relocation.

## Runtime

- `main` entry and initialization order.
- RTOS scheduler or bare-metal loop.
- Task/thread definitions.
- Interrupt handlers and callbacks.
- DMA, timers, SysTick, watchdog.
- For tooling projects: CLI/API/MCP entries, request handling, pipeline stages, storage, and output.

## Module Responsibilities

- Directory/module purpose.
- Key files.
- Entry functions/classes.
- Dependencies.
- Validation/test files.
- Likely edit points for common changes.

## Board And Peripherals

- Clock source and clock tree configuration.
- GPIO/pin mux configuration.
- UART/I2C/SPI/CAN/USB/Ethernet/ADC/PWM usage.
- External chips and buses.
- Power, reset, BOOT pins, and low-power modes if visible.

## Drivers And Middleware

- BSP layer.
- Vendor HAL/LL/register drivers.
- External device drivers.
- Filesystem, TCP/IP, USB stack, crypto, bootloader, logging.

## Build / Flash / Debug Operations

- Build scripts.
- Flash/programming scripts.
- Debug server/GDB scripts.
- Probe assumptions.
- Toolchain availability and missing tools.

## Risks

- MCU or board signal conflicts.
- Missing linker/startup files.
- Absolute local paths.
- Stale generated files.
- Unclear Flash address or bootloader offset.
- Peripheral exists but is not initialized.
- Manually modified vendor files.
- Unclear architecture boundaries.
- Important feature lacks a test or validation path.
