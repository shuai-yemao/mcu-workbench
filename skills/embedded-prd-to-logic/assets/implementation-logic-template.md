# Embedded Application Logic Handoff

Use the user's language for the final document. Keep source labels stable: `req_explicit`, `project_found`, `candidate_impact`, `engineering_inference`, `user_resolved`, `user_declined_default`, `deferred`, `needs_confirmation`. Prefer table-level or row-level source labels; do not append labels to every prose sentence.

Save by default to:

```text
docs/logic/<feature-slug>-application-logic.md
```

If no writable workspace exists, return the document inline and explicitly state that it was not saved.

This document is **application-logic only**. Hardware, driver, register, and protocol design live in `hardware-solution` or `embedded-llm-guardrails` — list those as `deferred`, do not invent values.

---

## 0. Document Metadata

| Item | Content |
| --- | --- |
| Source requirement | (path or text reference) |
| Feature name | |
| Project root | |
| Output path | |
| Analysis date | |
| Project evidence level | project_found / candidate_impact / engineering_inference only |
| Development approach | `serial_pipeline` / `parallel_exploration` / `parallel_implementation` / `review_gate` plus plain-language name |
| Output artifacts | `md_only` / `md_plus_review_html` |
| Deferred items | (count) |

---

## 1. Resolved Decisions

Place this section near the top so the next agent sees decisions before reading design.

| # | Question | Options presented | User choice | Source | Reasoning |
| --- | --- | --- | --- | --- | --- |
| 1 | | | | user_resolved / user_declined_default | |
| 2 | | | | user_resolved | |
| ... | | | | | |

If a question was deferred rather than resolved, list it in §8 (Deferred / Risks / Open Items) instead.

---

## 2. Development Approach

<!--
  Skill-internal: choose the shape from references/dev-modes.md, but do not expose file paths,
  "mode_id", "profile", or other internal terms in visible text.
-->

<One short plain-language paragraph naming the development approach and why it fits.>

| Field | Value |
| --- | --- |
| Approach | <plain name + one-line meaning> |
| Rationale | <why this fits the project> |
| File ownership | <who owns which files — plain language> |
| Build & verify cadence | <when builds and verification happen> |
| Integration | <how the work is integrated> |

<!--
  Render §2.1 only for parallel implementation. Delete it for serial / read-only exploration /
  review-first modes.
-->

### 2.1 Parallel work split

| Worker | Owns | May not edit | Merge gate |
| --- | --- | --- | --- |
| | | | |

Merge order: <freeze shared interfaces first; merge leaf modules before dependent modules; integrator owns shared files; build after each merge level.>

---

## 3. Implementation Behavior Summary

Keep this section concise. Do not paste personas, product background, marketing language, or repeated PRD scenarios. Capture only behavior that changes code.

### 3.1 Scope controls

| In scope for implementation | Out of scope / do not implement | Source |
| --- | --- | --- |
| | | req_explicit / user_resolved |

### 3.2 Primary flow

| Step | Trigger | User-visible behavior | Internal action/state | Source |
| --- | --- | --- | --- | --- |
| 1 | | | | req_explicit / user_resolved |
| 2 | | | | |

### 3.3 Page/action behavior

Use one row per page, mode, command, or feature slice. This table should replace repeated scenario prose.

| Page/Feature | Trigger/Action | Expected behavior | State update | Safety/timeout | Source |
| --- | --- | --- | --- | --- | --- |
| | | | | | req_explicit / user_resolved |

### 3.4 Edge cases

| Edge case | Trigger | Required behavior | Source |
| --- | --- | --- | --- |
| | | | req_explicit / user_resolved / engineering_inference |

---

## 4. Evidence Boundary

- Source files directly read:
- Files/functions not verified by direct source reading:
- Items found only by keyword/project scan (treat as `candidate_impact`):
- Parameters not defined by requirement (and not yet clarified):
- Behavior not yet verified on hardware:
- Build/test/manual validation not yet performed:
- PRD narrative intentionally omitted from this programming handoff:

---

## 5. Application Design

### 5.1 Module split and responsibilities

<!-- INSTRUCTION (do not render): the Owner column follows the chosen development approach
     (single owner for serial/review; per-worker for parallel). -->

下表列出各模块的职责与实现归属。

| Module | Responsibility | Owns state? | Owner | Calls | Called by | Source |
| --- | --- | --- | --- | --- | --- | --- |
| | | yes/no | | | | engineering_inference / project_found |

### 5.2 Project impact and integration points

| Type | Path/Object | Recommendation | Source |
| --- | --- | --- | --- |
| Module | (e.g., `App/menu/`) | add / modify / reuse / avoid modifying | project_found / candidate_impact |
| File | | add / modify / read-only reference | project_found / candidate_impact |
| Function/API | | add / call / wrap / needs confirmation | project_found / candidate_impact |
| Integration point | (e.g., main-loop 1 ms tick, button EXTI callback) | hook here, keep call thin | engineering_inference |
| Generated/protected area | (e.g., CubeMX USER CODE region) | use markers; do not edit outside | project_found |

Keep integration sites thin — the application module owns the logic; `main.c`, task entries, callbacks, and ISRs hold only annotated calls into it.

<!-- INSTRUCTION (do not render): integration POINTS are always relevant; integration SEQUENCING
     (merge order) only matters under a parallel approach — then refer to §2.1. -->

> 集成点说明在哪里接入；若为并行实现，合并顺序见 §2.1。

### 5.3 Detailed logic per feature slice

For each page, state machine branch, or subsystem. Keep it algorithmic, not narrative:

- Inputs:
- Outputs (user-visible):
- Internal state:
- Main algorithm (state-by-state, not code):
- Error handling:
- Verification cue (what to observe on the device):

---

## 6. State Machine And Event Flow

### 6.1 Main states

```text
IDLE -> STARTING -> RUNNING -> STOPPING -> IDLE
                   |   ^
                   v   |
                 PAUSED-
                 ERROR ----> IDLE (on reset)
```

### 6.2 Events

| Event | Producer | Consumer | Payload | Source |
| --- | --- | --- | --- | --- |
| | | | | req_explicit / user_resolved / engineering_inference |

### 6.3 Transition rules

| Current | Event/Condition | Next | Action | Source |
| --- | --- | --- | --- | --- |
| | | | | req_explicit / user_resolved |

---

## 7. Safety Rules (Application Layer)

Rules the implementation must not violate:

- TBD
- TBD

High-risk application-logic areas to call out for this feature:

- State machine deadlocks:
- Event races:
- Stuck transitions / missing timeouts:
- Unbounded retries:
- UI freeze / long-blocking work:
- Silent data loss on overflow:
- Mode confusion (UI vs internal state):

---

## 8. Deferred / Risks / Open Items

### 8.1 Cross-skill dependencies (`deferred`)

Items this skill does not solve. Route each to the right skill or decision-maker.

| Item | Why deferred | Routed to |
| --- | --- | --- |
| (e.g., motor driver PWM frequency) | Hardware/driver design | hardware-solution |
| (e.g., Flash sector for persistence) | Storage layout decision | hardware-solution + embedded-llm-guardrails |
| (e.g., RTOS task priority/stack numbers) | Concrete RTOS config | embedded-llm-guardrails |

### 8.2 Conflicts

Conflicts between requirement, user clarifications, and project boundary files.

| Conflict | Parties | Resolution requested |
| --- | --- | --- |
| | | |

### 8.3 Open questions (non-blocking)

| Question | Why it does not block the first deliverable |
| --- | --- |
| | |

---

## 9. Minimal Tasks And Verification

### 9.1 Tasks

<!-- INSTRUCTION (do not render): structure the task list to match the chosen approach —
     serial → single linear chain; parallel → worker streams with blocked-on/gate columns;
     exploration → explore-then-write; review-first → gate task first, rest blocked until pass.
     Keep this guidance in the comment; render only the plain task table below. -->

<!-- FILL: 按 §2 的开发方式列出任务（串行=线性链；并行=分 worker 流并标注相互阻塞与构建门）。 -->

| Priority/Stream | Task | Owner/file scope | Depends on | Verification |
| --- | --- | --- | --- | --- |
| P0 | Resolve remaining `deferred` items at top of §8.1 | docs/user confirmation | none | confirmation record |
| P1 | Implement smallest compilable skeleton (init + idle state) | new module under App/ | P0 | build_passed |
| P2 | Wire one happy-path scenario end-to-end | new module + thin integration sites | P1 | manual_step_defined |
| P3 | Add edge cases from §3.4 | new module | P2 | manual_step_defined |
| P4 | Add remaining scenarios and persistence scope | new module + storage hook | P3 | manual_step_defined |
| P5 | Run regression and prepare change report | whole project | P4 | regression log |

### 9.2 Verification methods

| Check | Method | Evidence label |
| --- | --- | --- |
| Build | (command, e.g., `cmake --build --preset Debug`) | build_passed / not_verified |
| Unit/host test | (state-machine test path) | unit_testable / not_verified |
| Manual hardware step | (step list for happy + one edge scenario) | manual_step_defined / not_verified |
| Regression | (existing test suite run) | not_verified |

---

## 10. Next-Agent Instructions

- 先读 §1 已决问题与 §2 开发方式；按所选方式的分工、顺序与验证规则规划实现。
- 把 §3 表格、§5 设计、§6 状态机当作编码真相；勿把已压缩的需求叙述重新展开为实现范围。
- Read `.ai/LLM_RULES.md` and `.ai/LLM_BOUNDARY.md` before editing; respect the §7 Safety Rules.
- Do not resolve `deferred` items silently — they belong to another skill. Start with the P1 skeleton and one verifiable happy-path scenario.
- Keep `main.c`, task entries, callbacks, and ISRs thin; do not edit CubeMX/HAL/startup/linker/clock areas outside `USER CODE` markers unless explicitly confirmed.
