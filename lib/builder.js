const { getPlatformConfig } = require('./platform');
const { runShellCommand } = require('./process-runner');

function getBuildCommand(platform, options = {}) {
  const config = getPlatformConfig(platform);

  if (platform.startsWith('esp32')) {
    return options.clean ? 'idf.py fullclean && idf.py build' : 'idf.py build';
  }

  const buildCommand = `cmake -B build -DCMAKE_TOOLCHAIN_FILE=cmake/toolchain-${config.arch}.cmake && cmake --build build`;
  return options.clean ? `cmake --build build --target clean && ${buildCommand}` : buildCommand;
}

async function buildProject(projectPath, platform, options = {}) {
  const { clean = false, execute = false, logger = console.log } = options;
  const command = getBuildCommand(platform, { clean });

  logger(`Building project at ${projectPath}...`);
  logger(`Command: ${command}`);

  if (execute) {
    const result = await runShellCommand(command, projectPath);
    return {
      success: true,
      output: result.stdout.trim() || 'Build complete',
      command
    };
  }

  return {
    success: true,
    output: 'Build complete (dry-run plan; use --execute to run)',
    command
  };
}

module.exports = {
  getBuildCommand,
  buildProject
};
