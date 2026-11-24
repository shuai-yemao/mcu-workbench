'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { mapMarkdownLinks, localTarget, isExternalOrIgnored } = require('../../../lib/skill-links');

const PLUGIN_ROOT = path.resolve(__dirname, '..');
const PROJECT_ROOT = path.resolve(PLUGIN_ROOT, '../..');
const MAP = JSON.parse(fs.readFileSync(path.join(PLUGIN_ROOT, 'skill-map.json'), 'utf8'));
const MARKER = path.join(PROJECT_ROOT, 'skills', '.architecture-projections.json');
const BASELINE = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'codex/plugin-split/artifacts/architecture/T-001/source-baseline.json'), 'utf8'));
const baselineHashes = new Map(BASELINE.skills.flatMap((skill) => skill.files.map((file) => [file.path.replace(/\\/g, '/'), file.sha256])));
const sha = (value) => crypto.createHash('sha256').update(value).digest('hex');
const filesUnder = (root) => !fs.existsSync(root) ? [] : fs.readdirSync(root, { withFileTypes: true }).flatMap((e) => {
  const p = path.join(root, e.name);
  return e.isDirectory() ? filesUnder(p) : e.isFile() ? [p] : [];
}).sort();
const inside = (root, target) => { const r = path.relative(root, target); return !r.startsWith(`..${path.sep}`) && r !== '..' && !path.isAbsolute(r); };

function syncSkills() {
  const skills = MAP.skills.map((s) => ({ ...s, source: path.resolve(PROJECT_ROOT, s.pluginPath), target: path.resolve(PROJECT_ROOT, s.projectionPath) }));
  const generated = [];
  for (const skill of skills) for (const source of filesUnder(skill.source)) {
    const target = path.join(skill.target, path.relative(skill.source, source));
    let content = fs.readFileSync(source);
    if (path.extname(source).toLowerCase() === '.md') {
      content = Buffer.from(mapMarkdownLinks(content.toString('utf8'), ({ target: link }) => {
        if (isExternalOrIgnored(link)) return null;
        const resolved = path.resolve(path.dirname(source), localTarget(link));
        const owner = skills.find((s) => inside(s.source, resolved));
        let rootTarget;
        if (owner) rootTarget = path.join(owner.target, path.relative(owner.source, resolved));
        else {
          const sharedRoot = path.join(PLUGIN_ROOT, 'references', 'shared');
          if (!inside(sharedRoot, resolved)) return null;
          rootTarget = path.join(PROJECT_ROOT, path.relative(sharedRoot, resolved));
        }
        let rel = path.relative(path.dirname(target), rootTarget).replace(/\\/g, '/');
        if (!rel.startsWith('.')) rel = `./${rel}`;
        const suffix = link.includes('#') ? link.slice(link.indexOf('#')) : '';
        return `${rel}${suffix}`;
      }), 'utf8');
    }
    generated.push({ source, target, content, sha256: sha(content) });
  }
  let previous = null;
  if (fs.existsSync(MARKER)) previous = JSON.parse(fs.readFileSync(MARKER, 'utf8'));
  if (previous) {
    if (previous.schemaVersion !== '1.0.0' || previous.plugin !== MAP.plugin || !Array.isArray(previous.files)) {
      throw new Error('Refusing unknown or malformed architecture projection marker.');
    }
    const seen = new Set();
    for (const entry of previous.files) {
      const target = path.resolve(PROJECT_ROOT, entry.path);
      if (path.relative(PROJECT_ROOT, target).startsWith('..') || !skills.some((skill) => inside(skill.target, target))) {
        throw new Error(`Refusing projection marker path escape: ${entry.path}`);
      }
      if (seen.has(entry.path) || !/^[a-f0-9]{64}$/.test(entry.sha256)) throw new Error(`Refusing invalid projection marker entry: ${entry.path}`);
      seen.add(entry.path);
    }
  }
  const managed = new Map((previous?.files || []).map((f) => [f.path, f.sha256]));
  for (const file of generated) {
    if (fs.existsSync(file.target)) {
      const rel = path.relative(PROJECT_ROOT, file.target).replace(/\\/g, '/');
      if (previous && !managed.has(rel)) throw new Error(`Refusing to overwrite unmarked projection: ${rel}`);
      if (previous && sha(fs.readFileSync(file.target)) !== managed.get(rel)) throw new Error(`Refusing to overwrite drifted projection: ${rel}`);
    }
  }
  if (previous && generated.every((file) => managed.get(path.relative(PROJECT_ROOT, file.target).replace(/\\/g, '/')) === file.sha256
    && fs.existsSync(file.target) && sha(fs.readFileSync(file.target)) === file.sha256)) {
    return { status: 'unchanged', fileCount: generated.length, marker: MARKER };
  }
  if (!previous) for (const skill of skills) {
    const expected = generated.filter((f) => inside(skill.target, f.target));
    if (fs.existsSync(skill.target)) {
      const existing = filesUnder(skill.target);
      const expectedPaths = new Set(expected.map((f) => f.target));
      if (existing.length !== expected.length || existing.some((file) => !expectedPaths.has(file))) {
        throw new Error(`Refusing adoption with unrecognized files: ${skill.projectionPath}`);
      }
      for (const file of expected) {
        const rel = path.relative(PROJECT_ROOT, file.target).replace(/\\/g, '/');
        const currentHash = sha(fs.readFileSync(file.target));
        if (currentHash !== file.sha256 && currentHash !== baselineHashes.get(rel)) {
          throw new Error(`Refusing adoption because bytes differ from baseline and generated projection: ${rel}`);
        }
      }
    }
  }
  const next = { schemaVersion: '1.0.0', plugin: MAP.plugin, generatedAt: new Date().toISOString(), files: generated.map((f) => ({ path: path.relative(PROJECT_ROOT, f.target).replace(/\\/g, '/'), source: path.relative(PROJECT_ROOT, f.source).replace(/\\/g, '/'), sourceSha256: sha(fs.readFileSync(f.source)), sha256: f.sha256 })) };
  const stage = path.join(PLUGIN_ROOT, `.projection-stage-${process.pid}`);
  const backups = [];
  try {
    fs.mkdirSync(stage);
    for (const f of generated) {
      const temp = path.join(stage, path.relative(PROJECT_ROOT, f.target));
      fs.mkdirSync(path.dirname(temp), { recursive: true }); fs.writeFileSync(temp, f.content);
    }
    const markerTemp = path.join(stage, 'marker.json'); fs.writeFileSync(markerTemp, `${JSON.stringify(next, null, 2)}\n`);
    for (const f of generated) {
      fs.mkdirSync(path.dirname(f.target), { recursive: true });
      const temp = path.join(stage, path.relative(PROJECT_ROOT, f.target));
      if (fs.existsSync(f.target)) {
        const backup = path.join(stage, 'backups', path.relative(PROJECT_ROOT, f.target));
        fs.mkdirSync(path.dirname(backup), { recursive: true }); fs.renameSync(f.target, backup);
        backups.push({ backup, target: f.target });
      }
      fs.renameSync(temp, f.target);
    }
    fs.mkdirSync(path.dirname(MARKER), { recursive: true });
    fs.renameSync(markerTemp, MARKER);
  } catch (error) {
    for (const f of generated) if (fs.existsSync(f.target)) fs.rmSync(f.target, { force: true });
    for (const item of backups.reverse()) if (fs.existsSync(item.backup)) fs.renameSync(item.backup, item.target);
    throw error;
  } finally { fs.rmSync(stage, { recursive: true, force: true }); }
  return { status: previous ? 'synchronized' : 'created', fileCount: generated.length, marker: MARKER };
}

if (require.main === module) { try { console.log(JSON.stringify(syncSkills(), null, 2)); } catch (e) { console.error(e.message); process.exitCode = 1; } }
module.exports = { syncSkills };
