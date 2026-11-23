'use strict';

const fs = require('fs');
const path = require('path');
const { formatExistingCode } = require('./generator');

const SOURCE_EXTENSION = /\.(?:c|h|cc|cpp|cxx|hpp)$/i;
const EXCLUDED_DIRECTORY = /^(?:\.git|\.mcu-workbench|\.claude|build|cmake-build-debug|node_modules)$/i;
const VENDOR_DIRECTORY = /^05_Vendor$/i;
const QUALITY_SCOPE_RELATIVE_PATH = '.mcu-workbench/quality-scope.json';

function isMutationTool(toolName) {
  return toolName === 'write' || toolName === 'edit' || toolName === 'apply_patch';
}

function parsePatchPaths(patchText) {
  const paths = [];
  for (const line of String(patchText || '').split(/\r?\n/)) {
    const match = line.match(/^\*\*\*\s+(?:Update|Add|Delete) File:\s+(.+?)\s*$/)
      || line.match(/^\*\*\*\s+Move to:\s+(.+?)\s*$/);
    if (match) paths.push(match[1].trim());
  }
  return paths;
}

function normalizeRelativePath(value) {
  const normalized = path.posix.normalize(String(value || '').replace(/\\/g, '/'));
  if (!normalized || normalized === '.' || normalized.startsWith('../')
    || normalized.startsWith('/')) return null;
  return normalized.replace(/^\.\//, '').replace(/\/$/, '');
}

function normalizeManagedVendorRoots(roots) {
  if (!Array.isArray(roots)) return [];
  return roots
    .map(normalizeRelativePath)
    .filter((value) => value && /^05_Vendor(?:\/|$)/i.test(value));
}

function loadQualityScope(projectRoot) {
  const scopeFile = path.join(projectRoot, QUALITY_SCOPE_RELATIVE_PATH);
  try {
    const scope = JSON.parse(fs.readFileSync(scopeFile, 'utf8'));
    return {
      managedVendorRoots: normalizeManagedVendorRoots(scope.managedVendorRoots)
    };
  } catch (error) {
    if (error.code !== 'ENOENT') return { managedVendorRoots: [] };
    return { managedVendorRoots: [] };
  }
}

function createCodeQualityHooks({ root, formatFile = formatExistingCode, fsImpl = fs.promises } = {}) {
  const projectRoot = path.resolve(root || process.cwd());
  const qualityScope = loadQualityScope(projectRoot);
  const snapshots = new Map();
  const active = new Set();

  function isManagedVendorPath(relative) {
    const parts = relative.split('/');
    const vendorIndex = parts.findIndex((part) => VENDOR_DIRECTORY.test(part));
    if (vendorIndex < 0) return true;
    const vendorPath = parts.join('/');
    return qualityScope.managedVendorRoots.some((rootPath) => (
      vendorPath === rootPath || vendorPath.startsWith(`${rootPath}/`)
    ));
  }

  function resolveProjectFile(filePath) {
    if (!filePath || typeof filePath !== 'string') return null;
    const absolute = path.resolve(projectRoot, filePath);
    const relative = path.relative(projectRoot, absolute);
    if (!relative || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) return null;
    const normalized = relative.split(path.sep).join('/');
    const parts = normalized.split('/');
    if (parts.some((part) => EXCLUDED_DIRECTORY.test(part)) || !SOURCE_EXTENSION.test(normalized)) return null;
    if (!isManagedVendorPath(normalized)) return null;
    return { absolute, relative: normalized };
  }

  function mutationPaths(toolName, args) {
    if (!isMutationTool(toolName)) return [];
    if (toolName === 'apply_patch') return parsePatchPaths(args?.patchText).map(resolveProjectFile).filter(Boolean);
    return [args?.filePath || args?.path || args?.file]
      .map(resolveProjectFile)
      .filter(Boolean);
  }

  async function snapshotPath(file) {
    if (snapshots.has(file.absolute)) return;
    try {
      snapshots.set(file.absolute, { exists: true, content: await fsImpl.readFile(file.absolute, 'utf8') });
    } catch (error) {
      if (error.code === 'ENOENT') snapshots.set(file.absolute, { exists: false, content: null });
      else throw error;
    }
  }

  async function restorePath(file, snapshot) {
    if (snapshot?.exists) {
      await fsImpl.writeFile(file.absolute, snapshot.content, 'utf8');
    } else {
      try {
        await fsImpl.unlink(file.absolute);
      } catch (error) {
        if (error.code !== 'ENOENT') throw error;
      }
    }
  }

  async function beforeTool(input, output) {
    for (const file of mutationPaths(input.tool, output.args)) await snapshotPath(file);
  }

  async function processEditedFile(filePath) {
    const file = resolveProjectFile(filePath);
    if (!file || active.has(file.absolute)) return;
    const snapshot = snapshots.get(file.absolute);
    snapshots.delete(file.absolute);
    if (!snapshot) {
      const error = new Error(`无法对 ${file.relative} 执行可回滚的质量处理：缺少写入前快照。`);
      error.code = 'QUALITY_SNAPSHOT_MISSING';
      throw error;
    }

    active.add(file.absolute);
    try {
      const current = await fsImpl.readFile(file.absolute, 'utf8');
      const normalized = formatFile(current, file.absolute);
      if (normalized !== current) await fsImpl.writeFile(file.absolute, normalized, 'utf8');
    } catch (error) {
      await restorePath(file, snapshot);
      const wrapped = new Error(`代码质量处理失败，已恢复 ${file.relative}：${error.message}`);
      wrapped.code = error.code || 'QUALITY_PROCESSING_FAILED';
      wrapped.file = file.relative;
      throw wrapped;
    } finally {
      active.delete(file.absolute);
    }
  }

  async function eventHook({ event }) {
    if (event?.type !== 'file.edited') return;
    await processEditedFile(event.properties?.file);
  }

  return {
    event: eventHook,
    'tool.execute.before': beforeTool,
    _private: {
      snapshots,
      processEditedFile,
      resolveProjectFile,
      qualityScope
    }
  };
}

module.exports = {
  createCodeQualityHooks,
  isMutationTool,
  parsePatchPaths,
  QUALITY_SCOPE_RELATIVE_PATH,
  loadQualityScope,
  normalizeManagedVendorRoots
};
