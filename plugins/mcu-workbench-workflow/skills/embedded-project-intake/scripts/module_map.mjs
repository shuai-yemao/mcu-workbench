#!/usr/bin/env node
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.argv[2];
if (!root) {
  console.error("Usage: node module_map.mjs <project-dir>");
  process.exit(2);
}

const abs = path.resolve(root);
const ignoreDirs = new Set([".git", "build", "out", "dist", "node_modules", "Objects", "Listings", "__pycache__", ".venv", ".claude", ".codex", ".agents", ".cursor"]);
const sourceExt = /\.(c|h|hpp|cpp|s|S|asm|py|rs|go)$/i;
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

function topModule(rel) {
  const parts = rel.split(/[\\/]/).filter(Boolean);
  if (parts.length <= 1) return ".";
  if (["src", "app", "drivers", "bsp", "board", "boards", "middleware", "hal", "cmsis", "startup", "include", "tests", "examples", "scripts"].includes(parts[0].toLowerCase())) {
    return parts.length > 2 && parts[0].toLowerCase() === "src" ? `${parts[0]}/${parts[1]}` : parts[0];
  }
  return parts[0];
}

function inferRole(name, fileNames, symbols) {
  const text = `${name} ${fileNames.join(" ")} ${symbols.join(" ")}`.toLowerCase();
  if (/startup|vector/.test(text)) return "startup/vector table";
  if (/linker|\.ld|\.sct|\.icf/.test(text)) return "memory/linker configuration";
  if (/parser|chunk|embed|retriev|store|index|search/.test(text)) return "document processing / retrieval pipeline";
  if (/mcp|server|api/.test(text)) return "service/API integration";
  if (/cli|main|command|bootstrap/.test(text)) return "command-line or application entry";
  if (/test/.test(text)) return "tests and validation";
  if (/example|demo/.test(text)) return "examples and sample data";
  if (/bsp|board|pin|gpio|clock/.test(text)) return "board support and hardware configuration";
  if (/driver|drv|\bhal\b|ll_|cmsis|periph/.test(text)) return "driver or hardware abstraction";
  if (/freertos|rtos|task|thread|queue|semaphore/.test(text)) return "RTOS and scheduling";
  return "UNKNOWN";
}

function extractSymbols(rel, text) {
  const symbols = new Set();
  if (/\.(c|h|hpp|cpp)$/i.test(rel)) {
    for (const m of text.matchAll(/^\s*(?:static\s+)?(?:[A-Za-z_][\w\s\*]+)\s+([A-Za-z_]\w*)\s*\([^;]*\)\s*\{/gm)) symbols.add(m[1]);
    for (const m of text.matchAll(/^\s*#\s*define\s+([A-Za-z_]\w*)/gm)) symbols.add(m[1]);
  } else if (/\.py$/i.test(rel)) {
    for (const m of text.matchAll(/^\s*(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\(/gm)) symbols.add(m[1]);
    for (const m of text.matchAll(/^\s*class\s+([A-Za-z_]\w*)\s*[\(:]/gm)) symbols.add(m[1]);
  }
  return [...symbols].slice(0, 20);
}

await walk();

const modules = new Map();
for (const rel of files) {
  const mod = topModule(rel);
  if (!modules.has(mod)) modules.set(mod, { module: mod, files: [], source_files: [], symbols: [] });
  const item = modules.get(mod);
  item.files.push(rel);
  if (sourceExt.test(rel)) {
    item.source_files.push(rel);
    const text = await readFile(path.join(abs, rel), "utf8").catch(() => "");
    item.symbols.push(...extractSymbols(rel, text));
  }
}

const result = [...modules.values()].map((item) => {
  const symbols = [...new Set(item.symbols)].slice(0, 30);
  return {
    module: item.module,
    file_count: item.files.length,
    source_count: item.source_files.length,
    role_guess: inferRole(item.module, item.files, symbols),
    key_files: item.files
      .filter((f) => /(^|[\\/])(main|cli|app|board|bsp|startup|system|config|CMakeLists|Makefile)|\.(uvprojx|ld|sct|icf|toml|yaml|json)$/i.test(f))
      .slice(0, 12),
    sample_source_files: item.source_files.slice(0, 12),
    symbols
  };
}).sort((a, b) => b.source_count - a.source_count || b.file_count - a.file_count);

console.log(JSON.stringify({ root: abs, modules: result }, null, 2));
