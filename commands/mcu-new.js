const fs = require('fs').promises;
const path = require('path');
const { getPlatformConfig } = require('../lib/platform');
const { generateBspDriver } = require('../lib/generator');

// 五层分层目录（数字前缀仅表达排序语义，不进入符号命名；对齐 docs/naming-convention.md §1.1）。
const LAYER_DIRECTORIES = [
  '00_Config',
  '01_App',
  '02_Service',
  '03_Platform',
  '04_Impl',
  '05_Vendor',
  '06_Toolchain',
  '99_Utils'
];

const LAYER_README = {
  '00_Config': '工程配置四件套：app_config / product_config / compile_config / feature_config',
  '01_App': '产品业务层：app_* 模块与 main 入口',
  '02_Service': '业务服务层：service_<域> 服务模块',
  '03_Platform': '平台接口层：platform_<子域> 接口定义与实现',
  '04_Impl': '适配实现层：impl_<子域> 或厂商名落地实现',
  '05_Vendor': '第三方底座：vendor_mapping.md + patch/，源码不复制',
  '06_Toolchain': '工具链：链接脚本、启动文件、编译/烧录配置',
  '99_Utils': '通用工具：utils_<模块>（crc/ringbuffer/filter/list）'
};

const MAIN_C_TEMPLATE = `#include <stdio.h>

int main(void) {
    // System init
    SystemInit();

    // Application code
    while (1) {
        // Main loop
    }

    return 0;
}
`;

function buildLayerTree(projectPath) {
  return LAYER_DIRECTORIES.map(async (dir) => {
    const dirPath = path.join(projectPath, dir);
    await fs.mkdir(dirPath, { recursive: true });
    await fs.writeFile(
      path.join(dirPath, 'README.md'),
      `# ${dir}\n\n${LAYER_README[dir]}\n`
    );
    return dirPath;
  });
}

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
  await Promise.all(buildLayerTree(projectPath));

  await fs.writeFile(
    path.join(projectPath, '05_Vendor', 'vendor_mapping.md'),
    '# Vendor 映射\n\n登记第三方底座源码与补丁位置；源码不复制进本工程。\n'
  );

  await fs.writeFile(path.join(projectPath, '01_App', 'main.c'), MAIN_C_TEMPLATE);

  await fs.writeFile(
    path.join(projectPath, 'CMakeLists.txt'),
    `cmake_minimum_required(VERSION 3.10)
project(${name})

# Platform configuration
set(CMAKE_SYSTEM_NAME Generic)
set(CMAKE_SYSTEM_PROCESSOR ${config.arch})

# Source files
file(GLOB_RECURSE SOURCES "01_App/*.c" "02_Service/*.c" "03_Platform/**/*.c" "04_Impl/**/*.c" "99_Utils/*.c")

# Include directories
include_directories(
    00_Config
    01_App
    02_Service
    03_Platform
    04_Impl
    05_Vendor
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

## 分层结构

\`\`\`
00_Config  工程配置
01_App     产品业务
02_Service 业务服务
03_Platform 平台接口
04_Impl    适配实现
05_Vendor  第三方底座
06_Toolchain 工具链
99_Utils   通用工具
\`\`\`

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
module.exports.LAYER_DIRECTORIES = LAYER_DIRECTORIES;
module.exports.LAYER_README = LAYER_README;
