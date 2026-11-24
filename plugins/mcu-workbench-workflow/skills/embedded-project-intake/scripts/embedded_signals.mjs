#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.argv[2];
if (!root) {
  console.error("Usage: node embedded_signals.mjs <project-dir>");
  process.exit(2);
}

const abs = path.resolve(root);
const ignoreDirs = new Set([".git", "build", "out", "dist", "node_modules", "Objects", "Listings", ".claude", ".codex", ".agents", ".cursor"]);
const files = [];

async function walk(dir = ".") {
  let entries;
  try {
    entries = await readdir(path.join(abs, dir), { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!ignoreDirs.has(entry.name)) await walk(rel);
    } else if (entry.isFile()) {
      files.push(rel);
    }
  }
}

await walk();

const textFiles = files.filter((f) => /\.(c|h|hpp|cpp|s|S|asm|ld|sct|icf|xml|uvprojx?|ewp|ini|yml|yaml|txt|md|mk)$/i.test(f)).slice(0, 1200);
const signals = {
  mcu: [],
  sdk_hal: [],
  rtos: [],
  startup: [],
  linker: [],
  interrupts: [],
  peripherals: [],
  external_buses: [],
  scripts: []
};

function add(kind, rel, evidence) {
  signals[kind].push({ file: rel, evidence });
}

const patterns = [
  ["mcu", /(STM32[A-Za-z0-9_]*|GD32[A-Za-z0-9_]*|CH32[VFXL]?[A-Za-z0-9_]*|NRF5[0-9A-Za-z_]*|ESP32[-A-Za-z0-9_]*|ATSAM[A-Za-z0-9_]*|LPC[0-9A-Za-z_]*|RP2040|RP2350)/g],
  ["sdk_hal", /(HAL_[A-Za-z0-9_]*|LL_[A-Za-z0-9_]*|CMSIS|STM32Cube|nrfx|nrf_drv|esp-idf|ESP_ERROR_CHECK|cyhal_[A-Za-z0-9_]*|MSS_[A-Za-z0-9_]*|DRV_[A-Za-z0-9_]*|BSP_[A-Za-z0-9_]*|SDK_Config|sdk_config)/g],
  ["rtos", /\b(FreeRTOS|vTaskStartScheduler|xTaskCreate|osKernelStart|ThreadX|tx_kernel_enter|Zephyr|k_thread|RT-Thread|rt_thread|CMSIS-RTOS)\b/g],
  ["interrupts", /\b(IRQHandler|NVIC_|HAL_.*Callback|ISR\(|interrupt|__attribute__\(\(interrupt\)\))\b/g],
  ["peripherals", /\b(GPIO|UART|USART|SPI|I2C|IIC|CAN|FDCAN|ADC|DAC|TIM|PWM|DMA|USB|ETH|QSPI|OSPI|I2S|SAI|SDIO|SDMMC|RTC|WWDG|IWDG)\b/g],
  ["external_buses", /\b(EEPROM|FLASH|NOR|NAND|FRAM|sensor|WHOAMI|JEDEC|I2C_ADDR|SPI_CS|OLED|LCD|touch|codec|PHY)\b/gi]
];

for (const rel of files) {
  const name = rel.replaceAll("\\", "/");
  if (/startup.*\.(s|S|asm|c)$/i.test(name) || /vector/i.test(name)) add("startup", rel, path.basename(rel));
  if (/\.(ld|sct|icf)$/i.test(name) || /linker/i.test(name)) add("linker", rel, path.basename(rel));
  if (/(^|\/)scripts\/.*\.(ps1|sh|bat|cmd)$/i.test(name)) add("scripts", rel, path.basename(rel));
}

for (const rel of textFiles) {
  const text = await readFile(path.join(abs, rel), "utf8").catch(() => "");
  const sample = text.length > 250000 ? text.slice(0, 250000) : text;
  for (const [kind, re] of patterns) {
    const found = new Set();
    for (const m of sample.matchAll(re)) {
      found.add(m[0]);
      if (found.size >= 8) break;
    }
    if (found.size) add(kind, rel, [...found].sort().join(", "));
  }
}

for (const key of Object.keys(signals)) signals[key] = signals[key].slice(0, 100);

console.log(JSON.stringify({
  root: abs,
  scanned_text_files: textFiles.length,
  signals
}, null, 2));
