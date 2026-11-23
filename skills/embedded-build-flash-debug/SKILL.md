---
name: embedded-build-flash-debug
description: >-
  Build, flash, and debug an embedded firmware project through local entry scripts (build.ps1/.sh, flash.ps1/.sh, debug.ps1/.sh, plus OpenOCD/J-Link/ST-LINK/pyOCD/GDB command files). Two modes: (1) Quick Run — when the user says 编译/build/编一下, 烧录/flash/下载/烧一下, 调试/debug/调一下, or invokes the skill with such a keyword, find and execute the matching script in scripts/ immediately; if no script exists, fall through to (2) Generate — create new build/flash/debug entry scripts for an existing project. Use when creating, reviewing, repairing, or running local build/flash/debug entry scripts. Not for pure toolchain/MCU selection advice, and not for generating a complete project scaffold.
---

# Embedded Build Flash Debug

## 🌐 语言规则 (Language Rule) — 必须遵守

**所有面向用户的对话和报告必须使用中文。** 这是硬性要求,不是建议:

- 最终报告:生成的脚本路径、构建/烧录/调试命令、检测结果、跳过原因、待确认项 → **全部中文**。
- `AskUserQuestion` 弹窗:标题、选项标签、说明文字 → **中文**。如「自动搜索 / 我手动填」。
- 与用户的对话、思考过程的叙述、分步骤说明 → **中文**。
- **脚本内容(注释、echo/printf 消息、变量名) → 英文,不翻译。** 命令、工具路径、参数 → 英文原样。

技术性命令与工具参数保持原样(英文)。SKILL.md 规范文件本身不要求翻译。

> **Why**: 用户为中文嵌入式开发者,中文报告可直接进入项目文档;脚本内保持英文避免编码问题(如 PowerShell GBK 乱码)。

## Philosophy

This skill is a **process spec**, not a tool wrapper. The model does the identification itself — reading and searching project files with the agent's normal file tools, probing tools with shell commands, picking command templates from `references/templates.md`. No bundled scripts do identification on the model's behalf.

The skill constrains **when to ask the user** and **what safety rules to honor**. Everything else is the model's judgment.

## Agent Compatibility

Folder name `embedded-build-flash-debug` works in both Codex and Claude Code.

- Codex invoke: `$embedded-build-flash-debug`
- Claude Code invoke: `/embedded-build-flash-debug`
- Codex install: `~/.codex/skills/embedded-build-flash-debug`
- Claude Code install: `~/.claude/skills/embedded-build-flash-debug` (user) or `.claude/skills/embedded-build-flash-debug` (project)

Frontmatter uses only `name` and `description` so the same file is portable.

## Quick Run Mode (dispatch — try this first)

When the user invokes this skill with a short keyword, **or** types a bare keyword as a normal chat message that matches the patterns below, **first try to execute an existing script** before entering the generation workflow. The user's intent on a short keyword is "run it", not "redesign it".

### Trigger keywords

| Intent | Keywords (CN / EN) | Script lookup |
|--------|--------------------|---------------|
| Build  | 编译 / 编一下 / 构建 / build / make / 编                  | `scripts/build.<ext>` |
| Flash  | 烧录 / 烧一下 / 下载 / 烧写 / flash / download / 烧       | `scripts/flash.<ext>` |
| Debug  | 调试 / 调一下 / 仿真 / debug / 调                          | `scripts/debug.<ext>` |

`<ext>` is whatever exists on disk — `.ps1` on Windows PowerShell hosts, `.sh` on bash/Git Bash/macOS/Linux. Match the first one found.

### Dispatch procedure

1. **Re-list `scripts/` immediately** (state may have changed since any earlier listing — do not trust a cached one).
2. **Resolve the target script** by mapping the keyword to the file above. If multiple extensions exist (`.ps1` and `.sh`), pick the one matching the host's active shell (see Step 5 rules in the generation workflow).
3. **Existence check**:
   - **Found** → execute it (see "How to execute" below). Report exit code and tail of any log it writes. **Stop** — do NOT enter the generation workflow.
   - **Not found** → tell the user no script exists yet, then fall through to Step 1 (Identify the project) of the generation workflow to create one.
4. **If the user explicitly says regenerate / rebuild script / 重新生成** → skip Quick Run Mode and go straight to the generation workflow.

### How to execute (host shell rules — same as Step 5a)

- `.ps1` → `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/<name>.ps1 [args]`
  - When invoking from Git Bash, use **forward-slash** path: `powershell.exe -File scripts/build.ps1` — never `scripts\build.ps1` (MSYS mangles backslashes).
  - Do **not** use the script's own `-o`/`-Output` flag with forward-slash paths through Git Bash (MSYS may not convert it). Pipe via `2>&1` instead.
- `.sh` → `bash scripts/<name>.sh [args]` (or `./scripts/<name>.sh` if executable bit is set)

Pass through any extra arguments the user supplied (e.g. `-Rebuild`, `-Parallel 4`, `-BuildFirst`). Stream stdout/stderr to the user in real time. After completion, surface the script's exit code and the tail of any log file it wrote.

### Safety for Quick Run Mode

- Build is non-destructive — execute freely.
- **Flash writes to hardware** — only execute when (a) the user explicitly asked (the keyword itself counts as the ask), AND (b) the script already exists with confirmed hardware parameters baked in (no TODO placeholders). The script's own WARNING/confirmation logic is the safety barrier.
- **Debug may start a server or attach to hardware** — same rule as flash; the user keyword counts as consent, but if the script prints two commands for separate terminals (server + GDB), do not auto-run them — print both and let the user run them.

## Workflow

### 1. Identify the project (工程识别)

Read project files directly. Do not summarize from memory — open the actual files.

- Search for build-system markers: `CMakeLists.txt`, `CMakePresets.json`, `Makefile`, `*.mk`, `*.uvprojx`, `*.uvproj`, `*.uvmpw`, `*.ewp`, `platformio.ini`, `west.yml`, `sdkconfig`, `idf_component.yml`, `*.cproject`.
- Open the relevant marker file to extract real values: target MCU from the **active build configuration** (compiler defines, the project file, or the included device header that the build actually uses — not just any `#define` in the tree), target name from `.uvprojx`, build configurations from `.ewp`, board from `CMakePresets.json` / app docs / build logs (not from `west.yml`), environments from `platformio.ini`, presets from `CMakePresets.json`.
- Find likely artifacts: search for `**/*.elf`, `**/*.axf`, `**/*.hex`, `**/*.bin`, `**/*.uf2`, `**/*.dfu` (skip `*.map`).
- Check existing scripts: list `scripts/` if it exists, and **re-list it immediately before reading or overwriting any file** (files can be added/removed externally between steps — don't trust a listing from an earlier step). Preserve user-owned files.

### 2. Identify available tools (工具识别)

**Ask the user up front which mode to use — this is the main speed lever.** Do it before running any probe, with an `AskUserQuestion`:

- **Auto-search** — the model runs the probe protocol below. Best when the user is unsure or wants zero typing.
- **I'll fill in the paths myself** — the user already knows the install locations. The model lists exactly which tool paths the project needs (derived from Step 1 — e.g. a Keil project needs `UV4.exe`; a CMake/GCC project needs `arm-none-eabi-gcc`), and the user supplies each one. **No probing at all — fastest path for a user who knows their setup.**

Route on the answer:

- **Manual mode** → **Stop all probing immediately.** List every required tool path in plain conversation text (the list is derived from Step 1 — e.g. a Keil project needs `UV4.exe`; a CMake/GCC project needs `arm-none-eabi-gcc`). If a candidate path happened to surface as a side effect of Step 1 file reads (e.g. a path mentioned in a build log, `.uvoptx`, or the project file itself), mention it inline as a hint — but run **zero** new disk/registry probes. Let the user reply with each path directly in the chat input box. **Do not use `AskUserQuestion`** — manual mode means the user wants to type, not click through options. After the user replies, skip straight to Step 3.
- **Auto mode** → run the probes and ordered protocol below. If any required tool still comes back empty, fall back to asking the user (last paragraph of this step).

Probes (auto mode) — adapt to OS. Examples:

```powershell
Get-Command cmake, ninja, make, arm-none-eabi-gcc, arm-none-eabi-gdb, openocd, JLink.exe, STM32_Programmer_CLI.exe, pyocd, pio -ErrorAction SilentlyContinue
```

```bash
command -v cmake ninja make arm-none-eabi-gcc arm-none-eabi-gdb openocd JLinkExe pyocd pio || true
```

For every tool the chosen command set needs, resolve a **real, executable path** through this ordered protocol — stop at the first hit:

1. **PATH lookup** — `command -v` / `where.exe` / `Get-Command`.
2. **Known install roots** — `Test-Path` / `ls`. Keil: `C:\Keil_v5\UV4`, `D:\Keil_v5\UV4`, `C:\Keil\UV4`, `D:\Keil\UV4`. IAR: `...\IAR Systems\Embedded Workbench <ver>\common\bin\iarbuild.exe`. STM32CubeProgrammer: `C:\ST\STM32CubeProgrammer\bin`. SEGGER J-Link: `C:\Program Files\SEGGER\JLink`. arm-none-eabi-gcc / OpenOCD: their usual `\bin`.
3. **Windows registry** — Keil and IAR register their install path. `reg query "HKLM\SOFTWARE\WOW6432Node\Keil\Products\MDK" /v Path`, then append the known sub-path (`\UV4\UV4.exe`). Same idea for IAR `InstallDir`.
4. **Environment variables** — `UV4`, `Keil`, `ARMCC5BIN`, `ARM_COMPILER_6_PATH`, `IARBUILD`, `STM32CP`, `JLINK`, `OPENOCD`, `GCC_ARM`.
5. **The project's own toolchain trail** — grep existing build logs (`*_build.log`, `*.log`), `.uvoptx`, `.ewp` for the compiler folder the project used last build. Keil emits `*** Using Compiler '...', folder: 'D:\keil\ARM\ARMCC\Bin'`; derive the sibling builder (`D:\keil\UV4\UV4.exe`) from it. This source is high-confidence — the project already built once.

Copy-paste probes for each step are in `references/templates.md` → "Tool detection".

Record the result as a table: tool name, available (yes/no), detected path or version string, and **which probe found it**.

**Auto-mode fallback: if a required tool is still not found by any probe → ask the user.** Offer any near-miss candidate you did find as an option in `AskUserQuestion`, plus an "Other / I'll type the full path" choice (this is the same manual entry Manual mode uses). Do not silently emit a script whose primary builder is unresolved — see Step 4 and the Hard rules.

### 3. Identify the command set (指令识别)

Read `references/templates.md`. Pick templates that match:
- the project's build system (step 1)
- the available tools (step 2)
- the user's stated goal (build only / build+flash / full debug)

For each command, fill in values you have evidence for. Do not invent values.

### 4. Surface unknowns and ask the user

List the values that step 1 and 2 could not produce. Anything in the **Must confirm** list below that is still missing → ask the user before generating the affected script. Do not generate flash/debug scripts with placeholder hardware values.

**Tool paths are not optional.** If the primary build tool (e.g. Keil `UV4.exe`, IAR `IarBuild.exe`) or the chosen compiler could not be auto-detected in Step 2, ask the user for its path via `AskUserQuestion` **before** generating the build script. Do not ship a build script with a `TODO` tool path — it will fail on first run with no path forward, and only the user can resolve an un-findable install.

Build scripts otherwise usually have enough info after steps 1+2 — generate them once the tool path is resolved, then ask for flash/debug gaps.

**Flash and debug scripts: probe + tool MUST be chosen by the user, not inferred.** Before generating `flash.<ext>` or `debug.<ext>`, use `AskUserQuestion` to let the user explicitly pick **both**:

1. **Probe / debugger hardware** — ST-LINK, J-Link, CMSIS-DAP / DAPLink, ESP serial/JTAG, AVR ISP, vendor probe, simulator, none, …
2. **Flash tool / approach** — STM32CubeProgrammer, OpenOCD, J-Link Commander, pyOCD, ST-LINK GDB server, IDE-native (`UV4.exe -f`, `IarBuild.exe -flash`), serial bootloader (esptool / stm32flash / bossac / avrdude), dfu-util, …

This ask is mandatory even when:

- Step 2 detected exactly one programmer on PATH. **Detection ≠ selection** — the user may have a different probe physically connected, or may prefer OpenOCD over STM32CubeProgrammer for the same ST-LINK.
- The project type "obviously" implies a probe (e.g. STM32CubeMX project ⇒ ST-LINK). **Project type is not consent.**
- The user invoked the skill with a flash keyword in Quick Run Mode but no script exists yet — falling through to generation still requires this ask.
- Auto Mode is active in the harness — the skill's explicit requirement overrides the harness's "bias toward not asking".

Present the options in Chinese per the Language Rule (e.g. header「烧录器」options「ST-LINK / J-Link / CMSIS-DAP / 其他」; header「烧录工具」options「STM32CubeProgrammer / OpenOCD / 其他」). Tailor the option list to what Step 2 actually detected, plus an「Other / 我手动填」choice — but **never collapse it to a single auto-pick**. After the user answers, fill the script's hardware variables from their choices plus the **Must confirm** list below.

### 5. Generate scripts

Generate **one** host script per function (build / flash / debug) — not one per platform. Pick the language from the shell the agent actually runs commands in (the harness reports it, e.g. `Shell: bash`, `Platform: win32`):

- Active shell is bash/sh/zsh/POSIX → `.sh`. **This includes Git Bash on Windows** — a win32 host driven through Git Bash is a `.sh` project, not a `.ps1` one.
- Active shell is Windows PowerShell/cmd with no bash as the active shell → `.ps1`.
- macOS/Linux → `.sh`.

Do **not** emit both `.sh` and `.ps1` "just in case". Generating two doubles the bug surface and the drift risk (two files to keep in sync). Only add a second language when the user explicitly asks for it.

Paths under `scripts/`:

- `scripts/build.<ext>`, `scripts/flash.<ext>`, `scripts/debug.<ext>` — `<ext>` is `.sh` or `.ps1` per the rule above.
- Optional companions: `scripts/openocd-flash.cfg`, `scripts/jlink-flash.jlink`, `scripts/gdbinit`, `scripts/openocd.cfg`.
- **Tool-path home (preferred when ≥2 scripts exist):** a single sourced `scripts/toolenv.<ext>` holding every detected/confirmed tool path and hardware variable (`UV4`, `ARM_GCC`, `OPENOCD`, `JLINK`, `STM32CP`, `DEVICE`, `INTERFACE`, `SPEED`, …), sourced at the top of each script. This gives the user **one** obvious place to edit tool locations instead of chasing variables across files. With a single script, a top-of-file variable block is fine.

Each script must:

- Start by `cd`-ing into the project root (resolved from script location, never hard-coded).
- Keep all hardware-specific values (artifact path, device, interface, speed, address, tool path) as named variables in **exactly one place** — either the script's own top block, or the shared `scripts/toolenv.<ext>` when present. Never scatter or inline them.
- Be idempotent and editable.
- Honor the **Script authoring pitfalls** below.

### 5a. Script authoring pitfalls (read before writing any script)

These are concrete bugs that have shipped before — apply them, do not rediscover them:

**PowerShell (`.ps1`)**

- `param(...)` MUST be the first executable statement in the file. Only comments and `#Requires` may precede it. Put `$ErrorActionPreference`, `$PSScriptRoot` / `$MyInvocation` resolution, and path computation **after** `param(...)`. Any executable line before `param(...)` is a hard parse error.
- On Windows PowerShell 5.1 (the only shell on machines without `pwsh`), keep the file **ASCII-only**. No-BOM UTF-8 with non-ASCII (e.g. CJK) is decoded as GBK and silently corrupts tokenization (variables turn empty, commands break). Script comments/echo are English per the Language Rule, so this is rarely an issue. If Chinese must appear in a `.ps1`, save as **UTF-8 with BOM**.
- Validate syntax with `[System.Management.Automation.Language.Parser]::ParseFile("<path>", [ref]$null, [ref]$errs)` — but the real proof is executing the script.

**Calling PowerShell from a POSIX/bash shell (Git Bash on Windows)**

- Use **forward-slash paths**: `powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/build.ps1`. Never pass `scripts\build.ps1` through the bash tool — MSYS rewrites the backslashes into a mangled token and `-File` reports the file missing.
- Prefer `-File <script>` over inline `-Command` with `$` variables — bash expands `$errs`, `$null`, `$_` before PowerShell ever sees them. If you must inline, wrap the whole `-Command '...'` argument in **single quotes** in bash so nothing is pre-expanded.

**Calling Windows native programs from Git Bash (MSYS)**

- Do **not** use the program's built-in `-o <output-file>` flag with forward-slash paths. Windows native programs (e.g. `UV4.exe -o path/to/log`) may receive the path unconverted by MSYS and pop up a "Create File failed" dialog instead of failing gracefully. Capture output via Bash pipes: `program ... 2>&1 | tee log`.
- This applies to all Windows-native tools called through Git Bash (`UV4.exe`, `JLink.exe`, `STM32_Programmer_CLI.exe`, etc.). MSYS does not auto-convert arguments of `-o`/`--output` flags the same way it converts positional path arguments.

**Bash/POSIX (`.sh`)**

- `set -euo pipefail` for fail-fast; quote all variables; resolve the project root via `$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)`.

**Verification (all languages)**

- Execute the generated build script (build is non-destructive) and capture real output before reporting success. A script that only parses — or that "should work" — is not done. A parse-only check is acceptable only when execution is genuinely unsafe (e.g. a flash or debug-server script).

### 6. Verify and report

- Run the generated build script only when: tools are available, **and** you have confirmed the build command itself does not trigger flash/upload/post-build programming (some `make` targets, IDE post-build steps, or `idf.py`/`pio run` hooks can flash as a side effect). If the build target may write to hardware, ask the user before running. Capture output.
- Do **not** run flash or destructive debug commands unless the user explicitly asks and target/probe parameters are confirmed.
- A generated build script is not "done" until it has actually been executed once and produced artifacts. Re-`ls scripts/` right before claiming any file was created or overwritten (state may have changed since the last listing).
- Report: exact commands, detected tools, generated files, skipped scripts with reasons, expected artifacts, missing tools, open questions.

## Must confirm before generating flash/debug

These values affect hardware behavior. Treat each item below as a hard ask unless the user has explicitly chosen it in this conversation. **"Tool detected on PATH" and "project type implies X" do NOT count as user input** — only a direct user choice (typed reply or `AskUserQuestion` answer) discharges the ask. See Step 4 for the mandatory probe + tool selection prompt.

- Exact MCU/device name.
- Probe type: ST-LINK, J-Link, CMSIS-DAP, DAPLink, ESP serial/JTAG, AVR ISP, vendor probe, simulator, none.
- Probe transport and speed (SWD/JTAG/cJTAG/UART/USB DFU/serial bootloader) when relevant.
- OpenOCD `interface.cfg` and `target.cfg` paths unless both already exist in the project or vendor docs.
- J-Link `device`, `if`, `speed`.
- pyOCD target name or board ID.
- Serial port and baud rate for serial/DFU tools.
- Artifact path and format: ELF, HEX, BIN, UF2, DFU, image package.
- Flash base address or bootloader offset for raw BIN writes.
- Reset behavior: `reset halt`, `reset run`, hardware reset, connect under reset.

## Safe to infer without asking

- CMake build directory name `build/` if `CMakeLists.txt` exists and `CMakePresets.json` doesn't override.
- Script directory name `scripts/`.
- Build artifacts discovered by searching the project.
- Host shell preference from OS when the user hasn't specified.
- Non-destructive dry-run checks (`--version`, file existence, `Get-Command`).

**Never inferable — always ask via `AskUserQuestion`:** probe/debugger hardware, flash tool or approach, MCU device name, OpenOCD `interface.cfg` / `target.cfg`, J-Link `device`/`if`/`speed`, pyOCD target, serial port & baud, flash base address / bootloader offset, reset behavior. Detection on PATH and project type are not consent. See Step 4 and Hard rules.

## Hard rules

- Never guess MCU model, probe type, OpenOCD interface/target cfg, J-Link device, pyOCD target, serial port, flash address, bootloader offset, external flash region, option bytes, fuses, or security settings.
- **Probe and flash tool must be user-chosen, never inferred.** Before generating any `flash.<ext>` or `debug.<ext>` script, use `AskUserQuestion` to let the user explicitly select (a) the probe/debugger hardware (ST-LINK / J-Link / CMSIS-DAP / serial / …) and (b) the flash tool or approach (STM32CubeProgrammer / OpenOCD / JLink.exe / pyOCD / IDE-native / serial / …). A tool being detected on PATH in Step 2 is **not** selection — the user may have a different probe plugged in, or may prefer a different tool for the same probe — and project type (e.g. STM32CubeMX ⇒ ST-LINK) is not consent. This rule overrides any harness-level "bias toward not asking". See Step 4.
- Never generate mass erase, chip erase, lock/unlock, option-byte, fuse, read-protection, secure-boot, or OTP commands unless the user explicitly requests them and the source project supports them.
- Prefer visible editable commands over opaque wrappers. No "magic" one-liners that hide what's happening.
- Preserve user-owned scripts. Repair only when the user asks or the script is clearly broken; otherwise create clearly named alternatives.
- Generate **exactly one** host script per function (build/flash/debug), chosen by the active shell — Git Bash on Windows ⇒ `.sh`, not `.ps1`. Never emit both `.sh` and `.ps1` unless the user explicitly asks. See step 5.
- In `.ps1` scripts, `param(...)` must be the first executable statement (only comments / `#Requires` may precede it). When invoking `powershell.exe` from Git Bash, use forward-slash `-File` paths (MSYS mangles backslashes). Verify any build script by executing it before reporting done. See step 5a.
- If a compiler or programmer is missing, do **not** install it. Resolve the path: auto-detect (Step 2) → else ask the user via `AskUserQuestion`. A build script's **primary builder/compiler** must never ship with an unresolved `TODO` path — it fails on first run with no way forward. `# TODO` is allowed only for optional/secondary tools the user explicitly chose to defer; **flash and debug scripts must never carry TODO placeholders for hardware values** (device, interface, address, port, cfg paths) — skip the script and report the missing fields instead.
- For Keil, IAR, or similar IDE projects, build headlessly only when the tool path is auto-detected (Step 2) or supplied by the user. If neither, **ask the user for the path** (`AskUserQuestion`) — do not leave a TODO, and do not pretend the IDE can build headlessly.
- **For IDE-managed projects (Keil MDK, IAR EW), flash and debug via the IDE's own command-line interface** (e.g. `UV4.exe -f`, `IarBuild.exe -flash`). Do not introduce external programmers (J-Link, OpenOCD, pyOCD, STM32CubeProgrammer) unless the IDE tool is missing or the user explicitly requests an alternative. The IDE already knows the probe configuration, target MCU, and flash algorithm — bypassing it with an external tool requires re-confirming all of those and adds unnecessary failure modes.
- CMake and Make projects should use build directories and project-local paths; never hard-code user absolute paths unless the tool install path itself is fixed.
- Do not start a debug server in blocking mode inside the same script that runs GDB. Print two commands and let the user run them in separate terminals.
- Never auto-activate vendor environments (ESP-IDF, Keil env, etc.) — print activation hints and let the user run them.

## Output contract

Every task ends with a report containing (用中文输出,见「语言规则」):

- Generated or updated script paths.
- Build command and expected output files.
- Flash command and its confirmed parameters, or the reason it was skipped.
- Debug command sequence (GDB server + GDB client), or the reason it was skipped.
- Detected local tools and missing tools.
- Commands actually run locally and commands intentionally not run.
- Open questions still needing user input.

Review tasks list findings with file references first, then build/flash/debug command risks, then specific repair suggestions.

## Resources

- `references/templates.md`: build/flash/debug command templates for CMake, Make, Keil, IAR, PlatformIO, west, ESP-IDF, OpenOCD, STM32_Programmer_CLI, J-Link, pyOCD, serial/DFU, and GDB server/client patterns.
