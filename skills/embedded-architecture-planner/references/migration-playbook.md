# Migration Playbook

Use this reference when improving an existing firmware project.

## Migration Principles

- Preserve vendor-generated files unless the user explicitly wants generator integration changed.
- Move boundaries before moving logic.
- Introduce wrappers before replacing implementations.
- Keep builds passing after each phase when possible.
- Do not mix architecture migration with unrelated formatting.
- Keep public behavior unchanged unless the user asks for feature changes.
- Do not start migration edits before the user chooses a candidate architecture option, unless the user explicitly told the agent to skip confirmation.
- After the architecture package is delivered, actively offer a minimal reference interface set. Do not treat broad code scaffolding as the default next step.

## Safe Phase Order

### Phase 0: Snapshot and Diagnosis

- Record current build target and toolchain.
- Identify startup path, `main`, interrupt files, RTOS config, linker script, board files, and generated code.
- Identify user code regions and vendor-generated regions.

### Phase 1: Reference Interfaces

Create only the target directories and public headers needed to establish the first useful boundaries. Avoid moving large files or generating source stubs.

Default first interface set:

- Directories: only the layers that receive a header in this increment
- Headers: lifecycle/state, one service API, one driver API, board boundary, or OS/time/critical/assert contracts as needed
- Notes: optional architecture notes only where the next wiring step is non-obvious
- Source stubs: none by default; create `.c` files only after explicit user confirmation for a broader code skeleton

### Phase 2: Platform/BSP Boundary

Move board-specific constants, pins, clocks, and peripheral instance names behind BSP headers.

### Phase 3: Driver Wrappers

Wrap device operations with stable `drv_*` APIs. Keep HAL/SDK calls inside drivers.

### Phase 4: Services

Create services for product capabilities:

- Logging
- Storage
- Upgrade
- Communication
- Power
- Fault handling

### Phase 5: App State

Move product lifecycle into explicit state machine files.

### Phase 6: Execution Model

For bare-metal, introduce non-blocking timers and main-loop scheduling. For RTOS, introduce tasks and queues one subsystem at a time.

### Phase 7: Diagnostics and Tests

Add reset reason, firmware version, build info, assert hooks, watchdog health reporting, and smoke tests.

## What Not To Do First

- Do not move every file at once.
- Do not rewrite protocol stacks during architecture cleanup.
- Do not change interrupt priorities without documenting timing impact.
- Do not add RTOS tasks before identifying blocking boundaries.
- Do not split code into layers if dependencies still point upward.

## Migration Output Template

| Phase | Change | Files | Risk | Verification |
|---|---|---|---|---|
| 1 | Add reference interfaces | selected `.h` files under `app/`, `product_drivers/`, `services/`, `bsp/`, or `platform/` | Low | Build unchanged |
| 2 | Wrap board pins | `bsp/board_pins.h` | Medium | GPIO smoke test |
| 3 | Add driver API | `product_drivers/drv_xxx.*` | Medium | Peripheral test |
