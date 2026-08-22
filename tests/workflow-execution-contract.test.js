const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

function readSkill(name) {
  return fs.readFileSync(
    path.join(ROOT, 'skills', 'workflow', name, 'SKILL.md'),
    'utf8',
  );
}

describe('workflow execution contract', () => {
  test('separates task implementation/testing from final Verify', () => {
    const integration = readSkill('workflow-integration-plan');
    const breakdown = readSkill('workflow-task-breakdown');
    const execution = readSkill('workflow-task-execution');

    expect(integration).toContain('所有 Task 完成后统一执行最终 Verify');
    expect(breakdown).toContain('Task 级测试只证明当前任务的局部完成条件，不等同最终验收');
    expect(execution).toContain('实现当前 Task');
    expect(execution).toContain('测试当前 Task');
    expect(execution).toContain('发现偏差必须回到 Spec');
  });
});
