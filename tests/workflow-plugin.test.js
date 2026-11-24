const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const root = path.resolve(__dirname, '..');
const pluginRoot = path.join(root, 'plugins/mcu-workbench-workflow');

describe('Workflow plugin package skeleton', () => {
  test('declares the fixed set of 14 Workflow Skills', () => {
    const map = JSON.parse(fs.readFileSync(path.join(pluginRoot, 'skill-map.json'), 'utf8'));
    expect(map.skills).toHaveLength(14);
    expect(new Set(map.skills.map(skill => skill.id)).size).toBe(14);
    expect(map.skills.map(skill => skill.id)).toEqual(expect.arrayContaining([
      'workflow-requirements-router','workflow-claude-layering','workflow-document-context',
      'workflow-requirements-challenge','workflow-review-gate','workflow-integration-plan',
      'workflow-task-breakdown','workflow-task-execution','workflow-final-review',
      'embed-ai-tool','embedded-change-report','embedded-project-intake','embedded-team-sync','mrd-to-prd'
    ]));
  });

  test('descriptor, package metadata and host manifests share package identity', () => {
    const descriptor = JSON.parse(fs.readFileSync(path.join(pluginRoot, 'descriptor.json'), 'utf8'));
    const plugin = JSON.parse(fs.readFileSync(path.join(pluginRoot, 'plugin.json'), 'utf8'));
    const pkg = JSON.parse(fs.readFileSync(path.join(pluginRoot, 'package.json'), 'utf8'));
    const codex = JSON.parse(fs.readFileSync(path.join(pluginRoot, '.codex-plugin/plugin.json'), 'utf8'));
    const cursor = JSON.parse(fs.readFileSync(path.join(pluginRoot, '.cursor-plugin/plugin.json'), 'utf8'));
    expect(pkg.scripts).toMatchObject({
      'prepare-links': 'node scripts/prepare-skill-links.js',
      validate: 'node scripts/validate.js',
      'sync-skills': 'node scripts/sync-skills.js'
    });
    expect([descriptor.id, plugin.id, pkg.name, codex.name, cursor.name]).toEqual(Array(5).fill('mcu-workbench-workflow'));
    expect([plugin.version, pkg.version]).toEqual([descriptor.version, descriptor.version]);
  });

  test('validator recognizes the complete Skill source set after migration', () => {
    const { validateWorkflowPlugin } = require(path.join(pluginRoot, 'scripts/validate.js'));
    const result = validateWorkflowPlugin();
    expect(result.valid).toBe(true);
    expect(result.missingSkills).toHaveLength(0);
  });
});

  test('all 14 mapped Skill source trees exist and contain their SKILL.md', () => {
    const map = JSON.parse(fs.readFileSync(path.join(pluginRoot, 'skill-map.json'), 'utf8'));
    for (const skill of map.skills) {
      expect(fs.existsSync(path.join(root, skill.sourcePath, 'SKILL.md'))).toBe(true);
    }
  });
  test('validator reports link closure, explicit external dependencies and projection ownership', () => {
    const { validateWorkflowPlugin } = require(path.join(pluginRoot, 'scripts/validate.js'));
    const result = validateWorkflowPlugin();
    expect(result.valid).toBe(true);
    expect(result.linkErrors).toBe(0);
    expect(result.sharedFileCount).toBe(153);
    expect(result.externalDependencyCount).toBe(5);
    expect(result.projectionFileCount).toBe(112);
  });

describe('Workflow validator negative fixtures', () => {
  test('rejects a drifted projection in an isolated package fixture', () => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-validator-'));
    try {
      const projectRoot = temp;
      const fixtureRoot = path.join(temp, 'plugins/mcu-workbench-workflow');
      const skillRoot = path.join(fixtureRoot, 'skills/sample-skill');
      const projectionRoot = path.join(temp, 'skills/sample-skill');
      fs.mkdirSync(path.join(fixtureRoot, '.codex-plugin'), { recursive: true });
      fs.mkdirSync(path.join(fixtureRoot, '.cursor-plugin'), { recursive: true });
      fs.mkdirSync(skillRoot, { recursive: true });
      fs.mkdirSync(projectionRoot, { recursive: true });
      const descriptor = JSON.parse(fs.readFileSync(path.join(pluginRoot, 'descriptor.json'), 'utf8'));
      const plugin = JSON.parse(fs.readFileSync(path.join(pluginRoot, 'plugin.json'), 'utf8'));
      const pkg = JSON.parse(fs.readFileSync(path.join(pluginRoot, 'package.json'), 'utf8'));
      const files = [
        ['descriptor.json', descriptor], ['plugin.json', plugin], ['package.json', pkg],
        ['.codex-plugin/plugin.json', { name: plugin.id, version: plugin.version, skills: './skills/' }],
        ['.cursor-plugin/plugin.json', { name: plugin.id, version: plugin.version, skills: ['./skills/'] }],
        ['skill-map.json', { schemaVersion: '1.0.0', plugin: plugin.id, skills: [{ id: 'sample-skill', kind: 'canonical', sourcePath: 'plugins/mcu-workbench-workflow/skills/sample-skill', projectionPath: 'skills/sample-skill' }] }],
        ['references/shared-sources.json', { schemaVersion: '1.0.0', plugin: plugin.id, files: [] }],
        ['references/external-dependencies.json', { schemaVersion: '1.0.0', plugin: plugin.id, dependencies: [] }]
      ];
      for (const [file, value] of files) {
        const target = path.join(fixtureRoot, file);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, JSON.stringify(value));
      }
      const body = '# sample skill\n';
      fs.writeFileSync(path.join(skillRoot, 'SKILL.md'), body);
      fs.writeFileSync(path.join(projectionRoot, 'SKILL.md'), body);
      fs.mkdirSync(path.join(projectRoot, 'skills'), { recursive: true });
      const digest = crypto.createHash('sha256').update(body).digest('hex');
      fs.writeFileSync(path.join(projectRoot, 'skills/.workflow-projections.json'), JSON.stringify({
        schemaVersion: '1.0.0', plugin: 'mcu-workbench-workflow',
        files: [{ path: 'skills/sample-skill/SKILL.md', source: 'plugins/mcu-workbench-workflow/skills/sample-skill/SKILL.md', sourceSha256: digest, sha256: digest }]
      }));
      const { validateWorkflowPlugin } = require(path.join(pluginRoot, 'scripts/validate.js'));
      const options = { projectRoot, pluginRoot: fixtureRoot, expectedIds: ['sample-skill'] };
      expect(validateWorkflowPlugin(options).valid).toBe(true);
      fs.writeFileSync(path.join(projectionRoot, 'SKILL.md'), 'user drift\n');
      const result = validateWorkflowPlugin(options);
      expect(result.valid).toBe(false);
      expect(result.errors.join('\n')).toMatch(/projection hash mismatch/);
    } finally {
      fs.rmSync(temp, { recursive: true, force: true });
    }
  });
});
