'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { syncSkills } = require('../plugins/mcu-workbench-devops/scripts/sync-skills');
const crypto = require('crypto');

describe('DevOps compatibility projection', () => {
  let root;
  let pluginRoot;
  let projectRoot;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'devops-projection-'));
    pluginRoot = path.join(root, 'plugin');
    projectRoot = path.join(root, 'project');
    fs.mkdirSync(path.join(pluginRoot, 'skills', 'tools-build'), { recursive: true });
    fs.writeFileSync(path.join(pluginRoot, 'skills', 'tools-build', 'SKILL.md'), '# Build\n');
  });

  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  test('creates a repeatable projection with a source and hash marker', () => {
    const result = syncSkills({
      pluginRoot,
      projectRoot,
      skillMappings: [{ id: 'tools-build', projection: 'tools/tools-build' }]
    });
    const projected = path.join(projectRoot, 'skills', 'tools', 'tools-build', 'SKILL.md');
    expect(fs.readFileSync(projected, 'utf8')).toBe('# Build\n');
    expect(fs.existsSync(result.markerPath)).toBe(true);
    expect(syncSkills({
      pluginRoot,
      projectRoot,
      skillMappings: [{ id: 'tools-build', projection: 'tools/tools-build' }]
    }).status).toBe('unchanged');
  });

  test('refuses to overwrite a modified projection', () => {
    const options = {
      pluginRoot,
      projectRoot,
      skillMappings: [{ id: 'tools-build', projection: 'tools/tools-build' }]
    };
    syncSkills(options);
    fs.appendFileSync(path.join(projectRoot, 'skills', 'tools', 'tools-build', 'SKILL.md'), 'user edit\n');
    expect(() => syncSkills(options)).toThrow(/modified projection/);
  });

  test('extends a marker with an unmarked projection only when it matches frozen baseline bytes', () => {
    const oldMapping = [{ id: 'tools-build', projection: 'tools/tools-build' }];
    const newMapping = [...oldMapping, { id: 'embedded-build-flash-debug', projection: 'embedded-build-flash-debug' }];
    const legacyOptions = { pluginRoot, projectRoot, skillMappings: oldMapping };
    const newSource = path.join(pluginRoot, 'skills', 'embedded-build-flash-debug');
    const newTarget = path.join(projectRoot, 'skills', 'embedded-build-flash-debug');
    fs.mkdirSync(newSource, { recursive: true });
    fs.writeFileSync(path.join(newSource, 'SKILL.md'), '# Build/flash/debug\n');
    fs.mkdirSync(newTarget, { recursive: true });
    const baseline = Buffer.from('# Existing root projection\n');
    fs.writeFileSync(path.join(newTarget, 'SKILL.md'), baseline);
    syncSkills(legacyOptions);
    const baselineHashes = {
      'skills/embedded-build-flash-debug/SKILL.md': crypto.createHash('sha256').update(baseline).digest('hex')
    };
    expect(() => syncSkills({ ...legacyOptions, skillMappings: newMapping, baselineHashes })).not.toThrow();
    const marker = JSON.parse(fs.readFileSync(path.join(projectRoot, 'skills', 'tools', '.devops-projections.json'), 'utf8'));
    expect(marker.skills).toEqual(['tools-build', 'embedded-build-flash-debug']);
    expect(fs.readFileSync(path.join(newTarget, 'SKILL.md'), 'utf8')).toBe('# Build/flash/debug\n');
  });

  test('rejects an unmarked projection changed after the frozen baseline', () => {
    const oldMapping = [{ id: 'tools-build', projection: 'tools/tools-build' }];
    const newMapping = [...oldMapping, { id: 'embedded-build-flash-debug', projection: 'embedded-build-flash-debug' }];
    const legacyOptions = { pluginRoot, projectRoot, skillMappings: oldMapping };
    const newSource = path.join(pluginRoot, 'skills', 'embedded-build-flash-debug');
    const newTarget = path.join(projectRoot, 'skills', 'embedded-build-flash-debug');
    fs.mkdirSync(newSource, { recursive: true });
    fs.writeFileSync(path.join(newSource, 'SKILL.md'), '# Build/flash/debug\n');
    fs.mkdirSync(newTarget, { recursive: true });
    fs.writeFileSync(path.join(newTarget, 'SKILL.md'), '# Drifted\n');
    syncSkills(legacyOptions);
    const baselineHashes = { 'skills/embedded-build-flash-debug/SKILL.md': '0'.repeat(64) };
    expect(() => syncSkills({ ...legacyOptions, skillMappings: newMapping, baselineHashes })).toThrow(/baseline/);
    expect(fs.readFileSync(path.join(newTarget, 'SKILL.md'), 'utf8')).toBe('# Drifted\n');
  });
});
