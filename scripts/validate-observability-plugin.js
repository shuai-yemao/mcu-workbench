const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PLUGIN = path.join(ROOT, 'plugins', 'mcu-workbench-observability');
const SKILLS = [
  'tools-debug',
  'tools-observability',
  'debug-gdb-openocd',
  'debug-jlink',
  'debug-platformio',
  'logic-analyzer',
  'rtos-debug',
  'serial-monitor',
  'serial-shell'
];

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function validateObservabilityPlugin() {
  const errors = [];
  const plugin = readJson('plugins/mcu-workbench-observability/plugin.json');
  const descriptor = readJson('plugins/mcu-workbench-observability/descriptor.json');
  const packageJson = readJson('plugins/mcu-workbench-observability/package.json');
  if (plugin.id !== 'mcu-workbench-observability') errors.push('plugin id mismatch');
  if (descriptor.id !== plugin.id) errors.push('descriptor id mismatch');
  if (packageJson.version !== plugin.version) errors.push('plugin package version mismatch');
  for (const skill of SKILLS) {
    const skillPath = path.join(PLUGIN, 'skills', skill, 'SKILL.md');
    if (!fs.existsSync(skillPath)) errors.push('missing skill: ' + skill);
  }
  const external = readJson('plugins/mcu-workbench-observability/external-skills.json');
  if (external.entries.length !== 7) errors.push('external skill registry count mismatch');
  for (const entry of external.entries) {
    if (entry.status !== 'migrated') errors.push('external skill not marked migrated: ' + entry.id);
    if (!entry.provenance) errors.push('external skill provenance missing: ' + entry.id);
  }
  return { errors, plugin, descriptor, packageJson };
}

if (require.main === module) {
  const result = validateObservabilityPlugin();
  if (result.errors.length) {
    console.error(result.errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.log('observability plugin validation passed: ' + result.plugin.version);
  }
}

module.exports = { ROOT, SKILLS, validateObservabilityPlugin };
