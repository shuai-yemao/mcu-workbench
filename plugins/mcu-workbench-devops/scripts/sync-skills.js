'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const PLUGIN_ROOT = path.resolve(__dirname, '..');
const PROJECT_ROOT = path.resolve(PLUGIN_ROOT, '../..');
const SKILL_MAPPINGS = [
  { id: 'tools-build', projection: 'tools/tools-build' },
  { id: 'tools-linker', projection: 'tools/tools-linker' },
  { id: 'tools-flash', projection: 'tools/tools-flash' },
  { id: 'tools-git', projection: 'tools/tools-git' },
  { id: 'tools-release', projection: 'tools/tools-release' },
  { id: 'build-cmake', projection: 'build-cmake' },
  { id: 'build-iar', projection: 'build-iar' },
  { id: 'build-idf', projection: 'build-idf' },
  { id: 'build-keil', projection: 'build-keil' },
  { id: 'build-makefile', projection: 'build-makefile' },
  { id: 'build-platformio', projection: 'build-platformio' },
  { id: 'flash-idf', projection: 'flash-idf' },
  { id: 'flash-jlink', projection: 'flash-jlink' },
  { id: 'flash-keil', projection: 'flash-keil' },
  { id: 'flash-openocd', projection: 'flash-openocd' },
  { id: 'flash-platformio', projection: 'flash-platformio' }
];

function collectFiles(root) {
  const files = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const current = path.join(root, entry.name);
    if (entry.isDirectory()) files.push(...collectFiles(current));
    else if (entry.isFile()) files.push(current);
  }
  return files.sort();
}

function hashFile(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function isWithin(root, target) {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith(`..${path.sep}`)
    && relative !== '..' && !path.isAbsolute(relative));
}

function rewriteMarkdownLinks(content, sourceFile, projectedFile, sourceRoot, projectRoot, mappings) {
  const lines = content.split(/(?<=\n)/);
  let fenced = false;
  return lines.map((line) => {
    const body = line.replace(/\r?\n$/, '');
    if (/^\s*(?:```|~~~)/.test(body)) {
      fenced = !fenced;
      return line;
    }
    if (fenced) return line;
    const masked = body.replace(/(`+)(.*?)\1/g, (match) => ' '.repeat(match.length));
    const pattern = /!?\[[^\]]*\]\((?<target><[^>]+>|[^)\s]+)(?<tail>[^)]*)\)/g;
    const replacements = [];
    for (const match of masked.matchAll(pattern)) {
      const raw = match.groups.target;
      const value = raw.startsWith('<') ? raw.slice(1, -1) : raw;
      if (/^(?:#|[a-z][a-z0-9+.-]*:|\/\/)/i.test(value)) continue;
      const anchorAt = value.indexOf('#');
      const suffix = anchorAt < 0 ? '' : value.slice(anchorAt);
      const local = anchorAt < 0 ? value : value.slice(0, anchorAt);
      let resolved = path.resolve(path.dirname(sourceFile), decodeURIComponent(local.replace(/\\/g, '/')));
      if (isWithin(sourceRoot, resolved)) {
        const relative = path.relative(sourceRoot, resolved).split(path.sep);
        const mapping = mappings.find((item) => item.id === relative[0]);
        if (mapping) resolved = path.join(projectRoot, 'skills', mapping.projection, ...relative.slice(1));
      }
      let rewritten = path.relative(path.dirname(projectedFile), resolved).replace(/\\/g, '/');
      if (!rewritten.startsWith('.')) rewritten = `./${rewritten}`;
      rewritten += suffix;
      if (rewritten === value) continue;
      const start = match.index + match[0].indexOf(raw);
      replacements.push({ start, end: start + raw.length, value: raw.startsWith('<') ? `<${rewritten}>` : rewritten });
    }
    let rewritten = body;
    for (const replacement of replacements.reverse()) {
      rewritten = rewritten.slice(0, replacement.start) + replacement.value + rewritten.slice(replacement.end);
    }
    return rewritten + line.slice(body.length);
  }).join('');
}

function currentProjectionHashes(projectRoot, mappings) {
  const hashes = {};
  for (const mapping of mappings) {
    const directory = path.join(projectRoot, 'skills', mapping.projection);
    if (!fs.existsSync(directory)) continue;
    for (const filePath of collectFiles(directory)) {
      hashes[path.relative(path.join(projectRoot, 'skills'), filePath).replace(/\\/g, '/')] = hashFile(filePath);
    }
  }
  return hashes;
}

function syncSkills(options = {}) {
  const pluginRoot = path.resolve(options.pluginRoot || PLUGIN_ROOT);
  const projectRoot = path.resolve(options.projectRoot || PROJECT_ROOT);
  const sourceRoot = path.join(pluginRoot, 'skills');
  const mappings = options.skillMappings || SKILL_MAPPINGS;
  const projectionRoot = path.join(projectRoot, 'skills');
  const markerPath = path.join(projectionRoot, 'tools', '.devops-projections.json');
  const source = path.relative(projectRoot, sourceRoot).replace(/\\/g, '/');
  let previousGeneratedFiles;
  if (!isWithin(projectRoot, projectionRoot) || !isWithin(projectRoot, markerPath)) {
    throw new Error('Projection path escaped project root.');
  }
  for (const mapping of mappings) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(mapping.id)
      || path.isAbsolute(mapping.projection)
      || mapping.projection.split(/[\\/]/).includes('..')) throw new Error(`Unsafe Skill projection: ${mapping.id}`);
    if (!fs.existsSync(path.join(sourceRoot, mapping.id, 'SKILL.md'))) {
      throw new Error(`Missing canonical Skill source: ${mapping.id}`);
    }
  }

  const markerExists = fs.existsSync(markerPath);
  if (markerExists) {
    const marker = JSON.parse(fs.readFileSync(markerPath, 'utf8'));
    if (marker.source !== source || JSON.stringify(marker.skills) !== JSON.stringify(mappings.map(({ id }) => id))) {
      throw new Error('Projection marker does not match this DevOps plugin.');
    }
    if (JSON.stringify(currentProjectionHashes(projectRoot, mappings)) !== JSON.stringify(marker.generatedFiles)) {
      throw new Error('Refusing to overwrite a modified projection.');
    }
    previousGeneratedFiles = marker.generatedFiles;
  } else {
    const occupied = mappings.find(({ projection }) => fs.existsSync(path.join(projectionRoot, projection)));
    if (occupied) throw new Error(`Refusing to replace unmarked projection: ${occupied.projection}`);
  }

  const token = `${process.pid}-${Date.now()}`;
  const stageRoot = path.join(projectRoot, `.devops-stage-${token}`);
  const backupRoot = path.join(projectRoot, `.devops-backup-${token}`);
  fs.mkdirSync(stageRoot, { recursive: true });
  fs.mkdirSync(backupRoot, { recursive: true });
  const generatedFiles = {};
  for (const mapping of mappings) {
    const sourceDirectory = path.join(sourceRoot, mapping.id);
    const targetDirectory = path.join(projectRoot, 'skills', mapping.projection);
    const stagedDirectory = path.join(stageRoot, mapping.projection);
    for (const sourceFile of collectFiles(sourceDirectory)) {
      const relative = path.relative(sourceDirectory, sourceFile);
      const stagedFile = path.join(stagedDirectory, relative);
      const projectedFile = path.join(targetDirectory, relative);
      fs.mkdirSync(path.dirname(stagedFile), { recursive: true });
      if (path.extname(sourceFile).toLowerCase() === '.md') {
        const markdown = fs.readFileSync(sourceFile, 'utf8');
        fs.writeFileSync(stagedFile, rewriteMarkdownLinks(markdown, sourceFile, projectedFile, sourceRoot, projectRoot, mappings), 'utf8');
      } else fs.copyFileSync(sourceFile, stagedFile);
      generatedFiles[path.relative(projectionRoot, projectedFile).replace(/\\/g, '/')] = hashFile(stagedFile);
    }
  }

  if (markerExists && JSON.stringify(generatedFiles) === JSON.stringify(previousGeneratedFiles)) {
    fs.rmSync(stageRoot, { recursive: true, force: true });
    fs.rmSync(backupRoot, { recursive: true, force: true });
    return { status: 'unchanged', markerPath };
  }

  const backedUp = [];
  const installed = [];
  try {
    for (const mapping of mappings) {
      const target = path.join(projectRoot, 'skills', mapping.projection);
      const staged = path.join(stageRoot, mapping.projection);
      const backup = path.join(backupRoot, mapping.projection);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.mkdirSync(path.dirname(backup), { recursive: true });
      if (fs.existsSync(target)) {
        fs.renameSync(target, backup);
        backedUp.push(mapping.id);
      }
      fs.renameSync(staged, target);
      installed.push(mapping.id);
    }
    fs.mkdirSync(path.dirname(markerPath), { recursive: true });
    fs.writeFileSync(markerPath, `${JSON.stringify({ source, skills: mappings.map(({ id }) => id), generatedFiles }, null, 2)}\n`, 'utf8');
  } catch (error) {
    for (const id of installed.reverse()) {
      const mapping = mappings.find((item) => item.id === id);
      fs.rmSync(path.join(projectRoot, 'skills', mapping.projection), { recursive: true, force: true });
    }
    for (const id of backedUp.reverse()) {
      const mapping = mappings.find((item) => item.id === id);
      fs.renameSync(path.join(backupRoot, mapping.projection), path.join(projectRoot, 'skills', mapping.projection));
    }
    throw error;
  } finally {
    fs.rmSync(stageRoot, { recursive: true, force: true });
    fs.rmSync(backupRoot, { recursive: true, force: true });
  }
  return { status: markerExists ? 'updated' : 'created', markerPath };
}

if (require.main === module) {
  try {
    const result = syncSkills();
    console.log(`DevOps Skill projections ${result.status}: ${result.markerPath}`);
  } catch (error) {
    console.error(`DevOps Skill projection failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { SKILL_MAPPINGS, syncSkills };
