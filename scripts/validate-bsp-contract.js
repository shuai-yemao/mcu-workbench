const fs = require('fs');
const path = require('path');
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
  if (!/\b[a-zA-Z0-9_]+_(?:handler|handle)_driver_ops_t\b/.test(header)) {
    errors.push('Handle header must declare a handler_driver_ops_t or handle_driver_ops_t interface.');
  }
  if (!/\bis_inited\b/.test(header)) errors.push('Handler header must declare is_inited.');
  if (/^\s*#\s*include\s*[<"][^>"]*driver\.h[>"]/im.test(source)) {
    errors.push('Handler must not include a concrete Driver header.');
  }
  const notify = source.match(/\b[a-zA-Z0-9_]+_notify_from_isr\s*\([^)]*\)\s*\{([\s\S]*?)\n\}/);
  if (notify && (/event_callback|\bcallback\s*\(/.test(notify[1]) || !/event_pending|from_isr/i.test(notify[1]))) {
    errors.push('Handle ISR notification must defer work without invoking the callback.');
  }
  if (/_ISR\b/.test(source) && !/FromISR/.test(source)) {
    errors.push('Handler ISR entry points must use a FromISR deferral interface.');
  }
}

function validateAdapter(options, errors) {
  const port = readFile(options.portSource);
  const wrapper = readFile(options.wrapperSource);
  if (port) {
    const publicDefinitions = [...port.matchAll(/^(?!\s*static\b)\s*[A-Za-z_]\w*[\w\s*]*\b([A-Za-z_]\w*)\s*\([^;{}]*\)\s*\{/gm)].map((match) => match[1]);
    if (publicDefinitions.length !== 1 || !/^drv_adapter_port_[a-z0-9_]+_register$/.test(publicDefinitions[0] || '')) {
      errors.push('Port must export exactly one drv_adapter_port_<type>_register function.');
    }
    const staticFunctions = [...port.matchAll(/static[\s\S]*?\b([A-Za-z_]\w*)\s*\([^;{}]*\)\s*\{([\s\S]*?)\n\}/g)];
    if (staticFunctions.some((match) => /\b(?:bsp_[a-z0-9_]+_driver|core_[a-z0-9_]+)\b/i.test(match[2]))) {
      errors.push('Port runtime functions must call Handle APIs only.');
    }
  }
  if (wrapper && /#\s*include\s*[<"][^>"]*(?:driver|handle|hal|freertos|cmsis_os|stm32)[^>"]*[>"]/i.test(wrapper)) {
    errors.push('Wrapper must not include Driver, Handle, HAL, or RTOS headers.');
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
  if (options.portSource || options.wrapperSource) validateAdapter(options, errors);
  if (options.acceptancePath && !fs.existsSync(options.acceptancePath)) {
    errors.push(`Acceptance record not found: ${options.acceptancePath}`);
  }
  return { errors };
}

function parseArgs(argv) {
  const names = {
    '--driver-header': 'driverHeader', '--driver-source': 'driverSource',
    '--handler-header': 'handlerHeader', '--handler-source': 'handlerSource',
    '--port-source': 'portSource', '--wrapper-source': 'wrapperSource', '--acceptance': 'acceptancePath', '--api-policy': 'apiPolicy'
  };
  const options = {};
  for (let index = 0; index < argv.length; index += 2) {
    if (!names[argv[index]] || !argv[index + 1]) throw new Error(`Unknown or incomplete argument: ${argv[index] || ''}`.trim());
    options[names[argv[index]]] = argv[index] === '--api-policy' ? argv[index + 1] : path.resolve(argv[index + 1]);
  }
  return options;
}

if (require.main === module) {
  const result = validateBspContract(parseArgs(process.argv.slice(2)));
  if (result.errors.length) {
    console.error(result.errors.join('\n'));
    process.exitCode = 1;
  }
}

module.exports = { validateBspContract, parseArgs };
