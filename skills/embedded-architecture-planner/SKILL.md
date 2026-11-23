---
name: embedded-architecture-planner
description: |
  Design and refactor embedded/MCU firmware software architecture from user requirements and existing project code. Use when Codex needs to analyze STM32, ESP32, RTOS, bare-metal, HAL/LL/SDK, BSP, product drivers, middleware, application layering, state machines, event-driven flows, RTOS task scheduling, OTA, low-power, diagnostics, or product-line firmware architecture; produce directory structures, module boundaries, task plans, interface drafts, migration plans, or architecture reports. By default, generate only small reference interface files, not broad implementation skeletons.
---

# Embedded Architecture Planner

## Core Mission

Design firmware architecture that matches product complexity, MCU resources, team maturity, and maintenance pressure. Read the user's requirements and project before proposing architecture. Prefer practical migration steps over clean-room rewrites.

This skill can produce architecture diagnosis, candidate options, target architecture packages, directory structures, module boundaries, RTOS task plans, state/event plans, migration plans, and small reference interface drafts. It should not generate broad source scaffolds unless the user explicitly asks for code skeletons.

## Workflow

### 1. Gather Context

Inspect the project when a path or workspace is available. Do not ask for details that can be discovered locally.

Collect product goal, MCU/SoC, board, SDK/HAL/LL, compiler/IDE, RTOS or bare-metal model, peripherals, Flash/RAM, latency, power, boot, safety, OTA, diagnostics, and product stage.

For repository scanning, start with `rg --files`. Use `scripts/scan_project_structure.py <project-root>` when a compact architecture signal report helps.

### 2. Diagnose Current Shape

Classify the current firmware shape and cite concrete evidence such as paths, symbols, config files, startup flow, task creation sites, ISR handlers, callback style, globals, and cross-layer calls.

Recognize these built-in patterns:

- Bare sequential flow
- Super Loop
- Interrupt foreground/background
- State-machine driven
- Layered BSP/Product Driver/Service/App
- RTOS multitasking
- Event/message driven
- Component/platform architecture
- Mixed or accidental architecture

### 3. Propose Candidate Architectures and Stop

After diagnosis, propose 2-4 candidate architecture directions and ask the user to choose before producing the full architecture package or editing project files.

Each option must include name, best fit, cost, risk, future ceiling, and recommended conditions. Mark one option as the recommended default.

Do not continue into detailed design until the user chooses, unless the user explicitly asks to skip confirmation with wording such as "direct final plan", "do not ask me", or "generate directly".

Use this choice gate:

```text
I recommend Option B. Please choose:

A. Conservative repair
B. Balanced architecture upgrade
C. RTOS/event-driven redesign
D. Product-line platformization

After you choose, I will produce the detailed architecture package and then ask whether to generate a small set of reference interface files.
```

Skip this gate only for quick conceptual explanations with no project-specific architecture package or code changes.

### 4. Produce Architecture Package After Choice

After the user chooses, select the lightest architecture inside that direction that can survive the next product phase.

Use these defaults:

- Simple control product: Super Loop + interrupt foreground/background + explicit state machine
- Mid-complexity product: light layering + state machine + event queue
- Connected or UI-heavy product: RTOS + layering + event-driven services + diagnostics
- Product-line firmware: componentization + board abstraction + feature configuration + CI build matrix
- Safety/automotive/multi-vendor system: standard layered thinking with explicit tooling and process cost

For a serious architecture answer, read `references/dependency-contract.md`, then include current diagnosis, target decision, directory tree, layer responsibilities, module table, execution model, state machine, event/message table, diagnostics strategy, migration phases, risks, and "what not to change yet".

### 5. Offer a Minimal Interface Gate

After producing the architecture package, do not stop silently. Always add a `Next Implementation Step` section that offers to generate a minimal set of reference interface files.

The reminder must list proposed directories, public headers, optional architecture notes, files that should stay untouched, and expected verification. Do not propose `.c` implementation files, empty modules, or adapter source files by default.

Use this closing gate:

```text
The architecture package is complete. I can optionally generate a small reference interface set to make the module boundaries concrete.

Default scope:
- directories: ...
- public headers only: ...
- optional docs: ...
- untouched for now: ...

Please confirm whether to generate these reference interface files. I will not create `.c` source stubs unless you explicitly ask for a broader code skeleton.
```

### 6. Generate Reference Interfaces After Confirmation

When the user confirms, read `references/skeleton-generation.md` and `references/dependency-contract.md`, then create only the first safe increment unless the user asks for a broad scaffold.

Prefer directories, public headers, small shared contract headers, and optional integration notes. Default to 3-8 files total for an existing project, and only exceed that when the user asks for broader scaffolding. Do not create `.c` source files, empty module implementations, adapter source files, move large existing files, rewrite vendor-generated code, or change runtime behavior unless explicitly requested.

When generating `.md` or `.h` files for Chinese users or Chinese firmware teams, write Markdown prose and C header comments in Chinese by default. Keep identifiers, macro names, include guards, types, and function names in the repository's existing English/C naming style.

After generation, report files created/edited, architecture mapping, manual integration needed, suggested verification, and dependency self-check results.

## Reference Routing

Read only the relevant references:

- `references/architecture-patterns.md`: choose among bare-metal, Super Loop, foreground/background, state machine, RTOS, event-driven, and platform architectures.
- `references/embedded-layering.md`: design BSP/Product Driver/Service/App/Platform boundaries and directory structures.
- `references/rtos-task-design.md`: design FreeRTOS/RT-Thread/Zephyr-style tasks, queues, priorities, stacks, timers, and synchronization.
- `references/state-machine-design.md`: design lifecycle, protocol, UI, low-power, and fault state machines.
- `references/event-driven-design.md`: design event names, event ownership, queues, dispatch contexts, and tracing.
- `references/migration-playbook.md`: refactor existing firmware safely without breaking vendor code or user changes.
- `references/skeleton-generation.md`: generate the first safe directory and reference interface set; broad source skeletons require explicit user request.
- `references/dependency-contract.md`: enforce layer dependency rules when designing module boundaries, forbidden dependencies, architecture packages, or skeleton code; run post-generation self-checks after edits.
- `references/output-templates.md`: use when the user wants a formal report or structured architecture document.

## Engineering Rules

- Preserve user changes and generated vendor code unless editing is necessary.
- For STM32CubeMX projects, keep the user's firmware architecture in an independent user-owned tree such as `User/` by default. Treat `Core/`, `Drivers/`, `.ioc`, and toolchain folders as generated/vendor/tooling boundaries; integrate through CubeMX user-code regions and IDE project groups instead of mixing product architecture into generated files.
- Prefer repository conventions over a generic ideal structure.
- Keep MCU constraints visible: stack, heap, ISR latency, DMA buffers, Flash erase time, low-power wakeup, watchdog windows.
- Treat logs, assertions, firmware versioning, reset reason, and fault capture as architecture, not afterthoughts.
- Keep ISR work short: capture, clear, buffer, notify. Move business logic to the main loop or tasks.
- Make state explicit before adding flags.
- Make blocking boundaries explicit before adding RTOS tasks.
- Design module APIs around product capabilities, not chip registers.
- When a CubeMX project already has vendor `Drivers/`, avoid creating lowercase `drivers/` or another ambiguous driver folder beside it on Windows. Prefer `User/AppDrivers/`, `User/Bsp/`, `User/Services/`, `User/Platform/`, and `User/Common/` unless the repository already has a stronger local convention.
- For generated reference `.md` and `.h` files, use Chinese for explanatory text and comments by default when the user communicates in Chinese. Keep code identifiers and public API names concise and English-style unless the repository already uses another naming convention.

## Response Style

Lead with the practical recommendation, then show the reasoning. For existing projects, cite file paths and current evidence. For new projects, state assumptions and design the first version that can grow without forcing a rewrite.
