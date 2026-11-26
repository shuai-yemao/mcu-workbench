#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.argv[2];
if (!root) {
  console.error("Usage: node build_entry_scan.mjs <project-dir>");
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

function matches(re) {
  return files.filter((f) => re.test(f.replaceAll("\\", "/")));
}

async function readSmall(rel) {
  const text = await readFile(path.join(abs, rel), "utf8").catch(() => "");
  return text.length > 200000 ? text.slice(0, 200000) : text;
}

const entries = {
  cmake: matches(/(^|\/)CMakeLists\.txt$/i),
  make: matches(/(^|\/)Makefile$|\.mk$/i),
  keil: matches(/\.(uvprojx?|uvmpw)$/i),
  iar: matches(/\.ewp$/i),
  platformio: matches(/(^|\/)platformio\.ini$/i),
  west: matches(/(^|\/)west\.yml$/i),
  espidf: matches(/(^|\/)(sdkconfig(?:\.defaults(?:\..+)?)?|idf_component\.yml)$/i),
  scripts: matches(/(^|\/)scripts\/.*\.(ps1|sh|bat|cmd)$/i)
};

const defines = new Set();
const includePaths = new Set();
for (const rel of [...entries.keil, ...entries.cmake, ...entries.make].slice(0, 20)) {
  const text = await readSmall(rel);
  for (const m of text.matchAll(/(?:^|[\s"'=;>-])-D([A-Za-z_][A-Za-z0-9_]*)/g)) defines.add(m[1]);
  for (const m of text.matchAll(/\badd_definitions\s*\(([^)]*)\)/gis)) {
    for (const d of m[1].matchAll(/-D([A-Za-z_][A-Za-z0-9_]*)/g)) defines.add(d[1]);
  }
  for (const m of text.matchAll(/(?:^|[\s"'=;>-])-I([^"'\s;<>]+)/g)) includePaths.add(m[1]);
  for (const m of text.matchAll(/<Define>([^<]+)<\/Define>|<VariousControls>.*?<\/VariousControls>/gis)) {
    const chunk = m[1] || m[0];
    for (const d of chunk.split(/[,;\s]+/)) if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(d)) defines.add(d);
  }
}

const artifacts = files.filter((f) => /\.(elf|axf|hex|bin|uf2|dfu|map)$/i.test(f)).slice(0, 100);

console.log(JSON.stringify({
  root: abs,
  build_entries: entries,
  detected_defines: [...defines].sort(),
  detected_include_paths: [...includePaths].sort().slice(0, 100),
  artifacts
}, null, 2));
