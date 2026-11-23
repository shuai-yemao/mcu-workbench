#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

function usage() {
  console.error("Usage: node extract_pdf_text_node.mjs [input.pdf] [output.txt]");
  console.error("If input is omitted, the first PDF in the current directory is used.");
}

function findPdf() {
  return fs.readdirSync(process.cwd()).find((name) => name.toLowerCase().endsWith(".pdf"));
}

async function loadPdfParse() {
  try {
    return await import("pdf-parse");
  } catch {
    const cwdRequire = createRequire(pathToFileURL(path.join(process.cwd(), "package.json")));
    return cwdRequire("pdf-parse");
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("-h") || args.includes("--help")) {
    usage();
    return;
  }

  const input = args[0] || findPdf();
  if (!input) {
    throw new Error("No PDF file found. Pass an input path explicitly.");
  }

  const output = args[1] || `${path.basename(input, path.extname(input))}.extracted.txt`;
  const { PDFParse } = await loadPdfParse();
  if (!PDFParse) {
    throw new Error("The pdf-parse package is required. Install it with: npm install pdf-parse");
  }

  const data = fs.readFileSync(input);
  const parser = new PDFParse({ data });
  const info = await parser.getInfo({ parsePageInfo: true });
  const total = info.total || info.pages || info.numpages;
  if (!total) {
    throw new Error("Could not determine PDF page count.");
  }

  const pages = [];
  for (let page = 1; page <= total; page += 1) {
    const result = await parser.getText({ partial: [page] });
    pages.push(`--- page ${page} ---\n${result.text.trimEnd()}`);
  }
  await parser.destroy();

  fs.writeFileSync(output, `${pages.join("\n\n")}\n`, "utf8");
  console.log(JSON.stringify({ input, output, pages: total, text_length: pages.join("\n").length }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

