const fs = require('fs');
const path = require('path');
const { getSkillContent } = require('../skills/loader');

const ROOT = path.resolve(__dirname, '..');

describe('AI collaboration skills', () => {
  test('triggers on final code, patch or git diff and depends on tools-quality', () => {
    const review = getSkillContent('workflow-final-review');
    expect(review).toContain('最终代码');
    expect(review).toContain('git diff');
    expect(review).toContain('tools-quality');
    expect(review).toContain('接口');
    expect(review).toContain('构建');
    expect(review).toContain('review-gates.md');
    expect(review).toContain('style-profile.md');
    expect(review).toContain('格式与注释门禁');
    expect(review).toContain('80 列');
    expect(review).toContain('目标工程 `.clang-format` 只作为补充证据');
  });

  test('keeps a read-only review boundary with fixed report fields', () => {
    const review = getSkillContent('workflow-final-review');
    const contract = fs.readFileSync(
      path.join(ROOT, 'skills', 'workflow', 'workflow-final-review', 'references', 'prompt-contract.md'),
      'utf8'
    );

    // 只读 Review 边界：不生成实现、不自动修复、不把静态/主机检查写成板级验证
    expect(review).toContain('不生成实现');
    expect(review).toContain('不自动修复');
    expect(review).toContain('不产生替换代码或修复补丁');
    expect(review).toContain('静态检查');
    expect(review).toContain('实物验证');
    expect(review).toContain('格式或注释任一失败');
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
    expect(contract).toContain('格式检查证据');
    expect(contract).toContain('注释完整性证据');
    expect(contract).toContain('禁止自动运行写回式格式化');
    expect(contract).toContain('插件 `tools-quality/style-profile` 优先');
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
