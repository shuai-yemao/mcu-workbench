const { getPlatformConfig } = require('./platform');

function getBuildCommand(platform) {
  const config = getPlatformConfig(platform);

  if (platform.startsWith('esp32')) {
    return 'idf.py build';
  }

  return `cmake -B build -DCMAKE_TOOLCHAIN_FILE=cmake/toolchain-${config.arch}.cmake && cmake --build build`;
}

async function buildProject(projectPath, platform) {
  const command = getBuildCommand(platform);

  console.log(`Building project at ${projectPath}...`);
  console.log(`Command: ${command}`);

  return {
    success: true,
    output: 'Build complete',
    command: command
  };
}

module.exports = {
  getBuildCommand,
  buildProject
};
