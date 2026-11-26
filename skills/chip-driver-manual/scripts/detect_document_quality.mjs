#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

function usage() {
  console.error("Usage: node detect_document_quality.mjs extracted.txt");
}

function countMatches(text, pattern) {
  return (text.match(pattern) || []).length;
}

function main() {
  const input = process.argv[2];
  if (!input || input === "-h" || input === "--help") {
    usage();
    process.exit(input ? 0 : 1);
  }

  const text = fs.readFileSync(input, "utf8");
  const pageCount = countMatches(text, /^--- page \d+ ---$/gm);
  const lines = text.split(/\r?\n/);
  const nonEmptyLines = lines.filter((line) => line.trim()).length;
  const replacementTokens = countMatches(text, /\uFFFD|\?\?\?/g);
  const nonAsciiTokens = countMatches(text, /[^\x00-\x7F]/g);
  const mojibakeLikeTokens = countMatches(text, /[\u9225\u98E6\u6E2D\u63B3\u6529\u7648\u63DD]/g);
  const suspicious = replacementTokens + mojibakeLikeTokens;
  const tableLikeLines = lines.filter((line) => {
    const tabs = (line.match(/\t/g) || []).length;
    const manySpaces = (line.match(/ {2,}/g) || []).length;
    const numbers = (line.match(/\b\d+(?:\.\d+)?\b/g) || []).length;
    return tabs >= 2 || (manySpaces >= 2 && numbers >= 2);
  }).length;
  const veryShortPages = text
    .split(/^--- page \d+ ---$/gm)
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => part.length < 80).length;

  const riskLabels = [];
  if (pageCount === 0) riskLabels.push("missing_page_markers");
  if (text.length < 1000) riskLabels.push("low_text_length");
  if (suspicious > 20 || nonAsciiTokens > Math.max(80, text.length * 0.005)) riskLabels.push("mojibake");
  if (tableLikeLines > 20) riskLabels.push("table_review_recommended");
  if (veryShortPages > 0) riskLabels.push("possible_scanned_or_blank_pages");

  const result = {
    input: path.basename(input),
    pages: pageCount || null,
    text_length: text.length,
    non_empty_lines: nonEmptyLines,
    suspicious_garbled_tokens: suspicious,
    non_ascii_tokens: nonAsciiTokens,
    table_like_lines: tableLikeLines,
    very_short_pages: veryShortPages,
    risk_labels: riskLabels.length ? riskLabels : ["text_ok"],
  };

  console.log(JSON.stringify(result, null, 2));
}

main();
