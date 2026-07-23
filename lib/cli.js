const packageMeta = require('../package.json');
const mcuNew = require('../commands/mcu-new');
const mcuDriver = require('../commands/mcu-driver');
const mcuBuild = require('../commands/mcu-build');
const mcuFlash = require('../commands/mcu-flash');
const mcuDebug = require('../commands/mcu-debug');
const {
  getAllSkills,
  getSkillsByCategory,
  getSkillsByPlatform,
} = require('../skills/registry');
const { listSupportedPlatforms, getPlatformConfig } = require('./platform');

const COMMANDS = {
  new: mcuNew,
  driver: mcuDriver,
  build: mcuBuild,
  flash: mcuFlash,
  debug: mcuDebug,
  monitor: mcuDebug.monitor
};

const COMMAND_ALIASES = {
  'mcu-new': 'new',
  'mcu-driver': 'driver',
  'mcu-build': 'build',
  'mcu-flash': 'flash',
  'mcu-debug': 'debug',
  'mcu-monitor': 'monitor'
};

const BOOLEAN_OPTIONS = new Set(['help', 'json', 'version', 'execute', 'clean', 'all', 'write']);
const GLOBAL_OPTIONS = new Set(['help', 'json', 'version']);

function toOptionKey(name) {
  return name.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function parseBoolean(value) {
  if (value === undefined) return true;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  throw new Error(`Invalid boolean value: ${value}`);
}

function parseArgs(argv) {
  const args = [...argv];
  const options = {};
  let command = null;

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (token === '--') {
      throw new Error('Positional arguments are not supported');
    }

    if (token.startsWith('--')) {
      const raw = token.slice(2);
      const equalIndex = raw.indexOf('=');
      const name = equalIndex === -1 ? raw : raw.slice(0, equalIndex);
      const inlineValue = equalIndex === -1 ? undefined : raw.slice(equalIndex + 1);
      if (!name) throw new Error('Empty option name');

      let value;
      if (BOOLEAN_OPTIONS.has(name)) {
        value = parseBoolean(inlineValue);
      } else if (inlineValue !== undefined) {
        value = inlineValue;
      } else if (index + 1 < args.length && !args[index + 1].startsWith('--')) {
        value = args[++index];
      } else {
        throw new Error(`Option --${name} requires a value`);
      }
      options[toOptionKey(name)] = value;
      continue;
    }

    if (!command) {
      command = COMMAND_ALIASES[token] || token;
    } else {
      throw new Error(`Unexpected argument: ${token}`);
    }
  }

  return { command, options };
}

function applyDefaults(command, options) {
  const spec = COMMANDS[command];
  if (!spec) return options;

  const normalized = { ...options };
  for (const option of spec.options || []) {
    const key = toOptionKey(option.name.replace(/^--/, ''));
    if (normalized[key] === undefined && option.default !== undefined) {
      normalized[key] = option.default;
    }
  }
  return normalized;
}

function validateOptions(command, options) {
  const spec = COMMANDS[command];
  if (!spec) return;

  const allowed = new Set([
    ...GLOBAL_OPTIONS,
    ...(spec.options || []).map((option) => option.name.replace(/^--/, '')),
    ...((command === 'build' || command === 'flash') ? ['execute'] : []),
    ...(command === 'skills' ? ['all'] : [])
  ]);
  for (const key of Object.keys(options)) {
    const cliName = key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
    if (!allowed.has(cliName)) throw new Error(`Unknown option for ${command}: --${cliName}`);
  }

  for (const option of spec.options || []) {
    const key = toOptionKey(option.name.replace(/^--/, ''));
    if (option.required && (options[key] === undefined || options[key] === '')) {
      throw new Error(`Option ${option.name} is required`);
    }
  }
}

function getHelp(command) {
  if (!command) {
    return [
      `mcu-workbench v${packageMeta.version}`,
      '',
      'Usage: mcu-workbench <command> [options]',
      '',
      'Commands:',
      '  new        Create a project skeleton',
      '  driver     Generate BSP driver files',
      '  build      Generate or execute a build plan',
      '  flash      Generate or execute a flash plan',
      '  debug      Generate an OpenOCD/GDB debug plan',
      '  monitor    Generate a serial monitor plan',
      '  platforms  List supported MCU platforms',
      '  skills     List active skills (use --all for archived entries)',
      '',
      'Global options: --help, --version, --json',
      'Build/flash execution is opt-in: add --execute.'
    ].join('\n');
  }

  const canonical = COMMAND_ALIASES[command] || command;
  if (canonical === 'platforms' || canonical === 'skills') {
    return canonical === 'platforms'
      ? 'Usage: mcu-workbench platforms [--json]'
      : 'Usage: mcu-workbench skills [--category <name>] [--platform <name>] [--all] [--json]';
  }
  const spec = COMMANDS[canonical];
  if (!spec) return `Unknown command: ${command}`;
  const lines = [`Usage: mcu-workbench ${canonical} [options]`, '', spec.description, '', 'Options:'];
  for (const option of spec.options || []) {
    const suffix = option.required ? ' (required)' : option.default !== undefined ? ` (default: ${option.default})` : '';
    lines.push(`  ${option.name.padEnd(16)} ${option.description}${suffix}`);
  }
  lines.push('  --json           Print machine-readable JSON');
  if (canonical === 'build' || canonical === 'flash') lines.push('  --execute        Run the generated external command');
  return lines.join('\n');
}

function formatSkills(options) {
  const allSkills = getAllSkills();
  let skills = allSkills;
  if (options.category) skills = getSkillsByCategory(options.category);
  if (options.platform) skills = getSkillsByPlatform(options.platform);
  if (!options.all) {
    skills = Object.fromEntries(Object.entries(skills).filter(([, skill]) => skill.canonical));
  }
  return {
    success: true,
    skills: Object.entries(skills).map(([id, skill]) => ({ id, ...skill }))
  };
}

async function dispatch(command, options) {
  if (command === 'platforms') {
    return {
      success: true,
      platforms: listSupportedPlatforms().map((id) => ({ id, ...getPlatformConfig(id) }))
    };
  }
  if (command === 'skills') return formatSkills(options);

  const spec = COMMANDS[command];
  if (!spec) throw new Error(`Unknown command: ${command}`);
  return spec.handler({ ...options, quiet: Boolean(options.json) });
}

function printHuman(command, result, stdout) {
  if (command === 'platforms') {
    result.platforms.forEach((platform) => stdout(`${platform.id}\t${platform.name}\t${platform.arch}`));
    return;
  }
  if (command === 'skills') {
    result.skills.forEach((skill) => stdout(`${skill.id}\t${skill.description}${skill.archived ? ' [archived]' : ''}`));
    return;
  }
  if (result.path) stdout(`Created project: ${result.path}`);
  if (result.files) stdout(`Generated ${result.files.length} files for ${result.peripheral} driver`);
  if (result.output) stdout(result.output);
  if (result.command) stdout(`Command: ${result.command}`);
  if (result.openocdCommand) stdout(`OpenOCD: ${result.openocdCommand}`);
  if (result.gdbCommand) stdout(`GDB: ${result.gdbCommand}`);
  if (result.port && result.baudRate) stdout(`Monitor: ${result.port} @ ${result.baudRate}`);
}

async function runCli(argv = process.argv.slice(2), io = {}) {
  const stdout = io.stdout || ((line) => console.log(line));
  const stderr = io.stderr || ((line) => console.error(line));
  let parsed;

  try {
    parsed = parseArgs(argv);
    if (parsed.options.version) {
      stdout(packageMeta.version);
      return { exitCode: 0, version: packageMeta.version };
    }
    if (!parsed.command || parsed.options.help) {
      stdout(getHelp(parsed.command));
      return { exitCode: 0, help: true };
    }
    const command = parsed.command;
    if (!['platforms', 'skills', ...Object.keys(COMMANDS)].includes(command)) {
      throw new Error(`Unknown command: ${command}`);
    }
    const options = applyDefaults(command, parsed.options);
    validateOptions(command, options);
    const result = await dispatch(command, options);
    if (options.json) stdout(JSON.stringify(result, null, 2));
    else printHuman(command, result, stdout);
    return { exitCode: 0, result };
  } catch (error) {
    stderr(`Error: ${error.message}`);
    stderr('Use --help to see valid commands and options.');
    return { exitCode: error.code === 'USAGE' ? 2 : 1, error };
  }
}

async function main(argv = process.argv.slice(2)) {
  const result = await runCli(argv);
  process.exitCode = result.exitCode;
  return result;
}

module.exports = {
  COMMANDS,
  parseArgs,
  getHelp,
  dispatch,
  runCli,
  main
};
