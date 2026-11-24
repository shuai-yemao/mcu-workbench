# Development Mode Guide

Use this file after the user chooses the downstream development mode in the clarification round. The mode only changes **how later agents should organize development**. It must not change the feature behavior, safety rules, state machine, or deferred hardware decisions.

Keep the output document simple. In §2 "Development Approach", write:

- the selected mode
- why it fits
- who may write which files
- when to build / verify
- what the next coding agent should do first

Do not expose this file path, "profile", "Layer A/B", or other skill-internal terms in the generated handoff.

## Quick Table

| mode_id | Plain name | Simple meaning | Write rule | Best fit |
| --- | --- | --- | --- | --- |
| `serial_pipeline` | 串行安全 | 一个主 agent 按顺序做，一步一验证 | 一个主 agent 写全部文件 | 默认稳妥方案、生产固件、高风险修改 |
| `parallel_exploration` | 并行只读探索 | 多个 explorer 分头看项目，最后一个 writer 写 | explorer 只读，writer 单独写 | 大型/陌生工程 |
| `parallel_implementation` | 并行实现 | 多个 worker 写不同文件，integrator 合并 | 文件归属必须互斥，共享文件只给 integrator | 文件边界清晰、模块独立 |
| `review_gate` | 先评审 | reviewer 先审文档和边界，通过后再写 | review 通过前禁止写代码 | 安全关键、归属不清、怕误改 |

## What To Write For Each Mode

### `serial_pipeline`

Use one linear task chain.

§2 should say:

- File ownership: one main agent owns all code edits.
- Build & verify cadence: build and run the relevant check after each task before continuing.
- Integration: integrate as each task lands; no parallel writers.

§9.1 tasks should be a simple P0 -> P1 -> P2 chain.

§10 next-agent instruction:

> Execute tasks strictly in order. After each task, build and run that task's verification method before starting the next. Do not spawn parallel writers.

### `parallel_exploration`

Use parallel read-only exploration, then one writer.

§2 should say:

- File ownership: explorers do not write; one writer owns all edits.
- Build & verify cadence: after findings are consolidated, writer implements and verifies serially.
- Integration: writer promotes evidence labels only after directly reading source.

§9.1 tasks should have two phases:

1. explorer tasks: similar modules, build flow, boundary files, integration points
2. writer tasks: implementation after all findings are consolidated

§10 next-agent instruction:

> Explorers must not edit files. Return path, purpose, safe integration point, evidence label, and boundary conflict. Writer waits for all findings, then implements serially.

### `parallel_implementation`

Use multiple writers only when file ownership is clear.

§2 should include a small work-split table:

| Worker | Owns | May not edit |
| --- | --- | --- |
| Worker A | | |
| Worker B | | |
| Integrator | shared headers / integration files | feature body files owned by workers |

Write rules:

- Freeze public headers / shared enums before workers write `.c` bodies.
- One owner per file or directory.
- Shared files such as `main.c`, build files, menu registries, and glue are integrator-only.
- If a worker needs a shared contract changed, they request it from the integrator.

§9.1 tasks should be grouped by worker stream, with clear dependencies and merge gates.

§10 next-agent instruction:

> Workers edit only owned files. Do not edit frozen headers or shared integration files. Integrator owns shared files, merge order, build gates, and final verification.

### `review_gate`

Use a review gate before implementation.

§2 should say:

- File ownership: reviewer reads only until gate passes; then one implementer writes.
- Build & verify cadence: no build/write before the gate; after pass, execute like `serial_pipeline`.
- Integration: serial after gate.

§9.1 must start with a review task:

| Priority | Task | Owner | Gate |
| --- | --- | --- | --- |
| P0 | Review logic doc, deferred items, state exits, safety rules, and project boundaries | reviewer | all items pass |

§10 next-agent instruction:

> Reviewer signs off before any code is written. If any gate item fails, stop and fix the document or clarify with the user. After all-pass, implement serially.

## Keep Out Of The Handoff

- Do not mention this guide or its file path.
- Do not mention "Layer A/B", "profile", or "collapse".
- Do not include every rule above if it does not affect the chosen mode.
- Do not generate parallel worker tables for serial modes.
