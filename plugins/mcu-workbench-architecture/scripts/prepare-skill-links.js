'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {
  collectMarkdownFiles,
  mapMarkdownLinks,
  localTarget,
  isExternalOrIgnored
} = require('../../../lib/skill-links');

const PLUGIN_ROOT = path.resolve(__dirname, '..');
const PROJECT_ROOT = path.resolve(PLUGIN_ROOT, '../..');
const SKILL_MAP_PATH = path.join(PLUGIN_ROOT, 'skill-map.json');
const SHARED_ROOT = path.join(PLUGIN_ROOT, 'references', 'shared');
const MANIFEST_PATH = path.join(PLUGIN_ROOT, 'references', 'shared-sources.json');

function hashFile(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function collectFiles(root) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const current = path.join(root, entry.name);
    if (entry.isDirectory()) return collectFiles(current);
    return entry.isFile() ? [current] : [];
  }).sort();
}

function isWithin(root, target) {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith(`..${path.sep}`)
    && relative !== '..' && !path.isAbsolute(relative));
}

function relativeLink(fromFile, toPath) {
  let relative = path.relative(path.dirname(fromFile), toPath).replace(/\\/g, '/');
  if (!relative.startsWith('.')) relative = `./${relative}`;
  return relative;
}

function splitTarget(target) {
  const anchorAt = target.indexOf('#');
  return anchorAt < 0
    ? { local: target, suffix: '' }
    : { local: target.slice(0, anchorAt), suffix: target.slice(anchorAt) };
}

function resolveLocal(baseFile, target) {
  const decoded = localTarget(target).replace(/\\/g, '/');
  return path.resolve(path.dirname(baseFile), decoded);
}

function loadSkillMap() {
  const map = JSON.parse(fs.readFileSync(SKILL_MAP_PATH, 'utf8'));
  if (map.plugin !== 'mcu-workbench-architecture' || !Array.isArray(map.skills) || map.skills.length !== 39) {
    throw new Error('Architecture skill-map.json must register exactly 39 Skills.');
  }
  return map;
}

function sourceOwner(sourcePath) {
  const normalized = sourcePath.replace(/\\/g, '/');
  if (normalized.startsWith('skills/workflow/')) return 'mcu-workbench-workflow (root source)';
  if (normalized.startsWith('skills/tools/tools-build/')
    || normalized.startsWith('skills/tools/tools-linker/')
    || normalized.startsWith('skills/tools/tools-flash/')
    || normalized.startsWith('skills/tools/tools-git/')
    || normalized.startsWith('skills/tools/tools-release/')) return 'mcu-workbench-devops';
  if (normalized.startsWith('skills/tools/tools-debug/')
    || normalized.startsWith('skills/tools/tools-observability/')) return 'mcu-workbench-observability';
  if (normalized.startsWith('skills/tools/tools-quality/')
    || normalized.startsWith('skills/tools/tools-verification/')) return 'mcu-workbench-verification';
  return 'repository-shared (no plugin ownership inferred)';
}

function ownerPluginSource(sourcePath) {
  const normalized = sourcePath.replace(/\\/g, '/');
  const tool = normalized.match(/^skills\/tools\/([^/]+)\/(.*)$/);
  if (!tool) return null;
  const owner = sourceOwner(normalized);
  if (!['mcu-workbench-devops', 'mcu-workbench-observability', 'mcu-workbench-verification'].includes(owner)) return null;
  return `plugins/${owner}/skills/${tool[1]}/${tool[2]}`;
}

function sourceMetadata(sourceFile) {
  const sourcePath = path.relative(PROJECT_ROOT, sourceFile).replace(/\\/g, '/');
  const ownerPlugin = sourceOwner(sourcePath);
  const ownerPluginSourcePath = ownerPluginSource(sourcePath);
  const ownerSourceAbsolute = ownerPluginSourcePath ? path.resolve(PROJECT_ROOT, ownerPluginSourcePath) : null;
  const ownerPluginSha256 = ownerSourceAbsolute && fs.existsSync(ownerSourceAbsolute)
    ? hashFile(ownerSourceAbsolute)
    : null;
  return {
    sourcePath,
    ownerPlugin,
    ownerPluginSourcePath: ownerPluginSha256 ? ownerPluginSourcePath : null,
    ownerPluginSha256,
    ownerDiffersFromSnapshotSource: ownerPluginSha256 ? ownerPluginSha256 !== hashFile(sourceFile) : null
  };
}

function createSkillSourceIndex(map) {
  return map.skills.map((skill) => ({
    id: skill.id,
    projectionRoot: path.resolve(PROJECT_ROOT, skill.projectionPath),
    pluginRoot: path.resolve(PLUGIN_ROOT, 'skills', skill.id)
  }));
}

function selectedSkillFor(targetPath, skillSources) {
  return skillSources.find((skill) => isWithin(skill.projectionRoot, targetPath)) || null;
}

function packageTargetFor(sourcePath, skillSources, closureSet) {
  const skill = selectedSkillFor(sourcePath, skillSources);
  if (skill) {
    const remainder = path.relative(skill.projectionRoot, sourcePath);
    return path.join(skill.pluginRoot, remainder);
  }
  if (!closureSet.has(sourcePath)) throw new Error(`Reference target is outside the declared closure: ${sourcePath}`);
  return path.join(PLUGIN_ROOT, 'references', 'shared', path.relative(PROJECT_ROOT, sourcePath));
}

function addExternalTarget(targetPath, skillSources, closureSet, queue) {
  if (selectedSkillFor(targetPath, skillSources)) return;
  if (!isWithin(PROJECT_ROOT, targetPath)) {
    throw new Error(`Reference escapes the repository root: ${targetPath}`);
  }
  if (!fs.existsSync(targetPath)) throw new Error(`Missing linked source: ${targetPath}`);
  const stat = fs.statSync(targetPath);
  if (stat.isDirectory()) {
    for (const filePath of collectFiles(targetPath)) {
      if (!closureSet.has(filePath)) {
        closureSet.add(filePath);
        queue.push(filePath);
      }
    }
  } else if (stat.isFile() && !closureSet.has(targetPath)) {
    closureSet.add(targetPath);
    queue.push(targetPath);
  }
}

function collectReferenceClosure(map, skillSources) {
  const closureSet = new Set();
  const queue = [];
  for (const skill of map.skills) {
    const root = path.resolve(PROJECT_ROOT, skill.projectionPath);
    for (const filePath of collectMarkdownFiles(root)) {
      mapMarkdownLinks(fs.readFileSync(filePath, 'utf8'), ({ target }) => {
        if (isExternalOrIgnored(target)) return;
        const { local } = splitTarget(target);
        if (!local) return;
        addExternalTarget(resolveLocal(filePath, local), skillSources, closureSet, queue);
      });
    }
  }
  while (queue.length) {
    const sourceFile = queue.pop();
    if (path.extname(sourceFile).toLowerCase() !== '.md') continue;
    mapMarkdownLinks(fs.readFileSync(sourceFile, 'utf8'), ({ target }) => {
      if (isExternalOrIgnored(target)) return;
      const { local } = splitTarget(target);
      if (!local) return;
      addExternalTarget(resolveLocal(sourceFile, local), skillSources, closureSet, queue);
    });
  }
  return [...closureSet].sort();
}

function rewriteMarkdown(content, originFile, packageFile, skillSources, closureSet, mode, plannedSharedTargets = new Set()) {
  return mapMarkdownLinks(content, ({ target }) => {
    if (isExternalOrIgnored(target)) return null;
    const { local, suffix } = splitTarget(target);
    if (!local) return null;

    if (mode === 'plugin') {
      const currentTarget = resolveLocal(packageFile, local);
      if (isWithin(PLUGIN_ROOT, currentTarget)
        && (fs.existsSync(currentTarget) || plannedSharedTargets.has(currentTarget))) {
        return null;
      }
    }

    const sourceTarget = resolveLocal(originFile, local);
    const packageTarget = packageTargetFor(sourceTarget, skillSources, closureSet);
    if (mode === 'shared' && packageTarget === path.join(PLUGIN_ROOT, 'references', 'shared', path.relative(PROJECT_ROOT, sourceTarget))) {
      return null;
    }
    return `${relativeLink(packageFile, packageTarget)}${suffix}`;
  });
}

function sourceFileMap(map, skillSources) {
  const entries = [];
  for (let index = 0; index < map.skills.length; index += 1) {
    const skill = map.skills[index];
    const root = skillSources[index].projectionRoot;
    for (const filePath of collectFiles(root)) {
      const packageFile = path.join(skillSources[index].pluginRoot, path.relative(root, filePath));
      entries.push({ skillId: skill.id, sourceFile: filePath, packageFile });
    }
  }
  return entries;
}

function validateUnchangedExisting(map, closure, skillSources) {
  const existing = fs.existsSync(MANIFEST_PATH);
  if (!existing) {
    if (fs.existsSync(SHARED_ROOT)) throw new Error('Refusing to replace unmarked shared references.');
    for (const entry of sourceFileMap(map, skillSources)) {
      if (!fs.existsSync(entry.packageFile)) throw new Error(`Missing package source: ${entry.packageFile}`);
      const originalHash = hashFile(entry.sourceFile);
      if (hashFile(entry.packageFile) !== originalHash) {
        throw new Error(`Package source differs from migration baseline: ${entry.packageFile}`);
      }
    }
    return null;
  }

  const previous = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
  const expectedSourceHashes = closure.map((sourcePath) => ({
    sourcePath: path.relative(PROJECT_ROOT, sourcePath).replace(/\\/g, '/'),
    sourceSha256: hashFile(sourcePath)
  }));
  if (JSON.stringify(previous.sourceHashes) !== JSON.stringify(expectedSourceHashes)) {
    throw new Error('Shared source changed; refusing implicit snapshot refresh.');
  }
  for (const entry of previous.files || []) {
    const filePath = path.join(PLUGIN_ROOT, entry.packagePath);
    if (!fs.existsSync(filePath) || hashFile(filePath) !== entry.sha256) {
      throw new Error(`Refusing to overwrite a modified shared snapshot: ${entry.packagePath}`);
    }
    const currentSource = sourceMetadata(path.resolve(PROJECT_ROOT, entry.sourcePath));
    if (currentSource.sourceSha256 && entry.sourceSha256 && currentSource.sourceSha256 !== entry.sourceSha256) {
      throw new Error(`Shared snapshot source changed: ${entry.sourcePath}`);
    }
    if (entry.ownerPluginSourcePath && currentSource.ownerPluginSha256 !== entry.ownerPluginSha256) {
      throw new Error(`Shared owner source changed: ${entry.ownerPluginSourcePath}`);
    }
    Object.assign(entry, currentSource);
  }
  for (const entry of previous.skillLinks || []) {
    const filePath = path.join(PLUGIN_ROOT, entry.packagePath);
    if (!fs.existsSync(filePath) || hashFile(filePath) !== entry.sha256) {
      throw new Error(`Refusing to overwrite a modified plugin Skill source: ${entry.packagePath}`);
    }
  }
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(previous, null, 2)}\n`, 'utf8');
  return previous;
}

function prepareSkillLinks(options = {}) {
  const pluginRoot = path.resolve(options.pluginRoot || PLUGIN_ROOT);
  const projectRoot = path.resolve(options.projectRoot || PROJECT_ROOT);
  if (pluginRoot !== PLUGIN_ROOT || projectRoot !== PROJECT_ROOT) {
    throw new Error('prepareSkillLinks only supports the checked-in architecture package paths.');
  }
  const map = loadSkillMap();
  const skillSources = createSkillSourceIndex(map);
  const closure = collectReferenceClosure(map, skillSources);
  const previous = validateUnchangedExisting(map, closure, skillSources);
  if (previous) return { status: 'unchanged', fileCount: previous.files.length, manifestPath: MANIFEST_PATH };

  const closureSet = new Set(closure);
  const plannedSharedTargets = new Set(closure.map((sourceFile) => path.resolve(
    PLUGIN_ROOT, 'references', 'shared', path.relative(PROJECT_ROOT, sourceFile)
  )));
  const generatedShared = closure.map((sourceFile) => {
    const packageFile = path.join(PLUGIN_ROOT, 'references', 'shared', path.relative(PROJECT_ROOT, sourceFile));
    let content = fs.readFileSync(sourceFile);
    if (path.extname(sourceFile).toLowerCase() === '.md') {
      content = Buffer.from(rewriteMarkdown(
        content.toString('utf8'), sourceFile, packageFile, skillSources, closureSet, 'shared', plannedSharedTargets
      ), 'utf8');
    }
    return {
      ...sourceMetadata(sourceFile),
      sourceSha256: hashFile(sourceFile),
      packagePath: path.relative(PLUGIN_ROOT, packageFile).replace(/\\/g, '/'),
      content,
      sha256: crypto.createHash('sha256').update(content).digest('hex')
    };
  });

  const generatedSkillLinks = [];
  for (const entry of sourceFileMap(map, skillSources)) {
    if (path.extname(entry.sourceFile).toLowerCase() !== '.md') continue;
    const originalContent = fs.readFileSync(entry.sourceFile, 'utf8');
    const currentContent = fs.readFileSync(entry.packageFile, 'utf8');
    const content = rewriteMarkdown(
      currentContent, entry.sourceFile, entry.packageFile, skillSources, closureSet, 'plugin', plannedSharedTargets
    );
    if (content !== currentContent) {
      generatedSkillLinks.push({
        packagePath: path.relative(PLUGIN_ROOT, entry.packageFile).replace(/\\/g, '/'),
        originalSourcePath: path.relative(PROJECT_ROOT, entry.sourceFile).replace(/\\/g, '/'),
        originalSourceSha256: crypto.createHash('sha256').update(originalContent).digest('hex'),
        content,
        sha256: crypto.createHash('sha256').update(content).digest('hex')
      });
    }
  }

  const files = generatedShared.map(({ content, ...metadata }) => metadata);
  const skillLinks = generatedSkillLinks.map(({ content, ...metadata }) => metadata);
  const manifest = {
    schemaVersion: '1.0.0',
    plugin: 'mcu-workbench-architecture',
    generatedAt: new Date().toISOString(),
    closureFileCount: files.length,
    files,
    skillLinks,
    sourceHashes: closure.map((sourceFile) => ({
      sourcePath: path.relative(PROJECT_ROOT, sourceFile).replace(/\\/g, '/'),
      sourceSha256: hashFile(sourceFile)
    }))
  };

  const stageRoot = path.join(PLUGIN_ROOT, `.architecture-link-stage-${process.pid}`);
  const sharedStage = path.join(stageRoot, 'shared');
  const manifestStage = path.join(stageRoot, 'shared-sources.json');
  const overridesStage = path.join(stageRoot, 'skill-overrides');
  const backupsStage = path.join(stageRoot, 'skill-backups');
  const applied = [];
  let sharedInstalled = false;
  let manifestInstalled = false;
  try {
    fs.mkdirSync(stageRoot, { recursive: false });
    for (const entry of generatedShared) {
      const stagedFile = path.join(sharedStage, path.relative(path.join(PLUGIN_ROOT, 'references', 'shared'), path.join(PLUGIN_ROOT, entry.packagePath)));
      fs.mkdirSync(path.dirname(stagedFile), { recursive: true });
      fs.writeFileSync(stagedFile, entry.content);
    }
    for (const entry of generatedSkillLinks) {
      const stagedFile = path.join(overridesStage, entry.packagePath);
      fs.mkdirSync(path.dirname(stagedFile), { recursive: true });
      fs.writeFileSync(stagedFile, entry.content);
    }
    fs.mkdirSync(path.dirname(manifestStage), { recursive: true });
    fs.writeFileSync(manifestStage, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
    if (fs.existsSync(SHARED_ROOT) || fs.existsSync(MANIFEST_PATH)) {
      throw new Error('Refusing to replace an existing unmarked shared reference bundle.');
    }
    fs.mkdirSync(path.dirname(SHARED_ROOT), { recursive: true });
    fs.renameSync(sharedStage, SHARED_ROOT);
    sharedInstalled = true;
    for (const entry of generatedSkillLinks) {
      const destination = path.join(PLUGIN_ROOT, entry.packagePath);
      const backup = path.join(backupsStage, entry.packagePath);
      const staged = path.join(overridesStage, entry.packagePath);
      fs.mkdirSync(path.dirname(backup), { recursive: true });
      fs.renameSync(destination, backup);
      try {
        fs.renameSync(staged, destination);
      } catch (error) {
        fs.renameSync(backup, destination);
        throw error;
      }
      applied.push({ destination, backup });
    }
    fs.renameSync(manifestStage, MANIFEST_PATH);
    manifestInstalled = true;
  } catch (error) {
    for (const item of applied.reverse()) {
      fs.rmSync(item.destination, { force: true });
      fs.renameSync(item.backup, item.destination);
    }
    if (manifestInstalled) fs.rmSync(MANIFEST_PATH, { force: true });
    if (sharedInstalled) fs.rmSync(SHARED_ROOT, { recursive: true, force: true });
    throw error;
  } finally {
    fs.rmSync(stageRoot, { recursive: true, force: true });
  }
  return { status: 'created', fileCount: files.length, skillLinkCount: skillLinks.length, manifestPath: MANIFEST_PATH };
}

if (require.main === module) {
  try {
    console.log(JSON.stringify(prepareSkillLinks(), null, 2));
  } catch (error) {
    console.error(`Architecture link preparation failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { prepareSkillLinks };
