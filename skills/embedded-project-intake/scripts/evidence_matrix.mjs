#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = process.argv[2];
if (!root) {
  console.error("Usage: node evidence_matrix.mjs <project-dir>");
  process.exit(2);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

function run(script) {
  const result = spawnSync(process.execPath, [path.join(scriptDir, script), root], {
    encoding: "utf8",
    windowsHide: true,
    timeout: 15000
  });
  if (result.status !== 0) return { error: result.stderr || result.stdout };
  return JSON.parse(result.stdout);
}

const inventory = run("project_inventory.mjs");
const build = run("build_entry_scan.mjs");
const signals = run("embedded_signals.mjs");

function status(items) {
  return items && items.length ? "CANDIDATE" : "UNKNOWN";
}

const matrix = [
  { area: "Inventory", status: "CONFIRMED", evidence: `${inventory.scanned_file_count || 0} files scanned`, notes: inventory.truncated ? "truncated" : "" },
  { area: "Build", status: Object.values(build.build_entries || {}).some((v) => v.length) ? "CANDIDATE" : "UNKNOWN", evidence: build.build_entries || {}, notes: "Inspect entries directly before final claim." },
  { area: "MCU", status: status([...(signals.signals?.mcu || []), ...((build.detected_defines || []).filter((d) => /^(STM32|GD32|CH32|NRF|ESP32|ATSAM|LPC|RP)/i.test(d)).map((d) => ({ file: "build defines", evidence: d })))]), evidence: [...(signals.signals?.mcu || []), ...((build.detected_defines || []).filter((d) => /^(STM32|GD32|CH32|NRF|ESP32|ATSAM|LPC|RP)/i.test(d)).map((d) => ({ file: "build defines", evidence: d })))].slice(0, 10), notes: "Candidate signals only." },
  { area: "SDK/HAL", status: status([...(signals.signals?.sdk_hal || []), ...((build.detected_defines || []).filter((d) => /(HAL|LL|CMSIS|SDK|BSP|DRIVER)/i.test(d)).map((d) => ({ file: "build defines", evidence: d })))]), evidence: [...(signals.signals?.sdk_hal || []), ...((build.detected_defines || []).filter((d) => /(HAL|LL|CMSIS|SDK|BSP|DRIVER)/i.test(d)).map((d) => ({ file: "build defines", evidence: d })))].slice(0, 10), notes: "" },
  { area: "RTOS", status: status(signals.signals?.rtos), evidence: signals.signals?.rtos?.slice(0, 10) || [], notes: "" },
  { area: "Startup", status: status(signals.signals?.startup), evidence: signals.signals?.startup?.slice(0, 10) || [], notes: "" },
  { area: "Linker", status: status(signals.signals?.linker), evidence: signals.signals?.linker?.slice(0, 10) || [], notes: "" },
  { area: "Interrupts", status: status(signals.signals?.interrupts), evidence: signals.signals?.interrupts?.slice(0, 10) || [], notes: "" },
  { area: "Peripherals", status: status(signals.signals?.peripherals), evidence: signals.signals?.peripherals?.slice(0, 10) || [], notes: "" },
  { area: "Scripts", status: status(signals.signals?.scripts), evidence: signals.signals?.scripts?.slice(0, 10) || [], notes: "" }
];

console.log(JSON.stringify({
  root: path.resolve(root),
  matrix,
  warning: "CANDIDATE entries are leads, not final claims. Inspect files before reporting CONFIRMED."
}, null, 2));
