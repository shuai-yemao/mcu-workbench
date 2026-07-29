#!/usr/bin/env node

const path = require('path');
const { validateSkillLinks } = require('../lib/skill-links');

const ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const options = {
    root: path.join(ROOT, 'skills'),
    boundaryRoot: ROOT,
    json: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--root') options.root = path.resolve(argv[++index]);
    else if (argument === '--boundary-root') options.boundaryRoot = path.resolve(argv[++index]);
    else if (argument === '--json') options.json = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

function run(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const result = validateSkillLinks(options);
  if (options.json) console.log(JSON.stringify(result, null, 2));
  else if (result.findings.length) {
    for (const finding of result.findings) {
      console.error(`${finding.file}:${finding.line}:${finding.column} ${finding.ruleId} ${finding.target}`);
    }
  } else {
    console.log(`Skill links valid: ${result.summary.files} Markdown files.`);
  }
  if (result.findings.length) process.exitCode = 1;
  return result;
}

if (require.main === module) {
  try {
    run();
  } catch (error) {
    console.error(`Skill link validation failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { parseArgs, run };
