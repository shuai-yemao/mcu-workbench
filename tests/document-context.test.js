const fs = require('fs');
const os = require('os');
const path = require('path');
const { runDocumentContext } = require('../lib/document-context');

describe('workflow-document-context API', () => {
  test('manages README artifacts without creating Claude layering artifacts', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'document-context-'));
    try {
      fs.mkdirSync(path.join(root, '03_Platform', 'platform_demo', 'inc'), { recursive: true });
      fs.writeFileSync(path.join(root, 'CMakeLists.txt'), 'project(document_context_fixture)\n', 'utf8');
      fs.writeFileSync(path.join(root, '03_Platform', 'platform_demo', 'inc', 'platform_demo.h'), [
        '/** @brief Platform demo capability contract. */',
        '#pragma once',
        'int platform_demo_read(void);',
        ''
      ].join('\n'), 'utf8');

      const preview = runDocumentContext({ action: 'init', root });
      expect(preview.changed).toBe(true);
      expect(preview.writes).toHaveLength(0);

      const result = runDocumentContext({ action: 'init', root, write: true });
      expect(result.exitCode).toBe(0);
      expect(fs.existsSync(path.join(root, 'README.md'))).toBe(true);
      expect(fs.existsSync(path.join(root, '03_Platform', 'README.md'))).toBe(true);
      expect(fs.existsSync(path.join(root, '.mcu-workbench', 'document-context.json'))).toBe(true);
      expect(fs.existsSync(path.join(root, '.mcu-workbench', 'document-context', 'readme.state.json'))).toBe(true);
      expect(fs.existsSync(path.join(root, 'Claude.md'))).toBe(false);
      expect(fs.existsSync(path.join(root, '.mcu-workbench', 'rules'))).toBe(false);
      expect(fs.readFileSync(path.join(root, '03_Platform', 'README.md'), 'utf8'))
        .toContain('由 `workflow-document-context` 生成');

      fs.appendFileSync(path.join(root, '03_Platform', 'README.md'), '\n## 手写补充\n', 'utf8');
      expect(runDocumentContext({ action: 'validate', root }).exitCode).toBe(0);

      const readmePath = path.join(root, '03_Platform', 'README.md');
      const readme = fs.readFileSync(readmePath, 'utf8');
      fs.writeFileSync(readmePath, readme.replace(
        '<!-- mcu-workbench:readme-managed:end -->',
        'drift inside managed block\n<!-- mcu-workbench:readme-managed:end -->'
      ), 'utf8');
      const drift = runDocumentContext({ action: 'validate', root });
      expect(drift.exitCode).toBe(1);
      expect(drift.errors).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: 'MANAGED_ARTIFACT_DRIFT', file: '03_Platform/README.md' })
      ]));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

