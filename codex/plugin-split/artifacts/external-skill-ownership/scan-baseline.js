'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../..');
const INVENTORY = path.join(ROOT, 'codex/plugin-split/external-skill-inventory.yaml');
const outputIndex = process.argv.indexOf('--output');
const outputPath = outputIndex >= 0 ? process.argv[outputIndex + 1] : null;
if (outputIndex >= 0 && (!outputPath || outputPath.startsWith('--'))) throw new Error('Expected a file path after --output');
const OUTPUT = outputPath ? path.resolve(process.cwd(), outputPath) : path.join(__dirname, 'baseline.json');
const GIT_CONTEXT = path.join(__dirname, 'git-context.json');
const GIT_STATUS = path.join(__dirname, 'git-status-before.txt');
const MARKERS = [
  'skills/.architecture-projections.json',
  'skills/.workflow-projections.json',
  'skills/tools/.devops-projections.json',
  'skills/tools/.verification-projections.json'
];

function sha256(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function filesUnder(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const current = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(current) : entry.isFile() ? [current] : [];
  }).sort();
}

const gitContext = JSON.parse(fs.readFileSync(GIT_CONTEXT, 'utf8'));
const gitChanges = fs.readFileSync(GIT_STATUS, 'utf8').split(/\r?\n/).filter(Boolean).map((line) => ({
  status: line.slice(0, 2).trim(),
  path: line.slice(3).replace(/\\/g, '/').replace(/^"|"$/g, '')
}));

const inventoryText = fs.readFileSync(INVENTORY, 'utf8');
const blocks = inventoryText.split(/^  - skill_id: /m).slice(1).map((block) => {
  const lines = block.split(/\r?\n/);
  return { id: lines[0].trim(), body: lines.slice(1).join('\n') };
});
const markerEntries = MARKERS.flatMap((relative) => {
  const file = path.join(ROOT, relative);
  if (!fs.existsSync(file)) return [];
  const marker = JSON.parse(fs.readFileSync(file, 'utf8'));
  return (marker.files || []).map((entry) => ({
    relative: entry.path.replace(/\\/g, '/'),
    plugin: marker.plugin,
    marker: relative,
    sha256: entry.sha256
  }));
});

const items = blocks.map(({ id, body }) => {
  const targetPlugin = (body.match(/^    target_plugin: (.+)$/m) || [])[1] || null;
  const status = (body.match(/^    status: (.+)$/m) || [])[1] || '';
  const deferred = /^deferred\b/.test(status);
  const sourcePath = (body.match(/^    source_path: (.+)$/m) || [])[1] || `skills/${id}`;
  const currentPluginPath = (body.match(/^    current_plugin_path: (.+)$/m) || [])[1] || null;
  const rootPath = path.join(ROOT, 'skills', id);
  const pluginPath = targetPlugin && targetPlugin.startsWith('mcu-workbench-')
    ? path.join(ROOT, 'plugins', targetPlugin, 'skills', id)
    : null;
  const rootFiles = filesUnder(rootPath);
  const pluginFiles = pluginPath ? filesUnder(pluginPath) : [];
  const currentPluginAbsolute = currentPluginPath ? path.join(ROOT, currentPluginPath) : null;
  const currentPluginFiles = currentPluginAbsolute ? filesUnder(currentPluginAbsolute) : [];
  const rootRelativeFiles = rootFiles.map((file) => path.relative(ROOT, file).replace(/\\/g, '/'));
  const markerOwners = markerEntries.filter((entry) => rootRelativeFiles.includes(entry.relative));
  const statusPaths = [rootPath, ...(pluginPath ? [pluginPath] : []), ...(currentPluginAbsolute ? [currentPluginAbsolute] : [])].filter((file) => fs.existsSync(file));
  return {
    id,
    targetPlugin,
    disposition: deferred ? 'deferred' : targetPlugin && targetPlugin.startsWith('mcu-workbench-') ? 'plugin' : 'outside-mcu-plugins',
    inventorySourcePath: sourcePath,
    rootPath: path.relative(ROOT, rootPath).replace(/\\/g, '/'),
    rootPresent: fs.existsSync(rootPath),
    rootFiles: rootFiles.map((file) => ({
      path: path.relative(ROOT, file).replace(/\\/g, '/'),
      sha256: sha256(file)
    })),
    pluginPath: pluginPath ? path.relative(ROOT, pluginPath).replace(/\\/g, '/') : null,
    pluginPresent: Boolean(pluginPath && fs.existsSync(pluginPath)),
    pluginFiles: pluginFiles.map((file) => ({
      path: path.relative(ROOT, file).replace(/\\/g, '/'),
      sha256: sha256(file)
    })),
    currentPluginPath,
    currentPluginPresent: Boolean(currentPluginAbsolute && fs.existsSync(currentPluginAbsolute)),
    currentPluginFiles: currentPluginFiles.map((file) => ({
      path: path.relative(ROOT, file).replace(/\\/g, '/'),
      sha256: sha256(file)
    })),
    markerOwners,
    gitStatus: gitChanges.filter(({ path: changedPath }) => statusPaths.some((target) => {
      const relative = path.relative(ROOT, target).replace(/\\/g, '/');
      return changedPath === relative || changedPath.startsWith(`${relative}/`);
    }))
  };
});

const counts = items.reduce((result, item) => {
  const key = item.targetPlugin || 'unassigned';
  result[key] = (result[key] || 0) + 1;
  return result;
}, {});
if (items.length !== 52 || new Set(items.map(({ id }) => id)).size !== 52) {
  throw new Error(`Expected 52 unique inventory entries, got ${items.length}`);
}

const baseline = {
  generatedAt: new Date().toISOString(),
  repositoryRoot: ROOT,
  branch: gitContext.branch,
  commit: gitContext.commit,
  statusSnapshot: path.relative(ROOT, GIT_STATUS).replace(/\\/g, '/'),
  inventory: path.relative(ROOT, INVENTORY).replace(/\\/g, '/'),
  counts,
  total: items.length,
  markerFiles: MARKERS.filter((relative) => fs.existsSync(path.join(ROOT, relative))),
  items
};

fs.writeFileSync(OUTPUT, `${JSON.stringify(baseline, null, 2)}\n`);
console.log(`Wrote baseline for ${items.length} Skills to ${OUTPUT}`);
