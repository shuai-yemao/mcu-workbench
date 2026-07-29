#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const {
  compareExpectedFindings,
  validateArchitectureContract
} = require('../lib/architecture-contract');

function parseArgs(argv, cwd = process.cwd()) {
  const options = { root: null, config: null, expect: null, json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--root') options.root = path.resolve(cwd, argv[++index]);
    else if (argument === '--config') options.config = path.resolve(cwd, argv[++index]);
    else if (argument === '--expect') options.expect = path.resolve(cwd, argv[++index]);
    else if (argument === '--json') options.json = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  if (!options.root) throw new Error('--root requires a firmware directory');
  return options;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readGitHead(root) {
  try {
    return execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim().toLowerCase();
  } catch (_error) {
    return null;
  }
}

function compareExpectedSource(expected, actualCommit) {
  const expectedCommit = expected && expected.source && expected.source.commit;
  if (!expectedCommit) return null;
  const normalizedExpected = String(expectedCommit).toLowerCase();
  const normalizedActual = actualCommit && String(actualCommit).toLowerCase();
  return {
    matches: normalizedActual === normalizedExpected,
    expectedCommit: normalizedExpected,
    actualCommit: normalizedActual
  };
}

function runArchitectureValidation({ root, layout, expected } = {}) {
  const result = validateArchitectureContract({ root, layout });
  const comparison = expected ? compareExpectedFindings(result.findings, expected) : null;
  const sourceComparison = compareExpectedSource(expected, readGitHead(root));
  const expectedMatches = (!comparison || comparison.matches)
    && (!sourceComparison || sourceComparison.matches);
  const exitCode = expected
    ? (expectedMatches ? 0 : 1)
    : (result.errors.length ? 1 : 0);
  return { result, comparison, sourceComparison, exitCode };
}

function formatFinding(finding) {
  return `${finding.severity.toUpperCase()} ${finding.ruleId} ${finding.file}:${finding.line} ${finding.message}`;
}

function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const config = options.config ? readJson(options.config) : null;
  const expected = options.expect ? readJson(options.expect) : null;
  const outcome = runArchitectureValidation({
    root: options.root,
    layout: config && (config.layout || config),
    expected
  });
  if (options.json) console.log(JSON.stringify(outcome, null, 2));
  else {
    for (const finding of outcome.result.findings) console.log(formatFinding(finding));
    console.log(`Architecture scan: ${outcome.result.summary.files} files, ${outcome.result.summary.errors} errors, ${outcome.result.summary.warnings} warnings.`);
    if (outcome.comparison && !outcome.comparison.matches) {
      for (const finding of outcome.comparison.missing) console.error(`MISSING ${JSON.stringify(finding)}`);
      for (const finding of outcome.comparison.unexpected) console.error(`UNEXPECTED ${JSON.stringify(finding)}`);
    } else if (outcome.comparison) {
      console.log('Reviewed finding manifest matches exactly.');
    }
    if (outcome.sourceComparison && !outcome.sourceComparison.matches) {
      console.error(`SOURCE_MISMATCH expected=${outcome.sourceComparison.expectedCommit} actual=${outcome.sourceComparison.actualCommit || 'unavailable'}`);
    } else if (outcome.sourceComparison) {
      console.log(`Pinned source commit verified: ${outcome.sourceComparison.actualCommit}`);
    }
  }
  process.exitCode = outcome.exitCode;
  return outcome;
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`Architecture validation failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = {
  compareExpectedSource,
  formatFinding,
  main,
  parseArgs,
  readGitHead,
  runArchitectureValidation
};
