const { DEVICE_PROFILES } = require('./codegen/device-profile');

const CORE_PERIPHERALS = ['gpio', 'i2c', 'spi', 'adc', 'tim', 'uart', 'wdg', 'rtc'];

function createError(message, code = 'USAGE') {
  const error = new Error(message);
  error.code = code;
  return error;
}

function normalizeCorePeripheral(peripheral) {
  const normalized = String(peripheral || '').trim().toLowerCase();
  const canonical = normalized;
  if (!CORE_PERIPHERALS.includes(canonical)) {
    throw createError(`Unsupported Core peripheral: ${peripheral}. Supported values: ${CORE_PERIPHERALS.join(', ')}.`);
  }
  return canonical;
}

function normalizeDeviceType(deviceType) {
  const normalized = String(deviceType || '').trim().toLowerCase().replace(/-/g, '_');
  if (!/^[a-z][a-z0-9_]*$/.test(normalized)) {
    throw createError('--device-type must use lower snake_case, for example externflash.');
  }
  return normalized;
}

function normalizeDevice(device) {
  const value = String(device || '').trim();
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(value)) {
    throw createError('--device must start with a letter and contain only letters, numbers, or underscores.');
  }
  return { directory: value.toUpperCase(), stem: value.toLowerCase() };
}

function normalizeCoreList(cores) {
  const values = Array.isArray(cores) ? cores : [cores];
  const normalized = [];
  for (const value of values) {
    const core = normalizeCorePeripheral(value);
    if (!normalized.includes(core)) normalized.push(core);
  }
  if (!normalized.length) throw createError('At least one --core option is required.');
  return normalized;
}

function validateDeviceProfile({ deviceType, device, cores, allowCustomDevice = false }) {
  const profile = DEVICE_PROFILES[device.stem];
  if (!profile) {
    if (!allowCustomDevice) {
      throw createError(`Unknown device ${device.directory}. Add --allow-custom-device after reviewing its bus contract.`);
    }
    return;
  }
  if (profile.deviceType !== deviceType || profile.cores.some((core) => !cores.includes(core))) {
    throw createError(`${device.directory} requires --device-type ${profile.deviceType} and --core ${profile.cores.join(' --core ')}.`);
  }
}

function formatGeneratedFiles(files) {
  return require('./codegen/formatter').formatGeneratedFiles(files);
}

function formatExistingCode(content, fileName) {
  return require('./codegen/formatter').formatExistingCode(content, fileName);
}

async function generateCorePeripheral(peripheral, platform) {
  return require('./codegen/renderers/platform-mcu-core').generateCorePeripheral(peripheral, platform);
}

async function generateSsd1306Display() {
  return require('./codegen/renderers/impl-bsp-model-first').generateSsd1306Display();
}

async function generateBspDriver(options) {
  return require('./codegen/renderers/impl-bsp-model-first').generateBspDriver(options);
}

async function writeGeneratedFiles(files, outputDir, { force = false } = {}) {
  return require('./codegen/writer').writeGeneratedFiles(files, outputDir, { force });
}

async function generate(request) {
  return require('./codegen').generate(request);
}

module.exports = {
  CORE_PERIPHERALS,
  DEVICE_PROFILES,
  createError,
  generateSsd1306Display,
  generateBspDriver,
  generateCorePeripheral,
  normalizeCoreList,
  normalizeCorePeripheral,
  normalizeDevice,
  normalizeDeviceType,
  validateDeviceProfile,
  formatGeneratedFiles,
  formatExistingCode,
  generate,
  writeGeneratedFiles
};
