---
name: embedded-project-intake
description: >-
  Two-stage embedded project intake: analyze a firmware / embedded codebase
  (ESP-IDF, STM32, FreeRTOS/RTOS, Zephyr, etc.) and produce an evidence-backed
  handoff report plus mandatory standalone HTML — overall architecture, per-module architecture and call-relationship
  diagrams, startup/runtime flow, state ownership and concurrency, build/flash/debug
  entry points, risks, unknowns, and an AI-reusable summary. Use for firmware project
  takeover, embedded architecture review, onboarding to an unfamiliar embedded repository,
  or generating a project handoff / intake report.
---

# Embedded Project Intake

## Purpose

Use this skill to generate an embedded software project guide that lets firmware engineers actually take over the project, and lets future AI sessions use it as compact project memory. The report must explain architecture, modules, runtime flow, implementation paths, build/flash/debug operations, key files, change entry points, risks, and unknowns. Evidence rules prevent hallucination, but the final product should be a project understanding document that is useful for engineers and readable by AI.

The value of this skill is not a longer summary; it is turning a codebase into a practical handoff map: where execution starts, how important behavior flows through functions/modules, which data structures carry state, which threads/interrupts/timers/callbacks interact, where engineers should modify behavior, and how each likely change should be validated.

Analysis depth must be decided by the user. Codex may propose candidate feature paths and recommend priority, but unless the user already specified them in the prompt, the business/technical paths that need deep analysis must be selected by the user.

The final report is the deliverable. Stage 1 is only a selection checkpoint. After the user selects paths, chooses `auto`, or asks for full analysis, generate a final report that is readable by humans and reusable by AI. The final report must include both whole-project baseline analysis and the selected or full deep-dive scope; it must not output only path reports. The report should contain a compact handoff summary, stable file/function anchors, selected path decisions, diagrams, unknowns, risks, and next task entry points. Every final report must be saved as both a local Markdown file and a standalone HTML file inside the project, not only sent in chat.

## Agent Compatibility

Codex and Claude Code use the same skill directory. Keep the directory name `embedded-project-intake`, and keep this `SKILL.md` as the entry point.

- Codex invocation: `$embedded-project-intake`
- Claude Code invocation: `/embedded-project-intake`
- Codex personal install path: `%USERPROFILE%\.codex\skills\embedded-project-intake` or `~/.codex/skills/embedded-project-intake`
- Claude Code personal install path: `%USERPROFILE%\.claude\skills\embedded-project-intake` or `~/.claude/skills/embedded-project-intake`
- Claude Code project-local install path: `.claude/skills/embedded-project-intake`

When installing, packaging, sharing, or explaining usage to another AI agent, read `references/install-and-usage.md` and `references/agent-compatibility.md`.

## Core Rule

No evidence, no conclusion. Every important statement about architecture, module responsibilities, call flow, MCU, board, memory map, clock, RTOS, drivers, build, flash, debug, pins, interrupts, or external chips must include evidence, or be marked `UNKNOWN` / `INFERRED`.

## Report Formatting Principles (报告排版四原则，硬性)

Every final report must follow these four formatting rules. They exist because flat, text-heavy, English-only reports without a table of contents are hard to navigate:

1. **Chinese section titles (中文标题)** — use Chinese for chapter and section headings. Keep established terms like `Project Picture` and `AI Handoff Summary` as English subtitles or parentheticals for cross-agent consistency. Evidence labels (`CONFIRMED` / `INFERRED` / `UNKNOWN` / `CONFLICT` / `UNVERIFIED`) stay in English — they are a defined vocabulary.
2. **Diagram-first (图优先)** — prefer diagrams over prose. Express call relationships (function-to-function, cross-module, task/queue/callback) with Mermaid (`flowchart` / `sequenceDiagram` / `stateDiagram-v2`); use text only for supplementation and engineering consequences. **Every module needs at least 2 diagrams**: a module-architecture diagram and an implementation/call-relationship diagram. Each diagram is followed by 2-5 engineering-consequence bullets. Every diagram node must map to a real file/function/module/state object/task/queue/hardware boundary.
3. **Table of contents (目录)** — place `## 📑 目录` right after the title, with Markdown anchor links to every chapter. Anchor rule: lowercase the heading, replace spaces with hyphens, drop punctuation.
4. **Module-hierarchical structure (按模块分层)** — the report spine is "overall architecture → each module's architecture → each module's implementation → cross-module flows → cross-cutting concerns". Give every important/core module its own section covering architecture then implementation. Merge trivial same-kind modules (e.g. 100+ boards collapse into one "board adaptation layer" entry) to avoid noise.

The canonical structure and per-module template live in `references/output-template.md`.

## Workflow

1. Identify the project root and the depth the user needs: `quick`, `normal`, or `deep`. Default to `normal`.
2. Before drawing conclusions, read `references/evidence-rules.md` and `references/anti-laziness.md`.
3. Run lightweight scan scripts:
   - `scripts/project_inventory.mjs <project-dir>`
   - `scripts/build_entry_scan.mjs <project-dir>`
   - `scripts/embedded_signals.mjs <project-dir>`
   - `scripts/module_map.mjs <project-dir>`
   - Optionally run `scripts/evidence_matrix.mjs <project-dir>` to generate a machine-readable preliminary claim draft.
4. After scripts report candidates, directly inspect source files. Scripts provide clues; they are not evidence by themselves.
5. Read `references/embedded-review-dimensions.md` and `references/engineer-report.md`, then cover the matching dimensions for the requested depth.
6. Unless the user has already specified exact analysis paths/features, output a **candidate path selection checkpoint** before deep analysis. It must include:
   - 5-10 candidate business/technical paths discovered from code.
   - A numbered one-line title summary first, so the user can reply with numbers like `1,3,5`.
   - Evidence for each candidate: entry function/file and likely downstream modules.
   - Recommended priority and reason: business importance, change probability, risk, hardware dependency, or unclear ownership.
   - One concise question asking the user to choose paths to deep-dive: reply with numbers such as `1,3,5`, reply `auto` for AI-selected priority paths, or reply `full` / `all` / `全量分析` for all meaningful candidate paths and modules.
7. If the environment provides a structured user-input tool, use it to let the user choose paths and keep options concise. Otherwise show the numbered summary and accept numeric replies. Do not make the user copy full path titles.
8. Stop at the checkpoint and wait for the user's selection. Do not spend time deep-diving AI-selected paths before user confirmation.
9. If the user already specified paths, asks to continue automatically, requests `quick`, or explicitly requests full analysis, skip the pause. When auto-selecting, mark paths as `AI-SELECTED` and state the selection criteria. When full analysis is requested, mark the scope as `FULL-ANALYSIS` and cover all meaningful candidate paths that can be supported by evidence.
10. Before deep analysis, identify core modules from scripts plus direct source inspection. When subagent tools are available and the environment/user authorization allows them, start one no-code-editing subagent per core module (or per merged module group for very large projects) to analyze module architecture, responsibilities, data/control flow, state ownership, concurrency/event interactions, risks, validation, and evidence. Use separate path-focused subagents only when a selected path cuts across modules and needs extra tracing. The main agent must merge all module/path results into one coherent final report and resolve overlap/conflicts. If subagents are unavailable, perform the same module-by-module passes sequentially.
11. When generating the final report, read `references/output-template.md` and follow its **module-hierarchical Chinese structure with a table of contents** (see Report Formatting Principles above). The spine is: 总体架构 → 每个模块的架构 → 每个模块的实现 → 选定路径深挖 → 横切关注点. Include an `AI Handoff Summary` section so future AI sessions can resume context without rereading the entire project.
12. Before deep-diving selected paths, include whole-project baseline sections: project identity, build/run/deploy entry points, architecture layers, **a per-module detail section (each core module: architecture diagram + implementation/call-relationship diagram)**, main runtime flow, key platform boundaries, main risks, unknowns, and recommended reading order. Merge trivial same-kind modules into one entry to avoid noise.
13. Trace only user-selected paths deeply, based on specific functions/files and direct source evidence. If the project is small and the user agrees to broad coverage, all meaningful paths may be traced.
14. Identify main state carriers and ownership boundaries for selected paths and project core: global structs, config files, queues, message buffers, driver handles, RTOS objects, file descriptors, callbacks, or generated artifacts. Explain who writes, who reads, and what may race or become stale.
15. Identify concurrency and event mechanisms related to selected paths: main loop, RTOS tasks, pthreads, interrupts, DMA callbacks, timers, work queues, ISR-to-task handoff, signals, or polling. Explain interactions and validation impact.
16. Make the report **diagram-first**. Express call relationships with Mermaid, not prose. Every report needs at minimum: a layered architecture diagram, a runtime-flow sequence diagram, a module-dependency graph, **two diagrams per core module (module architecture + implementation call graph)**, and one end-to-end call-relationship diagram per selected path. Mermaid renders natively in Markdown viewers (GitHub/VSCode/Typora); every diagram node must map to a real file/function/module/state/task/queue/hardware boundary, and each diagram is followed by 2-5 engineering-consequence bullets. Use Mermaid v11-safe syntax from `references/html-report-output.md`: do not use sequence participant IDs that collide with Mermaid keywords such as `As`, `Loop`, `End`, `Alt`, `Opt`, `Par`, `Note`, `Box`, or `Rect`; use aliases like `AudioSvc` / `RunLoop` instead. Use standard edge labels such as `A -.->|label| B`, not legacy dotted-label forms like `A -.label.-> B`.
17. Save the final report to a Markdown file inside the project, preferably `docs/embedded-project-intake-<topic>.md`. Create `docs/` if it does not exist.
18. Always generate a standalone HTML version next to the Markdown report, preferably `docs/embedded-project-intake-<topic>.html`. Read `references/html-report-output.md` first. HTML is mandatory and should be a standalone browser-readable artifact derived from Markdown, not a replacement for the Markdown handoff report. When inlining Mermaid, use `scripts/inline_mermaid_html.mjs` or equivalent `indexOf` + `slice` concatenation; never use `String.replace(search, mermaidText)` because Mermaid contains `$&` tokens that replacement strings can expand and corrupt. Before final response, run `scripts/validate_mermaid_report.mjs <markdown-or-html> [html]` when available; fix all reported Mermaid syntax risks and inline-integrity failures before delivery.
19. If the user asks about Codex/Claude Code sharing, installation, packaging, or usage docs, read `references/agent-compatibility.md` and `references/install-and-usage.md`.
20. If a required conclusion lacks evidence, write `UNKNOWN`, and list the needed file, schematic, manual, build log, or user answer.
21. If evidence conflicts, write `CONFLICT`, and list both sources.
22. Do not modify code unless the user explicitly asks for a fix after intake.

## Resources

- `references/install-and-usage.md`: Detailed installation, usage, typical inputs, and troubleshooting guide.
- `references/agent-compatibility.md`: Cross-agent discovery and packaging notes.
- `references/html-report-output.md`: Standalone HTML output rules for polished/browser-readable intake reports.
- `scripts/validate_mermaid_report.mjs`: Static Mermaid v11/report-integrity checks for generated Markdown/HTML reports.

## Depth Modes

- `quick`: project purpose, architecture sketch, module list, build entry points, 1-2 AI-selected key call paths, main risks, and unknowns. Ask questions only if the user goal is unclear. Output is Chinese-titled with a TOC and diagram-first even at this depth. Save both Markdown and HTML.
- `normal`: Stage 1 numbered candidate path checkpoint; after the user selects numbers, `auto`, or full analysis, output the module-hierarchical Chinese report (with TOC): overall architecture + per-module architecture/implementation (each core module with ≥2 diagrams), startup/linker/runtime flow, selected or full feature call paths shown as end-to-end call-relationship diagrams, state ownership, concurrency model, implementation/change-entry map, build·flash·debug, evidence matrix, risks/unknowns, and recommended reading order. Save both Markdown and HTML.
- `deep`: Stage 1 numbered candidate path checkpoint; after the user selects numbers, `auto`, or full analysis, add module-by-module ownership, richer selected/full feature call/data paths, configuration dependencies, build artifact flow, change-risk map, validation matrix, and recommended reading order on top of normal coverage. Save both Markdown and HTML.

## Normal Mode Must Cover

- A **table of contents** (`## 📑 目录`) with anchor links to every chapter.
- **Chinese section titles** throughout.
- Project identity and likely goal (一句话画像).
- Overall architecture: layered architecture diagram + module-dependency graph + module list table.
- **Per-module detail section**: each core module gets its own subsection with a module-architecture diagram and an implementation/call-relationship diagram (≥2 diagrams each), responsibility, key files/entries, state/interface, risks/validation. Trivial same-kind modules are merged.
- Runtime/initialization flow diagram (reset → startup → init → main loop/scheduler/tasks).
- Startup/vector table and linker/memory layout (or `UNKNOWN`).
- Main loop, scheduler, or application entry.
- Board configuration, clock, pin, and peripheral initialization signals.
- Driver and middleware layout.
- Interrupt/DMA/timer usage signals.
- External chips or buses, if visible.
- Function-level call paths for important features as diagrams, not only directory summaries.
- Selected or full-analysis deep-dive paths shown as end-to-end call-relationship diagrams (USER-SELECTED/AI-SELECTED/FULL-ANALYSIS).
- Key state/data structures and their producers/consumers.
- Thread/task/interrupt/timer/callback interactions and synchronization risks.
- Implementation/change-entry map: where common engineering tasks should be changed and what to validate after changing them.
- Evidence table for MCU/board/toolchain/SDK/RTOS/build system.
- Build, flash, and debug entry points.
- High-risk assumptions, conflicts, unknowns, and recommended follow-up reading order.

## Anti-Hallucination Rules

- Do not guess MCU model, Flash/RAM size, package, oscillator, board name, pin mapping, boot mode, RTOS, probe, or external chip from convention alone.
- Do not treat generated build outputs as source facts unless explicitly marked as generated evidence.
- Do not claim a peripheral is used just because HAL drivers exist; there must be initialization, configuration, call point, or project-file inclusion evidence.
- Do not claim a script is usable unless it was run, or its command path and required tools were checked.
- Do not collapse conflicting evidence into one confident answer.
- Do not stop at file lists. Explain what each important module does and how control/data flows through the project.
- When source is available, do not stop at module-level summaries. Trace important features through specific functions, callbacks, queues, interrupts, timers, or protocol handlers.
- Do not output reports with only generic architecture diagrams and no change entry points or validation steps.
- Do not give vague advice. Every next step should connect to files, functions, build targets, or missing artifacts.

## Expected Output

For intake reports, output a **module-hierarchical, Chinese-titled, diagram-first report with a table of contents**:

- A `## 📑 目录` (table of contents) right after the title, with anchor links to every chapter.
- 一、项目总览: one-sentence project picture, tech-stack/dependency evidence table, compact AI handoff summary.
- 二、总体架构: layered architecture diagram (Mermaid), module-dependency graph + module list table, runtime/initialization flow diagram, key platform boundaries.
- 三、模块详解: one subsection per core module, each with a **module-architecture diagram** and an **implementation/call-relationship diagram** (≥2 diagrams), responsibility, key files/entries, state/interface, risks/validation. Merge trivial same-kind modules.
- 四、选定路径深挖: each user-selected path as an **end-to-end call-relationship diagram** (Mermaid), plus trigger / call chain / state-data / platform boundary / failure points / validation.
- 五、状态归属与并发模型: state-ownership table + concurrency/event diagram and table.
- 六、构建·烧录·调试·运行: build/flash/debug table.
- 七、变更入口与验证: change-entry map (task → start → read → edit → validate).
- 八、风险·未知项·冲突 (sorted by impact).
- 九、证据与验证矩阵.
- 十、推荐阅读顺序 & AI 复用提示.
- 附录: confirmed/inferred facts, saved report path.
- Confirmed facts with evidence paths; inferred facts with reasons; unknowns with required follow-up inputs; risks sorted by impact; concrete next steps.

Diagrams are the primary medium — call relationships are shown as Mermaid graphs, with text only for supplementation and engineering consequences. Every diagram node maps to a real file/function/module/state/task/queue/hardware boundary.

For the candidate path checkpoint (Stage 1), output only the project picture, candidate path table, recommended choices, and one direct question. The question must accept numbered selections like `1,3,5`, `auto` for AI-selected priority paths, or `full` / `all` / `全量分析` for full analysis. Do not output the complete final report before the user selects paths, authorizes automatic selection, or requests full analysis.

For the final report, output a persistent artifact-style report and save it to local Markdown plus standalone HTML. It should be suitable for pasting into future AI sessions or saving as project documentation.

Always save a standalone `.html` artifact derived from the Markdown report (inlining `assets/mermaid.min.js` so diagrams render offline) and provide both Markdown and HTML file links in the final response. Mermaid inlining must pass byte-for-byte verification against the bundled asset.

For review tasks, output findings first, each with file evidence, then summary and open questions.

For later coding tasks, first state which intake facts constrain the change.
