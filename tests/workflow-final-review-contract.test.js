const fs = require('node:fs');
const path = require('node:path');

const file = path.resolve(
  __dirname,
  '..',
  'skills',
  'workflow',
  'workflow-final-review',
  'SKILL.md',
);

describe('workflow final review contract', () => {
  test('requires final Verify before internal Final Review', () => {
    const text = fs.readFileSync(file, 'utf8');

    expect(text).toContain('Final Review 只保存内部结构化结果');
    expect(text).toContain('Verify 通过后');
    expect(text).toContain('Verify 发现偏差时必须回到 Spec');
    expect(text).toContain('不生成 Final Review Markdown');
  });
});
