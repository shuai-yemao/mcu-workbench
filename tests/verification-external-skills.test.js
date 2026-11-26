'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const pluginSkills = path.join(root, 'plugins/mcu-workbench-verification/skills');
const externalVerificationSkills = [
  'embedded-unit-test-generator',
  'static-analysis',
  'embedded-bug-hunter',
  'memory-analysis'
];

describe('verification external Skill migration', () => {
  test.each(externalVerificationSkills)('%s is physically present in the plugin', (skillId) => {
    const file = path.join(pluginSkills, skillId, 'SKILL.md');
    expect(fs.existsSync(file)).toBe(true);
    expect(fs.readFileSync(file, 'utf8')).toMatch(new RegExp(`^name: ${skillId}$`, 'm'));
  });

  test('keeps only verification-owned external Skills in the compatibility view', () => {
    const marker = path.join(root, 'skills/tools/.verification-projections.json');
    const projections = JSON.parse(fs.readFileSync(marker, 'utf8'));
    expect(projections.skills).toEqual([
      'tools-verification',
      'tools-quality',
      ...externalVerificationSkills
    ]);
    for (const skillId of ['academic-paper', 'academic-paper-reviewer', 'academic-pipeline', 'sr-screener']) {
      expect(projections.skills).not.toContain(skillId);
      expect(fs.existsSync(path.join(root, 'skills', skillId, 'SKILL.md'))).toBe(true);
    }
  });
});
