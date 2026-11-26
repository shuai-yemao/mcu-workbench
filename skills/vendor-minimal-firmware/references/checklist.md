# Vendor Minimal Firmware Checklist

## Discovery

- List all files under the vendor docs/SDK tree.
- Identify exact target chip artifacts: headers, device database names, linker files, startup files, memory maps, examples.
- Identify project type: Keil `.uvproj/.uvprojx`, IAR, MPLAB, Makefile, CMake, or other.
- Identify the simplest official example that already boots and enters `main`.

## Copy Rules

- Copy the official project file rather than creating one from scratch.
- Copy public/common headers and source files from the vendor package.
- Preserve relative paths unless the copied project is intentionally relocated.
- Keep vendor copyright headers where copied source remains recognizably vendor-derived.
- Do not migrate the project to another IDE/build system unless the user explicitly asks for migration.
- Do not create replacement startup/linker/runtime files when vendor files exist.

## Trim Rules

Keep:

- startup/vector files
- target register/header files
- system clock configuration used by the example
- minimal runtime helpers required by `main`
- linker/scatter/memory settings
- compiler options and memory model

Remove:

- peripheral demo modules not used by the minimal boot path
- example pin toggles, print loops, buffers, protocol demos
- USB, UART, SPI, ADC, PWM, GPIO helper modules unless required for startup
- test data, demo interrupts, business logic
- stale IDE project source entries

Do not add:

- custom driver layers or board abstraction
- demo blinking/printf/test loops
- guessed clock/register setup
- new build-system scaffolding unrelated to the vendor project

## Chip Adaptation

- Prefer exact-chip vendor files.
- If using a same-family project as a shell, keep the vendor project formatting and change only target name, output name, register/header file, and source list.
- If the IDE device name is unknown or causes "cannot read", keep the original readable vendor device metadata and adapt the firmware with exact target headers. Explain the compromise.
- Do not alter clock/memory constants unless the target chip documents require it.

## Keil/uVision Notes

- Avoid rewriting `.uvproj` with generic XML serializers; Keil can be sensitive to formatting.
- Restore from the original vendor `.uvproj` and use focused text patches for small edits.
- Check `<File>` entries after trimming.
- If source files move, repair `#include` paths.
- Build logs commonly appear as `.build_log.htm`; inspect them for error/warning count and program size.

## Required Final Checks

- Project file exists and opens or has been restored from a readable vendor original.
- Project source list contains no deleted/nonexistent files.
- Include paths resolve for all kept source files.
- No stale references remain to removed demo modules, peripheral example headers, printf/test output, or wrong chip headers.
- Target-chip header and project metadata are consistent, or any deliberate compromise is documented.
- Toolchain build was run when available.
- Successful builds report generated artifact path and exact error/warning counts.
- Failed or unavailable builds report the exact missing tool, failing command, or build-log error.

## Final Response Template

Use this structure:

1. Full source and project file description
2. Environment dependencies and software setup
3. How to compile

Also include:

- Source basis: which vendor example/project files were copied.
- Trim summary: what was removed.
- Adaptation summary: chip/header/device/memory changes.
- Validation: build result or why build could not be run.
