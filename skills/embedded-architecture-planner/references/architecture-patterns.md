# Architecture Patterns

Use this reference when choosing the firmware execution and organization pattern.

## Decision Map

| Pattern | Use When | Avoid When | Main Risk |
|---|---|---|---|
| Bare sequential flow | Bring-up, demo, tiny one-shot tools | Product logic grows or needs responsiveness | Hidden blocking |
| Super Loop | Few periodic activities, low RAM, simple timing | Many async events or natural blocking operations | Accidental scheduler in business code |
| Foreground/background | ISR-driven I/O with simple processing | ISR starts doing business logic | Shared data races |
| State machine | Product has modes, lifecycle, protocol, UI, fault recovery | Team refuses to document states | Flag explosion |
| Layered architecture | Board, chip, sensor, or SKU changes are likely | Single throwaway target | Abstraction without value |
| Event-driven | Many async modules need loose coupling | No event tracing or queue policy | Invisible dependencies |
| RTOS multitasking | Multiple blocking activities with different timing/priority | Functions are merely numerous | Stack, deadlock, priority mistakes |
| Component/platform | Product line, multi-board, feature matrix | First prototype with unstable requirements | Tooling and governance cost |

## Selection Heuristics

Start with project pressure, not preference:

- Timing pressure suggests ISR, DMA, timers, or RTOS priority design.
- Lifecycle complexity suggests state machines.
- Async interaction suggests event-driven design.
- Hardware variation suggests BSP and driver interfaces.
- Product-line reuse suggests componentization and configuration.
- Field maintenance suggests logging, fault capture, OTA, and diagnostics.

## Practical Baselines

Simple product:

```text
main loop + timer scheduler + ISR notifications + explicit app state machine
```

Mid-complexity product:

```text
app/services/product_drivers/bsp/platform + event queue + state machines
```

Connected product:

```text
RTOS tasks + event bus + services + persistent logs + OTA/fault strategy
```

Product line:

```text
board abstraction + driver interfaces + feature config + generated config + CI matrix
```

## Common Wrong Turns

- Using RTOS to compensate for unclear module boundaries.
- Using an event bus before naming event owners and dispatch context.
- Adding layers that only forward calls with no isolation value.
- Letting `main.c` become product logic, board config, ISR policy, and service startup all at once.
- Putting protocol parsing, storage writes, and logs inside ISR callbacks.
