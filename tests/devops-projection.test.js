'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { syncSkills } = require('../plugins/mcu-workbench-devops/scripts/sync-skills');

describe('DevOps compatibility projection', () => {
  let root;
  let pluginRoot;
  let projectRoot;

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'devops-projection-'));
    pluginRoot = path.join(root, 'plugin');
    projectRoot = path.join(root, 'project');
    fs.mkdirSync(path.join(pluginRoot, 'skills', 'tools-build'), { recursive: true });
    fs.writeFileSync(path.join(pluginRoot, 'skills', 'tools-build', 'SKILL.md'), '# Build\n');
  });

  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  test('creates a repeatable projection with a source and hash marker', () => {
    const result = syncSkills({
      pluginRoot,
      projectRoot,
      skillMappings: [{ id: 'tools-build', projection: 'tools/tools-build' }]
    });
    const projected = path.join(projectRoot, 'skills', 'tools', 'tools-build', 'SKILL.md');
    expect(fs.readFileSync(projected, 'utf8')).toBe('# Build\n');
    expect(fs.existsSync(result.markerPath)).toBe(true);
    expect(syncSkills({
      pluginRoot,
      projectRoot,
      skillMappings: [{ id: 'tools-build', projection: 'tools/tools-build' }]
    }).status).toBe('unchanged');
  });

  test('refuses to overwrite a modified projection', () => {
    const options = {
      pluginRoot,
      projectRoot,
      skillMappings: [{ id: 'tools-build', projection: 'tools/tools-build' }]
    };
    syncSkills(options);
    fs.appendFileSync(path.join(projectRoot, 'skills', 'tools', 'tools-build', 'SKILL.md'), 'user edit\n');
    expect(() => syncSkills(options)).toThrow(/modified projection/);
  });
});
