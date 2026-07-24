const fs = require('fs');
const path = require('path');
const { ROOT, readJson } = require('./common');

const FORBIDDEN_CODEX_KEYS = new Set(['agents', 'hooks', 'mcpServers']);

function validateCodexManifest(errors) {
  const manifestPath = path.join(ROOT, '.codex-plugin', 'plugin.json');
  if (!fs.existsSync(manifestPath)) return false;
  const manifest = readJson('.codex-plugin/plugin.json', errors);
  if (!manifest) return false;
  if (manifest.name !== 'mcu-workbench') errors.push('codex manifest: name 必须为 mcu-workbench');
  if (manifest.skills !== './skills/') errors.push('codex manifest: skills 必须为 ./skills/');
  if (!manifest.interface || manifest.interface.displayName !== 'MCU-Workbench') errors.push('codex manifest: 缺少 interface.displayName');
  if (!manifest.interface || !manifest.interface.shortDescription) errors.push('codex manifest: 缺少 interface.shortDescription');
  if (!manifest.interface || !manifest.interface.longDescription) errors.push('codex manifest: 缺少 interface.longDescription');
  for (const key of FORBIDDEN_CODEX_KEYS) if (Object.prototype.hasOwnProperty.call(manifest, key)) errors.push(`codex manifest: 当前适配禁止字段 ${key}`);
  if (!fs.existsSync(path.join(ROOT, 'skills'))) errors.push('codex manifest: skills 目录不存在');
  return true;
}

function validateClaudeManifestSkillPaths(manifest, expectedLayers, errors) {
  if (!manifest || !Array.isArray(manifest.skills)) return;

  const expectedManifestPaths = new Set([...expectedLayers].map((layer) => `./skills/${layer}/`));
  const actualManifestPaths = new Set(manifest.skills);
  for (const skillPath of expectedManifestPaths) {
    if (!actualManifestPaths.has(skillPath)) errors.push(`manifest: 缺少 skills 路径 ${skillPath}`);
  }
  for (const skillPath of actualManifestPaths) {
    if (!expectedManifestPaths.has(skillPath)) errors.push(`manifest: 未登记 skills 路径 ${skillPath}`);
    if (!/^\.\/skills\/[a-z0-9-]+\/$/.test(skillPath)) {
      errors.push(`manifest: skills 路径格式无效 ${skillPath}`);
      continue;
    }
    const resolved = path.resolve(ROOT, skillPath.slice(2));
    const skillsRoot = path.join(ROOT, 'skills');
    if (!resolved.startsWith(skillsRoot + path.sep)) {
      errors.push(`manifest: skills 路径越界 ${skillPath}`);
      continue;
    }
    if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
      errors.push(`manifest: skills 路径不存在 ${skillPath}`);
    }
  }
}

module.exports = {
  FORBIDDEN_CODEX_KEYS,
  validateCodexManifest,
  validateClaudeManifestSkillPaths
};
