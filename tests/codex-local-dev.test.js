const { readCodexPluginVersion } = require('../scripts/register-codex-marketplace');
const {
  parseArgs,
  resolveCodexBin,
  sanitizeCachebuster,
  withCachebuster
} = require('../scripts/codex-local-dev');

describe('codex local development mode', () => {
  test('reads the current Codex plugin manifest version', () => {
    expect(readCodexPluginVersion()).toMatch(/^1\.0\.0(?:\+codex\.[a-z0-9-]+)?$/);
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

  test('maps refresh to the install action', () => {
    expect(parseArgs(['refresh']).action).toBe('install');
  });

  test('skips broken Codex candidates and selects the first runnable CLI', () => {
    expect(resolveCodexBin(null, {
      candidates: ['broken-codex', 'working-codex'],
      probe: (candidate) => candidate === 'working-codex'
    })).toBe('working-codex');
  });

  test('reports all failed Codex candidates', () => {
    expect(() => resolveCodexBin(null, {
      candidates: ['broken-a', 'broken-b'],
      probe: () => false
    })).toThrow('broken-a, broken-b');
  });
});
