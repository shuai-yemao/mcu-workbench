#!/usr/bin/env node
import { cp, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const usage = "Usage: node install_for_agent.mjs <codex|claude|claude-project> [project-dir] [--force]";
const target = process.argv[2];
const projectDir = process.argv[3] && !process.argv[3].startsWith("--") ? process.argv[3] : process.cwd();
const force = process.argv.includes("--force");

if (!["codex", "claude", "claude-project"].includes(target)) {
  console.error(usage);
  process.exit(2);
}

const skillDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillName = path.basename(skillDir);
const home = os.homedir();

function destination() {
  if (target === "codex") return path.join(home, ".codex", "skills", skillName);
  if (target === "claude") return path.join(home, ".claude", "skills", skillName);
  return path.join(path.resolve(projectDir), ".claude", "skills", skillName);
}

const dest = destination();
if (existsSync(dest) && !force) {
  console.error(`Destination exists: ${dest}`);
  console.error("Re-run with --force to replace it.");
  process.exit(1);
}

if (existsSync(dest)) await rm(dest, { recursive: true, force: true });
await mkdir(path.dirname(dest), { recursive: true });
await cp(skillDir, dest, {
  recursive: true,
  filter: (src) => {
    const normalized = src.replaceAll("\\", "/");
    return !normalized.includes("/node_modules/") && !normalized.endsWith(".zip");
  }
});

console.log(JSON.stringify({ installed: true, target, source: skillDir, destination: dest }, null, 2));
