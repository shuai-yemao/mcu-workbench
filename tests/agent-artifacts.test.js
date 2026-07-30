const fs = require('fs');
const os = require('os');
const path = require('path');
const { initProject, writeRunRecord } = require('../scripts/agent-artifacts');

describe('agent artifact protocol', () => {
  let root;
  beforeEach(() => { root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcu-workbench-agent-')); });
  afterEach(() => { fs.rmSync(root, { recursive: true, force: true }); });

  test('initializes stable project roots without overwriting metadata', () => {
    const result = initProject({ projectRoot: root, projectId: 'gr5526-lvgl', mcu: 'GR5526', toolchain: 'Keil' });
    expect(fs.existsSync(result.path)).toBe(true);
    for (const relative of ['docs/architecture', 'docs/verification', 'docs/devlog', 'docs/notes', '.mcu-workbench/runs']) {
      expect(fs.existsSync(path.join(root, relative))).toBe(true);
    }
    expect(() => initProject({ projectRoot: root })).toThrow(/already exists/);
  });

  test('writes a complete unique run record and rejects overwrite', () => {
    initProject({ projectRoot: root });
    const result = writeRunRecord({
      projectRoot: root,
      runId: '20260723T120000Z-system-architect-audit',
      agent: 'system-architect',
      task: 'audit layers',
      status: 'completed',
      inputs: ['project tree'],
      evidence: ['src/main.c'],
      changedFiles: ['docs/architecture/layers.md'],
      tests: ['npm test'],
      artifacts: ['docs/architecture/layers.md'],
      blockers: [],
      handoff: ['firmware-engineer'],
      workingDirectories: ['C:/tools/mcu-workbench', 'D:/firmware'],
      commands: ['npm run validate:architecture', 'cmake --build --preset Debug'],
      attempts: ['attempt-1: format command used wrong cwd; corrected']
    });
    const record = JSON.parse(fs.readFileSync(result.path, 'utf8'));
    for (const field of ['run_id', 'agent', 'task', 'status', 'inputs', 'evidence', 'changed_files', 'tests', 'artifacts', 'blockers', 'handoff', 'working_directories', 'commands', 'attempts']) expect(record[field]).toBeDefined();
    expect(record.working_directories).toEqual(['C:/tools/mcu-workbench', 'D:/firmware']);
    expect(record.attempts).toHaveLength(1);
    const metadata = JSON.parse(fs.readFileSync(path.join(root, '.mcu-workbench', 'project.json'), 'utf8'));
    expect(metadata.active_agents).toContain('system-architect');
    expect(() => writeRunRecord({ projectRoot: root, runId: '20260723T120000Z-system-architect-audit', agent: 'system-architect', task: 'audit layers', status: 'completed' })).toThrow(/already exists/);
  });
});
