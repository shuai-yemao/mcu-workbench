const { fileHeader } = require('../source-style');

function formatGeneratedFiles(files) {
  return require('../formatter').formatGeneratedFiles(files);
}

function normalizeBoard(board) {
  const value = String(board || '').trim().toLowerCase().replace(/-/g, '_');
  if (!/^[a-z][a-z0-9_]*$/.test(value)) {
    const error = new Error('--board must use lower snake_case.');
    error.code = 'CODEGEN_REQUEST';
    throw error;
  }
  return value;
}

function normalizeDeviceTypes(deviceTypes) {
  const values = Array.isArray(deviceTypes) ? deviceTypes : [deviceTypes];
  const normalized = [];
  for (const raw of values) {
    const value = String(raw || '').trim().toLowerCase().replace(/-/g, '_');
    if (!/^[a-z][a-z0-9_]*$/.test(value)) {
      const error = new Error('--device-types must use lower snake_case.');
      error.code = 'CODEGEN_REQUEST';
      throw error;
    }
    if (!normalized.includes(value)) normalized.push(value);
  }
  if (!normalized.length) {
    const error = new Error('At least one --device-type is required for impl_board generation.');
    error.code = 'CODEGEN_REQUEST';
    throw error;
  }
  return normalized;
}

function boardHeader(board) {
  const prefix = `impl_board_${board}_bsp`;
  const guard = `${prefix.toUpperCase()}_H`;
  return `${fileHeader(`${prefix}.h`, `${board} 板级 BSP 组合根注册接口。`, 'Board 只调用 Port 注册入口；资源和协议实现由 Impl 子层提供。', ['<stdint.h>', 'platform_error.h'])}
#ifndef ${guard}
#define ${guard}

/* Includes */
#include <stdint.h>
#include "platform_error.h"

/* Public Functions */
platform_err_t ${prefix}_register(void);

#endif /* ${guard} */
`;
}

function boardSource(board, deviceTypes) {
  const prefix = `impl_board_${board}_bsp`;
  const includes = deviceTypes
    .map((type) => `#include "impl_${type}_handle_port.h"`)
    .join('\n');
  const calls = deviceTypes
    .map((type) => `    ret = impl_${type}_handle_port_register();
    if (ret != PLATFORM_ERR_OK) return ret;`)
    .join('\n');
  return `${fileHeader(`${prefix}.c`, `${board} 板级 BSP 组合根实现。`, 'Board 只按顺序调用 Port 注册入口，不复制 Handle 状态、不调用 HAL。', [`${prefix}.h`, ...deviceTypes.map((type) => `impl_${type}_handle_port.h`)])}
/* Includes */
#include "${prefix}.h"
${includes}

/* Public Functions */
platform_err_t ${prefix}_register(void) {
    platform_err_t ret;
${calls}
    return PLATFORM_ERR_OK;
}
`;
}

async function generateImplBoard({ board, deviceTypes }) {
  const normalizedBoard = normalizeBoard(board);
  const normalizedDeviceTypes = normalizeDeviceTypes(deviceTypes);
  const prefix = `impl_board_${normalizedBoard}_bsp`;
  const files = [
    { path: `04_Impl/impl_board/Inc/${prefix}.h`, content: boardHeader(normalizedBoard) },
    { path: `04_Impl/impl_board/Src/${prefix}.c`, content: boardSource(normalizedBoard, normalizedDeviceTypes) }
  ];
  Object.defineProperty(files, 'manifest', {
    enumerable: false,
    value: {
      layer: 'impl_board',
      board: normalizedBoard,
      deviceTypes: normalizedDeviceTypes,
      apiMapping: normalizedDeviceTypes.map((type) => `Board -> impl_${type}_handle_port_register`),
      unresolved: [
        'UNRESOLVED_BOARD_RESOURCE_API: Port implementations still require target resource providers',
        'UNRESOLVED_PLATFORM_OS_API: no target platform_os header was supplied'
      ]
    }
  });
  return formatGeneratedFiles(files);
}

module.exports = {
  id: 'impl-board.composition',
  layer: 'impl_board',
  version: '1',
  skill: 'impl_board',
  render: async (request) => generateImplBoard(request),
  generateImplBoard
};
