const fs = require('fs');
const path = require('path');
const { getSkillContent } = require('../skills/loader');

const ROOT = path.resolve(__dirname, '..');

describe('AI collaboration skills', () => {
  test('triggers on final code, patch or git diff and delegates code quality to tools-quality', () => {
    const review = getSkillContent('workflow-final-review');
    expect(review).toContain('最终代码');
    expect(review).toContain('git diff');
    expect(review).toContain('tools-quality');
    expect(review).toContain('接口');
    expect(review).toContain('构建');
    expect(review).toContain('review-gates.md');
    expect(review).toContain('Cppcheck/MISRA');
    expect(review).toContain('代码质量门禁');
    expect(review).toContain('mode: final-gate');
  });

  test('requires spec-first traceability, full verification and bounded omission repair', () => {
    const review = getSkillContent('workflow-final-review');
    const contract = fs.readFileSync(
      path.join(ROOT, 'skills', 'workflow', 'workflow-final-review', 'references', 'prompt-contract.md'),
      'utf8'
    );

    // Spec 逐条核对，不能用 task.md 勾选状态替代需求证据
    expect(review).toContain('重新读取放行后的 `spec.md`');
    expect(review).toContain('任务勾选状态、任务数量或 `task.md` 的“可交付”标记只作为施工上下文');
    expect(review).toContain('Spec 逐条追踪矩阵');
    expect(review).toContain('代码路径、符号、配置和测试用例');
    expect(review).toContain('测试、类型检查和构建');
    expect(review).toContain('先增加一个能证明当前行为缺失的测试/静态检查');
    expect(review).toContain('重新生成 Spec 逐条追踪矩阵');
    expect(review).toContain('不得自行扩展 Spec');
    expect(review).not.toContain('由其拆解并达到 `可交付` 的 `task.md`');
    expect(review).not.toContain('不修复功能或架构问题');
    expect(review).toContain('质量复检');
    expect(review).toContain('git diff --check');
    expect(review).toContain('静态检查');
    expect(review).toContain('实物验证');
    expect(review).toContain('代码质量整改由 `tools-quality` 执行');
    expect(review).toContain('最终门禁结论');

    // 固定报告字段：范围与证据、严重级别、定位、影响、修复建议、验证与阻塞项
    for (const field of [
      '审查范围与证据', '严重级别', '定位', '影响', '修复建议', '已执行/待补验证', '阻塞项'
    ]) {
      expect(review + contract).toContain(field);
    }

    // Review 契约要求标明代码版本/diff、审查基线、profile 来源与未验证假设
    expect(contract).toContain('git diff');
    expect(contract).toContain('审查基线');
    expect(contract).toContain('profile');
    expect(contract).toContain('未验证假设');
    expect(contract).toContain('代码质量门禁证据');
    expect(contract).toContain('注释与格式摘要');
    expect(contract).toContain('必须重新读取 `spec.md`');
    expect(contract).toContain('每条范围、业务规则和验收标准的 ID');
    expect(contract).toContain('任务勾选状态不构成完成证据');
    expect(contract).toContain('必须先增加失败测试/检查');
    expect(contract).toContain('测试、类型检查、构建和 Spec 追踪');
    expect(contract).toContain('必须执行受限整改和复检');
    expect(contract).toContain('函数签名、控制流、常量/宏取值');
    expect(contract).toContain('风格与静态规则优先级由 `tools-quality` 统一执行');
    expect(contract).not.toContain('不修复功能、安全或架构问题');
  });

  test('tools-quality owns the code-quality gate and verification is separate', () => {
    const quality = getSkillContent('tools-quality');
    const verification = getSkillContent('tools-verification');
    expect(quality).toContain('name: tools-quality');
    expect(quality).toContain('公开 API Doxygen');
    expect(quality).toContain('clang-format --dry-run --Werror');
    expect(quality).toContain('Cppcheck');
    expect(quality).toContain('MISRA');
    expect(quality).toContain('UNMAPPED');
    expect(quality).toContain('受限整改');
    expect(quality).toContain('mode');
    expect(quality).toContain('advisory');
    expect(quality).toContain('final-gate');
    expect(quality).toContain('不得宣称整个需求或最终交付已经通过');
    expect(quality).toContain('tools-verification');
    expect(verification).toContain('name: tools-verification');
    expect(verification).toContain('Map');
    expect(verification).toContain('Unity');
    expect(verification).toContain('tools-quality');
  });

  test('only delegates to active agents and never claims board-level verification from static checks', () => {
    const review = getSkillContent('workflow-final-review');
    const agents = fs.readdirSync(path.join(ROOT, 'agents'));

    for (const agent of [
      'embedded-lead.md',
      'system-architect.md',
      'firmware-engineer.md',
      'verification-engineer.md',
      'toolchain-engineer.md',
      'hardware-integration.md'
    ]) {
      expect(agents).toContain(agent);
      expect(review).toContain(path.basename(agent, '.md'));
    }
    expect(review).not.toContain('code-reviewer agent');
    expect(review).not.toContain('security-reviewer agent');
    expect(review).not.toContain('build-error-resolver agent');
  });
});
