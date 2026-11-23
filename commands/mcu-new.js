const fs = require('fs').promises;
const path = require('path');
const { getPlatformConfig } = require('../lib/platform');
const { generateBspDriver } = require('../lib/generator');

async function createProject(options) {
  const { name, platform, rtos = 'bare-metal' } = options;

  if (!name) {
    throw new Error('Name is required');
  }
  if (!/^[a-z0-9][a-z0-9_-]*$/i.test(name)) {
    throw new Error('Name must contain only letters, numbers, hyphens, or underscores');
  }

  const config = getPlatformConfig(platform);
  const projectPath = path.join(process.cwd(), name);

  await fs.mkdir(projectPath, { recursive: true });
  await fs.mkdir(path.join(projectPath, 'App'), { recursive: true });
  await fs.mkdir(path.join(projectPath, 'BSP'), { recursive: true });
  await fs.mkdir(path.join(projectPath, 'System'), { recursive: true });
  await fs.mkdir(path.join(projectPath, 'Core'), { recursive: true });
  await fs.mkdir(path.join(projectPath, 'cmake'), { recursive: true });

  await fs.writeFile(
    path.join(projectPath, 'App', 'main.c'),
    `#include <stdio.h>

int main(void) {
    // System init
    SystemInit();

    // Application code
    while (1) {
        // Main loop
    }

    return 0;
}
`
  );

  await fs.writeFile(
    path.join(projectPath, 'CMakeLists.txt'),
    `cmake_minimum_required(VERSION 3.10)
project(${name})

# Platform configuration
set(CMAKE_SYSTEM_NAME Generic)
set(CMAKE_SYSTEM_PROCESSOR ${config.arch})

# Source files
file(GLOB_RECURSE SOURCES "App/*.c" "BSP/**/*.c" "System/*.c")

# Include directories
include_directories(
    App
    BSP
    System
    Core
)

# Build target
add_executable(firmware.elf \${SOURCES})
`
  );

  await fs.writeFile(
    path.join(projectPath, 'README.md'),
    `# ${name}

Platform: ${config.name}
RTOS: ${rtos}

## Build

\`\`\`bash
mcu-workbench build --platform ${platform}
\`\`\`

## Flash

\`\`\`bash
mcu-workbench flash --platform ${platform} --device stlink
\`\`\`
`
  );

  return {
    success: true,
    path: projectPath,
    platform: platform,
    rtos: rtos
  };
}

module.exports = {
  name: 'mcu-new',
  description: '创建新的嵌入式项目',
  options: [
    { name: '--name', description: '项目名称', required: true },
    { name: '--platform', description: '目标平台', required: true },
    { name: '--rtos', description: '操作系统', default: 'bare-metal' }
  ],
  handler: createProject
};

// 保留早期 Node 原型的可测试函数接口；Claude Code 不使用此导出。
module.exports.createProject = createProject;
