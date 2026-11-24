const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { syncSkillProjections } = require('../plugins/mcu-workbench-workflow/scripts/sync-skills');
const { mapMarkdownLinks } = require('../plugins/mcu-workbench-workflow/scripts/markdown-links');

const hash = value => crypto.createHash('sha256').update(value).digest('hex');

describe('Workflow protected Skill projections', () => {
  let temp;
  beforeEach(() => { temp = fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-projection-')); });
  afterEach(() => { fs.rmSync(temp, { recursive: true, force: true }); });

  test('rewrites the link target without changing identical display text', () => {
    expect(mapMarkdownLinks('[guide.md](guide.md)', () => 'external:guide.md'))
      .toBe('[guide.md](external:guide.md)');
  });

  function fixture() {
    const projectRoot = temp;
    const pluginRoot = path.join(temp, 'plugins/mcu-workbench-workflow');
    const source = path.join(pluginRoot, 'skills/sample-skill');
    const target = path.join(projectRoot, 'skills/sample-skill');
    fs.mkdirSync(source, { recursive: true });
    fs.mkdirSync(target, { recursive: true });
    fs.writeFileSync(path.join(source, 'SKILL.md'), '# plugin source\n');
    fs.writeFileSync(path.join(target, 'SKILL.md'), '# original root\n');
    return { projectRoot, pluginRoot, source, target, map: { schemaVersion: '1.0.0', plugin: 'mcu-workbench-workflow', skills: [{ id: 'sample-skill', pluginPath: 'plugins/mcu-workbench-workflow/skills/sample-skill', projectionPath: 'skills/sample-skill' }] } };
  }

  test('adopts an unchanged baseline, writes marker and stays idempotent', () => {
    const f = fixture();
    const baselineHashes = { 'skills/sample-skill/SKILL.md': hash('# original root\n') };
    expect(syncSkillProjections({ ...f, baselineHashes }).status).toBe('created');
    expect(fs.readFileSync(path.join(f.target, 'SKILL.md'), 'utf8')).toBe('# plugin source\n');
    expect(syncSkillProjections({ ...f, baselineHashes }).status).toBe('unchanged');
  });

  test('refuses unmarked conflicting content and refuses managed drift', () => {
    const f = fixture();
    expect(() => syncSkillProjections({ ...f, baselineHashes: {} })).toThrow(/adoption|unmarked/i);
    const baselineHashes = { 'skills/sample-skill/SKILL.md': hash('# original root\n') };
    syncSkillProjections({ ...f, baselineHashes });
    fs.writeFileSync(path.join(f.target, 'SKILL.md'), 'user edit\n');
    expect(() => syncSkillProjections({ ...f, baselineHashes })).toThrow(/drift/i);
  });

  test('restores all earlier files after a mid-commit write failure', () => {
    const f = fixture();
    fs.writeFileSync(path.join(f.source, 'guide.md'), '# plugin guide\n');
    fs.writeFileSync(path.join(f.target, 'guide.md'), '# original guide\n');
    const baselineHashes = {
      'skills/sample-skill/SKILL.md': hash('# original root\n'),
      'skills/sample-skill/guide.md': hash('# original guide\n')
    };
    const rename = fs.renameSync;
    let injected = false;
    jest.spyOn(fs, 'renameSync').mockImplementation((from, to) => {
      if (!injected && String(to).endsWith(path.join('sample-skill', 'guide.md'))) {
        injected = true;
        throw new Error('injected write interruption');
      }
      return rename(from, to);
    });
    try {
      expect(() => syncSkillProjections({ ...f, baselineHashes })).toThrow(/injected write interruption/);
    } finally {
      fs.renameSync.mockRestore();
    }
    expect(fs.readFileSync(path.join(f.target, 'SKILL.md'), 'utf8')).toBe('# original root\n');
    expect(fs.readFileSync(path.join(f.target, 'guide.md'), 'utf8')).toBe('# original guide\n');
    expect(fs.existsSync(path.join(f.projectRoot, 'skills/.workflow-projections.json'))).toBe(false);
  });

  test('rejects a marker that escapes the Skills root', () => {
    const f = fixture();
    const marker = path.join(f.projectRoot, 'skills/.workflow-projections.json');
    fs.writeFileSync(marker, JSON.stringify({
      schemaVersion: '1.0.0', plugin: 'mcu-workbench-workflow',
      files: [{ path: '../outside.txt', sha256: hash('x') }]
    }));
    expect(() => syncSkillProjections(f)).toThrow(/path escape/i);
  });
});
