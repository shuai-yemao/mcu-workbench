#!/usr/bin/env node
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.argv[2];
if (!root) {
  console.error("Usage: node check_scaffold.mjs <project-dir>");
  process.exit(2);
}

const abs = path.resolve(root);
const warnings = [];
const present = [];

async function exists(rel) {
  try {
    await access(path.join(abs, rel));
    present.push(rel);
    return true;
  } catch {
    return false;
  }
}

async function collect(dir, out = []) {
  let entries;
  try {
    entries = await readdir(path.join(abs, dir), { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== ".git" && entry.name !== "build") await collect(rel, out);
    } else if (entry.isFile()) {
      out.push(rel);
    }
  }
  return out;
}

const files = await collect(".");
const rootBuildEntries = ["Makefile", "CMakeLists.txt", "platformio.ini", "west.yml"];
for (const entry of rootBuildEntries) await exists(entry);

const ideBuildEntries = files.filter((f) => /\.(uvprojx|uvproj|ewp|cproject|project)$/i.test(f));
for (const entry of ideBuildEntries) present.push(entry);

const hasBuild = present.length > 0;
if (!hasBuild) warnings.push("No obvious build entry point found.");

const startup = files.filter((f) => /startup|vector/i.test(f) && /\.(c|s|S|asm)$/i.test(f));
if (startup.length === 0) warnings.push("No startup/vector source found.");
if (startup.length > 1) warnings.push(`Multiple startup/vector sources found: ${startup.join(", ")}`);

const linker = files.filter((f) => /\.(ld|sct|icf)$/i.test(f) || /linker/i.test(f));
if (linker.length === 0) warnings.push("No linker script found.");
if (linker.length > 2) warnings.push(`Multiple linker-like files found; verify selected script: ${linker.join(", ")}`);

const sources = files.filter((f) => /\.(c|cc|cpp|s|S|asm)$/i.test(f));
if (sources.length === 0) warnings.push("No C/C++/assembly source files found.");

const includeDirs = [".", "include", "inc", "src"];
for (const file of files) {
  const normalized = file.replaceAll("\\", "/");
  if (/\binclude\b/i.test(normalized) || /\binc\b/i.test(normalized)) {
    const dir = path.dirname(file);
    if (!includeDirs.includes(dir)) includeDirs.push(dir);
  }
}

async function fileExistsInIncludeDirs(name, fromFile) {
  const sourceDir = path.dirname(fromFile);
  const candidates = [path.join(abs, sourceDir, name)];
  for (const dir of includeDirs) candidates.push(path.join(abs, dir, name));
  for (const candidate of candidates) {
    try {
      await access(candidate);
      return true;
    } catch {
    }
  }
  return false;
}

const missingIncludes = new Set();
function shouldSkipConditionalInclude(fromFile, name) {
  const normalized = fromFile.replaceAll("\\", "/").toLowerCase();
  if (/vendor\/cmsis_core\/include\/cmsis_compiler\.h$/.test(normalized)) return true;
  if (/vendor\/cmsis_core\/include\/core_cm\d+\.h$/.test(normalized) && /^mpu_/.test(name)) return true;
  if (/stm32[a-z0-9]+\.h$/.test(path.basename(normalized)) && /^stm32[a-z0-9]+\.h$/i.test(name)) return true;
  return false;
}

for (const rel of files.filter((f) => /\.(c|h|hpp|cpp)$/i.test(f)).slice(0, 1000)) {
  const text = await readFile(path.join(abs, rel), "utf8").catch(() => "");
  for (const match of text.matchAll(/^\s*#\s*include\s+"([^"]+)"/gm)) {
    const name = match[1];
    if (shouldSkipConditionalInclude(rel, name)) continue;
    if (!(await fileExistsInIncludeDirs(name, rel))) {
      missingIncludes.add(`${rel}: ${name}`);
    }
  }
}
for (const item of [...missingIncludes].slice(0, 50)) {
  warnings.push(`Missing quoted include: ${item}`);
}

for (const rel of files.filter((f) => /\.(c|h|hpp|cpp|ld|s|S|asm|mk|txt)$/i.test(f)).slice(0, 500)) {
  const text = await readFile(path.join(abs, rel), "utf8").catch(() => "");
  if (/[A-Z]:\\Users\\|\/home\/[^/\s]+\/|\/Users\/[^/\s]+\//.test(text)) {
    warnings.push(`Possible absolute user path in ${rel}`);
  }
}

console.log(JSON.stringify({
  root: abs,
  file_count: files.length,
  source_count: sources.length,
  startup_files: startup,
  linker_files: linker,
  build_entry_points: present,
  warnings
}, null, 2));
process.exit(warnings.length ? 1 : 0);
