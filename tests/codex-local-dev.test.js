const { readCodexPluginVersion } = require('../scripts/register-codex-marketplace');
const {
  parseArgs,
  sanitizeCachebuster,
  withCachebuster
} = require('../scripts/codex-local-dev');

describe('codex local development mode', () => {
  test('reads the current Codex plugin manifest version', () => {
    expect(readCodexPluginVersion()).toBe('1.0.0');
  });

  test('replaces an existing cachebuster without changing the base version', () => {
    expect(withCachebuster('1.0.0+codex.old-token', 'local-20260818-120000'))
      .toBe('1.0.0+codex.local-20260818-120000');
  });

  test('normalizes cachebuster tokens and rejects empty values', () => {
    expect(sanitizeCachebuster(' local / build 01 ')).toBe('local-build-01');
    expect(() => sanitizeCachebuster('---')).toThrow();
  });

  test('parses install and watch options', () => {
    expect(parseArgs([
      'watch',
      '--codex-bin',
      'C:/tools/codex.cmd',
      '--debounce-ms',
      '800'
    ])).toMatchObject({
      action: 'watch',
      codexBin: 'C:/tools/codex.cmd',
      debounceMs: 800
    });
  });
});
