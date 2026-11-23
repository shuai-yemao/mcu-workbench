const fs = require('fs');
const os = require('os');
const path = require('path');
const { CANONICAL_SKILLS } = require('../skills/catalog');
const { renameWithRetry, syncCodexSkills } = require('../scripts/sync-codex-skills');

describe('Codex skill synchronization', () => {
  let temporaryRoot;

  beforeEach(() => {
    temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mcu-workbench-sync-'));
  });

  afterEach(() => {
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  });

  test('migrates legacy directories, installs the complete catalog and creates a backup', () => {
    const target = path.join(temporaryRoot, 'skills');
    const backupRoot = path.join(temporaryRoot, 'backups');
    fs.mkdirSync(path.join(target, 'embedded'), { recursive: true });
    fs.writeFileSync(path.join(target, 'embedded', 'SKILL.md'), 'legacy router');
    fs.mkdirSync(path.join(target, 'debug-gdb-openocd'), { recursive: true });
    fs.writeFileSync(path.join(target, 'debug-gdb-openocd', 'SKILL.md'), 'legacy debug');

    const summary = syncCodexSkills({ target, backupRoot });

    expect(summary.total).toBe(23);
    expect(summary.renamed).toBe(2);
    expect(summary.added).toBe(21);
    expect(summary.replaced).toBe(2);
    expect(fs.existsSync(path.join(target, 'embedded'))).toBe(false);
    expect(fs.existsSync(path.join(target, 'debug-gdb-openocd'))).toBe(false);
    expect(fs.existsSync(path.join(target, 'workflow-router', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(target, 'tools-debug', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(summary.backup, 'embedded', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(summary.backup, 'debug-gdb-openocd', 'SKILL.md'))).toBe(true);
    for (const skill of CANONICAL_SKILLS) {
      const installed = fs.readFileSync(path.join(target, skill.id, 'SKILL.md'), 'utf8');
      const source = fs.readFileSync(path.join(__dirname, '..', skill.path, 'SKILL.md'), 'utf8');
      expect(installed).toBe(source);
    }
  });

  test('dry run reports the migration without creating a target directory', () => {
    const target = path.join(temporaryRoot, 'skills');
    const summary = syncCodexSkills({ target, dryRun: true });
    expect(summary.total).toBe(23);
    expect(summary.added).toBe(23);
    expect(fs.existsSync(target)).toBe(false);
  });

  test('reports a conflict when a canonical directory and a legacy alias coexist', () => {
    const target = path.join(temporaryRoot, 'skills');
    fs.mkdirSync(path.join(target, 'tools-debug'), { recursive: true });
    fs.mkdirSync(path.join(target, 'debug-gdb-openocd'), { recursive: true });

    expect(() => syncCodexSkills({ target, dryRun: true })).toThrow(/both exist/);
  });

  test('reports a conflict when multiple legacy aliases coexist', () => {
    const target = path.join(temporaryRoot, 'skills');
    fs.mkdirSync(path.join(target, 'debug-gdb-openocd'), { recursive: true });
    fs.mkdirSync(path.join(target, 'cmbacktrace-debug'), { recursive: true });

    expect(() => syncCodexSkills({ target, dryRun: true })).toThrow(/Multiple legacy directories/);
  });

  test('retries transient Windows directory rename locks', () => {
    const source = path.join(temporaryRoot, 'staging');
    const destination = path.join(temporaryRoot, 'destination');
    fs.mkdirSync(source);
    const originalRename = fs.renameSync;
    let attempts = 0;
    jest.spyOn(fs, 'renameSync').mockImplementation((from, to) => {
      attempts += 1;
      if (attempts < 3) {
        const error = new Error('temporary lock');
        error.code = 'EPERM';
        throw error;
      }
      return originalRename(from, to);
    });

    try {
      renameWithRetry(source, destination, { retries: 3, delayMs: 0 });
      expect(attempts).toBe(3);
      expect(fs.existsSync(destination)).toBe(true);
    } finally {
      fs.renameSync.mockRestore();
    }
  });
});
