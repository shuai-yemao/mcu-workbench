'use strict';

const path = require('node:path');

const PLUGIN_OUTPUT_ROOT = '00_Docs/06_嵌入式插件输出';
const PLUGIN_OUTPUT_DIRECTORIES = Object.freeze({
  architecture: `${PLUGIN_OUTPUT_ROOT}/architecture`,
  verification: `${PLUGIN_OUTPUT_ROOT}/verification`,
  devlog: `${PLUGIN_OUTPUT_ROOT}/devlog`,
  notes: `${PLUGIN_OUTPUT_ROOT}/notes`,
});
const PLUGIN_DASHBOARD_RELATIVE_PATH = `${PLUGIN_OUTPUT_ROOT}/workflow-dashboard.html`;
const LEGACY_OUTPUT_DIRECTORIES = Object.freeze({
  architecture: 'docs/architecture',
  verification: 'docs/verification',
  devlog: 'docs/devlog',
  notes: 'docs/notes',
});

function projectOutputPath(projectRoot, relativePath) {
  return path.join(path.resolve(projectRoot), ...String(relativePath).split('/'));
}

function pluginOutputRootPath(projectRoot) {
  return projectOutputPath(projectRoot, PLUGIN_OUTPUT_ROOT);
}

function pluginDashboardPath(projectRoot) {
  return projectOutputPath(projectRoot, PLUGIN_DASHBOARD_RELATIVE_PATH);
}

function pluginOutputDirectories(projectRoot) {
  return Object.fromEntries(
    Object.entries(PLUGIN_OUTPUT_DIRECTORIES).map(([name, relativePath]) => [name, projectOutputPath(projectRoot, relativePath)]),
  );
}

function isPathInside(parent, candidate) {
  const relative = path.relative(path.resolve(parent), path.resolve(candidate));
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

module.exports = {
  LEGACY_OUTPUT_DIRECTORIES,
  PLUGIN_DASHBOARD_RELATIVE_PATH,
  PLUGIN_OUTPUT_DIRECTORIES,
  PLUGIN_OUTPUT_ROOT,
  isPathInside,
  pluginDashboardPath,
  pluginOutputDirectories,
  pluginOutputRootPath,
  projectOutputPath,
};
