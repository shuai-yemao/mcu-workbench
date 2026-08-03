#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');
const {
  generateBspDriver,
  generateCorePeripheral,
  normalizeCorePeripheral,
  normalizeDevice,
  normalizeDeviceType
} = require('../lib/generator');

const STANDARD_HEADERS = new Set(['stdbool.h', 'stddef.h', 'stdint.h', 'inttypes.h', 'limits.h', 'stdint.h']);

function maskCommentsAndStrings(content) {
  let result = '';
  let index = 0;
  let state = 'code';
  while (index < content.length) {
    const current = content[index];
    const next = content[index + 1];
    if (state === 'code' && current === '/' && next === '*') {
      result += '  ';
      index += 2;
      state = 'block';
    } else if (state === 'code' && current === '/' && next === '/') {
      result += '  ';
      index += 2;
      state = 'line';
    } else if (state === 'code' && (current === '"' || current === "'")) {
      result += ' ';
      index += 1;
      state = current === '"' ? 'string' : 'char';
    } else if (state === 'block' && current === '*' && next === '/') {
      result += '  ';
      index += 2;
      state = 'code';
    } else if ((state === 'string' || state === 'char') && current === '\\') {
      result += '  ';
      index += 2;
    } else if ((state === 'string' && current === '"') || (state === 'char' && current === "'")) {
      result += ' ';
      index += 1;
      state = 'code';
    } else {
      result += (state === 'code' || current === '\n' || current === '\r') ? current : ' ';
      if (state === 'line' && current === '\n') state = 'code';
      index += 1;
    }
  }
  return result;
}

function directIncludes(content) {
  return [...content.matchAll(/^\s*#\s*include\s*[<"]([^>"]+)[>"]/gm)].map((match) => match[1]);
}

function findFunctionDefinitions(content) {
  const code = maskCommentsAndStrings(content);
  const definitions = [];
  const expression = /(^|\n)\s*((?:static\s+)?[A-Za-z_][\w\s*]*?)\b([A-Za-z_]\w*)\s*\([^;{}]*\)\s*\{/g;
  for (const match of code.matchAll(expression)) {
    const prefix = match[2];
    const start = (match.index || 0) + match[0].lastIndexOf(match[3]);
    let cursor = code.indexOf('{', start);
    let depth = 0;
    for (; cursor < code.length; cursor += 1) {
      if (code[cursor] === '{') depth += 1;
      else if (code[cursor] === '}') {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    definitions.push({
      name: match[3],
      isStatic: /\bstatic\b/.test(prefix),
      body: code.slice(code.indexOf('{', start) + 1, cursor)
    });
  }
  return definitions;
}

function createLayerError(message) {
  const error = new Error(message);
  error.code = 'LAYER';
  return error;
}

function expectedPaths({ core, deviceType, device }) {
  const type = normalizeDeviceType(deviceType);
  const normalizedDevice = normalizeDevice(device);
  const driverRoot = `Bsp/BoardDriver/${type}/Driver/${normalizedDevice.directory}`;
  const handleRoot = `Bsp/BoardDriver/${type}/Handle`;
  const portRoot = `Bsp/Porting/${type}`;
  const wrapperRoot = `Bsp/Wrapper/${type}`;
  return {
    coreHeader: `Core/Inc/core_${core}.h`,
    coreSource: `Core/Src/core_${core}.c`,
    driverConfig: `${driverRoot}/Inc/bsp_${normalizedDevice.stem}_config.h`,
    driverHeader: `${driverRoot}/Inc/bsp_${normalizedDevice.stem}_driver.h`,
    driverSource: `${driverRoot}/Src/bsp_${normalizedDevice.stem}_driver.c`,
    handleHeader: `${handleRoot}/Inc/bsp_${type}_handle.h`,
    handleSource: `${handleRoot}/Src/bsp_${type}_handle.c`,
    portHeader: `${portRoot}/Inc/drv_adapter_port_${type}.h`,
    portSource: `${portRoot}/Src/drv_adapter_port_${type}.c`,
    wrapperHeader: `${wrapperRoot}/Inc/drv_adapter_wrapper_${type}.h`,
    wrapperSource: `${wrapperRoot}/Src/drv_adapter_wrapper_${type}.c`
  };
}

function readSlice(root, paths, errors) {
  const files = {};
  for (const [role, relative] of Object.entries(paths)) {
    const absolute = path.join(root, relative);
    if (!fs.existsSync(absolute)) {
      errors.push({ ruleId: 'LAYER_REQUIRED_FILE', file: relative, message: 'Required generated file is missing.' });
    } else {
      files[role] = { relative, content: fs.readFileSync(absolute, 'utf8') };
    }
  }
  return files;
}

function addError(errors, ruleId, file, message) {
  errors.push({ ruleId, file, message });
}

function validateSections(files, errors) {
  for (const file of Object.values(files)) {
    if (!file.content.includes('@file')) addError(errors, 'LAYER_FILE_DOC', file.relative, 'Generated file must have an @file documentation header.');
    if (file.relative.endsWith('.c')) {
      for (const section of ['Includes', 'Public Functions']) {
        if (!file.content.includes(`/* ${section} */`)) {
          addError(errors, 'LAYER_SOURCE_SECTION', file.relative, `Generated source must contain ${section} section.`);
        }
      }
    }
  }
}

function validateCore(files, errors) {
  if (!files.coreHeader) return;
  const forbidden = /#\s*include\s*[<"][^>"]*(?:stm32\w*_hal|stm32|FreeRTOS|cmsis_os|task|queue|semphr)[^>"]*[>"]|\b(?:I2C|SPI|UART|GPIO|DMA|TIM|ADC|RTC)_\w*TypeDef\b/i;
  if (forbidden.test(files.coreHeader.content)) {
    addError(errors, 'LAYER_CORE_PUBLIC_LEAK', files.coreHeader.relative, 'Core public header must not expose HAL, RTOS, or vendor types.');
  }
}

function validateWrapper(files, errors) {
  for (const role of ['wrapperHeader', 'wrapperSource']) {
    const file = files[role];
    if (!file) continue;
    for (const include of directIncludes(file.content)) {
      const ownHeader = role === 'wrapperSource' && include === path.basename(files.wrapperHeader.relative);
      if (!ownHeader && !STANDARD_HEADERS.has(include)) {
        addError(errors, 'LAYER_WRAPPER_DEPENDENCY', file.relative, `Wrapper include is not allowed: ${include}.`);
      }
    }
  }
}

function validateHalDriver(files, errors) {
  for (const role of ['driverHeader', 'driverSource']) {
    const file = files[role];
    if (!file) continue;
    const code = maskCommentsAndStrings(file.content);
    if (/\bHAL_[A-Za-z0-9_]+\s*\(|#\s*include\s*[<"][^>"]*(?:stm32|hal|freertos|rtthread|cmsis_os)[^>"]*[>"]/i.test(code)) {
      addError(errors, 'LAYER_HAL_DRIVER_CONCRETE_DEPENDENCY', file.relative, 'HAL Driver must use injected Core and MCU Ops rather than HAL or RTOS dependencies.');
    }
  }
  if (files.driverHeader && !/(?:^|_)register_core_ops\s*\(/m.test(files.driverHeader.content)) {
    addError(errors, 'LAYER_HAL_DRIVER_CORE_OPS', files.driverHeader.relative, 'HAL Driver must expose Core Ops injection.');
  }
  if (files.driverHeader && !/(?:^|_)register_mcu_ops\s*\(/m.test(files.driverHeader.content)) {
    addError(errors, 'LAYER_HAL_DRIVER_MCU_OPS', files.driverHeader.relative, 'HAL Driver must expose MCU Ops injection.');
  }
  if (files.driverSource && !/driver->core_ops\.pf_transaction\s*\(\s*driver->core_ops\.context\s*\)/.test(files.driverSource.content)) {
    addError(errors, 'LAYER_HAL_DRIVER_EFFECTIVE_CORE_OPS', files.driverSource.relative, 'HAL Driver must invoke injected Core Ops in its protocol path.');
  }
  if (files.driverSource && !/driver->mcu_ops\.pf_chip_feature\s*\(\s*driver->mcu_ops\.context\s*\)/.test(files.driverSource.content)) {
    addError(errors, 'LAYER_HAL_DRIVER_EFFECTIVE_MCU_OPS', files.driverSource.relative, 'HAL Driver must invoke injected MCU Ops in its chip-specific protocol path.');
  }
}

function validateHandler(files, errors) {
  for (const role of ['handleHeader', 'handleSource']) {
    const file = files[role];
    if (!file) continue;
    const code = maskCommentsAndStrings(file.content);
    if (/#\s*include\s*[<"][^>"]*(?:drv_adapter_(?:port|wrapper)|core_|mcu_|stm32|hal|freertos|rtthread|osal_internal)[^>"]*[>"]/i.test(code)) {
      addError(errors, 'LAYER_HANDLER_CONCRETE_DEPENDENCY', file.relative, 'Handler must use injected OS Wrapper and HAL Driver Ops only.');
    }
  }
  if (files.handleHeader && !/(?:^|_)register_osal_ops\s*\(/m.test(files.handleHeader.content)) {
    addError(errors, 'LAYER_HANDLER_OS_WRAPPER_OPS', files.handleHeader.relative, 'Handler must expose OS Wrapper Ops injection.');
  }
  if (files.handleSource && !/handle->osal_ops\.pf_notify_from_isr\s*\(\s*handle->osal_ops\.context\s*\)/.test(files.handleSource.content)) {
    addError(errors, 'LAYER_HANDLER_EFFECTIVE_OS_WRAPPER_OPS', files.handleSource.relative, 'Handler must invoke injected OS Wrapper Ops in its public processing path.');
  }
  if (files.handleSource && !/handle->driver_ops\.pf_read_id\s*\(\s*handle->driver_ops\.context\s*,\s*device_id\s*\)/.test(files.handleSource.content)) {
    addError(errors, 'LAYER_HANDLER_EFFECTIVE_HAL_DRIVER_OPS', files.handleSource.relative, 'Handler must invoke injected HAL Driver Ops in its public processing path.');
  }
}

function validatePort(files, type, errors) {
  if (!files.portSource) return;
  const expected = `drv_adapter_port_${type}_register`;
  const definitions = findFunctionDefinitions(files.portSource.content);
  const publicDefinitions = definitions.filter((definition) => !definition.isStatic);
  if (publicDefinitions.length !== 1 || publicDefinitions[0].name !== expected) {
    addError(errors, 'LAYER_PORT_PUBLIC_API', files.portSource.relative, `Port must define exactly one non-static function: ${expected}.`);
  }
  const coreOpsBindings = new Set(
    [...files.portSource.content.matchAll(/\bcore_ops\.[A-Za-z_]\w*\s*=\s*([A-Za-z_]\w*)\s*;/g)].map((match) => match[1])
  );
  for (const definition of definitions.filter((entry) => entry.isStatic)) {
    const callsDriverDirectly = /\bbsp_[a-z0-9_]+_driver\b/i.test(definition.body);
    const callsCoreDirectly = /\bcore_[a-z0-9_]+\b/i.test(definition.body);
    if (callsDriverDirectly || (callsCoreDirectly && !coreOpsBindings.has(definition.name))) {
      addError(errors, 'LAYER_PORT_RUNTIME_BYPASS', files.portSource.relative, `Port runtime function ${definition.name} must call Handle APIs only.`);
    }
    if (/port_(?:core|mcu|osal)/i.test(definition.name)
      && /\breturn\s+(?:\(\s*[A-Za-z_]\w*\s*\)\s*)*0(?:[uUlL]+)?\s*;/.test(definition.body)) {
      addError(errors, 'LAYER_PORT_STUB_OPS', files.portSource.relative, `Port operation ${definition.name} must bind a real platform operation instead of returning success.`);
    }
  }
  if (/\bHAL_[A-Za-z0-9_]+\s*\(/.test(maskCommentsAndStrings(files.portSource.content))) {
    addError(errors, 'LAYER_PORT_HAL', files.portSource.relative, 'Generated Port must not directly call HAL APIs.');
  }
  const requiredInjections = [
    ['LAYER_PORT_CORE_OPS_INJECTION', /driver_register_core_ops\s*\(/, 'Port must inject Core Ops into the HAL Driver.'],
    ['LAYER_PORT_MCU_OPS_INJECTION', /driver_register_mcu_ops\s*\(/, 'Port must inject MCU Ops into the HAL Driver.'],
    ['LAYER_PORT_OS_WRAPPER_OPS_INJECTION', /handle_register_osal_ops\s*\(/, 'Port must inject OS Wrapper Ops into the Handler.'],
    ['LAYER_PORT_HAL_DRIVER_OPS_INJECTION', /handle_register_driver\s*\(/, 'Port must inject HAL Driver Ops into the Handler.'],
    ['LAYER_PORT_WRAPPER_REGISTRATION', /drv_adapter_wrapper_[a-z0-9_]+_register\s*\(/i, 'Port must register BSP public Ops with the Wrapper.']
  ];
  for (const [ruleId, pattern, message] of requiredInjections) {
    if (!pattern.test(files.portSource.content)) addError(errors, ruleId, files.portSource.relative, message);
  }
}

function validateHandle(files, type, errors) {
  if (!files.handleSource) return;
  const prefix = `bsp_${type}_handle`;
  const definitions = findFunctionDefinitions(files.handleSource.content);
  const notify = definitions.find((definition) => definition.name === `${prefix}_notify_from_isr`);
  const process = definitions.find((definition) => definition.name === `${prefix}_process`);
  if (!notify || /event_callback|\bcallback\s*\(/.test(notify.body) || !/from_isr|event_pending/i.test(notify.body)) {
    addError(errors, 'LAYER_HANDLE_ISR_DEFERRAL', files.handleSource.relative, 'Handle ISR notification must defer work and must not call the user callback.');
  }
  if (!process || !/callback\s*\(/.test(process.body) || !/event_pending\s*=\s*false/.test(process.body)) {
    addError(errors, 'LAYER_HANDLE_TASK_CALLBACK', files.handleSource.relative, 'Handle process function must release deferred state before task-context callback.');
  }
}

function validateSsd1306Display(files, errors) {
  const requiredSections = ['Includes', 'Private Defines', 'Private Types', 'Private State', 'Private Functions', 'Public Functions'];
  for (const [role, file] of Object.entries(files)) {
    if (role === 'coreHeader' || role === 'coreSource') continue;
    if (!file.content.includes('@par dependencies') || !file.content.includes('Processing flow:')) {
      addError(errors, 'LAYER_WORKFLOW_DOC_PROFILE', file.relative, 'SSD1306 generated files must use the workflow full-documentation profile.');
    }
    if (file.relative.endsWith('.c')) {
      for (const section of requiredSections) {
        if (!file.content.includes(`/* ${section} */`)) {
          addError(errors, 'LAYER_WORKFLOW_SOURCE_SECTION', file.relative, `Generated source must contain ${section} section.`);
        }
      }
    }
  }
  for (const role of ['handleHeader', 'handleSource']) {
    const file = files[role];
    if (file && /bsp_ssd1306_(?:driver|config)/i.test(file.content)) {
      addError(errors, 'LAYER_HANDLE_DEVICE_DEPENDENCY', file.relative, 'Display Handle must not depend on SSD1306 files or configuration.');
    }
  }
  if (files.driverSource && /\bHAL_[A-Za-z0-9_]+\s*\(|#\s*include\s*[<"][^>"]*(?:stm32|hal|freertos|rtthread|cmsis_os)[^>"]*[>"]/i.test(maskCommentsAndStrings(files.driverSource.content))) {
    addError(errors, 'LAYER_HAL_DRIVER_CONCRETE_DEPENDENCY', files.driverSource.relative, 'SSD1306 Driver must use injected Core Bus Ops only.');
  }
  if (files.portSource) {
    const source = files.portSource.content;
    for (const [ruleId, pattern, message] of [
      ['LAYER_PORT_OSAL_CONSTRUCTION', /osal_mutex_create\s*\(/, 'Display Port must create its declared OSAL mutex.'],
      ['LAYER_PORT_OSAL_INJECTION', /pf_bind_osal\s*\(/, 'Display Port must inject OSAL Ops into the Handle.'],
      ['LAYER_PORT_OSAL_CLEANUP', /osal_mutex_destroy\s*\(/, 'Display Port must release the created OSAL mutex on assembly failure.'],
      ['LAYER_PORT_DIRECT_CONTEXT_OPS', /pf_bind_bus\(driver_api\.p_context/, 'Port must bind context-first Driver Ops directly.'],
      ['LAYER_PORT_WRAPPER_REGISTRATION', /drv_adapter_wrapper_display_register\s*\(/, 'Port must register display public Ops with the Wrapper.']
    ]) {
      if (!pattern.test(source)) addError(errors, ruleId, files.portSource.relative, message);
    }
    if (/\(\s*int32_t\s*\(\s*\*\s*\)/.test(source)) {
      addError(errors, 'LAYER_PORT_FUNCTION_POINTER_CAST', files.portSource.relative, 'Port must not use function-pointer casts for context-first Ops.');
    }
  }
  if (files.handleSource && (!/pf_lock\(/.test(files.handleSource.content)
    || !/pf_unlock\(/.test(files.handleSource.content))) {
    addError(errors, 'LAYER_HANDLER_OSAL_MUTEX_USE', files.handleSource.relative, 'Display Handle must use injected OSAL mutex operations around framebuffer access.');
  }
}

function validateLayerContract({ root, core, deviceType, device } = {}) {
  if (!root || !core || !deviceType || !device) throw createLayerError('--root, --core, --device-type, and --device are required.');
  const normalizedCore = normalizeCorePeripheral(core);
  const type = normalizeDeviceType(deviceType);
  const normalizedDevice = normalizeDevice(device);
  const paths = expectedPaths({ core: normalizedCore, deviceType: type, device });
  const errors = [];
  const resolvedRoot = path.resolve(root);
  const files = readSlice(resolvedRoot, paths, errors);
  validateSections(files, errors);
  validateCore(files, errors);
  validateWrapper(files, errors);
  if (normalizedDevice.stem === 'ssd1306') {
    validateSsd1306Display(files, errors);
  } else {
    validateHalDriver(files, errors);
    validateHandler(files, errors);
    validatePort(files, type, errors);
    validateHandle(files, type, errors);
  }
  return { root: resolvedRoot, paths, errors, valid: errors.length === 0 };
}

function parseArgs(argv, cwd = process.cwd()) {
  if (argv.length === 1 && argv[0] === '--self-check') return { selfCheck: true };
  const options = { root: null, core: null, deviceType: null, device: null, json: false };
  const names = { '--root': 'root', '--core': 'core', '--device-type': 'deviceType', '--device': 'device' };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--json') options.json = true;
    else if (names[argument]) {
      const value = argv[++index];
      if (!value) throw createLayerError(`${argument} requires a value.`);
      options[names[argument]] = argument === '--root' ? path.resolve(cwd, value) : value;
    }
    else throw createLayerError(`Unknown argument: ${argument}`);
  }
  if (!options.root || !options.core || !options.deviceType || !options.device) {
    throw createLayerError('--root, --core, --device-type, and --device are required.');
  }
  return options;
}

async function runSelfCheck() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'mcu-layer-contract-self-check-'));
  try {
    const files = [
      ...(await generateCorePeripheral('spi', 'stm32f4')),
      ...(await generateBspDriver({
        deviceType: 'externflash', device: 'W25Q64', cores: ['spi'], platform: 'stm32f4'
      }))
    ];
    for (const file of files) {
      const target = path.join(root, file.path);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, file.content, 'utf8');
    }
    return validateLayerContract({ root, core: 'spi', deviceType: 'externflash', device: 'W25Q64' });
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const result = options.selfCheck ? await runSelfCheck() : validateLayerContract(options);
  if (options.json) console.log(JSON.stringify(result, null, 2));
  else if (result.valid) console.log(`Layer contract valid: ${result.root}${options.selfCheck ? ' (generated self-check)' : ''}`);
  else result.errors.forEach((error) => console.error(`${error.ruleId} ${error.file}: ${error.message}`));
  process.exitCode = result.valid ? 0 : 3;
  return result;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`Layer validation failed: ${error.message}`);
    process.exitCode = error.code === 'LAYER' || error.code === 'USAGE' ? 3 : 1;
  });
}

module.exports = {
  directIncludes,
  expectedPaths,
  findFunctionDefinitions,
  maskCommentsAndStrings,
  parseArgs,
  runSelfCheck,
  validateHalDriver,
  validateHandler,
  validateSsd1306Display,
  validateLayerContract
};
