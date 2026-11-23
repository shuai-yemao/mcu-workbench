#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const usage = [
  "Usage: node validate_mermaid_report.mjs <report.md|report.html> [more-files...]",
  "",
  "Static checks for embedded-project-intake reports:",
  "- Mermaid v11 risky sequence participant IDs",
  "- legacy dotted flowchart edge labels",
  "- raw JSON-like sequence labels",
  "- standalone HTML Mermaid inline integrity"
].join("\n");

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error(usage);
  process.exit(2);
}

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const skillDir = path.resolve(scriptDir, "..");
const bundledMermaidPath = path.join(skillDir, "assets", "mermaid.min.js");
let bundledMermaid = "";
try {
  bundledMermaid = await readFile(bundledMermaidPath, "utf8");
} catch {
  // HTML inline integrity check will report this only when needed.
}

const keywordIds = new Set([
  "as",
  "loop",
  "end",
  "alt",
  "opt",
  "par",
  "and",
  "else",
  "note",
  "box",
  "rect",
  "critical",
  "break",
  "create",
  "destroy",
  "participant",
  "actor",
  "link",
  "links",
  "properties",
  "details",
  "activate",
  "deactivate"
]);

function lineOf(text, offset) {
  return text.slice(0, offset).split(/\r?\n/).length;
}

function extractMermaidBlocks(file, text) {
  const blocks = [];
  if (/\.html?$/i.test(file)) {
    const re = /<pre\s+class=["']mermaid["']\s*>\s*([\s\S]*?)\s*<\/pre>/gi;
    let m;
    while ((m = re.exec(text))) {
      blocks.push({ offset: m.index, text: decodeHtml(m[1]) });
    }
  } else {
    const re = /```mermaid\s*\n([\s\S]*?)\n```/g;
    let m;
    while ((m = re.exec(text))) {
      blocks.push({ offset: m.index, text: m[1] });
    }
  }
  return blocks;
}

function decodeHtml(text) {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function checkMermaidBlock(file, source, block, index) {
  const issues = [];
  const lines = block.text.split(/\r?\n/);
  const isSequence = /^\s*sequenceDiagram\b/.test(block.text);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = lineOf(source, block.offset) + i;

    const participant = line.match(/^\s*(?:participant|actor)\s+([A-Za-z][A-Za-z0-9_]*)\s+as\b/i);
    if (participant && keywordIds.has(participant[1].toLowerCase())) {
      issues.push({
        file,
        line: lineNo,
        severity: "error",
        message: `Mermaid sequence participant id '${participant[1]}' collides with a keyword; use an alias such as RunLoop or AudioSvc.`
      });
    }

    const dotted = line.match(/-\.[^-|\n]+(?:\.->|\.-)/);
    if (dotted) {
      issues.push({
        file,
        line: lineNo,
        severity: "error",
        message: `Legacy dotted edge label '${dotted[0]}' is risky in Mermaid v11; use -.->|label| instead.`
      });
    }

    if (isSequence) {
      const msg = line.match(/[-.]+>>[+]?[A-Za-z0-9_]+:\s*(.*)$/);
      if (msg && /[{][^}\n]*[:][\s\S]*[}]/.test(msg[1])) {
        issues.push({
          file,
          line: lineNo,
          severity: "warn",
          message: "Sequence message contains raw JSON/object-like braces; prefer plain text labels for Mermaid v11 compatibility."
        });
      }
    }
  }

  return issues.map((issue) => ({ ...issue, block: index + 1 }));
}

function checkHtmlInline(file, html) {
  const issues = [];
  if (!/\.html?$/i.test(file)) return issues;

  const placeholder = "/*__MERMAID_INLINE__*/";
  const placeholders = (html.match(/\/\*__MERMAID_INLINE__\*\//g) || []).length;
  if (placeholders > 0) {
    issues.push({ file, line: lineOf(html, html.indexOf(placeholder)), severity: "error", message: "Mermaid inline placeholder remains in HTML." });
  }

  const scriptOpen = (html.match(/<script\b/gi) || []).length;
  const scriptClose = (html.match(/<\/script>/gi) || []).length;
  if (scriptOpen !== scriptClose) {
    issues.push({ file, line: 1, severity: "error", message: `Script tag imbalance: ${scriptOpen} <script> vs ${scriptClose} </script>.` });
  }

  if (bundledMermaid) {
    const idx = html.indexOf(bundledMermaid.slice(0, 64));
    if (idx < 0) {
      issues.push({ file, line: 1, severity: "error", message: "Bundled Mermaid library prefix was not found in HTML." });
    } else {
      const inlined = html.slice(idx, idx + bundledMermaid.length);
      if (inlined !== bundledMermaid) {
        issues.push({ file, line: lineOf(html, idx), severity: "error", message: "Inlined Mermaid library is not byte-for-byte identical to bundled assets/mermaid.min.js." });
      }
    }
  }

  return issues;
}

const allIssues = [];
for (const file of files) {
  const absolute = path.resolve(file);
  const text = await readFile(absolute, "utf8");
  const blocks = extractMermaidBlocks(file, text);
  blocks.forEach((block, index) => {
    allIssues.push(...checkMermaidBlock(file, text, block, index));
  });
  allIssues.push(...checkHtmlInline(file, text));
}

const errors = allIssues.filter((issue) => issue.severity === "error");
const result = {
  ok: errors.length === 0,
  files: files.map((file) => path.resolve(file)),
  errors: errors.length,
  warnings: allIssues.length - errors.length,
  issues: allIssues
};

console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
