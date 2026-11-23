#!/usr/bin/env node
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const usage = [
  "Usage: node inline_mermaid_html.mjs <template-html> <output-html> [mermaid-js]",
  "",
  "The template must contain exactly one /*__MERMAID_INLINE__*/ placeholder.",
  "This script uses indexOf + slice concatenation, not String.replace(), so",
  "Mermaid's literal $& / $' / $` content cannot be expanded by replacement rules."
].join("\n");

const templatePath = process.argv[2];
const outputPath = process.argv[3];
const explicitMermaidPath = process.argv[4];

if (!templatePath || !outputPath) {
  console.error(usage);
  process.exit(2);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const skillDir = path.resolve(scriptDir, "..");
const mermaidPath = explicitMermaidPath
  ? path.resolve(explicitMermaidPath)
  : path.join(skillDir, "assets", "mermaid.min.js");

const placeholder = "/*__MERMAID_INLINE__*/";
const template = await readFile(path.resolve(templatePath), "utf8");
const mermaid = await readFile(mermaidPath, "utf8");

const first = template.indexOf(placeholder);
if (first < 0) {
  console.error(`Placeholder not found: ${placeholder}`);
  process.exit(1);
}

const second = template.indexOf(placeholder, first + placeholder.length);
if (second >= 0) {
  console.error(`Placeholder appears more than once: ${placeholder}`);
  process.exit(1);
}

const html = template.slice(0, first) + mermaid + template.slice(first + placeholder.length);

const inlineStart = first;
const inlineEnd = inlineStart + mermaid.length;
const inlined = html.slice(inlineStart, inlineEnd);
if (inlined !== mermaid) {
  console.error("Mermaid inline verification failed: inlined content is not byte-for-byte identical.");
  process.exit(1);
}

if (html.includes(placeholder)) {
  console.error("Mermaid inline verification failed: placeholder token remains in output.");
  process.exit(1);
}

const scriptOpenCount = (html.match(/<script\b/gi) || []).length;
const scriptCloseCount = (html.match(/<\/script>/gi) || []).length;
if (scriptOpenCount !== scriptCloseCount) {
  console.error(`Script tag imbalance: ${scriptOpenCount} <script> vs ${scriptCloseCount} </script>.`);
  process.exit(1);
}

await writeFile(path.resolve(outputPath), html, "utf8");

console.log(JSON.stringify({
  ok: true,
  output: path.resolve(outputPath),
  mermaid: mermaidPath,
  mermaid_bytes: Buffer.byteLength(mermaid, "utf8"),
  mermaid_dollar_amp_count: (mermaid.match(/\$&/g) || []).length,
  script_tags: scriptOpenCount
}, null, 2));
