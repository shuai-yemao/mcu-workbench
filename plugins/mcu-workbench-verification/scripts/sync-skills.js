'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PLUGIN_ROOT = path.resolve(__dirname, '..');
const PROJECT_ROOT = path.resolve(PLUGIN_ROOT, '../..');
const SOURCE_ROOT = path.join(PLUGIN_ROOT, 'skills');
const PROJECTION_ROOT = path.join(PROJECT_ROOT, 'skills');
const MARKER_PATH = path.join(PROJECTION_ROOT, 'tools', '.verification-projections.json');
const SKILLS = [
  { id: 'tools-verification', projection: 'tools/tools-verification' },
  { id: 'tools-quality', projection: 'tools/tools-quality' },
  { id: 'embedded-unit-test-generator', projection: 'embedded-unit-test-generator' },
  { id: 'static-analysis', projection: 'static-analysis' },
  { id: 'embedded-bug-hunter', projection: 'embedded-bug-hunter' },
  { id: 'memory-analysis', projection: 'memory-analysis' }
];
const SKILL_IDS = SKILLS.map(({ id }) => id);
const SKILL_BY_ID = new Map(SKILLS.map((skill) => [skill.id, skill]));
const PREVIOUS_SKILL_IDS = ['tools-verification', 'tools-quality'];
const INTERMEDIATE_SKILL_IDS = ['tools-verification', 'tools-quality', 'embedded-unit-test-generator', 'static-analysis'];
const LEGACY_SKILL_IDS = ['tools-verification', 'tools-quality', 'academic-paper', 'academic-paper-reviewer', 'academic-pipeline', 'embedded-unit-test-generator', 'sr-screener', 'static-analysis'];
const BASELINE_PATH = path.join(PROJECT_ROOT, 'codex/plugin-split/artifacts/external-skill-ownership/baseline-v1.5.json');

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
    && relative !== '..'
    && !path.isAbsolute(relative));
}

function rewriteMarkdownLinks(content, sourceFile, targetFile) {
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
      if (isWithin(SOURCE_ROOT, resolved)) {
        const [skillId, ...remaining] = path.relative(SOURCE_ROOT, resolved).split(path.sep);
        const skill = SKILL_BY_ID.get(skillId);
        resolved = skill
          ? path.join(PROJECTION_ROOT, skill.projection, ...remaining)
          : path.join(PROJECT_ROOT, 'skills', skillId, ...remaining);
      }

      let rewritten = path.relative(path.dirname(targetFile), resolved).replace(/\\/g, '/');
      if (!rewritten.startsWith('.')) rewritten = `./${rewritten}`;
      rewritten += suffix;
      if (rewritten === value) continue;

      const start = match.index + match[0].indexOf(raw);
      replacements.push({
        start,
        end: start + raw.length,
        value: raw.startsWith('<') ? `<${rewritten}>` : rewritten
      });
    }

    let rewritten = body;
    for (const replacement of replacements.reverse()) {
      rewritten = rewritten.slice(0, replacement.start)
        + replacement.value
        + rewritten.slice(replacement.end);
    }
    return rewritten + line.slice(body.length);
  }).join('');
}

function currentProjectionHashes(skillIds = SKILL_IDS) {
  const hashes = {};
  for (const { id, projection } of SKILLS.filter(({ id }) => skillIds.includes(id))) {
    const directory = path.join(PROJECTION_ROOT, projection);
    if (!fs.existsSync(directory)) continue;
    for (const filePath of collectFiles(directory)) {
      hashes[path.relative(PROJECTION_ROOT, filePath).replace(/\\/g, '/')] = hashFile(filePath);
    }
  }
  return hashes;
}

function assertNewProjectionsMatchBaseline(skillIds) {
  const baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
  for (const skillId of skillIds) {
    const skill = SKILL_BY_ID.get(skillId);
    const directory = path.join(PROJECTION_ROOT, skill.projection);
    const item = baseline.items.find(({ id }) => id === skillId);
    if (!item || !item.rootFiles?.length || !fs.existsSync(directory)) {
      throw new Error(`Missing frozen baseline files for new projection: ${skillId}`);
    }
    const expected = item.rootFiles.map(({ path: file }) => path.relative(`skills/${skill.projection}`, file).replace(/\\/g, '/')).sort();
    const actual = collectFiles(directory).map((file) => path.relative(directory, file).replace(/\\/g, '/')).sort();
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(`Refusing to adopt unmarked projection with unexpected files: ${skillId}`);
    }
    for (const file of item.rootFiles) {
      const relative = path.relative(`skills/${skill.projection}`, file.path);
      if (hashFile(path.join(directory, relative)) !== file.sha256) {
        throw new Error(`Refusing to adopt unmarked projection with baseline drift: ${file.path}`);
      }
    }
  }
}

function assertProjectionIsManaged() {
  const existingSkills = SKILLS.filter(({ projection }) => fs.existsSync(path.join(PROJECTION_ROOT, projection)));
  if (!fs.existsSync(MARKER_PATH)) {
    if (existingSkills.length) {
      throw new Error('Refusing to replace existing Skill directories without a projection marker.');
    }
    return;
  }

  const marker = JSON.parse(fs.readFileSync(MARKER_PATH, 'utf8'));
  const knownMarkerVersion = JSON.stringify(marker.skills) === JSON.stringify(SKILL_IDS)
    || JSON.stringify(marker.skills) === JSON.stringify(PREVIOUS_SKILL_IDS)
    || JSON.stringify(marker.skills) === JSON.stringify(INTERMEDIATE_SKILL_IDS)
    || JSON.stringify(marker.skills) === JSON.stringify(LEGACY_SKILL_IDS);
  if (marker.source !== 'plugins/mcu-workbench-verification/skills' || !knownMarkerVersion) {
    throw new Error('The compatibility projection marker does not match this plugin.');
  }

  const legacyMarker = JSON.stringify(marker.skills) === JSON.stringify(LEGACY_SKILL_IDS);
  const previousMarker = JSON.stringify(marker.skills) === JSON.stringify(PREVIOUS_SKILL_IDS);
  const actual = previousMarker
    ? Object.fromEntries(Object.keys(marker.generatedFiles).map((relative) => {
      const filePath = path.join(PROJECTION_ROOT, 'tools', relative);
      return [relative, fs.existsSync(filePath) ? hashFile(filePath) : null];
    }))
    : legacyMarker
      ? Object.fromEntries(Object.keys(marker.generatedFiles).map((relative) => {
        const filePath = path.join(PROJECTION_ROOT, relative);
        return [relative, fs.existsSync(filePath) ? hashFile(filePath) : null];
      }))
      : currentProjectionHashes(marker.skills);
  if (JSON.stringify(actual) !== JSON.stringify(marker.generatedFiles)) {
    throw new Error('Refusing to overwrite a modified compatibility projection. Restore it or review edits first.');
  }

  const unmarkedSkills = SKILL_IDS.filter((skillId) => !marker.skills.includes(skillId));
  assertNewProjectionsMatchBaseline(unmarkedSkills);
}

function stageProjection(stageRoot) {
  const hashes = {};
  for (const { id: skillId, projection } of SKILLS) {
    const sourceDirectory = path.join(SOURCE_ROOT, skillId);
    if (!fs.existsSync(path.join(sourceDirectory, 'SKILL.md'))) {
      throw new Error(`Missing canonical Skill source: ${sourceDirectory}`);
    }
    const targetDirectory = path.join(stageRoot, projection);
    for (const sourceFile of collectFiles(sourceDirectory)) {
      const relative = path.relative(sourceDirectory, sourceFile);
      const stagedFile = path.join(targetDirectory, relative);
      const projectedFile = path.join(PROJECTION_ROOT, projection, relative);
      fs.mkdirSync(path.dirname(stagedFile), { recursive: true });
      if (path.extname(sourceFile).toLowerCase() === '.md') {
        const content = fs.readFileSync(sourceFile, 'utf8');
        fs.writeFileSync(stagedFile, rewriteMarkdownLinks(content, sourceFile, projectedFile), 'utf8');
      } else {
        fs.copyFileSync(sourceFile, stagedFile);
      }
      hashes[path.relative(PROJECTION_ROOT, projectedFile).replace(/\\/g, '/')] = hashFile(stagedFile);
    }
  }
  return hashes;
}

function syncSkills() {
  fs.mkdirSync(PROJECTION_ROOT, { recursive: true });
  fs.mkdirSync(path.dirname(MARKER_PATH), { recursive: true });
  assertProjectionIsManaged();

  const token = `${process.pid}-${Date.now()}`;
  const stageRoot = path.join(PROJECTION_ROOT, `.verification-stage-${token}`);
  const backupRoot = path.join(PROJECTION_ROOT, `.verification-backup-${token}`);
  fs.mkdirSync(stageRoot);
  const generatedFiles = stageProjection(stageRoot);
  fs.mkdirSync(backupRoot);

  const backedUp = [];
  const installed = [];
  try {
    for (const { id: skillId, projection } of SKILLS) {
      const current = path.join(PROJECTION_ROOT, projection);
      const staged = path.join(stageRoot, projection);
      const backup = path.join(backupRoot, projection);
      fs.mkdirSync(path.dirname(staged), { recursive: true });
      fs.mkdirSync(path.dirname(backup), { recursive: true });
      if (fs.existsSync(current)) {
        if (!isWithin(PROJECTION_ROOT, current) || path.dirname(current) !== path.join(PROJECTION_ROOT, path.dirname(projection))) {
          throw new Error(`Unsafe projection path: ${current}`);
        }
        fs.renameSync(current, backup);
        backedUp.push(skillId);
      }
      fs.renameSync(staged, current);
      installed.push(skillId);
    }
  } catch (error) {
    for (const skillId of installed.reverse()) {
      const skill = SKILL_BY_ID.get(skillId);
      fs.rmSync(path.join(PROJECTION_ROOT, skill.projection), { recursive: true, force: true });
    }
    for (const skillId of backedUp.reverse()) {
      const skill = SKILL_BY_ID.get(skillId);
      fs.renameSync(path.join(backupRoot, skill.projection), path.join(PROJECTION_ROOT, skill.projection));
    }
    throw error;
  } finally {
    fs.rmSync(stageRoot, { recursive: true, force: true });
    fs.rmSync(backupRoot, { recursive: true, force: true });
  }

  fs.writeFileSync(MARKER_PATH, `${JSON.stringify({
    source: 'plugins/mcu-workbench-verification/skills',
    skills: SKILL_IDS,
    generatedFiles
  }, null, 2)}\n`, 'utf8');
  console.log(`Generated compatibility projections for ${SKILL_IDS.join(', ')}.`);
}

if (require.main === module) {
  try {
    syncSkills();
  } catch (error) {
    console.error(`Verification Skill projection failed: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { syncSkills };
