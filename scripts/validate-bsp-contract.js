const fs = require('fs');
const FORBIDDEN_DRIVER_INCLUDE = /#\s*include\s*[<"][^>"]*(?:stm32|hal|freertos|cmsis_os)[^>"]*[>"]/i;

function readFile(filePath) {
  return filePath && fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
}

function getExportedBspFunctions(content) {
  return [...content.matchAll(/\b(bsp_[a-zA-Z0-9_]+)\s*\(/g)].map((match) => match[1]);
}

function getPublicDefinitions(content) {
  return [...content.matchAll(/^(?!\s*static\b)\s*[a-zA-Z_][\w\s*]*?\b(bsp_[a-zA-Z0-9_]+)\s*\([^;{}]*\)\s*\{/gm)]
    .map((match) => match[1]);
}

function validateBspContract(options = {}) {
  const errors = [];
  if (options.apiPolicy === 'instance_only') {
    const header = readFile(options.driverHeader);
    const source = readFile(options.driverSource);
    const headerFunctions = getExportedBspFunctions(header);
    const sourceFunctions = getPublicDefinitions(source);
    const invalid = [...headerFunctions, ...sourceFunctions]
      .filter((name) => !/_driver_inst$/.test(name));
    if (invalid.length) errors.push(`instance_only Driver exports forbidden functions: ${[...new Set(invalid)].join(', ')}`);
    if (FORBIDDEN_DRIVER_INCLUDE.test(header) || FORBIDDEN_DRIVER_INCLUDE.test(source)) {
      errors.push('Driver must not include HAL, FreeRTOS, CMSIS-OS, or STM32 headers.');
    }
    if (!/\bis_inited\b/.test(header)) errors.push('Driver header must declare is_inited.');
    if (!/\bpf_[a-zA-Z0-9_]+\b/.test(header)) errors.push('Driver header must declare pf_* instance operations.');
  }
  return { errors };
}

module.exports = { validateBspContract };
