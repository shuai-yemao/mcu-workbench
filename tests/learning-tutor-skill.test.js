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
  'session-state.md',
  'architecture-reasoning.md',
  'writing-and-teaching-practice.md'
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
    const capabilityIndex = read('capability-index.md');

    expect(questions).toContain('栏目权威与提问原则');
    expect(questions).toContain('用户指定的 Vault 模板优先');
    expect(questions).toContain('单题循环');
    expect(questions).not.toContain('11 节主流程');
    expect(skill).toContain('每轮只提出一个问题');
    expect(skill).toContain('不知道');
    expect(skill).toContain('架构设计与逻辑推理');
    expect(skill).toContain('技术文档、技术博客或教学提纲');
    expect(questions).toContain('3–6');
    expect(questions).toContain('架构设计与逻辑推理题');
    expect(questions).toContain('表达与授课题');
    expect(note).toContain('sequenceDiagram');
    expect(note).toContain(':line');
    expect(note).toContain('[[笔记文件名]]');
    expect(coverage).toContain('typedef struct');
    expect(coverage).toContain('公开 API');
    expect(coverage).toContain('模块职责、依赖方向和可替换边界');
    expect(coverage).toContain('技术文档能让同组工程师');
    expect(coverage).toContain('补充? y/n');
    expect(obsidian).toContain('明确确认');
    expect(obsidian).toContain('不覆盖原笔记');
    expect(session).toContain('weak_points');
    expect(session).toContain('next_question');
    expect(session).toContain('architecture_reasoning');
    expect(session).toContain('expression_practice');
    expect(capabilityIndex).toContain('迁移比对资料');
    expect(capabilityIndex).toContain('不作为 active reference 读取');
  });

  test('new training references define architecture, writing, and teaching practice', () => {
    const read = (file) => fs.readFileSync(path.join(SKILL_ROOT, 'references', file), 'utf8');
    const architecture = read('architecture-reasoning.md');
    const writing = read('writing-and-teaching-practice.md');

    expect(architecture).toContain('## 推理链');
    expect(architecture).toContain('**问题**');
    expect(architecture).toContain('**取舍**');
    expect(architecture).toContain('**验证**');
    expect(architecture).toContain('至少两个可行方案');
    expect(architecture).toContain('静态、构建、运行日志、板级和回归验证');
    expect(writing).toContain('技术文档训练');
    expect(writing).toContain('技术博客训练');
    expect(writing).toContain('教学讲解训练');
    expect(writing).toContain('保留用户原稿');
  });

  test('plugin validator accepts the restored protocol', () => {
    const errors = [];
    validateLearningTutorReferences(errors);
    expect(errors).toEqual([]);
    expect(validatePlugin().errors).toEqual([]);
  });
});
