# Dependency Contract

Use this reference when generating architecture packages, scaffolds, or skeleton code.

## Default Layer Contract

Use this dependency contract unless the repository already has a stricter local contract:

```text
Allowed:
app -> services/common
services -> product_drivers/common/platform
product_drivers -> bsp/platform/HAL
bsp -> HAL/CMSIS/generated Core headers
platform -> HAL/CMSIS/CPU only
common -> standard library/basic types only

Forbidden:
platform -> app/services/product_drivers
bsp -> app/services
services -> app
product_drivers -> app/services
common -> any project layer
```

For CubeMX `User/` layouts, map the physical folders to the same logical layers:

```text
User/App -> app
User/Services -> services
User/AppDrivers -> product_drivers
User/Bsp -> bsp
User/Platform -> platform
User/Common -> common
```

## STM32CubeMX Boundary

For STM32CubeMX projects, treat `Core/`, `Drivers/`, `.ioc`, and toolchain project folders as generated/vendor/tooling areas. Keep product architecture outside those folders unless integrating through documented user-code regions or project file groups.

Default CubeMX layout:

```text
User/
  App/
  Services/
  AppDrivers/
  Bsp/
  Platform/
  Common/
  Docs/
```

Use this pattern when the repository is still close to CubeMX defaults, when regeneration is likely, or when the team needs a clean mental boundary between generated startup/peripheral init and product firmware architecture. Keep `Core/Src/main.c` as startup wiring and handoff only; do not let it become the main product module.

If a CubeMX/STM32 project already has vendor `Drivers/`, do not create lowercase `drivers/` on Windows. Prefer `User/AppDrivers/` for product drivers to avoid mixing them with HAL/CMSIS.

## Shared Types

Shared DTOs, config structs, public event base types, and fault/error codes used by multiple layers must live in `common/`, `domain/`, or another neutral lower-level contract.

Do not place shared types in `app/` if `services/` or product drivers need to include them.

## Platform Adapter Boundary

Platform adapters must remain low-level. They may expose time, critical sections, assert hooks, memory hooks, and OS abstraction, but they must not contain product state-machine decisions.

For faults/asserts, prefer:

- weak hook called by `platform_assert_failed()`
- callback registered from `app`
- small retained fault record read by `app`
- local fail-stop only when no app recovery contract exists

For Cortex-M critical sections, do not generate a plain `disable_irq()`/`enable_irq()` pair unless nesting is impossible and documented. Prefer save/restore of PRIMASK or an explicit critical-state token.

## Actuator Safety

For boards with motors, relays, buzzers, heaters, power switches, or other actuators, generated startup flow must put outputs into safe states before service/app logic starts.

## Post-Generation Self-Check

After generating or editing skeleton files, run a lightweight include/dependency scan by inspection or shell search before reporting completion. Fix violations immediately unless the user explicitly requested a different local pattern.

Reject or fix these signs:

- Product architecture files are generated directly under `Core/` in a CubeMX project without a specific integration reason.
- `platform/*.c` or `platform/*.h` includes `app/`, `services/`, or product-driver headers.
- `services/*.c` or `services/*.h` includes `app/` headers.
- Product driver files include `app/` or `services/` headers.
- `common/` includes any project-layer header.
- A lowercase `drivers/` directory is created beside CubeMX vendor `Drivers/` on Windows.
- Actuator safe-output initialization exists but is not called before app/service startup.
- Cortex-M critical sections restore interrupts with unconditional enable instead of restoring prior interrupt state.
