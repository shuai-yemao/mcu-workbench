#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const jsonMode = args.includes("--json");
const filtered = args.filter((arg) => arg !== "--json");

if (filtered.length < 2) {
  console.error('Usage: node query_bundle.mjs <bundle-root> "query words" [--json]');
  process.exit(2);
}

const root = path.resolve(filtered[0]);
const query = filtered.slice(1).join(" ").trim();
const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

function exists(file) {
  try {
    fs.accessSync(file, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function listFiles(dir) {
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name);
  } catch {
    return [];
  }
}

function score(text) {
  const lower = String(text ?? "").toLowerCase();
  let total = 0;
  for (const term of terms) {
    if (lower.includes(term)) total += term.length;
  }
  if (lower.includes(query.toLowerCase())) total += query.length * 2;
  return total;
}

function clip(text, max = 360) {
  const compact = String(text ?? "").replace(/\s+/g, " ").trim();
  return compact.length > max ? `${compact.slice(0, max - 1)}...` : compact;
}

function flattenText(value, out = []) {
  if (value == null) return out;
  if (typeof value === "string" || typeof value === "number") {
    out.push(String(value));
  } else if (Array.isArray(value)) {
    for (const item of value) flattenText(item, out);
  } else if (typeof value === "object") {
    for (const key of ["text", "content", "title_content", "paragraph_content", "list_items", "item_content", "html"]) {
      if (key in value) flattenText(value[key], out);
    }
  }
  return out;
}

function findImageRefs(line) {
  const refs = [];
  const md = /!\[[^\]]*\]\((images\/[^)]+)\)/g;
  let match;
  while ((match = md.exec(line))) refs.push(match[1]);
  return refs;
}

const results = [];
const fullMd = path.join(root, "full.md");

if (exists(fullMd)) {
  const lines = fs.readFileSync(fullMd, "utf8").split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const lineScore = score(lines[i]);
    if (lineScore > 0) {
      const nearbyImages = [];
      for (let j = Math.max(0, i - 8); j <= Math.min(lines.length - 1, i + 8); j++) {
        nearbyImages.push(...findImageRefs(lines[j]));
      }
      results.push({
        source: "full.md",
        line: i + 1,
        score: lineScore,
        text: clip(lines[i]),
        images: [...new Set(nearbyImages)].slice(0, 5),
      });
    }
  }
}

for (const file of listFiles(root).filter((name) => /content_list.*\.json$/i.test(name))) {
  const filePath = path.join(root, file);
  let data;
  try {
    data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    continue;
  }

  const visit = (node, pageHint = null) => {
    if (Array.isArray(node)) {
      node.forEach((item, index) => visit(item, typeof pageHint === "number" ? pageHint : index));
      return;
    }
    if (!node || typeof node !== "object") return;

    const text = flattenText(node).join(" ");
    const nodeScore = score(text);
    const pageIdx = Number.isInteger(node.page_idx) ? node.page_idx : pageHint;
    if (nodeScore > 0 && text.trim()) {
      results.push({
        source: file,
        page: Number.isInteger(pageIdx) ? pageIdx + 1 : undefined,
        type: node.type,
        score: nodeScore,
        text: clip(text),
        bbox: node.bbox,
      });
    }

    for (const key of ["content", "blocks", "list_items", "paragraph_content", "title_content"]) {
      if (key in node) visit(node[key], pageIdx);
    }
  };

  visit(data);
}

results.sort((a, b) => b.score - a.score);
const top = results.slice(0, 12);

if (jsonMode) {
  console.log(JSON.stringify({ root, query, results: top }, null, 2));
} else {
  console.log(`Query: ${query}`);
  console.log(`Bundle: ${root}`);
  console.log(`Hits: ${results.length} (showing ${top.length})`);
  for (const hit of top) {
    const where = [
      hit.source,
      hit.line ? `line ${hit.line}` : null,
      hit.page ? `page ${hit.page}` : null,
      hit.type ? `type ${hit.type}` : null,
    ].filter(Boolean).join(" | ");
    console.log(`\n[${hit.score}] ${where}`);
    console.log(hit.text);
    if (hit.images?.length) console.log(`images: ${hit.images.join(", ")}`);
    if (hit.bbox) console.log(`bbox: ${JSON.stringify(hit.bbox)}`);
  }
}
