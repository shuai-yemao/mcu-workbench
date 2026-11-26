'use strict';

const { validateDescriptor } = require('../../packages/contracts');
const descriptor = require('./descriptor.json');
const sourceSkills = [
  'tools-quality', 'tools-verification', 'embedded-unit-test-generator', 'static-analysis',
  'embedded-bug-hunter', 'memory-analysis'
];

function escapeXml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function createVerificationPlugin() {
  const checked = validateDescriptor(descriptor);
  if (!checked.valid) throw new TypeError('verification descriptor is invalid: ' + checked.errors.join('; '));
  let disposed = false;
  return {
    descriptor,
    sourceSkills: [...sourceSkills],
    run(cases, evidence = {}) {
      if (!Array.isArray(cases)) throw new TypeError('verification cases must be an array');
      const results = cases.map((testCase) => {
        const started = Date.now();
        try {
          const value = testCase.execute();
          return { name: testCase.name, passed: value?.passed !== false, durationMs: Date.now() - started };
        } catch (error) {
          return { name: testCase.name, passed: false, error: error.message, durationMs: Date.now() - started };
        }
      });
      return {
        passed: results.every((item) => item.passed), cases: results,
        evidence: { cwd: evidence.cwd || null, command: evidence.command || null, evidenceLevel: evidence.evidenceLevel || 'host' }
      };
    },
    dispose() { disposed = true; },
    get disposed() { return disposed; }
  };
}

function createVerificationReport(result) {
  const failures = result.cases.filter((item) => !item.passed);
  const json = { status: result.passed ? 'passed' : 'failed', total: result.cases.length, failed: failures.length, cases: result.cases, evidence: result.evidence };
  const junitCases = result.cases.map((item) => {
    const failure = item.passed ? '' : `<failure message="${escapeXml(item.error || 'failed')}">${escapeXml(item.error || 'failed')}</failure>`;
    return `<testcase name="${escapeXml(item.name)}" time="${item.durationMs / 1000}">${failure}</testcase>`;
  }).join('');
  const junit = `<testsuite name="mcu-workbench-verification" tests="${result.cases.length}" failures="${failures.length}">${junitCases}</testsuite>`;
  const markdown = ['# Verification Pilot Report', '', `- Status: **${json.status}**`,
    '- Evidence level: `' + result.evidence.evidenceLevel + '`', '- cwd: `' + result.evidence.cwd + '`',
    '- command: `' + result.evidence.command + '`', '', '| Case | Result | Error |', '|---|---|---|',
    ...result.cases.map((item) => `| ${item.name} | ${item.passed ? 'pass' : 'fail'} | ${item.error || ''} |`)
  ].join('\n');
  return { json, junit, markdown };
}

module.exports = { descriptor, createVerificationPlugin, createVerificationReport };
