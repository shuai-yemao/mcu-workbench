const fs = require('fs').promises;
const os = require('os');
const path = require('path');
const { createProject, LAYER_DIRECTORIES, LAYER_README } = require('../commands/mcu-new');

describe('MCU New Command', () => {
  test('createProject validates required options', async () => {
    await expect(createProject({})).rejects.toThrow('Name is required');
  });

  test('exposes the numbered five-layer directory contract', () => {
    expect(LAYER_DIRECTORIES).toEqual([
      '00_Config',
      '01_App',
      '02_Service',
      '03_Platform',
      '04_Impl',
      '05_Vendor',
      '06_Toolchain',
      '99_Utils'
    ]);
    for (const dir of LAYER_DIRECTORIES) {
      expect(LAYER_README[dir]).toBeTruthy();
    }
  });

  test('creates the numbered layer tree with main.c in 01_App and layered CMake globs', async () => {
    const cwd = process.cwd();
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mcu-new-'));
    try {
      process.chdir(root);
      const result = await createProject({ name: 'demo-fw', platform: 'stm32f4' });
      expect(result.success).toBe(true);

      const tree = await fs.readdir(result.path);
      for (const dir of LAYER_DIRECTORIES) {
        expect(tree).toContain(dir);
        const readme = await fs.readFile(path.join(result.path, dir, 'README.md'), 'utf8');
        expect(readme).toContain(`# ${dir}`);
      }

      const mainSource = await fs.readFile(path.join(result.path, '01_App', 'main.c'), 'utf8');
      expect(mainSource).toContain('int main(void)');
      const vendorMapping = await fs.readFile(path.join(result.path, '05_Vendor', 'vendor_mapping.md'), 'utf8');
      expect(vendorMapping).toContain('Vendor 映射');

      const cmake = await fs.readFile(path.join(result.path, 'CMakeLists.txt'), 'utf8');
      expect(cmake).toContain(
        'file(GLOB_RECURSE SOURCES "01_App/*.c" "02_Service/*.c" "03_Platform/**/*.c" "04_Impl/**/*.c" "99_Utils/*.c")'
      );
      expect(cmake).toContain([
        'include_directories(',
        '    00_Config',
        '    01_App',
        '    02_Service',
        '    03_Platform',
        '    04_Impl',
        '    05_Vendor',
        ')'
      ].join('\n'));
    } finally {
      process.chdir(cwd);
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
