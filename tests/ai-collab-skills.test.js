const fs = require('fs');
const path = require('path');
const { resolveSkillId } = require('../skills/catalog');
const { getSkillContent } = require('../skills/loader');

const ROOT = path.resolve(__dirname, '..');

describe('AI collaboration skills', () => {
  test('routes every legacy AI collaboration entry to a focused canonical skill', () => {
    expect(resolveSkillId('embedded-ai-collab')).toBe('workflow-ai-collab');
    expect(resolveSkillId('embedded-ai-prompt-templates')).toBe('workflow-ai-collab');
    expect(resolveSkillId('embedded-ai-coding-standard')).toBe('tools-ai-code-quality');
    expect(resolveSkillId('embedded-ai-code-review')).toBe('tools-ai-code-quality');
  });

  test('uses project evidence for generation, style and review', () => {
    const collaboration = getSkillContent('workflow-ai-collab');
    const quality = getSkillContent('tools-ai-code-quality');
    const styleProfile = fs.readFileSync(
      path.join(ROOT, 'skills', 'tools', 'tools-ai-code-quality', 'references', 'style-profile.md'),
      'utf8'
    );

    expect(collaboration).toContain('需求与证据');
    expect(collaboration).toContain('逐函数生成');
    expect(collaboration).toContain('独立审查');
    expect(collaboration).toContain('tool_root');
    expect(collaboration).toContain('firmware_root');
    expect(collaboration).toContain('绝对 `cwd`');
    expect(styleProfile).toContain('用户明确要求');
    expect(styleProfile).toContain('.editorconfig');
    expect(styleProfile).toContain('.clang-format');
    expect(styleProfile).toContain('100 列软限制');
    expect(styleProfile).toContain('最小必要注释');
    expect(quality).toContain('不强制 `ec_*`');
    expect(quality).toContain('不使用居中横线分隔注释');
  });

  test('only delegates to active agents', () => {
    const collaboration = getSkillContent('workflow-ai-collab');
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
      expect(collaboration).toContain(path.basename(agent, '.md'));
    }
    expect(collaboration).not.toContain('code-reviewer agent');
    expect(collaboration).not.toContain('security-reviewer agent');
    expect(collaboration).not.toContain('build-error-resolver agent');
  });
});
