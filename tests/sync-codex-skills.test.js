const fs = require('fs');
const os = require('os');
const path = require('path');
const { CANONICAL_SKILLS } = require('../skills/catalog');
const { renameWithRetry, syncCodexSkills } = require('../scripts/sync-codex-skills');
const { validateSkillLinks } = require('../lib/skill-links');

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
    fs.mkdirSync(path.join(target, 'bsp-adapter'), { recursive: true });
    fs.writeFileSync(path.join(target, 'bsp-adapter', 'SKILL.md'), 'legacy adapter');

    const summary = syncCodexSkills({ target, backupRoot });

    expect(summary.total).toBe(41);
    expect(summary.renamed).toBe(3);
    expect(summary.added).toBe(38);
    expect(summary.replaced).toBe(3);
    expect(fs.existsSync(path.join(target, 'embedded'))).toBe(false);
    expect(fs.existsSync(path.join(target, 'debug-gdb-openocd'))).toBe(false);
    expect(fs.existsSync(path.join(target, 'bsp-adapter'))).toBe(false);
    expect(fs.existsSync(path.join(target, 'workflow-requirements-router', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(target, 'tools-debug', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(target, 'platform_bsp', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(target, 'impl_board', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(summary.backup, 'embedded', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(summary.backup, 'debug-gdb-openocd', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(summary.backup, 'bsp-adapter', 'SKILL.md'))).toBe(true);
    for (const skill of CANONICAL_SKILLS) {
      expect(fs.existsSync(path.join(target, skill.id, 'SKILL.md'))).toBe(true);
    }
    expect(fs.existsSync(path.join(target, '_shared', 'bsp', 'bsp-architecture-contract.md'))).toBe(true);

    const port = fs.readFileSync(path.join(target, 'impl_board', 'SKILL.md'), 'utf8');
    expect(port).toContain('../_shared/bsp/bsp-architecture-contract.md');
    expect(port).toContain('../impl_bsp/SKILL.md');

    const links = validateSkillLinks({ root: target, boundaryRoot: target });
    expect(links.findings).toEqual([]);
  });

  test('dry run reports the migration without creating a target directory', () => {
    const target = path.join(temporaryRoot, 'skills');
    const summary = syncCodexSkills({ target, dryRun: true });
    expect(summary.total).toBe(41);
    expect(summary.added).toBe(41);
    expect(fs.existsSync(target)).toBe(false);
  });

  test('migrates the renamed workflow router alias', () => {
    const target = path.join(temporaryRoot, 'skills');
    const backupRoot = path.join(temporaryRoot, 'backups');
    fs.mkdirSync(path.join(target, 'workflow-router'), { recursive: true });
    fs.writeFileSync(path.join(target, 'workflow-router', 'SKILL.md'), 'legacy router');

    const summary = syncCodexSkills({ target, backupRoot });

    expect(summary.renamed).toBe(1);
    expect(fs.existsSync(path.join(target, 'workflow-router'))).toBe(false);
    expect(fs.existsSync(path.join(target, 'workflow-requirements-router', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(summary.backup, 'workflow-router', 'SKILL.md'))).toBe(true);
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
