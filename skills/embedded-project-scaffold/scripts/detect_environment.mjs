#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const candidates = [
  { role: "compiler", name: "arm-none-eabi-gcc", args: ["--version"] },
  { role: "compiler", name: "riscv-none-elf-gcc", args: ["--version"] },
  { role: "compiler", name: "riscv64-unknown-elf-gcc", args: ["--version"] },
  { role: "compiler", name: "xtensa-esp32-elf-gcc", args: ["--version"] },
  { role: "compiler", name: "gcc", args: ["--version"] },
  { role: "compiler", name: "clang", args: ["--version"] },
  { role: "build", name: "make", args: ["--version"] },
  { role: "build", name: "mingw32-make", args: ["--version"] },
  { role: "build", name: "cmake", args: ["--version"] },
  { role: "build", name: "ninja", args: ["--version"] },
  { role: "build", name: "west", args: ["--version"] },
  { role: "build", name: "pio", args: ["--version"] },
  { role: "flash_debug", name: "openocd", args: ["--version"] },
  { role: "flash_debug", name: "JLinkExe", args: ["-Version"] },
  { role: "flash_debug", name: "JLinkGDBServer", args: ["-Version"] },
  { role: "flash_debug", name: "STM32_Programmer_CLI", args: ["--version"] },
  { role: "flash_debug", name: "st-flash", args: ["--version"] },
  { role: "flash_debug", name: "pyocd", args: ["--version"] },
  { role: "flash_debug", name: "probe-rs", args: ["--version"] },
  { role: "flash_debug", name: "esptool.py", args: ["version"] },
  { role: "flash_debug", name: "bossac", args: ["--help"] },
  { role: "flash_debug", name: "avrdude", args: ["-?"] },
  { role: "debug", name: "arm-none-eabi-gdb", args: ["--version"] },
  { role: "debug", name: "gdb-multiarch", args: ["--version"] }
];

function probe(tool) {
  const result = spawnSync(tool.name, tool.args, {
    encoding: "utf8",
    windowsHide: true,
    timeout: 5000
  });
  const found = !result.error || result.error.code !== "ENOENT";
  const output = `${result.stdout || ""}${result.stderr || ""}`.trim();
  return {
    role: tool.role,
    name: tool.name,
    found,
    exit_code: typeof result.status === "number" ? result.status : null,
    version: output.split(/\r?\n/).find(Boolean) || null
  };
}

const tools = candidates.map(probe);
const byRole = {};
for (const tool of tools.filter((item) => item.found)) {
  byRole[tool.role] ||= [];
  byRole[tool.role].push(tool.name);
}

console.log(JSON.stringify({
  platform: process.platform,
  arch: process.arch,
  found: byRole,
  tools
}, null, 2));
