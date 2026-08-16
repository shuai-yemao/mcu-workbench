const fs = require('fs');
const os = require('os');
const path = require('path');

const { createCodeQualityHooks, parsePatchPaths } = require('../lib/opencode-quality-hook');

describe('OpenCode existing-code quality hook', () => {
  test('extracts code files from apply_patch markers', () => {
    expect(parsePatchPaths([
      '*** Begin Patch',
      '*** Update File: 03_Platform/demo.c',
      '*** Add File: 04_Impl/new.h',
      '*** End Patch'
    ].join('\n'))).toEqual(['03_Platform/demo.c', '04_Impl/new.h']);
  });

  test('normalizes after edit and preserves a rollback snapshot on failure', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'opencode-quality-'));
    try {
      const file = path.join(root, 'demo.c');
      const original = 'int demo(void) { return 0; }\n';
      fs.writeFileSync(file, original, 'utf8');
      const hooks = createCodeQualityHooks({
        root,
        formatFile: (content) => `${content.replace('return 0', 'return 1')}// normalized\n`
      });

      await hooks['tool.execute.before']({ tool: 'edit' }, { args: { filePath: 'demo.c' } });
      fs.writeFileSync(file, 'int demo(void) { return 2; }\n', 'utf8');
      await hooks.event({ event: { type: 'file.edited', properties: { file: 'demo.c' } } });
      expect(fs.readFileSync(file, 'utf8')).toContain('return 2');
      expect(fs.readFileSync(file, 'utf8')).toContain('// normalized');

      await hooks['tool.execute.before']({ tool: 'edit' }, { args: { filePath: 'demo.c' } });
      fs.writeFileSync(file, 'int demo(void) { return 3; }\n', 'utf8');
      const failingHooks = createCodeQualityHooks({
        root,
        formatFile: () => { throw new Error('clang-format unavailable'); }
      });
      await failingHooks['tool.execute.before']({ tool: 'edit' }, { args: { filePath: 'demo.c' } });
      await expect(failingHooks.event({ event: { type: 'file.edited', properties: { file: 'demo.c' } } }))
        .rejects.toMatchObject({ code: 'QUALITY_PROCESSING_FAILED' });
      expect(fs.readFileSync(file, 'utf8')).toContain('return 3');
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  test('only formats explicitly managed project-owned Vendor roots', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'opencode-quality-vendor-'));
    try {
      fs.mkdirSync(path.join(root, '.mcu-workbench'), { recursive: true });
      fs.writeFileSync(path.join(root, '.mcu-workbench', 'quality-scope.json'), JSON.stringify({
        schemaVersion: 1,
        managedVendorRoots: ['05_Vendor/circle_buffer']
      }), 'utf8');

      const hooks = createCodeQualityHooks({ root });

      expect(hooks._private.resolveProjectFile(
        '05_Vendor/circle_buffer/src/circle_buffer.c'
      )).not.toBeNull();
      expect(hooks._private.resolveProjectFile(
        '05_Vendor/lvgl/src/lvgl.c'
      )).toBeNull();
      expect(hooks._private.resolveProjectFile('03_Platform/demo.c')).not.toBeNull();
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
