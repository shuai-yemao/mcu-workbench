'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const syncScript = path.join(
  __dirname,
  '..',
  'plugins',
  'mcu-workbench-architecture',
  'scripts',
  'sync-skills.js'
);

describe('Architecture Skill projection entry', () => {
  test('provides a package-owned synchronization script', () => {
    expect(fs.existsSync(syncScript)).toBe(true);
  });

  test('protects generated projections with a marker after exact baseline adoption', () => {
    const marker = path.join(__dirname, '..', 'skills', '.architecture-projections.json');
    expect(fs.existsSync(marker)).toBe(true);
    if (!fs.existsSync(marker)) return;
    const data = JSON.parse(fs.readFileSync(marker, 'utf8'));
    expect(data.plugin).toBe('mcu-workbench-architecture');
    expect(data.files).toHaveLength(249);
    expect(data.files.every((file) => /^[a-f0-9]{64}$/.test(file.sha256))).toBe(true);
  });

  test('registers all architecture Skills in the legacy aggregate resolver', () => {
    const { pluginSkills } = require('../skills/catalog');
    const entries = pluginSkills('mcu-workbench-architecture');
    expect(entries).toHaveLength(39);
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(39);
  });

  test('refuses to overwrite a drifted projection and preserves its bytes', () => {
    const target = path.join(__dirname, '..', 'skills', 'app', 'app-architecture', 'SKILL.md');
    const before = fs.readFileSync(target);
    const drift = Buffer.concat([before, Buffer.from('\nuser-drift\n')]);
    try {
      fs.writeFileSync(target, drift);
      expect(() => execFileSync(process.execPath, [syncScript], { stdio: 'pipe' })).toThrow();
      expect(fs.readFileSync(target)).toEqual(drift);
    } finally {
      fs.writeFileSync(target, before);
    }
  });

  test('rejects an unknown marker without changing projection files', () => {
    const marker = path.join(__dirname, '..', 'skills', '.architecture-projections.json');
    const target = path.join(__dirname, '..', 'skills', 'app', 'app-architecture', 'SKILL.md');
    const beforeMarker = fs.readFileSync(marker);
    const beforeTarget = fs.readFileSync(target);
    const changed = JSON.parse(beforeMarker.toString('utf8'));
    changed.plugin = 'unknown-plugin';
    try {
      fs.writeFileSync(marker, JSON.stringify(changed));
      expect(() => execFileSync(process.execPath, [syncScript], { stdio: 'pipe' })).toThrow();
      expect(fs.readFileSync(target)).toEqual(beforeTarget);
    } finally {
      fs.writeFileSync(marker, beforeMarker);
    }
  });
});
