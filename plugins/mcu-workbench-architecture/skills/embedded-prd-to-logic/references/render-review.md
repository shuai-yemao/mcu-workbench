# Render The Human Review HTML

The skill always produces the AI-facing logic handoff `.md`. When the user asks for a review page, visual summary, HTML, or human-facing artifact, also produce a **human review HTML** (cards, diagrams, plain language — for evaluators). This file is the rendering guide for that optional HTML.

## Why

The logic `.md` is optimized for an AI programming agent: structured tables, source labels, state machines, tasks, and verification cues. That can still be dense for humans. The review HTML re-renders the **same content** into a form a person can scan in minutes and sign off on.

## When

- **Only when requested**, in Phase 6, immediately after the `.md` is written.
- Trigger examples: "生成评审页", "HTML", "可视化", "给人看的版本", "review page", "visual summary".
- If not requested, do not create the HTML and do not mention it as skipped.

## Naming and path

Next to the `.md`, same directory. Derive from the logic-doc filename:

```text
docs/logic/<slug>-application-logic.md   →   docs/logic/<slug>-review.html
foo-application-logic.md                 →   foo-review.html
```

If the user named the `.md` themselves (e.g., `logic3.md`), name the HTML `<that-name>-review.html` (`logic3-review.html`).

## Content source

Use the **same resolved content** already produced for the `.md` — the parsed requirement, §1 decisions, §3 behavior, §6 state machine, §7 safety, §8 deferred/risks, §9 tasks. **Do not re-analyze or ask new clarifications.** The HTML is a re-render, not a second pass.

## Template

Use [`assets/review-template.html`](../assets/review-template.html). Keep its `<style>` block **verbatim** (it is the theme). Fill each `<!-- FILL -->` block. The template's comments already mark which logic-doc section each block draws from.

## Core principle: translate, don't copy

- **Never paste `.md` tables verbatim.** Convert decisions → cards, the state machine → a node/arrow diagram, pages/features → card grids, safety rules → callouts.
- **Demote source labels to colored badges** (see scheme below). Don't write "Source: req_explicit" as prose — use `<span class="badge b-req">需求</span>`.
- **Plain language in the summary.** The executive summary (§summary) must read in one minute by someone who has not read the PRD: what it is, how the user uses it, the key guarantee, current status. No jargon, no tables.
- **Omit pure-AI noise**: persona lists, marketing adjectives, repeated scenarios — already compressed out of the `.md`; keep them out of the HTML too.

## Section ↔ source mapping

| Review HTML section | Draws from logic doc | Render as |
| --- | --- | --- |
| Title + status pills | §0 metadata | h1 + `.pill` row (status / mode / resource %) |
| 📌 执行摘要 | §0 + §3 (plain rewrite) | one `.card`, 3–5 short paragraphs |
| 🎯 一图看懂 — 状态流转 | §6.1 states + §6.3 transitions | `.flow` of `.node` + `.arr`; return/timeout in `.returns` |
| 🎯 功能/页面一览 | §3.3 page/action table | `.grid3` of `.card.page-card` |
| 🖥️ 屏幕仿真（仅带屏幕的产品） | §3.3 + 实际 UI 布局 | tabs + `.oled-screen` 像素级仿真（详见下"Screen simulator"） |
| ✅ 关键决策 | §1 resolved decisions | `.grid2` of `.card` (q / choice / why + badge) |
| 🔧 开发流程 | §2 + optional §2.1 work split | per-mode (see below) |
| ⚠️ 安全规则 | §7 safety | red `.callout` (hard rules) + green `.callout` (resolved risks) |
| 📝 任务与验证 | §9.1 tasks + §9.2 verification | `<table>` + amber `.callout` (executed checks) |
| 🔍 待确认/风险 | §8.3 open + §8.2 conflicts + §8.1 deferred | `.grid2` cards + `<details>` for deferred |
| 📖 术语表 | domain terms only | `<table>` in a `.card` |
| 🏷 标签图例 | fixed | badge legend (template default, rarely changed) |

## Source-label badge scheme (canonical — keep these exact classes)

| Source label | Badge class | Chinese text |
| --- | --- | --- |
| `req_explicit` | `b-req` | 需求 |
| `user_resolved` / `user_declined_default` | `b-user` | 用户定 |
| `project_found` | `b-src` | 源码确认 |
| `engineering_inference` | `b-inf` | 推断 |
| `candidate_impact` | `b-cand` | 待核 |
| `deferred` | `b-def` | 转交 |
| `needs_confirmation` | `b-inf` | 待确认 |

Translate the badge text to the document's language; keep the CSS class stable.

## State-machine diagram pattern

Render the happy path as a horizontal `.flow` of `.node` + `.arr`:

```html
<div class="flow">
  <div class="node entry">IDLE</div>
  <div class="arr"><span class="line">→</span><span class="lbl">触发</span></div>
  <div class="node">RUNNING</div>
</div>
```

Put return loops, cancels, and timeouts in a `.returns` list below (don't try to draw back-arrows in CSS — a labeled list is clearer for reviewers):

```html
<div class="returns">
  <div class="r">↩ EXIT → back to MENU</div>
  <div class="r">⏱ 30s idle → home + restore outputs</div>
</div>
```

## Screen simulator (display / UI features only)

If the product has a screen (OLED/LCD/e-ink), add the 🖥️ 屏幕仿真 section (`#screens`) so reviewers see the actual UI instead of imagining it. **Skip the whole section (and its CSS in the template) for screen-less features** — don't leave an empty simulator.

- Render each distinct screen as a `.oled-screen` panel: monospace, `white-space:pre`, text laid out at roughly the real pixel positions (title row / content rows / action bar y-locations). Aim for fidelity to what the firmware actually draws, not an idealized mockup — reviewers are checking the real layout.
- Tab switching is **pure CSS, no JS**: one `<input type="radio" id="tab-N">` + `<label for="tab-N">` per screen, and one `.oled-screen.panel-N` per screen. The template's CSS already wires `#tab-N:checked ~ .oled .panel-N { display:block }`. If you add/rename screens, keep the `tab-N`/`panel-N` ids and the matching CSS rules in sync.
- Keep the dark "lit-pixel" look (`.oled`/`.oled-screen` use `--oled-bg`/`--oled-on`) — it reads as a real OLED.
- Inverse/selected item: `<span class="inv">…</span>`. Animated progress bar: `<span class="bartrack"><span class="bar"></span></span>` (CSS keyframes loop ~2s). Use the animated bar only on the screen that actually has a loading animation.

## Development-flow visualization (swim-lane / timeline)

Render the 🔧 开发流程 (`#flow`) section as a `.tl` swim-lane so "who does what, when" is visible at a glance — not a prose list. The template's `.tl` grid + `.tl-bar` color classes are ready.

Phase columns = work stages; rows (`.lane`) = workers/streams; a `.tl-bar` inside a cell marks that worker's active span. Shape follows the chosen development approach:

- `parallel_implementation` → 4 phase columns: 接口冻结 / 并行实现 / 集成合并 / 烧录手测. A 全员 lane carries the freeze bar; then one lane per worker (T1/T2/T3) with their parallel bar in column 2; then an 集成者 lane with merge (col 3) + flash (col 4) bars. Bar classes: `.b-freeze` / `.b-t1` / `.b-t2` / `.b-t3` / `.b-int` / `.b-flash`.
- `serial_pipeline` → one lane labeled `main agent` with a single bar spanning all implementation phases (or a `.step` linear chain). Emphasize "single owner, no parallel".
- `parallel_exploration` → two phases: 探查 / 写. Explorer lanes active in 探查 (read-only), a single `writer` lane active in 写.
- `review_gate` → a 评审门 phase (reviewer) first, then implementation phases unlocked after the gate.

Add a `.tl-legend` mapping bar colors to meanings. Keep the swim-lane honest to the ownership and sequencing already written in the logic document.

> The swim-lane lives **only in this review HTML** — it is a human-facing visualization. The logic `.md` is read by the coding agent and keeps the dev-flow as structured tables/text (frozen interfaces, file ownership, merge order); **do not** duplicate the swim-lane/diagram into the `.md`.

## Self-contained & printable

- The template's CSS is inline — **no external stylesheets, no JS, no network**. The file opens by double-click and prints to PDF cleanly (`@media print` already hides the sidebar).
- Keep it one file. Don't split CSS/JS out.
- **Visible text must not reference this skill.** A reviewer who has never heard of `embedded-prd-to-logic` must understand the page. So: no `references/*.md` / `assets/*` paths in visible text; no "Layer A/B", "mode_id", "profile" jargon; no footer line like "生成自 …（embedded-prd-to-logic 技能）". Name the development approach in plain words. The glossary (if any) explains terms in plain language using only what's in the document. Skill-internal notes belong only in `<!-- comments -->`.

## Final response

After writing the requested file(s), the final chat response states the saved path(s), summarizes the main decisions once, and lists `deferred` items. Do not dump the HTML content into chat.
