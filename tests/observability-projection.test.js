'use strict';

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { syncSkills } = require('../plugins/mcu-workbench-observability/scripts/sync-skills');

describe('Observability compatibility projection', () => {
  let tempRoot;
  let pluginRoot;
  let projectRoot;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'observability-projection-'));
    pluginRoot = path.join(tempRoot, 'plugin');
    projectRoot = path.join(tempRoot, 'project');
    fs.mkdirSync(path.join(pluginRoot, 'skills', 'can-debug'), { recursive: true });
    fs.writeFileSync(path.join(pluginRoot, 'skills', 'can-debug', 'SKILL.md'), '# CAN\n');
  });

  afterEach(() => fs.rmSync(tempRoot, { recursive: true, force: true }));

  test('adopts an exact baseline root directory and writes a stable marker', () => {
    const source = Buffer.from('# CAN\n');
    const target = path.join(projectRoot, 'skills', 'can-debug', 'SKILL.md');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, source);
    const baselineHashes = {
      'skills/can-debug/SKILL.md': crypto.createHash('sha256').update(source).digest('hex')
    };
    const options = { pluginRoot, projectRoot, skillMappings: [{ id: 'can-debug', projection: 'can-debug' }], baselineHashes };
    const result = syncSkills(options);
    expect(result.status).toBe('created');
    expect(syncSkills(options).status).toBe('unchanged');
    const marker = JSON.parse(fs.readFileSync(result.markerPath, 'utf8'));
    expect(marker.files).toHaveLength(1);
  });

  test('refuses unmarked target drift and preserves the existing bytes', () => {
    const target = path.join(projectRoot, 'skills', 'can-debug', 'SKILL.md');
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, '# user edit\n');
    const before = fs.readFileSync(target);
    const options = { pluginRoot, projectRoot, skillMappings: [{ id: 'can-debug', projection: 'can-debug' }], baselineHashes: {} };
    expect(() => syncSkills(options)).toThrow(/unmarked projection/);
    expect(fs.readFileSync(target)).toEqual(before);
  });
});
