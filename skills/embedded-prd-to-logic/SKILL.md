---
name: embedded-prd-to-logic
description: >-
  Convert a customer requirement, PRD, feature concept, issue, or change request
  into application-logic implementation design for an embedded product:
  user-visible behavior, scenarios, state machines, event flow, module split,
  and the smallest verifiable development tasks. Use when analyzing what an
  embedded feature should do at the application layer, or producing an
  implementation-ready application-logic handoff document. When the requirement
  is ambiguous, present 2-4 concrete candidate options with tradeoffs and ask
  the user to choose — never silently fill in defaults. Focuses on application
  logic, not hardware/driver/register design; hardware details are deferred to
  hardware-solution or driver skills.
---

# Embedded PRD To Application Logic

## Overview

Convert a customer requirement into an implementation-ready **application logic** handoff document for an embedded product: user-visible behavior, application-layer state machines and event flow, module split, public API sketches, and the smallest verifiable tasks.

Default output is an **AI programming guide**, not a PRD summary. Compress product background, personas, marketing adjectives, broad experience principles, long non-goals, and repeated scenario prose. Preserve only behavior that affects code: triggers, states, events, module ownership, APIs, safety rules, deferred engineering decisions, tasks, and verification.

**Scope boundary:** application logic only. Hardware, drivers, register maps, protocol stacks, Flash/storage layout, and concrete RTOS numbers are out of scope — mark them `deferred` and route to `hardware-solution` / `embedded-llm-guardrails`. The full in/out-of-scope list lives in `references/embedded-risk-rules.md`.

## Core Principle: Options-Based Clarification

Customer requirements are ambiguous. This skill's defining behavior: **resolve ambiguity with menus, never open-ended question lists.**

For every ambiguous point, generate **2–4 concrete candidate options** and ask the user to choose — via the host's structured-question tool (`AskUserQuestion` in Claude Code) or an inline numbered list in Codex. Option-construction rules and seed menus: `references/clarification-patterns.md`.

Hard limits: **at most 4 questions per round**, each 2–4 options. Overflow goes to the document's Open Questions as plain text.

Always ask the two handoff setup questions before writing the document unless the user already answered them: (1) downstream development mode, and (2) output artifact preference (`md_only` or `md_plus_review_html`). These setup questions do not count against the 4 business-ambiguity question cap.

## Workflow

Run these phases in order. **Detailed procedure for each phase: `references/core-workflow.md`** — read it before producing the document.

1. **Parse** — extract app-level semantics; mark gaps `ambiguous`
2. **Detect** — flag ambiguities that block app-logic design
3. **Clarify** — ask handoff setup questions, then 2–4 options per business ambiguity (≤ 4 / round)
4. **Inspect** — run `scripts/collect_project_context.py`; read the `.ai/` boundary files
5. **Map** — modules, state machines, public APIs, integration points; tag every conclusion with a source label
6. **Produce** — fill `assets/implementation-logic-template.md` and save the AI-facing handoff to `docs/logic/<feature-slug>-application-logic.md`. If the user chose `md_plus_review_html`, also render `docs/logic/<feature-slug>-review.html` using `references/render-review.md`.
7. **Stop** — no production code unless the user explicitly asks

### Source labels (canonical — use throughout; keep stable across translations)

- `req_explicit` — the requirement directly states it
- `project_found` — verified by reading source
- `candidate_impact` — scan/keyword hit, not yet verified
- `engineering_inference` — reasonable inference
- `user_resolved` — picked by the user during Phase 3
- `user_declined_default` — user said "you decide"; recommended default applied
- `deferred` — out of scope; routed to another skill or later decision
- `needs_confirmation` — non-blocking; carried to Open Questions

Never promote `candidate_impact`, `engineering_inference`, or `user_declined_default` to verified fact.

## Commands

Collect project context (application focus):

```bash
python <skill-dir>/scripts/collect_project_context.py --project-root .
```

Guided by requirement keywords (path + content search):

```bash
python <skill-dir>/scripts/collect_project_context.py --project-root . --keywords "menu,scene,led,state" --content-search
```

Write JSON output to a file:

```bash
python <skill-dir>/scripts/collect_project_context.py --project-root . --output req-project-context.json
```

Treat scan hits as `candidate_impact`. Open the relevant source file before asserting an integration point.

## Output Rules

- Use the user's language; Chinese requests default to Chinese. Translate section titles; keep source labels stable.
- **Self-contained output**: the document must read standalone to someone who has never seen this skill. No references to this skill's files (`references/*`, `assets/*`), no `Layer A/B` / `mode_id` / `profile` jargon, no "fill per profile" instruction language, and no section-enumeration meta in visible text — all such guidance lives in template `<!-- comments -->` only.
- Ask for output artifact preference before writing unless already specified. Default recommendation is `md_only`; generate the human review `.html` only when the user chooses `md_plus_review_html` or explicitly asks for a review page, visual summary, HTML, or human-facing artifact. In the final chat response, give the saved path(s), summarize main decisions, and list `deferred` items the user may want to route elsewhere.
- Do not reproduce PRD prose. Omit user personas, background problem statements, marketing/visual adjectives, and long non-goals unless they change implementation behavior.
- Avoid repeated source labels in every sentence; prefer section/table-level source labels and use inline labels only when a specific row mixes evidence levels.
- Do not invent user-visible text (UI strings, error messages, tones) — if the requirement does not specify them, generate 2–4 candidate wordings and ask.
- Do not invent MCU pin mappings, bus details, register addresses, protocol frame layouts, Flash addresses, or timing constants. Mark them `deferred`.
- Do not suggest editing CubeMX/HAL/generated-code areas outside `USER CODE` markers.
- Application logic lives in focused modules under `App/` (or project equivalent). Keep `main.c`, task entry functions, callbacks, and ISRs thin — only annotated calls into the app module.
- If the requirement conflicts with project boundary files, surface the conflict and request confirmation before producing the design.
- The document must be actionable by a later agent. Avoid vague advice like "design the menu"; specify responsible module, states, events, transitions, safety behavior, and expected verification evidence.

## After the Handoff

This skill does not write production code. If the user then asks for implementation, route as follows (use only those that are available):

- `embedded-llm-guardrails` — define allowed/forbidden files before editing production code
- `hardware-solution` — resolve `deferred` hardware/driver items
- `embedded-unit-test-generator` — generate tests
- `embedded-change-report` — produce a final change report

## Agent Compatibility

Codex and Claude Code share this directory; keep the name `embedded-prd-to-logic` and this `SKILL.md` as the entry point. Invocations: `$embedded-prd-to-logic` (Codex) / `/embedded-prd-to-logic` (Claude Code). Install paths, packaging, and prompt examples live in `README.md`.

## Resources

- Install & usage guide: `README.md`
- Workflow procedure (read before producing the doc): `references/core-workflow.md`
- Clarification patterns and seed options: `references/clarification-patterns.md`
- Scope boundary + application-layer risk rules: `references/embedded-risk-rules.md`
- Output template: `assets/implementation-logic-template.md`
- Optional human review HTML template: `assets/review-template.html`
- Optional review HTML rendering guide: `references/render-review.md`
- Development-mode writing guide: `references/dev-modes.md`
- Project context collector: `scripts/collect_project_context.py`
