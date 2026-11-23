# Embedded Layering

Use this reference when designing directory structures, module boundaries, and dependency rules.

## Default Directory Shape

This tree is an architecture illustration, not a generation checklist. When creating files, follow `skeleton-generation.md` and default to a small reference interface set instead of generating every `.c` file shown here.

For STM32CubeMX-generated projects that still have the default `Core/`, `Drivers/`, and toolchain folders, prefer an independent `User/` tree. This keeps CubeMX regeneration safe and makes product architecture visually separate from generated startup and vendor HAL code. The tree below is a target architecture illustration; do not generate the full `.c` tree unless the user explicitly asks for a broad implementation skeleton.

```text
User/
  App/
    app_main.c
    app_state.c
    app_fault.c
  Services/
    svc_event.c
    svc_log.c
    svc_health.c
    svc_storage.c
    svc_comm.c
  AppDrivers/
    drv_button.c
    drv_led.c
    drv_sensor.c
  Bsp/
    board.c
    board_pins.h
  Platform/
    platform_os.c
    platform_time.c
    platform_critical.c
    platform_assert.c
  Common/
    fw_error.h
    fw_event.h
    fw_version.h
  Docs/
    architecture.md
```

Keep `Core/Src/main.c` responsible for CubeMX startup, board init handoff, and scheduler/app startup only. Put product behavior, services, drivers, and state machines under `User/`.

```text
firmware/
  app/
    app_main.c
    app_state.c
    app_fault.c
    app_config.c
  services/
    svc_log.c
    svc_storage.c
    svc_upgrade.c
    svc_comm.c
    svc_power.c
  product_drivers/
    drv_button.c
    drv_led.c
    drv_sensor.c
    drv_flash.c
    drv_motor.c
  bsp/
    board.c
    board_pins.h
    board_clock.c
  platform/
    osal.c
    timebase.c
    critical.c
    assert_port.c
  middleware/
  third_party/
  tests/
```

Adapt names to the repository's existing style. Use the generic `firmware/` shape for non-CubeMX projects or repositories that already have a strong custom layout.

## Layer Responsibilities

| Layer | Owns | Must Not Own |
|---|---|---|
| app | Product behavior, modes, policies, use cases | Chip registers, board pins, raw driver transactions |
| services | Reusable product capabilities: logging, storage, upgrade, protocol, power | Product-specific UI flow or direct peripheral registers |
| product_drivers | Device-level behavior: sensors, flash, display controller, modem driver | Product policy and cloud/application decisions |
| bsp | Board pins, clocks, power rails, interrupt routing, board variants | Business logic |
| platform | OS abstraction, critical sections, timebase, assert, memory hooks | Feature logic |
| middleware | Vendor or third-party stacks | Board-specific policy unless wrapped |

## Dependency Direction

Prefer:

```text
app -> services -> product_drivers -> bsp/platform -> vendor HAL/SDK
```

Allow app to call product drivers only for very small projects. In production projects, route product capabilities through services.

Avoid:

- Driver calling app directly
- Service knowing board pin names
- BSP depending on app mode
- Vendor callbacks containing product policy

## Interface Style

Use small C headers with product-level naming:

```c
typedef enum {
    SENSOR_OK = 0,
    SENSOR_ERR_BUS,
    SENSOR_ERR_TIMEOUT,
} sensor_status_t;

sensor_status_t drv_sensor_init(void);
sensor_status_t drv_sensor_read(sensor_sample_t *sample);
```

For services:

```c
void svc_log_init(void);
void svc_log_event(uint16_t event_id, uint32_t arg0, uint32_t arg1);
bool svc_storage_save_config(const app_config_t *config);
```

## Board Variation

For multiple boards, isolate:

- Pin map
- Clock tree
- Power rails
- Peripheral instances
- Interrupt priorities
- External device presence
- Calibration constants

Use `board_xxx.c/.h`, generated config, Kconfig, devicetree, or compile-time feature files depending on the ecosystem.
