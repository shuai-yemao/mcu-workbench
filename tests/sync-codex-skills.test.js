const fs = require('fs');
const os = require('os');
const path = require('path');
const { CANONICAL_SKILLS } = require('../skills/catalog');
const NATIVE_SKILL_IDS = require('../codex/native-skills.json').skills;
const { parseArgs, renameWithRetry, syncCodexSkills } = require('../scripts/sync-codex-skills');
const { validateSkillLinks } = require('../lib/skill-links');

const SYNC_SKILL_COUNT = CANONICAL_SKILLS.length + NATIVE_SKILL_IDS.length;

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

    expect(summary.total).toBe(SYNC_SKILL_COUNT);
    expect(summary.renamed).toBe(3);
    expect(summary.added).toBe(SYNC_SKILL_COUNT - 3);
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
    for (const id of NATIVE_SKILL_IDS) {
      expect(fs.existsSync(path.join(target, id, 'SKILL.md'))).toBe(true);
    }
    expect(fs.existsSync(path.join(target, '_shared', 'bsp', 'bsp-architecture-contract.md'))).toBe(true);

    const port = fs.readFileSync(path.join(target, 'impl_board', 'SKILL.md'), 'utf8');
    expect(port).toContain('../_shared/bsp/bsp-architecture-contract.md');
    expect(port).toContain('../impl_bsp/SKILL.md');

    const links = validateSkillLinks({ root: target, boundaryRoot: target });
    expect(links.findings).toHaveLength(23);
    expect(links.findings.filter((finding) => (
      finding.file.startsWith('academic-paper/') || finding.file.startsWith('academic-pipeline/')
    ))).toHaveLength(22);
    expect(links.findings.filter((finding) => finding.target.includes('deep-research/agents/bibliography_agent.md')))
      .toHaveLength(1);
    expect(links.findings.filter((finding) => !finding.target.includes('deep-research/agents/bibliography_agent.md')))
      .toHaveLength(22);
  });

  test('dry run reports the migration without creating a target directory', () => {
    const target = path.join(temporaryRoot, 'skills');
    const summary = syncCodexSkills({ target, dryRun: true });
    expect(summary.total).toBe(SYNC_SKILL_COUNT);
    expect(summary.added).toBe(SYNC_SKILL_COUNT);
    expect(fs.existsSync(target)).toBe(false);
  });

  test('targeted native Skill sync preserves unrelated installed skills and shared files', () => {
    const target = path.join(temporaryRoot, 'skills');
    const backupRoot = path.join(temporaryRoot, 'backups');
    const untouchedSkill = path.join(target, 'workflow-requirements-router', 'SKILL.md');
    const untouchedSharedFile = path.join(target, '_shared', 'sentinel', 'keep.md');
    fs.mkdirSync(path.dirname(untouchedSkill), { recursive: true });
    fs.writeFileSync(untouchedSkill, 'user-owned skill');
    fs.mkdirSync(path.dirname(untouchedSharedFile), { recursive: true });
    fs.writeFileSync(untouchedSharedFile, 'user-owned shared file');

    const summary = syncCodexSkills({ target, backupRoot, include: NATIVE_SKILL_IDS });

    expect(summary.total).toBe(NATIVE_SKILL_IDS.length);
    expect(summary.sharedReferences).toBe(0);
    expect(summary.backup).toBeNull();
    expect(fs.readFileSync(untouchedSkill, 'utf8')).toBe('user-owned skill');
    expect(fs.readFileSync(untouchedSharedFile, 'utf8')).toBe('user-owned shared file');
    for (const id of NATIVE_SKILL_IDS) {
      expect(fs.existsSync(path.join(target, id, 'SKILL.md'))).toBe(true);
    }
  });

  test('targeted native Skill sync backs up only the selected existing directory', () => {
    const target = path.join(temporaryRoot, 'skills');
    const backupRoot = path.join(temporaryRoot, 'backups');
    const existingFile = path.join(target, NATIVE_SKILL_IDS[0], 'SKILL.md');
    const untouchedSkill = path.join(target, 'workflow-requirements-router', 'SKILL.md');
    fs.mkdirSync(path.dirname(existingFile), { recursive: true });
    fs.writeFileSync(existingFile, 'old native skill');
    fs.mkdirSync(path.dirname(untouchedSkill), { recursive: true });
    fs.writeFileSync(untouchedSkill, 'user-owned skill');

    const summary = syncCodexSkills({ target, backupRoot, include: NATIVE_SKILL_IDS });

    expect(summary.replaced).toBe(1);
    expect(fs.readFileSync(path.join(summary.backup, NATIVE_SKILL_IDS[0], 'SKILL.md'), 'utf8'))
      .toBe('old native skill');
    expect(fs.readFileSync(untouchedSkill, 'utf8')).toBe('user-owned skill');
  });

  test('parses an explicit Codex Skill include list', () => {
    const options = parseArgs(['--include', 'academic-paper,academic-pipeline']);
    expect(options.include).toEqual(['academic-paper', 'academic-pipeline']);
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
