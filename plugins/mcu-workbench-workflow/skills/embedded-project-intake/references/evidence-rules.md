# Evidence Rules

## Claim Labels

Use these labels in reports:

- `CONFIRMED`: Directly supported by source files, build files, scripts, manifests, generated project files, or logs.
- `INFERRED`: Very likely based on multiple signals, but not explicitly written.
- `UNKNOWN`: Not found or not yet checked.
- `CONFLICT`: Two or more sources contradict each other.
- `UNVERIFIED`: A command, script, or build path was identified but not executed.

## Evidence Requirements

Every important conclusion must include:

- File path.
- Symbol, macro, section, command, or filename supporting the conclusion.
- Evidence type: source, generated output, build configuration, script, log, or user-provided.

## Strong Evidence Examples

- MCU macro in compile arguments or vendor project file.
- Selected startup file in a project file.
- Memory regions in linker script.
- RTOS source and scheduler call point.
- Peripheral initialization function and call path.
- Flash script with confirmed tools and artifacts.

## Weak Evidence Examples

- HAL driver files exist but are not compiled or called.
- README names a board but build files point to another chip.
- Folder name contains an MCU family.
- Generated object files exist with no source mapping.

Weak evidence can support `INFERRED`, but not `CONFIRMED`.

## Conflict Handling

When evidence conflicts:

1. List both sources.
2. Prefer build/project files over README when judging the actual target.
3. Prefer source and linker files over stale documentation when judging memory layout.
4. Mark as `CONFLICT` until resolved.
