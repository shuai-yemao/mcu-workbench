#!/usr/bin/env node
import { readdir, stat } from "node:fs/promises";
import path from "node:path";

const root = process.argv[2];
if (!root) {
  console.error("Usage: node project_inventory.mjs <source-dir>");
  process.exit(2);
}

const exts = new Map();
const names = new Map();
const interesting = [];
const maxFiles = 10000;
let files = 0;

const interestingPatterns = [
  /startup/i, /system_/i, /linker/i, /\.ld$/i, /\.sct$/i, /\.icf$/i,
  /makefile$/i, /cmakelists\.txt$/i, /toolchain/i, /platformio\.ini$/i,
  /freertos/i, /cmsis/i, /hal/i, /ll_/i, /bsp/i, /board/i, /config/i
];

async function walk(dir) {
  if (files > maxFiles) return;
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules" || entry.name === "build") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full);
      continue;
    }
    if (!entry.isFile()) continue;
    files++;
    const rel = path.relative(root, full);
    const ext = path.extname(entry.name).toLowerCase() || "(none)";
    exts.set(ext, (exts.get(ext) || 0) + 1);
    const base = entry.name.toLowerCase();
    names.set(base, (names.get(base) || 0) + 1);
    if (interestingPatterns.some((p) => p.test(rel))) {
      const s = await stat(full).catch(() => null);
      interesting.push({ path: rel, bytes: s?.size ?? 0 });
    }
  }
}

await walk(path.resolve(root));

const sortEntries = (map) => [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
console.log(JSON.stringify({
  root: path.resolve(root),
  file_count: files,
  extension_counts: sortEntries(exts).slice(0, 30).map(([extension, count]) => ({ extension, count })),
  interesting_files: interesting.sort((a, b) => a.path.localeCompare(b.path)).slice(0, 200)
}, null, 2));
