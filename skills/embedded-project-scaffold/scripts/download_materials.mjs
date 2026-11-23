#!/usr/bin/env node
import { createWriteStream } from "node:fs";
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";

const [manifestPath, outputDirArg] = process.argv.slice(2);
if (!manifestPath || !outputDirArg) {
  console.error("Usage: node download_materials.mjs <manifest.json> <output-dir>");
  process.exit(2);
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const items = Array.isArray(manifest) ? manifest : manifest.items;
if (!Array.isArray(items)) {
  throw new Error("Manifest must be an array or an object with an items array.");
}

const outputDir = path.resolve(outputDirArg);
await mkdir(outputDir, { recursive: true });

function safeName(value) {
  return String(value || "material")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 160);
}

function inferName(item, url) {
  if (item.filename) return safeName(item.filename);
  const parsed = new URL(url);
  const base = path.basename(parsed.pathname);
  return safeName(base || item.title || "material");
}

const downloaded = [];

for (const item of items) {
  if (!item.url) throw new Error("Each item requires a url.");
  const url = new URL(item.url);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`Unsupported URL protocol: ${item.url}`);
  }

  const group = safeName(item.group || item.vendor || item.part || "materials");
  const targetDir = path.join(outputDir, group);
  await mkdir(targetDir, { recursive: true });

  const filePath = path.join(targetDir, inferName(item, url));
  const response = await fetch(url, {
    redirect: "follow",
    headers: { "user-agent": "embedded-project-scaffold/1.0" }
  });
  if (!response.ok || !response.body) {
    throw new Error(`Download failed ${response.status} ${response.statusText}: ${item.url}`);
  }

  await pipeline(response.body, createWriteStream(filePath));
  const info = await stat(filePath);
  downloaded.push({
    title: item.title || null,
    url: item.url,
    path: filePath,
    bytes: info.size,
    selected_reason: item.selected_reason || null,
    source_confidence: item.source_confidence || null,
    downloaded_at: new Date().toISOString()
  });
}

await writeFile(
  path.join(outputDir, "materials-manifest.json"),
  JSON.stringify({ downloaded }, null, 2)
);

console.log(JSON.stringify({ output_dir: outputDir, downloaded }, null, 2));
