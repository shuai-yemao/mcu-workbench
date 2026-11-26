# Application-Logic Risk Rules

Use this reference when converting a customer requirement into **application-layer** logic for an embedded product. Hardware, driver, register, and protocol design risks are out of scope here — route them to `hardware-solution` or `embedded-llm-guardrails`.

## Scope Boundary

In scope (this skill owns these decisions):

- User-visible behavior (UI flow, scenarios, state transitions, error UX)
- Application state machines and event flow
- Module split and ownership at the App/Feature layer
- Public API sketches for new/modified app modules
- Integration points (init / periodic tick / event handler) — kept small

Out of scope (route to other skills, mark as `deferred`):

- MCU/SoC model, pin mapping, electrical polarity, power tree
- I2C/SPI/UART/CAN bus timing, register maps, frame layouts
- Clock tree, PLL, low-power modes, watchdog hardware config
- ISR/DMA/critical-section implementation
- RTOS priority/stack/queue concrete numbers
- Flash/EEPROM addresses, sector layout, wear-leveling
- Calibration constants, safety thresholds measured against hardware limits
- Production jig, EMI/ESD, compliance testing

When a requirement forces an out-of-scope decision, list it under "Cross-skill Dependencies" in the output document and let the user route it. Do not invent values to make the application logic "look complete".

## Do Not Guess (Application Layer)

The following must be confirmed via the options-based clarification flow (Phase 3) before they enter the design:

- Which behavior wins when the user and the system both trigger the feature
- Power-on / boot default state of the feature
- Failure UX: silent retry vs visible error vs hard stop
- Cancel/interrupt behavior mid-cycle
- Which inputs and outputs are in scope for this iteration
- Whether progress persists across reboot
- Which existing module owns the new behavior
- UI wording shown to the end user

## High-Risk Application-Logic Areas

Call these out explicitly in the document's "Safety Rules" section so the implementing agent does not miss them:

- **State machine deadlocks** — states with no exit transition on a plausible event
- **Event races** — two events arrive near-simultaneously, end in inconsistent state
- **Stuck transitions** — waiting on a condition that may never arrive (no timeout)
- **Resource starvation** — periodic processing hogs CPU, starving other features
- **UI freeze** — long-running work blocks the UI tick
- **Unbounded retry** — error handler retries forever without backoff or cap
- **Silent data loss** — cache/buffer overflow drops user-visible events without trace
- **Loss of user settings** — default-on-reboot when the user expected persistence
- **Mode confusion** — UI shows one mode while the device is in another
- **Critical sections held too long** — app-layer lock wraps slow operations

For each, write a one-line rule the implementation must respect. Examples:

- "Cancel event from any state must transition to idle within one tick."
- "Retry backoff: 1s, 2s, 4s, 8s, then stop and surface error."
- "Cache drops oldest entry on overflow; never the in-progress one."

## Logic Placement Rules (Application Layer)

- Put new behavior in a focused module under `App/` (or project equivalent). Keep `main.c`, task entries, callbacks, and ISRs minimal — only annotated calls into the app module.
- Public API of an app module: `init()`, `process(tick_ms)`, event handlers, query handlers. Internal state is private.
- Prefer state machines for multi-step behavior. Avoid boolean flags scattered across functions.
- When logic needs unit tests on the host, isolate hardware access behind a small wrapper so the state machine can be tested without the BSP.
- For CubeMX-generated projects, place calls inside `USER CODE BEGIN/END` markers; do not edit outside.
- If `.ai/LLM_BOUNDARY.md` marks a file or directory as protected, do not suggest modifying it unless the user explicitly confirms an exception.

## Unreliable Evidence

Treat as weak signals — label `candidate_impact` until verified by direct source reading:

- File names found by keyword search
- Comments describing intended behavior that the code does not enforce
- Old test files that may no longer match firmware behavior
- Generated code that may be overwritten by CubeMX
- Build outputs from a different target, board, or configuration
- README claims not reflected in current code

Never promote weak signals to `project_found`.

## Verification Labels

- `build_passed`: the build command has run and passed.
- `unit_testable`: a host/unit test exists or can be generated for the state machine.
- `manual_step_defined`: hardware manual test steps are defined; do not imply they have passed.
- `not_verified`: no command, log, or evidence was provided.

Do not claim timing validation, hardware validation, closed-loop regression, or production readiness without evidence.

## Conflict Handling

If the user's clarification choice conflicts with:

- A project AI boundary file → surface the conflict in "Conflicts" subsection; do not silently pick the user over the boundary. Ask one more clarification if needed.
- A previously resolved ambiguity → flag the contradiction; ask the user to pick which one wins.
- A hardware reality that cannot be confirmed → mark the affected design branch `deferred` and continue with the rest.

Conflicts are not failures — they are evidence the skill is doing its job. Surface them in the document, do not smooth them over.
