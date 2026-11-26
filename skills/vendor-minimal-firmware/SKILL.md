---
name: vendor-minimal-firmware
description: Create minimal MCU firmware projects only by copying and trimming official vendor example projects, SDK demos, EVTs, or bundled chip-company source trees. Use when the user explicitly asks for a smallest/empty/minimal framework based on vendor-provided examples or project files, while preserving vendor directory style, project settings, startup files, linker/memory settings, and removing only unrelated peripheral demo or business logic. Do not use for designing a new embedded architecture, porting SDKs to a new build system, writing drivers, or creating firmware from scratch.
---

# Vendor Minimal Firmware

## Goal

Produce a minimal, buildable firmware project from official vendor examples. Treat the vendor project as the source of truth; copy first, then trim.

## Hard Boundaries

Do not:

- Create a custom project architecture or directory convention.
- Migrate the vendor project to another build system or IDE.
- Rewrite startup code, linker/scatter files, memory maps, or vector tables.
- Guess register initialization that is not present in the vendor source.
- Replace vendor headers, CMSIS files, device packs, or runtime files with hand-written equivalents.
- Add a driver layer, HAL wrapper, board abstraction, demo feature, or business logic.
- Reformat or fully reserialize fragile IDE project files when targeted text edits can preserve the vendor file shape.

Only adapt chip identity, selected headers, source lists, include paths, target/output names, and other metadata required to make the copied vendor project match the requested target.

## Required Workflow

1. Inspect the provided docs/SDK/example tree before editing.
   - Prefer `rg --files` to map files.
   - Identify official project files, target headers, startup files, linker/scatter files, public/common sources, and the simplest example entry point.
   - Read representative project files and source files before deciding what to keep.

2. Select the closest official base project.
   - Prefer a project for the exact chip.
   - If no exact project exists, choose the closest same-family official project and adapt only chip identity/header/device metadata.
   - Prefer simple GPIO/timer/basic examples over USB/RTOS/protocol demos when choosing an entry point.

3. Create the output by copying vendor files.
   - Preserve vendor directory style and relative paths where practical.
   - Keep original project/compiler/startup/linker/memory settings unless the target chip adaptation requires a small explicit change.
   - Do not invent a new architecture, build system, driver layer, or abstraction.

4. Trim to the minimum running framework.
   - Remove unrelated peripheral modules, demo calls, loops that toggle pins, printf/test output, protocol stacks, business logic, and generated sample behavior.
   - Keep only startup, vector/interrupt requirements, system clock, memory/runtime initialization, delay helpers only if needed, and an empty main loop.
   - Do not change core clock, memory model, linker ranges, startup code, or compiler options unless adapting to the requested chip. State every such change.

5. Repair paths conservatively.
   - After moving a copied source file, update include paths only enough for compilation.
   - Prefer keeping the source in a location that avoids path changes.
   - For fragile IDE project files, preserve original formatting. Avoid full XML/project reserialization when small text edits are enough.
   - If an IDE project reports "cannot read" or fails before compilation, restore the original vendor project file and reapply only the smallest textual edits.

6. Validate.
   - Check project file source lists for deleted or missing modules.
   - Verify include paths for moved files.
   - Search for stale references to removed examples, peripheral headers, print/demo logic, or wrong chip headers.
   - Verify the active target chip header is consistent with the requested chip, or explicitly explain any IDE-device-name compromise.
   - Build if the toolchain is available. If not available, report static validation and the exact missing tool.
   - If the build succeeds, report the generated artifact path and error/warning counts from the build log.

7. Deliver the fixed output structure.
   - Include generated source/project file locations.
   - Explain environment dependencies and setup.
   - Explain how to compile.
   - Summarize copied sources, trimmed content, target-chip adaptations, and validation results.

## Output Location

When the user does not specify an output name, use a short target-chip name plus `_MIN` or `_minimal`, matching the vendor naming style.

## Detailed Checklist

Read `references/checklist.md` before finalizing any generated project, and especially when the task involves an IDE project file, a chip-family mismatch, or a failure to open/build the generated project.
