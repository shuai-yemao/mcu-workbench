const fs = require('fs');
const os = require('os');
const path = require('path');
const { runReadmeContext } = require('../lib/document-context-readme');

describe('document-context README boundary', () => {
  test('keeps README management outside the Claude layering entry point', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'document-context-readme-'));
    try {
      fs.mkdirSync(path.join(root, '03_Platform', 'platform_demo', 'inc'), { recursive: true });
      fs.writeFileSync(path.join(root, 'CMakeLists.txt'), 'project(document_context_readme_fixture)\n', 'utf8');
      fs.writeFileSync(path.join(root, '03_Platform', 'platform_demo', 'inc', 'platform_demo.h'), [
        '/** @brief Platform demo capability contract. */',
        '#pragma once',
        'int platform_demo_read(void);',
        ''
      ].join('\n'), 'utf8');

      const result = runReadmeContext({ action: 'init', root, write: true });

      expect(result.exitCode).toBe(0);
      expect(fs.existsSync(path.join(root, 'README.md'))).toBe(true);
      expect(fs.existsSync(path.join(root, '03_Platform', 'README.md'))).toBe(true);
      expect(fs.existsSync(path.join(root, 'Claude.md'))).toBe(false);
      expect(fs.readFileSync(path.join(root, '03_Platform', 'README.md'), 'utf8'))
        .toContain('由 `workflow-document-context` 生成');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('blocks with a structured error when the README state is corrupted', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'document-context-readme-invalid-'));
    try {
      const stateDirectory = path.join(root, '.mcu-workbench', 'document-context');
      fs.mkdirSync(stateDirectory, { recursive: true });
      fs.writeFileSync(path.join(stateDirectory, 'readme.state.json'), '{invalid\n', 'utf8');

      const result = runReadmeContext({ action: 'validate', root });

      expect(result.exitCode).toBe(1);
      expect(result.errors).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: 'STATE_INVALID' })
      ]));
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
