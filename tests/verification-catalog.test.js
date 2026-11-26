'use strict';
const { pluginSkills, resolveSkillId } = require('../skills/catalog');

describe('verification plugin catalog projection', () => {
  test('registers only six Verification-owned Skills once with physical plugin paths', () => {
    const skills = pluginSkills('mcu-workbench-verification');
    expect(skills.map(({ id }) => id)).toEqual([
      'tools-verification', 'tools-quality', 'embedded-unit-test-generator', 'static-analysis',
      'embedded-bug-hunter', 'memory-analysis'
    ]);
    expect(new Set(skills.map(({ id }) => id)).size).toBe(skills.length);
    expect(skills.every(({ pluginPath }) => pluginPath.startsWith('plugins/mcu-workbench-verification/skills/'))).toBe(true);
    expect(skills.map(({ id }) => id)).not.toEqual(expect.arrayContaining(['academic-paper', 'academic-paper-reviewer', 'academic-pipeline', 'sr-screener']));
  });

  test.each([
    ['tools-verification', 'tools-verification'],
    ['quality-code-review', 'tools-quality'],
    ['academic-paper', 'academic-paper'],
    ['embedded-unit-test-generator', 'embedded-unit-test-generator'],
    ['sr-screener', 'sr-screener'],
    ['static-analysis', 'tools-quality']
  ])('resolves %s to %s', (input, expected) => {
    expect(resolveSkillId(input)).toBe(expected);
  });
});

