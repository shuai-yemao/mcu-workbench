const fs = require('fs');
const path = require('path');
const { ROOT } = require('./common');

const TUTOR_SKILL_ROOT = path.join(ROOT, 'skills', 'tools', 'tools-learning-tutor');

function validateLearningTutorReferences(errors) {
  const requiredFiles = [
    'SKILL.md',
    'references/learning-modes.md',
    'references/project-scan-and-evidence.md',
    'references/question-bank.md',
    'references/note-template.md',
    'references/coverage-checklist.md',
    'references/obsidian-write-protocol.md',
    'references/session-state.md'
  ];
  for (const relative of requiredFiles) {
    if (!fs.existsSync(path.join(TUTOR_SKILL_ROOT, relative))) {
      errors.push(`tools-learning-tutor: 缺少 ${relative}`);
    }
  }

  const skillPath = path.join(TUTOR_SKILL_ROOT, 'SKILL.md');
  if (!fs.existsSync(skillPath)) return;
  const content = fs.readFileSync(skillPath, 'utf8');
  for (const reference of requiredFiles.slice(1)) {
    if (!content.includes(`references/${path.basename(reference)}`)) {
      errors.push(`tools-learning-tutor: SKILL.md 未直接链接 ${reference}`);
    }
  }

  const capabilityAnchors = [
    'tutor', 'code-audit', 'note-refresh', 'project-note',
    '逐节', 'Q&A', 'Mermaid', 'WikiLink', 'Obsidian', '未验证', '薄弱点'
  ];
  for (const anchor of capabilityAnchors) {
    if (!content.includes(anchor)) errors.push(`tools-learning-tutor: 主入口缺少能力标记 ${anchor}`);
  }
}

module.exports = {
  validateLearningTutorReferences
};
