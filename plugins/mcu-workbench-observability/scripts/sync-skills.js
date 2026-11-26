'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DEFAULT_PLUGIN_ROOT = path.resolve(__dirname, '..');
const DEFAULT_PROJECT_ROOT = path.resolve(DEFAULT_PLUGIN_ROOT, '../..');
const DEFAULT_SKILLS = ['can-debug', 'modbus-debug', 'visa-debug'];
const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const slash = (value) => value.replace(/\\/g, '/');
const inside = (root, target) => {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
};

function filesUnder(root) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(root, entry.name);
    return entry.isDirectory() ? filesUnder(file) : entry.isFile() ? [file] : [];
  }).sort();
}

function baselineHashes(projectRoot, override) {
  if (override) return override instanceof Map ? override : new Map(Object.entries(override));
  const file = path.join(projectRoot, 'codex/plugin-split/artifacts/external-skill-ownership/baseline-v1.5.json');
  if (!fs.existsSync(file)) return new Map();
  const baseline = JSON.parse(fs.readFileSync(file, 'utf8'));
  return new Map(baseline.items.flatMap((item) => (item.rootFiles || []).map((entry) => [entry.path, entry.sha256])));
}

function syncSkills(options = {}) {
  const pluginRoot = path.resolve(options.pluginRoot || DEFAULT_PLUGIN_ROOT);
  const projectRoot = path.resolve(options.projectRoot || DEFAULT_PROJECT_ROOT);
  const sourceRoot = path.join(pluginRoot, 'skills');
  const projectionRoot = path.join(projectRoot, 'skills');
  const markerPath = path.join(projectionRoot, '.observability-projections.json');
  const mappings = options.skillMappings || DEFAULT_SKILLS.map((id) => ({ id, projection: id }));
  const frozenHashes = baselineHashes(projectRoot, options.baselineHashes);
  if (!inside(pluginRoot, sourceRoot) || !inside(projectRoot, projectionRoot)) throw new Error('Projection path escaped managed roots.');

  const generated = [];
  for (const mapping of mappings) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(mapping.id) || path.isAbsolute(mapping.projection) || mapping.projection.split(/[\\/]/).includes('..')) {
      throw new Error(`Unsafe Observability mapping: ${mapping.id}`);
    }
    const source = path.resolve(sourceRoot, mapping.id);
    const targetRoot = path.resolve(projectionRoot, mapping.projection);
    if (!inside(sourceRoot, source) || !inside(projectionRoot, targetRoot) || !fs.existsSync(path.join(source, 'SKILL.md'))) {
      throw new Error(`Missing or unsafe Observability source: ${mapping.id}`);
    }
    for (const file of filesUnder(source)) {
      const target = path.join(targetRoot, path.relative(source, file));
      const bytes = fs.readFileSync(file);
      generated.push({ id: mapping.id, source: file, target, sourceSha256: sha256(bytes), content: bytes, sha256: sha256(bytes) });
    }
  }
  const generatedPaths = new Set(generated.map((file) => slash(path.relative(projectRoot, file.target))));
  if (generatedPaths.size !== generated.length) throw new Error('Duplicate Observability projection targets.');

  let previous = null;
  if (fs.existsSync(markerPath)) {
    previous = JSON.parse(fs.readFileSync(markerPath, 'utf8'));
    if (previous.schemaVersion !== '1.0.0' || previous.plugin !== 'mcu-workbench-observability' || !Array.isArray(previous.files)) {
      throw new Error('Refusing unknown or malformed Observability marker.');
    }
  }
  const managed = new Map();
  for (const entry of previous?.files || []) {
    const target = path.resolve(projectRoot, entry.path);
    if (!inside(projectionRoot, target) || !generatedPaths.has(slash(path.relative(projectRoot, target))) || managed.has(entry.path) || !/^[a-f0-9]{64}$/.test(entry.sha256)) {
      throw new Error(`Refusing invalid or stale marker entry: ${entry.path}`);
    }
    managed.set(entry.path, entry.sha256);
    if (!fs.existsSync(target) || sha256(fs.readFileSync(target)) !== entry.sha256) throw new Error(`Refusing modified projection: ${entry.path}`);
  }

  for (const file of generated) {
    const relative = slash(path.relative(projectRoot, file.target));
    if (!fs.existsSync(file.target)) continue;
    const currentHash = sha256(fs.readFileSync(file.target));
    if (managed.has(relative)) {
      if (currentHash !== managed.get(relative)) throw new Error(`Refusing modified projection: ${relative}`);
    } else if (currentHash !== frozenHashes.get(relative)) {
      throw new Error(`Refusing unmarked projection that differs from frozen baseline: ${relative}`);
    }
  }

  for (const mapping of mappings) {
    const targetRoot = path.resolve(projectionRoot, mapping.projection);
    if (!fs.existsSync(targetRoot)) continue;
    const expected = generated.filter((file) => file.id === mapping.id).map((file) => file.target);
    const existing = filesUnder(targetRoot);
    if (existing.length !== expected.length || existing.some((file) => !expected.includes(file))) {
      throw new Error(`Refusing unrecognized files in Observability projection: ${mapping.projection}`);
    }
  }

  if (previous && generated.every((file) => managed.get(slash(path.relative(projectRoot, file.target))) === file.sha256
    && fs.existsSync(file.target) && sha256(fs.readFileSync(file.target)) === file.sha256)) {
    return { status: 'unchanged', fileCount: generated.length, markerPath };
  }

  const stage = path.join(pluginRoot, `.observability-stage-${process.pid}`);
  if (fs.existsSync(stage)) throw new Error(`Refusing existing staging directory: ${stage}`);
  const backups = [];
  const created = [];
  let markerBackup = null;
  let markerWritten = false;
  try {
    fs.mkdirSync(stage);
    for (const file of generated) {
      const staged = path.join(stage, 'files', slash(path.relative(projectRoot, file.target)));
      fs.mkdirSync(path.dirname(staged), { recursive: true });
      fs.writeFileSync(staged, file.content);
    }
    const markerTemp = path.join(stage, 'marker.json');
    const next = {
      schemaVersion: '1.0.0', plugin: 'mcu-workbench-observability', generatedAt: new Date().toISOString(),
      files: generated.map((file) => ({ path: slash(path.relative(projectRoot, file.target)), source: slash(path.relative(projectRoot, file.source)), sourceSha256: file.sourceSha256, sha256: file.sha256 }))
    };
    fs.writeFileSync(markerTemp, `${JSON.stringify(next, null, 2)}\n`);
    for (const file of generated) {
      fs.mkdirSync(path.dirname(file.target), { recursive: true });
      const staged = path.join(stage, 'files', slash(path.relative(projectRoot, file.target)));
      if (fs.existsSync(file.target)) {
        const backup = path.join(stage, 'backups', slash(path.relative(projectRoot, file.target)));
        fs.mkdirSync(path.dirname(backup), { recursive: true });
        fs.renameSync(file.target, backup);
        backups.push({ backup, target: file.target });
      } else created.push(file.target);
      fs.renameSync(staged, file.target);
    }
    if (fs.existsSync(markerPath)) {
      markerBackup = path.join(stage, 'marker.previous.json');
      fs.renameSync(markerPath, markerBackup);
    }
    fs.renameSync(markerTemp, markerPath);
    markerWritten = true;
  } catch (error) {
    if (markerWritten && fs.existsSync(markerPath)) fs.rmSync(markerPath, { force: true });
    if (markerBackup && fs.existsSync(markerBackup)) fs.renameSync(markerBackup, markerPath);
    for (const target of created.reverse()) if (fs.existsSync(target)) fs.rmSync(target, { force: true });
    for (const item of backups.reverse()) {
      if (fs.existsSync(item.target)) fs.rmSync(item.target, { force: true });
      if (fs.existsSync(item.backup)) fs.renameSync(item.backup, item.target);
    }
    throw error;
  } finally {
    fs.rmSync(stage, { recursive: true, force: true });
  }
  return { status: previous ? 'updated' : 'created', fileCount: generated.length, markerPath };
}

if (require.main === module) {
  try { console.log(JSON.stringify(syncSkills(), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}

module.exports = { syncSkills };
