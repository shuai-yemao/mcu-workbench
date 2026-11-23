const fs = require('fs');
const path = require('path');
const {
  CANONICAL_SKILLS,
  resolveSkillId,
} = require('../skills/catalog');
const { getSkillContent } = require('../skills/loader');
const {
  validateLearningTutorReferences,
  validatePlugin
} = require('../scripts/validate-plugin');

const ROOT = path.resolve(__dirname, '..');
const SKILL_ROOT = path.join(ROOT, 'skills', 'tools', 'tools-learning-tutor');
const REFERENCE_FILES = [
  'learning-modes.md',
  'project-scan-and-evidence.md',
  'question-bank.md',
  'note-template.md',
  'coverage-checklist.md',
  'obsidian-write-protocol.md',
  'session-state.md'
];

describe('tools-learning-tutor restored capability', () => {
  test('remains one canonical skill with legacy aliases', () => {
    expect(CANONICAL_SKILLS.filter((skill) => skill.id === 'tools-learning-tutor')).toHaveLength(1);
    expect(resolveSkillId('workflow-learning-tutor')).toBe('tools-learning-tutor');
    expect(resolveSkillId('learning-tutor')).toBe('tools-learning-tutor');
    expect(getSkillContent('tools-learning-tutor')).toContain('先选模式');
  });

  test('all detailed references exist and are directly linked', () => {
    const content = fs.readFileSync(path.join(SKILL_ROOT, 'SKILL.md'), 'utf8');
    for (const file of REFERENCE_FILES) {
      expect(fs.existsSync(path.join(SKILL_ROOT, 'references', file))).toBe(true);
      expect(content).toContain(`references/${file}`);
    }
  });

  test('references preserve the old interactive teaching and note protocol', () => {
    const read = (file) => fs.readFileSync(path.join(SKILL_ROOT, 'references', file), 'utf8');
    const questions = read('question-bank.md');
    const skill = fs.readFileSync(path.join(SKILL_ROOT, 'SKILL.md'), 'utf8');
    const note = read('note-template.md');
    const coverage = read('coverage-checklist.md');
    const obsidian = read('obsidian-write-protocol.md');
    const session = read('session-state.md');

    expect(questions).toContain('11 节主流程');
    expect(skill).toContain('每轮只提出一个问题');
    expect(skill).toContain('不知道');
    expect(questions).toContain('3–6');
    expect(note).toContain('sequenceDiagram');
    expect(note).toContain(':line');
    expect(note).toContain('[[笔记文件名]]');
    expect(coverage).toContain('typedef struct');
    expect(coverage).toContain('公开 API');
    expect(coverage).toContain('补充? y/n');
    expect(obsidian).toContain('明确确认');
    expect(obsidian).toContain('不覆盖原笔记');
    expect(session).toContain('weak_points');
    expect(session).toContain('next_question');
  });

  test('plugin validator accepts the restored protocol', () => {
    const errors = [];
    validateLearningTutorReferences(errors);
    expect(errors).toEqual([]);
    expect(validatePlugin().errors).toEqual([]);
  });
});
