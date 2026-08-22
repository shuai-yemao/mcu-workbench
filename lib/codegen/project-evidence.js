const fs = require('fs').promises;
const path = require('path');

const SKIP_DIRECTORIES = new Set(['.git', '.mcu-workbench', 'build', 'node_modules', 'cmake-build-debug']);

const EVIDENCE_MATCHERS = Object.freeze({
  platform_os_public_headers: (file) => /(?:^|\/)03_Platform\/platform_os\/.*\.h$/i.test(file) || /(?:^|\/)platform_os_[^/]*\.h$/i.test(file),
  platform_os_internal_headers: (file) => /platform_os_internal[^/]*\.h$/i.test(file),
  impl_os_mapping: (file) => /(?:^|\/)04_Impl\/impl_os\/.*\.(?:c|h)$/i.test(file) || /(?:^|\/)impl_os_[^/]*\.(?:c|h)$/i.test(file),
  chip_exact_model: (file) => /\.(?:ioc|uvprojx|uvproj|ewp|sln)$/i.test(file) || /(?:^|\/)(?:sdkconfig|Kconfig|board[^/]*\.(?:h|c))$/i.test(file),
  hal_cmsis_version: (file) => /(?:hal|cmsis|device|stm32|gd32|at32)[^/]*\.(?:c|h|xml|json|yml|yaml|txt)$/i.test(file),
  peripheral_instances: (file) => /(?:\.ioc$|(?:board|bsp|pin|clock|dma|irq)[^/]*\.(?:c|h))$/i.test(file),
  build_entry: (file) => /(?:^|\/)(?:CMakeLists\.txt|Makefile|platformio\.ini|idf_component\.yml|project\.yml|[^/]+\.uvprojx|[^/]+\.ewp)$/i.test(file),
  rtos_or_baremetal_backend: (file) => /(?:freertos|rt-thread|rtthread|cmsis[-_]?os|baremetal|kernel)[^/]*\.(?:c|h|s|S|txt|mk)$/i.test(file),
  rtos_config: (file) => /(?:FreeRTOSConfig\.h|FreeRTOS[^/]*Config[^/]*|rtconfig\.h|os_config[^/]*\.(?:h|c))$/i.test(file),
  vendor_source_root: (file) => /(?:^|\/)(?:05_Vendor|Vendor|Drivers|Middlewares|ThirdParty|third_party)(?:\/|$)/i.test(file),
  version_or_commit: (file) => /(?:^|\/)(?:package\.json|VERSION|version\.h|CMakePresets\.json|\.gitmodules)$/i.test(file),
  license_record: (file) => /(?:^|\/)(?:LICENSE|NOTICE|COPYING)(?:\.[^/]*)?$/i.test(file)
});

async function collectFiles(root, current = root, output = []) {
  const entries = await fs.readdir(current, { withFileTypes: true });
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (entry.isDirectory() && SKIP_DIRECTORIES.has(entry.name)) continue;
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) {
      await collectFiles(root, absolute, output);
    } else if (entry.isFile()) {
      output.push(path.relative(root, absolute).split(path.sep).join('/'));
    }
  }
  return output;
}

async function collectProjectEvidence(projectRoot) {
  const root = path.resolve(String(projectRoot || ''));
  if (!projectRoot) {
    const error = new Error('projectRoot is required for project evidence collection.');
    error.code = 'EVIDENCE_ROOT';
    throw error;
  }
  let stat;
  try {
    stat = await fs.stat(root);
  } catch (error) {
    const wrapped = new Error(`Project evidence root is not accessible: ${root}`);
    wrapped.code = 'EVIDENCE_ROOT';
    wrapped.cause = error;
    throw wrapped;
  }
  if (!stat.isDirectory()) {
    const error = new Error(`Project evidence root is not a directory: ${root}`);
    error.code = 'EVIDENCE_ROOT';
    throw error;
  }

  const files = await collectFiles(root);
  const categories = Object.fromEntries(Object.entries(EVIDENCE_MATCHERS).map(([id, matcher]) => [
    id,
    files.filter(matcher)
  ]));
  return {
    schemaVersion: 'project-evidence-v1',
    root,
    fileCount: files.length,
    categories,
    evidence: Object.fromEntries(Object.entries(categories).map(([id, matches]) => [id, {
      status: matches.length ? 'confirmed-by-static-scan' : 'unverified',
      files: matches
    }]))
  };
}

module.exports = { EVIDENCE_MATCHERS, collectProjectEvidence };
