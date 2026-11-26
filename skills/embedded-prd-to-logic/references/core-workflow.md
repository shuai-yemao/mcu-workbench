# Core Workflow

Detailed procedure for converting a customer requirement into embedded application logic. [SKILL.md](../SKILL.md) holds the summary table and the canonical source labels; this file holds the step-by-step detail.

The defining behavior of this skill: **ambiguity is resolved with menus, not open questions**. Every phase feeds that goal.

## Phase 1 — Requirement Parsing

Extract only what the source supports, at the application layer — what the user sees and does, not how the bits move on the wire.

### PRD-to-code filtering

The handoff is for AI programming. Do not copy the PRD structure. Convert source text into implementation signals:

| PRD content | Default handling in the handoff |
| --- | --- |
| User personas, market/background problem statements | Omit unless they change permissions, workflow, or acceptance criteria |
| Marketing adjectives such as "cool", "dashboard feel", "premium" | Convert to concrete UI constraints only if specified; otherwise omit |
| Long experience principles | Keep only measurable layout, timing, input, output, and safety constraints |
| Non-goals | Keep only items that prevent implementation scope creep; compress into one row/table |
| Repeated scenarios | Merge into one happy path plus edge-case table; do not repeat the same page flow in multiple sections |
| Source labels | Use row-level or section-level labels; avoid appending `req_explicit` to every sentence when the whole table comes from the requirement |

| Field | Capture |
| --- | --- |
| User story | One short implementation-facing story, not a persona list |
| Trigger | User action, external event, schedule, boot event, upstream message |
| Happy-path scenario | Concrete step-by-step of what the user perceives |
| Edge scenario | Cancel, timeout, no input, error, conflict |
| State | Named states the feature moves through |
| Output | Display change, sound, motion, LED pattern, message sent upstream |
| Acceptance | Observable on-device behavior that signals "done" |
| Out of scope | Explicit non-goals |

If a field is undefined, mark it `ambiguous` and queue it for Phase 3.

Do not extract pin numbers, I2C addresses, register maps, baud rates, Flash sectors, RTOS priorities, or calibration constants. Those are `deferred` and routed to other skills.

## Phase 2 — Ambiguity Detection

Go through the parsed fields and flag anything with more than one reasonable interpretation at the application layer. Common sources (seed options in `clarification-patterns.md`):

| Pattern | Example |
| --- | --- |
| Behavior choice | Auto-start vs wait for user |
| Default state | Factory default vs last-state-restore |
| Conflict resolution | Two triggers fire at once — which wins |
| Failure UX | Silent retry vs visible error vs hard stop |
| Lifecycle | How the feature starts, pauses, resumes, ends |
| Ownership | Existing module A vs existing module B vs new module |
| Naming / wording | UI strings, error messages, audible cues |
| Persistence scope | What survives reboot vs what resets |

Deduplicate near-identical ambiguities — if two questions collapse into one combined choice, combine them. Cap the round at 4; overflow goes to the document's Open Questions as plain text (no menu), since it does not block the first deliverable.

## Phase 3 — Options-Based Clarification

For each ambiguity, build a clarification menu.

### Option construction

1. **Specific, not generic.** "Auto-start on power-on, run until user stops" beats "automatic mode".
2. **2–4 options per question.** Never one (not a choice), never five (overload).
3. **Each option:** short label, concrete description, tradeoff/implication.
4. **Mark a recommended default** only when an engineering reason prefers one. If there is no engineering reason, present honestly without a recommendation.
5. **Labels stay short** (≤ 12 chars when possible) — they may become UI chips later.

### Downstream development mode

Always ask one downstream development-mode question (seeded by `clarification-patterns.md` Category I) unless the user already specified how later agents should develop from the document. It does not count against the 4-question cap. Record the selected `mode_id` in the document's "Agent Development Mode" section — later agents treat it as an execution switch, not just a resolved ambiguity. If the user says "you decide", default to `serial_pipeline` for production / high-risk firmware and `parallel_exploration` for large unfamiliar projects; record the source as `user_declined_default`.

The selected development mode changes only the development-organization parts of the document: §2 Development Approach, file ownership wording, §9.1 task grouping, and §10 Next-Agent Instructions. It must not change the feature behavior, state machine, safety rules, or deferred hardware decisions.

### Output artifact preference

Always ask one output-artifact question unless the user already specified the desired files. It does not count against the 4-question cap.

- `md_only` (recommended): generate only the AI-facing logic handoff `.md`.
- `md_plus_review_html`: generate the logic `.md` and a human-facing review `.html`.

Record the choice in §0 metadata. If the user says "you decide", choose `md_only` and record `user_declined_default`. If the user explicitly asks for HTML, review page, visual summary, or human-facing artifact, treat that as `md_plus_review_html`.

### Delivery

Prefer the host's structured-question tool — it gives clickable options and records the choice cleanly:

- Claude Code: `AskUserQuestion` with `questions: [{question, header, options: [{label, description}, ...], multiSelect}]`
- Codex without a structured tool: numbered inline list, ask the user to reply with the number

### Do not ask in this phase

- Hardware details (pin, address, register, bus, electrical spec) — `deferred`
- Tooling setup (build commands, programmer) — read from project or readme
- Anything already answered in this session or in memory — reuse it
- Implementation internals inferable from project conventions — infer and label `engineering_inference`

### Handling user responses

- Picks an option → record `user_resolved` with the chosen label and reasoning (or "user-directed").
- Says "you decide" → apply the recommended default (or the simplest, if none), record as `user_declined_default`.
- Proposes a third option outside the menu → record it verbatim, mark `user_resolved`.
- Declines to answer at all → defer to Open Questions; do not silently pick.

### Multi-round behavior

If an answer opens a new sub-ambiguity, schedule a follow-up round (still ≤ 4 per round). Do not loop more than 2 rounds without explicit user encouragement — at some point, write the document with the remaining items as `deferred`.

## Phase 4 — Project Inspection

Run `scripts/collect_project_context.py --project-root <project>` to enumerate candidates. Focus the scan on the application layer:

- Existing feature modules, app tasks, UI/scenes, event buses, state machines
- Where the new feature hooks in (init, periodic tick, event handler)

Treat scan output as candidate evidence. Before claiming a specific file/function/task/callback is the integration point, open that source file. If not yet directly read, label it `candidate_impact`.

Read local AI boundary files before proposing code boundaries:

- `.ai/LLM_RULES.md`
- `.ai/LLM_BOUNDARY.md`
- `.ai/TEAM_RULES.md`
- `.ai/PROJECT_STATUS.md`

Requirement intent does not silently override boundary rules. If they conflict, surface the conflict in the document's Conflicts section.

If no project is available, continue from the requirement alone and state that project impact has not been verified.

## Phase 5 — Requirement-to-Logic Mapping

Map the resolved requirement to the project:

1. Find existing feature modules with similar scope or naming.
2. Identify application-layer integration points: init, periodic tick, event handler, UI scene.
3. Decide whether the new logic belongs in an existing module or a new focused `.c/.h` pair under `App/` (or project equivalent).
4. Identify the smallest compilable and verifiable slice — one observable behavior path.

Tag every conclusion with a source label — the canonical label list lives in [SKILL.md](../SKILL.md). Never promote `candidate_impact`, `engineering_inference`, or `user_declined_default` to verified fact.

## Phase 6 — Output Document

Default save path:

```text
docs/logic/<feature-slug>-application-logic.md
```

Derive `<feature-slug>` from the PRD filename if one was provided; otherwise from the feature name.

Use `assets/implementation-logic-template.md` as the output shape — it defines the canonical section list (metadata, resolved decisions, agent development mode, implementation behavior summary, evidence boundary, application design, state machine and event flow, safety rules, deferred / risks / open items, minimal tasks and verification, next-agent instructions). Do not duplicate that section list here.

**Output must be self-contained.** The rendered document is read by people who have never seen this skill. Do NOT let skill-internal mechanics leak into visible text:
- No references to this skill's files (`references/*.md`, `assets/*`, `scripts/*`).
- No `Layer A` / `Layer B` terminology, no `mode_id` / `profile` jargon.
- No instruction-style phrases ("fill per profile", "按 profile 填充", "keep only the rows your profile requires").
- No section-enumeration meta ("§1/§3 are mode-agnostic", "this §2 … is filled per …").

All such guidance belongs **only** in the template's `<!-- comments -->`. Visible text is plain, reader-facing content: name the development approach in plain words (e.g. "并行实现：多个开发者按文件互斥分工，由集成者合并"), state ownership/sequencing directly, and let any source labels be explained by the document's own glossary. If a sentence only makes sense to someone who has read this skill, rewrite or delete it.

When filling the template, prefer code-facing tables over prose. If the source PRD contains rich product narrative, summarize it only when it changes state transitions, UI text/layout constraints, safety behavior, or acceptance tests.

Apply the selected development mode using `references/dev-modes.md`. Keep it simple: write the chosen approach in plain language, set file ownership rules, shape §9.1 tasks accordingly, and write concrete next-agent instructions. Delete unused mode-specific tables from the output.

If the user chose `md_plus_review_html`, render the optional human review view after the `.md`: use `assets/review-template.html` and `references/render-review.md`, translating the same content into cards / diagrams / plain language. This is a re-render, not a second analysis pass or clarification round.

The final chat response stays short: saved path(s), summary of main decisions, and the list of `deferred` items the user may want to route to another skill. The default saved artifact is the logic `.md`; produce the review `.html` only if the user chose `md_plus_review_html`.

## Phase 7 — Stop Before Code

This skill prepares a handoff and writes no production code. The logic `.md` is the default artifact for the coding agent; the review `.html` is optional for human evaluators. If the user then asks for implementation, route to `embedded-llm-guardrails`, `hardware-solution`, `embedded-unit-test-generator`, and `embedded-change-report` as described in [SKILL.md](../SKILL.md).
