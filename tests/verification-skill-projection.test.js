'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pluginSkills = path.join(root, 'plugins/mcu-workbench-verification/skills');

describe('verification canonical Skill ownership', () => {
  test.each(['tools-verification', 'tools-quality'])('%s has a plugin-owned canonical source', (skillId) => {
    const file = path.join(pluginSkills, skillId, 'SKILL.md');
    expect(fs.existsSync(file)).toBe(true);
    expect(fs.readFileSync(file, 'utf8')).toMatch(new RegExp(`^name: ${skillId}$`, 'm'));
  });

  test('keeps root catalog paths as generated compatibility projections', () => {
    const marker = path.join(root, 'skills/tools/.verification-projections.json');
    expect(fs.existsSync(marker)).toBe(true);
    const projections = JSON.parse(fs.readFileSync(marker, 'utf8'));
    expect(projections.source).toBe('plugins/mcu-workbench-verification/skills');
    expect(projections.skills).toEqual(['tools-verification', 'tools-quality', 'embedded-unit-test-generator', 'static-analysis', 'embedded-bug-hunter', 'memory-analysis']);
    for (const skillId of ['academic-paper', 'academic-paper-reviewer', 'academic-pipeline', 'sr-screener']) {
      expect(fs.existsSync(path.join(root, 'skills', skillId, 'SKILL.md'))).toBe(true);
    }
  });
});

