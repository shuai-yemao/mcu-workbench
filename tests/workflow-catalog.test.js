const fs = require('fs');
const path = require('path');
const { pluginSkills, resolveSkillId } = require('../skills/catalog');
const expected = [
  'workflow-requirements-router','workflow-claude-layering','workflow-document-context',
  'workflow-requirements-challenge','workflow-review-gate','workflow-integration-plan',
  'workflow-task-breakdown','workflow-task-execution','workflow-final-review',
  'embed-ai-tool','embedded-change-report','embedded-project-intake','embedded-team-sync','mrd-to-prd'
];

describe('Workflow plugin catalog compatibility', () => {
  test('registers exactly the approved 14 plugin Skills with plugin source paths', () => {
    const skills = pluginSkills('mcu-workbench-workflow');
    expect(skills.map(skill => skill.id)).toEqual(expected);
    expect(skills.every(skill => skill.pluginPath.startsWith('plugins/mcu-workbench-workflow/skills/'))).toBe(true);
    expect(skills).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: 'workflow' })]));
  });

  test('retains legacy alias routing to the canonical root projection', () => {
    expect(resolveSkillId('workflow-router')).toBe('workflow-requirements-router');
    const root = process.cwd();
    const legacyRoot = path.join(root, 'skills/workflow/SKILL.md');
    expect(fs.existsSync(legacyRoot)).toBe(true);
    expect(fs.readFileSync(legacyRoot, 'utf8')).toContain('name: workflow');
  });
});
