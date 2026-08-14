const fs = require('fs');
const path = require('path');
const { HEADER, buildCodexCompat } = require('../scripts/build-codex-compat');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'codex', 'AGENTS.md');
const target = path.join(root, 'AGENTS.override.md');

describe('Codex host boundary', () => {
  test('keeps the generated root bridge synchronized with codex source', () => {
    const sourceContent = fs.readFileSync(source, 'utf8');
    const targetContent = fs.readFileSync(target, 'utf8');
    expect(targetContent).toBe(`${HEADER}${sourceContent.endsWith('\n') ? sourceContent : `${sourceContent}\n`}`);
  });

  test('restricts Codex write guidance to the Codex host layer', () => {
    const content = fs.readFileSync(source, 'utf8');
    expect(content).toContain('Codex 特化写入范围');
    expect(content).toContain('不得修改、重写或复制');
    expect(content).toContain('不在 Codex 特化任务中直接修改 `common/`');
  });

  test('routes current plugin capabilities without weakening evidence boundaries', () => {
    const content = fs.readFileSync(source, 'utf8');
    expect(content).toContain('workflow-requirements-router');
    expect(content).toContain('app-architecture');
    expect(content).toContain('UNRESOLVED_OSAL_API');
    expect(content).toContain('npm run validate:layer -- --root <firmware-root>');
  });

  test('requires a format and comment remediation loop before Codex final approval', () => {
    const content = fs.readFileSync(source, 'utf8');

    for (const requirement of [
      'Codex 最终质量整改闭环',
      '强制初检',
      '必要注释判定',
      '受限整改',
      '同条件复检',
      'git diff --check',
      '格式化和补充/更正注释',
      '函数签名、控制流',
      '常量/宏取值、数据结构',
      '最终结论必须为 `阻塞`',
      '才可给出 `通过`'
    ]) {
      expect(content).toContain(requirement);
    }
  });

  test('can regenerate the bridge in an isolated temporary path', () => {
    const temporaryTarget = path.join(root, 'tests', '.tmp-codex-compat.md');
    try {
      const result = buildCodexCompat({ target: temporaryTarget });
      expect(result.target).toBe(temporaryTarget);
      expect(fs.readFileSync(temporaryTarget, 'utf8')).toBe(fs.readFileSync(target, 'utf8'));
    } finally {
      if (fs.existsSync(temporaryTarget)) fs.unlinkSync(temporaryTarget);
    }
  });
});
