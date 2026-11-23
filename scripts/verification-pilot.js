'use strict';

const fs = require('fs');
const path = require('path');
const { createVerificationPlugin, createVerificationReport } = require('../plugins/verification');

const outputArgIndex = process.argv.indexOf('--out');
const outputDir = outputArgIndex >= 0 && process.argv[outputArgIndex + 1]
  ? path.resolve(process.argv[outputArgIndex + 1])
  : path.resolve('artifacts/verification-pilot');

const result = createVerificationPlugin().run([
  { name: 'descriptor-contract', execute: () => ({ passed: true }) },
  { name: 'report-contract', execute: () => ({ passed: true }) }
], {
  cwd: process.cwd(),
  command: 'node scripts/verification-pilot.js',
  evidenceLevel: 'host'
});

const report = createVerificationReport(result);
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(path.join(outputDir, 'verification-report.json'), `${JSON.stringify(report.json, null, 2)}\n`);
fs.writeFileSync(path.join(outputDir, 'verification-report.junit.xml'), `${report.junit}\n`);
fs.writeFileSync(path.join(outputDir, 'verification-report.md'), `${report.markdown}\n`);
console.log(JSON.stringify({ status: report.json.status, outputDir, total: report.json.total, failed: report.json.failed }));
if (!result.passed) process.exitCode = 1;
