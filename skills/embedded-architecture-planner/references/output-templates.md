# Output Templates

Use this reference when producing formal architecture deliverables.

## Architecture Report

```markdown
# Firmware Architecture Proposal

## Recommendation

## Current Project Diagnosis

## Product and Technical Constraints

## Target Architecture

## Directory Structure

## Layer Responsibilities

## Module Table

## Execution Model

## State Machines

## Event and Message Flow

## Diagnostics and Fault Strategy

## Migration Plan

## Risks and Tradeoffs

## Open Questions
```

## Candidate Choice Gate

Use this after project diagnosis and before detailed architecture design:

```markdown
## Current Diagnosis

## Candidate Architectures

| Option | Direction | Best Fit | Cost | Risk | Future Ceiling |
|---|---|---|---|---|---|
| A | Conservative repair | ... | ... | ... | ... |
| B | Balanced architecture upgrade | ... | ... | ... | ... |
| C | RTOS/event-driven redesign | ... | ... | ... | ... |

## Recommendation

I recommend Option B because ...

Please choose A/B/C, or tell me what constraint to change. After you choose, I will continue with the detailed directory structure, module boundaries, execution model, state/event plan, migration steps, and then ask whether to generate a small set of reference interface files.
```

Do not produce final scaffolding or edit project files before the user chooses unless they explicitly asked to skip confirmation.

## Reference Interface Gate

Use this at the end of an architecture package:

```markdown
## Next Implementation Step

The architecture package is complete. I can optionally generate a small reference interface set to make the module boundaries concrete.

Default scope:

| Type | Proposed Files | Purpose |
|---|---|---|
| Directories | only folders that receive reference headers | Establish architecture boundaries |
| Public headers | `app_state.h`, `svc_log.h`, `drv_xxx.h`, `board.h`, `timebase.h` | Define public contracts |
| Optional docs | `docs/architecture.md` | Record the chosen boundaries when useful |
| Untouched | vendor HAL, startup, linker, generated files | Avoid risky churn |

For CubeMX projects, show proposed paths under `User/` by default, such as `User/App/app_state.h`, `User/Services/svc_log.h`, `User/AppDrivers/drv_xxx.h`, `User/Bsp/board.h`, `User/Platform/timebase.h`, and `User/Docs/architecture.md`.

Please confirm whether to generate these reference interface files. For Chinese users, generated `.md` prose and `.h` comments will use Chinese, while code identifiers will follow the repository style. I will not create `.c` source stubs unless you explicitly ask for a broader code skeleton.
```

If the user already asked to generate code directly, still keep the default output to reference headers unless they explicitly ask for `.c` files, empty implementations, full scaffold, or implementation skeleton.

## Module Table

| Module | Layer | Responsibility | Public API | Depends On | Notes |
|---|---|---|---|---|---|

## Bare-Metal Schedule Table

| Function | Period/Trigger | Max Runtime | Priority | Can Block | Failure Policy |
|---|---|---:|---:|---|---|

## RTOS Task Table

| Task | Priority | Stack | Wakeup | Owns | Communicates With | Watchdog Health |
|---|---:|---:|---|---|---|---|

## Event Table

| Event | Publisher | Subscriber | Payload | Queue Policy | Log |
|---|---|---|---|---|---|

## Migration Plan

| Phase | Goal | Files | Verification | Rollback |
|---|---|---|---|---|

## Short Answer Shape

For quick user questions, answer in this order:

1. Recommended architecture
2. Why it fits
3. Minimal directory tree
4. Task/state/event sketch
5. First three implementation steps

For project-specific architecture work, answer in this order first:

1. Current diagnosis
2. Candidate options
3. Recommended option
4. Ask the user to choose before continuing

After the user chooses and the architecture package is produced, end with:

1. Next reference interface proposal
2. Files that will be created
3. Files that will remain untouched
4. Ask for confirmation to generate the reference interfaces
