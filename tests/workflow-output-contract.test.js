const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function readSkill(name) {
  return fs.readFileSync(
    path.join(ROOT, 'skills', 'workflow', name, 'SKILL.md'),
    'utf8',
  );
}

describe('workflow output contract', () => {
  test('keeps RCP internal and exposes only formal user documents', () => {
    const router = readSkill('workflow-requirements-router');
    const challenge = readSkill('workflow-requirements-challenge');
    const gate = readSkill('workflow-review-gate');

    expect(router).toContain('RCP 是内部结构化状态');
    expect(router).toContain('用户正式接收的文档只有详细 `spec.md`、`plan.md` 和 `task.md`');
    expect(challenge).toContain('只更新内部 RCP 状态');
    expect(gate).toContain('Review-Package 是内部结构化审查状态');
    expect(gate).toContain('不生成用户项目中的 Review-Package Markdown');

    const readme = fs.readFileSync(path.join(ROOT, 'README.md'), 'utf8');
    const codexEntry = fs.readFileSync(
      path.join(ROOT, 'codex', 'embedded-workflow-entry.md'),
      'utf8',
    );
    expect(readme).toContain('当前 Spec 工作流文档契约（v1.0）');
    expect(codexEntry).toContain('当前 v1.0 文档契约');
  });
});
