const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  checkCodexPluginRefresh,
  collectFiles,
  fingerprint,
  parseArgs
} = require('../scripts/check-codex-plugin-refresh');

function writeFile(root, relativePath, content) {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, 'utf8');
}

function createFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcu-workbench-refresh-'));
  writeFile(root, 'package.json', JSON.stringify({ version: '9.9.9' }));
  writeFile(root, '.codex-plugin/plugin.json', JSON.stringify({ version: '9.9.9' }));
  writeFile(root, 'AGENTS.md', 'agents');
  writeFile(root, 'AGENTS.override.md', 'override');
  writeFile(root, 'codex/AGENTS.md', 'codex');
  writeFile(root, 'agents/embedded-lead.md', 'lead');
  writeFile(root, 'skills/workflow/SKILL.md', 'skill');
  return root;
}

afterEach(() => {
  for (const directory of fs.readdirSync(os.tmpdir())
    .filter((entry) => entry.startsWith('mcu-workbench-refresh-')
      || entry.startsWith('mcu-workbench-cache-'))) {
    fs.rmSync(path.join(os.tmpdir(), directory), { recursive: true, force: true });
  }
});

describe('check-codex-plugin-refresh', () => {
  test('reports refresh_required when the version cache is missing', () => {
    const source = createFixture();
    const cacheRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mcu-workbench-cache-'));

    const report = checkCodexPluginRefresh({ source, cacheRoot });

    expect(report.status).toBe('refresh_required');
    expect(report.action).toBe('marketplace_refresh');
    expect(report.cache.exists).toBe(false);
  });

  test('reports up_to_date when source and cache content match', () => {
    const source = createFixture();
    const cacheRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mcu-workbench-cache-'));
    fs.cpSync(source, path.join(cacheRoot, '9.9.9'), { recursive: true });

    const report = checkCodexPluginRefresh({ source, cacheRoot });

    expect(report.status).toBe('up_to_date');
    expect(report.action).toBe('none');
    expect(report.source.fingerprint).toBe(report.cache.fingerprint);
  });

  test('detects a changed skill and emits strict status', () => {
    const source = createFixture();
    const cacheRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mcu-workbench-cache-'));
    fs.cpSync(source, path.join(cacheRoot, '9.9.9'), { recursive: true });
    writeFile(source, 'skills/workflow/SKILL.md', 'changed');

    const report = checkCodexPluginRefresh({ source, cacheRoot });

    expect(report.status).toBe('refresh_required');
    expect(report.reasons).toEqual(expect.arrayContaining([
      'Marketplace source and Codex cache content fingerprints differ.'
    ]));
  });

  test('supports machine-readable output options without changing files', () => {
    expect(parseArgs(['--json', '--strict', '--source', 'C:/source', '--cache-root', 'C:/cache'])).toMatchObject({
      json: true,
      strict: true,
      source: path.resolve('C:/source'),
      cacheRoot: path.resolve('C:/cache')
    });
    expect(collectFiles(createFixture()).length).toBeGreaterThan(0);
    expect(fingerprint(createFixture()).hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
