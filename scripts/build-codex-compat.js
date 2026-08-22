#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'codex', 'AGENTS.md');
const TARGET = path.join(ROOT, 'AGENTS.override.md');
const HEADER = [
  '<!-- GENERATED FILE: do not edit directly. -->',
  '<!-- Source: codex/AGENTS.md -->',
  ''
].join('\n');

function buildCodexCompat({ source = SOURCE, target = TARGET } = {}) {
  const content = fs.readFileSync(source, 'utf8').replace(/^\uFEFF/, '');
  const generated = `${HEADER}${content.endsWith('\n') ? content : `${content}\n`}`;
  fs.writeFileSync(target, generated, 'utf8');
  return { source, target, bytes: Buffer.byteLength(generated, 'utf8') };
}

if (require.main === module) {
  try {
    const result = buildCodexCompat();
    console.log(`Codex compatibility bridge generated: ${result.target}`);
  } catch (error) {
    console.error(`Codex compatibility bridge failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { buildCodexCompat, HEADER };
