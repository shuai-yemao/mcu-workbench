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

function validateHandler(options, errors) {
  const header = readFile(options.handlerHeader);
  const source = readFile(options.handlerSource);
  if (!/\b[a-zA-Z0-9_]+_handler_driver_ops_t\b/.test(header)) {
    errors.push('Handler header must declare a handler_driver_ops_t interface.');
  }
  if (!/\bis_inited\b/.test(header)) errors.push('Handler header must declare is_inited.');
  if (/^\s*#\s*include\s*[<"][^>"]*driver\.h[>"]/im.test(source)) {
    errors.push('Handler must not include a concrete Driver header.');
  }
  if (/_ISR\b/.test(source) && !/FromISR/.test(source)) {
    errors.push('Handler ISR entry points must use a FromISR deferral interface.');
  }
}

function validateBspContract(options = {}) {
  const errors = [];
  if (options.apiPolicy === 'instance_only' && (options.driverHeader || options.driverSource)) {
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
  if (options.handlerHeader || options.handlerSource) validateHandler(options, errors);
  return { errors };
}

module.exports = { validateBspContract };
