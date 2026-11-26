const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  QUALITY_CLANG_FORMAT_RELATIVE_PATH,
  runClaudeLayer,
  RULES_RELATIVE_DIRECTORY
} = require('../lib/claude-layer');

describe('quality style onboarding', () => {
  test('writes and re-applies the plugin clang-format at project root on init', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'quality-style-'));
    try {
      fs.mkdirSync(path.join(root, '01_App'), { recursive: true });
      fs.writeFileSync(path.join(root, '01_App', 'main.c'), 'int main(void) { return 0; }\n', 'utf8');
      const pluginStyle = fs.readFileSync(path.join(__dirname, '..', 'skills', 'tools', 'tools-quality', 'references', 'capabilities', 'quality-format-check', '.clang-format'), 'utf8');

      const result = runClaudeLayer({ action: 'init', root, write: true });
      expect(result.exitCode).toBe(0);
      expect(fs.readFileSync(path.join(root, QUALITY_CLANG_FORMAT_RELATIVE_PATH), 'utf8')).toBe(pluginStyle);
      expect(result.state.artifactHashes[QUALITY_CLANG_FORMAT_RELATIVE_PATH]).toBeDefined();
      expect(fs.existsSync(path.join(root, RULES_RELATIVE_DIRECTORY))).toBe(true);

      fs.writeFileSync(path.join(root, QUALITY_CLANG_FORMAT_RELATIVE_PATH), 'BasedOnStyle: LLVM\n', 'utf8');
      runClaudeLayer({ action: 'init', root, write: true });
      expect(fs.readFileSync(path.join(root, QUALITY_CLANG_FORMAT_RELATIVE_PATH), 'utf8')).toBe(pluginStyle);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
