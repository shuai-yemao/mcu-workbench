# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root — domain context for this repo (what mcu-workbench is, the architecture evolution in flight, the plugin mechanism notes).
- **`docs/adr/`** — read ADRs that touch the area you're about to work in. The 9 current ADRs (0001-0003, 0005-0008, 0010-0011) record the decisions (D1-D3, D5-D8, D10-D11) of the software architecture evolution to the five-layer contract layering (App/Service/Platform/Impl/Vendor). ADR 0004/0009/0012 (D4/D9/D12) were superseded and deleted when Platform gained `platform_common` and `platform_middleware` skills.
- **`docs/architecture-overall-plan.md`** (v3.0) — the authoritative overall plan for the architecture evolution; supersedes the legacy `software-layer-contract.md` and `software-architecture-knowledge-graph.md` under `skills/workflow/workflow-review-gate/references/` which are still the old 13-layer contract (awaiting migration).

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront. The `/domain-modeling` skill (reached via `/grill-with-docs` and `/improve-codebase-architecture`) creates them lazily when terms or decisions actually get resolved.

## File structure

Single-context repo (this repo — no monorepo signals):

```
/
├── CONTEXT.md
├── docs/adr/
│   ├── 0001-skills-目录物理重排为五层-迁移映射.md
│   └── ... (0002-0003, 0005-0008, 0010-0011)
├── docs/architecture-overall-plan.md
└── skills/
```

This repo is **single-context**: no `CONTEXT-MAP.md`, no `packages/*`, no `pnpm-workspace.yaml`. Treat the whole repo as one context.
