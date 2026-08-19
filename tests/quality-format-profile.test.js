const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const FORMAT_DIR = path.join(
  ROOT,
  'skills',
  'tools',
  'tools-quality',
  'references',
  'capabilities',
  'quality-format-check'
);

describe('quality format profiles', () => {
  test('applies the extracted kernel layout as the universal plugin profile', () => {
    const profile = fs.readFileSync(path.join(FORMAT_DIR, '.clang-format'), 'utf8');
    const style = fs.readFileSync(
      path.join(ROOT, 'skills', 'tools', 'tools-quality', 'references', 'style-profile.md'),
      'utf8'
    );
    const guide = fs.readFileSync(path.join(FORMAT_DIR, 'GUIDE.md'), 'utf8');

    expect(profile).toContain('UseTab: Always');
    expect(profile).toContain('BreakBeforeBraces: Allman');
    expect(profile).toContain('IndentPPDirectives: BeforeHash');
    expect(profile).toContain('ColumnLimit: 80');
    expect(profile).toContain('AlignConsecutiveDeclarations:');
    expect(style).toContain('统一嵌入式源码排版 profile');
    expect(style).toContain('适用于插件所有生成代码');
    expect(guide).toContain('插件所有生成的 `.c/.h` 文件');
    expect(guide).not.toContain('.clang-format-freertos');
  });
});
