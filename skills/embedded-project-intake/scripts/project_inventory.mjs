#!/usr/bin/env node
import { readdir, stat } from "node:fs/promises";
import path from "node:path";

const root = process.argv[2];
if (!root) {
  console.error("Usage: node project_inventory.mjs <project-dir>");
  process.exit(2);
}

const abs = path.resolve(root);
const ignoreDirs = new Set([".git", "build", "out", "dist", "node_modules", "Objects", "Listings", ".vscode", ".idea", ".claude", ".codex", ".agents", ".cursor"]);
const maxFiles = Number(process.env.INTAKE_MAX_FILES || 5000);
const files = [];
const dirCounts = {};
const extCounts = {};

async function walk(dir = ".") {
  if (files.length >= maxFiles) return;
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
      const top = rel.split(/[\\/]/)[0] || ".";
      dirCounts[top] = (dirCounts[top] || 0) + 1;
      const ext = path.extname(entry.name).toLowerCase() || "(none)";
      extCounts[ext] = (extCounts[ext] || 0) + 1;
    }
  }
}

await walk();

const important = files.filter((f) => {
  const n = f.replaceAll("\\", "/").toLowerCase();
  return /(^|\/)(readme|makefile|cmakelists\.txt|platformio\.ini|west\.yml|sdkconfig)$/.test(n)
    || /\.(uvprojx?|ewp|ld|sct|icf|ioc|cproject|project)$/i.test(f)
    || /startup|system_|freertosconfig|hal_conf|sdk_config|board|bsp|linker/i.test(f);
}).slice(0, 200);

const totalBytes = await files.slice(0, 1000).reduce(async (promise, rel) => {
  const acc = await promise;
  try {
    const s = await stat(path.join(abs, rel));
    return acc + s.size;
  } catch {
    return acc;
  }
}, Promise.resolve(0));

console.log(JSON.stringify({
  root: abs,
  scanned_file_count: files.length,
  max_files: maxFiles,
  truncated: files.length >= maxFiles,
  approximate_bytes_first_1000: totalBytes,
  top_level_counts: dirCounts,
  extension_counts: extCounts,
  important_files: important
}, null, 2));
