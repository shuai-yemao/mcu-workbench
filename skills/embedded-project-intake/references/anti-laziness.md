# Anti-Laziness Check Gate

Use this gate before final output. If any item fails, keep inspecting or mark the missing part as `UNKNOWN`.

## Common Failure Modes

| Lazy behavior | Required countermeasure |
| --- | --- |
| Reading only README and summarizing it | Scan build entries, source, startup files, linker files, scripts, and configuration. |
| Saying "uses STM32 HAL" because HAL files exist | Show project inclusion, include paths, config headers, or initialization calls. |
| Saying "FreeRTOS project" because a folder exists | Show scheduler calls, tasks, configuration, or compiled files. |
| Skipping linker/startup because it is boring | Identify startup files and memory layout, or mark `UNKNOWN`. |
| Outputting module names with no evidence | Attach file paths and key symbols for every module. |
| Outputting only an evidence matrix | Also explain architecture, module responsibilities, runtime flow, and implementation paths. |
| Only describing directories without purpose | Explain what each important directory/module owns and where engineers should edit. |
| Treating "read code" as a next step | Give a recommended reading order and concrete files. |
| Ignoring scripts | List build/flash/debug scripts, or say none were found. |
| Hiding uncertainty | Keep an explicit `UNKNOWN` section. |
| Giving broad advice | Provide next steps tied to specific evidence and risks. |

## Minimum Requirements Before Final Response

- At least one build entry has been inspected, or marked `UNKNOWN`.
- At least one MCU/target signal has been inspected, or marked `UNKNOWN`.
- Startup and linker have been searched, or marked `UNKNOWN`.
- RTOS and middleware signals have been searched.
- Peripheral/initialization call signals have been searched.
- Existing scripts have been searched.
- Module responsibilities have been mapped.
- Runtime or command flow has been explained.
- Implementation paths for likely engineering tasks have been listed.
- Risks and unknowns have been listed.

## Refuse Overclaiming

Use wording like:

- `CONFIRMED from ...`
- `INFERRED because ...`
- `UNKNOWN: not found in scanned files`
- `CONFLICT: ... vs ...`

Avoid using these as final conclusions:

- "Obviously"
- "It should be"
- "Usually"
- "Looks like"
