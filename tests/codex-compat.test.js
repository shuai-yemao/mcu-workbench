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
