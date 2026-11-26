# Command Templates

Reference commands the model picks from when generating build/flash/debug scripts. Adapt to actual project values; do not copy verbatim if the project deviates.

## Build

### CMake

Configure + build, with optional preset or generator:

```bash
# With preset (preferred when CMakePresets.json defines one)
cmake --preset <preset>
cmake --build --preset <preset>

# Without preset
cmake -S . -B build [-G Ninja]
cmake --build build [--config Debug]
```

After build, expected artifacts typically live under `build/*.elf`, `build/*.hex`, `build/*.bin`.

### Make

```bash
make [target]
# Windows fallback when make is missing:
mingw32-make [target]
```

Do not hard-code cross-compiler paths unless the project Makefile already references them.

### Keil MDK

```bash
# From Git Bash / MSYS: prefer tee over -o — UV4.exe -o with / paths
# can fail at the MSYS ↔ Win32 boundary (Windows popup "Create File failed").
UV4.exe -b <project.uvprojx> [-t <target>] -j0 2>&1 | tee build.log
```

Common install roots: `C:\Keil_v5\UV4\UV4.exe`, `D:\Keil_v5\UV4\UV4.exe`. Detect with `Test-Path` or `where.exe`; do not guess.

Preserve target names from the `.uvprojx` file.

### IAR

```powershell
IarBuild.exe <project.ewp> -build <configuration>
```

If the configuration name is unknown, list configurations parsed from the `.ewp` file or ask the user.

### PlatformIO

```bash
pio run [-e <env>]
```

Only pass `-e` when the env is confirmed (read from `platformio.ini`).

### Zephyr / west

```bash
west build -b <board> [build_dir]
```

Board name resolution (in priority order): explicit user input → `CMakePresets.json` → `app/sample.yaml` or app docs → existing `build/CMakeCache.txt` or build logs → `boards/<board>.overlay` entries. `west.yml` is a module manifest and usually does **not** identify the board. If none of these yield a board, ask the user.

### ESP-IDF

```bash
idf.py build
```

Do not auto-activate the ESP-IDF environment. Print an activation hint and let the user run it:

```bash
# Linux/macOS
. $IDF_PATH/export.sh
# Windows
%IDF_PATH%\export.bat
```

## Flash

Generate flash scripts only when target, probe, artifact, and required address are confirmed. See SKILL.md "Must confirm".

**Rule: IDE projects use the IDE for flashing.** Keil → `UV4.exe -f`, IAR → `IarBuild.exe -flash`. Do not reach for OpenOCD / J-Link / pyOCD when the IDE can already flash through the project's configured probe. External programmers are for bare-metal CMake/Make projects without an IDE.

### Keil MDK (IDE-native flash)

```bash
# Same tool as build — project already knows the probe, target, and flash algorithm
UV4.exe -f <project.uvprojx> [-t <target>] 2>&1 | tee flash.log
```

### IAR (IDE-native flash)

```bash
IarBuild.exe <project.ewp> -flash <configuration>
```

### OpenOCD (external — for GCC/CMake projects)

ELF or HEX (no address needed):

```bash
openocd -f interface/<probe>.cfg -f target/<chip>.cfg \
  -c "program <artifact> verify reset exit"
```

Raw BIN (address required):

```bash
openocd -f interface/<probe>.cfg -f target/<chip>.cfg \
  -c "program <artifact>.bin <flash-address> verify reset exit"
```

`<flash-address>` must come from the project's linker script, memory map, datasheet, or explicit user confirmation. Never copy a value from this or any other example.

If the artifact path contains spaces, move the `program` line into a side `.cfg` file and reference it via `-f`:

```bash
openocd -f interface/<probe>.cfg -f target/<chip>.cfg -f scripts/openocd-flash.cfg
```

`scripts/openocd-flash.cfg`:

```
program {<project-relative-path>} verify reset exit
```

The `{...}` are tcl braces; they tolerate spaces.

### STM32_Programmer_CLI

ELF/HEX:

```powershell
STM32_Programmer_CLI -c port=<SWD|JTAG|...> -w <artifact> -v -rst
```

Raw BIN (address required):

```powershell
STM32_Programmer_CLI -c port=<SWD|JTAG|...> -w <artifact>.bin <flash-address> -v -rst
```

`<flash-address>` must come from the project's linker script, memory map, datasheet, or explicit user confirmation. Default `port=SWD` is acceptable only when the user (or project metadata) confirms the target is an STM32 attached via ST-LINK; otherwise ask.

### J-Link

Requires `device`, `interface`, `speed`, `artifact`. Generate a `.jlink` commander script:

```
device <device>
if <SWD|JTAG>
speed <speed>
loadfile "<project-relative-path>"
r
g
exit
```

Then invoke:

```bash
JLinkExe -device <device> -if <SWD|JTAG> -speed <speed> -CommanderScript scripts/jlink-flash.jlink
```

On Windows the executable is `JLink.exe`. Avoid `erase` unless the user explicitly requests it.

### pyOCD

```bash
pyocd flash -t <target> <artifact>
```

### Serial bootloader / DFU

Tool-specific. Required inputs vary (port/VID/PID, baud, DFU alt, format, address). Do not guess boot-mode entry steps. Common tools: `esptool`, `espflash`, `bossac`, `dfu-util`, `avrdude`, `stm32flash`.

## Debug

Generate debug scripts when a GDB server and ELF file are known. Always run server and GDB in separate terminals.

### OpenOCD + GDB

Terminal 1 (server):

```bash
openocd -f interface/<probe>.cfg -f target/<chip>.cfg
```

Terminal 2 (GDB):

```bash
arm-none-eabi-gdb <elf> -x scripts/gdbinit
```

`scripts/gdbinit`:

```
target extended-remote localhost:3333
monitor reset halt
load                 # only if user wants the debug script to also download
monitor reset halt
```

### J-Link GDB Server

Server:

```bash
JLinkGDBServer -device <device> -if <SWD|JTAG> -speed <speed> -port 2331
```

GDB:

```
target remote localhost:2331
```

On Windows the server executable may be `JLinkGDBServerCL.exe` or `JLinkGDBServer.exe`.

### ST-LINK GDB Server

Use when ST tools ship a GDB server. The executable path varies by STM32CubeIDE version; ask the user if not in PATH. Do not guess.

### GDB client

- `arm-none-eabi-gdb` for Arm Cortex-M.
- `riscv-none-elf-gdb` or `riscv64-unknown-elf-gdb` for RISC-V.
- `gdb-multiarch` as fallback.

## Tool detection snippets

Use these to probe the host. Adapt to OS.

PowerShell:

```powershell
Get-Command cmake, ninja, make, mingw32-make, `
  arm-none-eabi-gcc, arm-none-eabi-gdb, riscv-none-elf-gcc, gdb-multiarch, `
  openocd, pyocd, pio, west, idf.py, `
  JLink.exe, JLinkGDBServerCL.exe, STM32_Programmer_CLI.exe, ST-LINK_gdbserver.exe, `
  esptool, dfu-util, bossac, avrdude `
  -ErrorAction SilentlyContinue | Select-Object Name, Source
```

POSIX shell:

```bash
for t in cmake ninja make arm-none-eabi-gcc arm-none-eabi-gdb \
         riscv-none-elf-gcc gdb-multiarch openocd pyocd pio west idf.py \
         JLinkExe JLinkGDBServer dfu-util bossac avrdude; do
  command -v "$t" >/dev/null && echo "found: $t -> $(command -v $t)"
done
```

Windows IDE-only tools (not on PATH):

```powershell
@(
  'C:\Keil_v5\UV4\UV4.exe',
  'D:\Keil_v5\UV4\UV4.exe',
  'C:\ST\STM32CubeProgrammer\bin\STM32_Programmer_CLI.exe'
) | ForEach-Object { if (Test-Path $_) { "found: $_" } }

# Glob-friendlier: STM32CubeIDE plugin path varies by version
Get-ChildItem 'C:\ST\STM32CubeIDE_*\STM32CubeIDE\plugins\com.st.stm32cube.ide.mcu.externaltools.stlink-gdb-server*\tools\bin\ST-LINK_gdbserver.exe' -ErrorAction SilentlyContinue
```

### Windows registry (Keil / IAR install dir)

Keil registers its install path; `UV4.exe` lives under `<install>\UV4\`:

```powershell
# Keil MDK — try both 64-bit and 32-bit registry views
@('HKLM:\SOFTWARE\WOW6432Node\Keil\Products\MDK',
  'HKLM:\SOFTWARE\Keil\Products\MDK',
  'HKCU:\SOFTWARE\Keil\Products\MDK') | ForEach-Object {
  $v = (Get-ItemProperty $_ -ErrorAction SilentlyContinue).Path
  if ($v) { $uv4 = Join-Path $v 'UV4\UV4.exe'; if (Test-Path $uv4) { "found: $uv4 (from $_)" } }
}
```

```bash
# Git Bash equivalent (reg.exe works under MSYS; double-slash the /v flag)
for k in 'HKLM\SOFTWARE\WOW6432Node\Keil\Products\MDK' 'HKLM\SOFTWARE\Keil\Products\MDK'; do
  p=$(reg query "$k" //v Path 2>/dev/null | awk '/Path/ {print $NF}')
  [ -n "$p" ] && [ -f "$p/UV4/UV4.exe" ] && echo "found: $p/UV4/UV4.exe (from $k)"
done
# IAR: <install>\common\bin\iarbuild.exe
b=$(reg query 'HKLM\SOFTWARE\WOW6432Node\IAR Systems\Embedded Workbench' //s 2>/dev/null \
    | grep -i InstallDir | head -1 | sed 's/.*InstallDir//; s/\r//g' | xargs)
[ -n "$b" ] && [ -f "$b/common/bin/iarbuild.exe" ] && echo "found: $b/common/bin/iarbuild.exe"
```

### Environment variables

```bash
for v in UV4 Keil ARMCC5BIN ARM_COMPILER_6_PATH IARBUILD STM32CP JLINK OPENOCD GCC_ARM; do
  eval val=\$$v
  [ -n "$val" ] && echo "$v=$val"
done
```

### Project's own toolchain trail (high confidence — the project already built once)

Keil writes the compiler folder into its build log on every build; the builder is a sibling of it:

```bash
grep -riE "Using Compiler .*folder:" --include="*.log" . 2>/dev/null | head
# e.g. *** Using Compiler 'V5.06 update 6 (build 750)', folder: 'D:\keil\ARM\ARMCC\Bin'
#   ⇒ UV4.exe lives at  D:\keil\UV4\UV4.exe
```

### When a required tool is still not found

Do **not** silently write a `TODO` path into the script. Surface it to the user with `AskUserQuestion` — offer any near-miss candidate you found during probing as an option, and let the user pick "Other" to type the full path. Only after the user answers (or explicitly says "leave it, I'll fill it in") do you emit the script.
