const fs = require('fs').promises;
const os = require('os');
const path = require('path');
const { generateBspDriver, generateCorePeripheral } = require('../lib/generator');
const { validateArchitectureContract } = require('../lib/architecture-contract');
const {
  parseArgs,
  validateCommentLanguage,
  validateLayerContract
} = require('../scripts/validate-layer-contract');

async function createSlice() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mcu-layer-contract-'));
  const files = [
    ...(await generateCorePeripheral('spi', 'stm32f4')),
    ...(await generateBspDriver({
      deviceType: 'externflash', device: 'W25Q64', cores: ['spi'], platform: 'stm32f4'
    }))
  ];
  for (const file of files) {
    const target = path.join(root, file.path);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, file.content, 'utf8');
  }
  return root;
}

async function mutate(root, relative, mutation) {
  const target = path.join(root, relative);
  const content = await fs.readFile(target, 'utf8');
  await fs.writeFile(target, mutation(content), 'utf8');
}

function validate(root) {
  return validateLayerContract({ root, core: 'spi', deviceType: 'externflash', device: 'W25Q64' });
}

describe('generated layer contract validator', () => {
  test('accepts a no-input self-check invocation for the package validation command', () => {
    expect(parseArgs(['--self-check'])).toEqual({ selfCheck: true });
  });

  test('accepts a generated Core and BSP slice', async () => {
    const root = await createSlice();
    expect(validate(root)).toMatchObject({ valid: true, errors: [] });
  });

  test('rejects a generated file whose version tag is removed instead of skipping validation', async () => {
    const root = await createSlice();
    await mutate(root, '03_Platform/platform_mcu/Inc/platform_spi.h', (content) => (
      content.replace(/ \* @version[^\n]*\n/, '')
    ));

    expect(validate(root).errors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ruleId: 'LAYER_FILE_DOC',
        file: '03_Platform/platform_mcu/Inc/platform_spi.h'
      }),
      expect.objectContaining({
        ruleId: 'LAYER_FILE_DATE',
        file: '03_Platform/platform_mcu/Inc/platform_spi.h'
      })
    ]));
  });

  test('rejects a generated header whose actual type section is removed', async () => {
    const root = await createSlice();
    await mutate(root, '03_Platform/platform_mcu/Inc/platform_spi.h', (content) => (
      content.replace(/\/\* 公开类型[^\n]*\*\/\n/, '')
    ));

    expect(validate(root).errors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ruleId: 'LAYER_SOURCE_SECTION',
        file: '03_Platform/platform_mcu/Inc/platform_spi.h',
        message: expect.stringContaining('类型')
      })
    ]));
  });

  test('rejects a generated function when its Doxygen block is removed', async () => {
    const root = await createSlice();
    await mutate(root, '03_Platform/platform_mcu/Inc/platform_spi.h', (content) => content
      .replace(/\/\*\*\n \* @brief (?:执行带超时约束的同步数据传输。|以毫秒超时执行同步事务。)[\s\S]*?\*\//, ''));

    expect(validate(root).errors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ruleId: 'LAYER_FUNCTION_DOC',
        file: '03_Platform/platform_mcu/Inc/platform_spi.h'
      })
    ]));
  });

  test('rejects a generated source when its step comments are removed', async () => {
    const root = await createSlice();
    await mutate(root, '03_Platform/platform_mcu/Src/platform_spi.c', (content) => (
      content.replace(/\/\* [^\n]*-{3,} [^\n]*\*\//g, '')
    ));

    expect(validate(root).errors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ruleId: 'LAYER_SOURCE_STEP_DOC',
        file: '03_Platform/platform_mcu/Src/platform_spi.c'
      })
    ]));
  });

  test('rejects a generated source whose secondary partition width is wrong', async () => {
    const root = await createSlice();
    await mutate(root, '03_Platform/platform_mcu/Src/platform_spi.c', (content) => (
      content.replace(/\/\* 初始化 -+ \*\//, '/* 初始化 ---------------- */')
    ));

    expect(validate(root).errors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ruleId: 'LAYER_FORMAT_SECONDARY_PARTITION',
        file: '03_Platform/platform_mcu/Src/platform_spi.c'
      })
    ]));
  });

  test('rejects a generated source whose assignment columns are not aligned', async () => {
    const root = await createSlice();
    await mutate(root, '03_Platform/platform_mcu/Src/platform_spi.c', (content) => (
      content.replace('event->status   = PLATFORM_ERR_OK;', 'event->status    = PLATFORM_ERR_OK;')
    ));

    expect(validate(root).errors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ruleId: 'LAYER_FORMAT_ASSIGNMENT_ALIGNMENT',
        file: '03_Platform/platform_mcu/Src/platform_spi.c'
      })
    ]));
  });

  test('rejects a generated header whose declaration columns are not aligned', async () => {
    const root = await createSlice();
    await mutate(root, '03_Platform/platform_mcu/Inc/platform_spi.h', (content) => (
      content.replace('uint32_t       event_id;', 'uint32_t  event_id;')
    ));

    expect(validate(root).errors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ruleId: 'LAYER_FORMAT_DECLARATION_ALIGNMENT',
        file: '03_Platform/platform_mcu/Inc/platform_spi.h'
      })
    ]));
  });

  test('rejects a generated type whose trailing comments are not aligned', async () => {
    const root = await createSlice();
    await mutate(root, '03_Platform/platform_mcu/Inc/platform_spi.h', (content) => (
      content.replace('event_id;  /**< 待处理的事件标识。', 'event_id;   /**< 待处理的事件标识。')
    ));

    expect(validate(root).errors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ruleId: 'LAYER_FORMAT_TRAILING_COMMENT_ALIGNMENT',
        file: '03_Platform/platform_mcu/Inc/platform_spi.h'
      })
    ]));
  });

  test('rejects a generated source that keeps the generic step placeholder', async () => {
    const root = await createSlice();
    await mutate(root, '03_Platform/platform_mcu/Src/platform_spi.c', (content) => content
      .replace(/\/\* [^\n]*-{3,} [^\n]*\*\//, '/* 入口检查与核心处理 ---------------------------------------------- */'));

    expect(validate(root).errors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ruleId: 'LAYER_SOURCE_STEP_DOC',
        file: '03_Platform/platform_mcu/Src/platform_spi.c'
      })
    ]));
  });

  test('rejects a generated macro when its preceding comment is removed', async () => {
    const root = await createSlice();
    await mutate(root, '04_Impl/impl_bsp/externflash/W25Q64/Inc/impl_w25q64_config.h', (content) => {
      const lines = content.split(/\r?\n/);
      const index = lines.findIndex((line) => line.includes('#define IMPL_W25Q64_DEFAULT_TIMEOUT_MS'));
      lines.splice(index - 1, 1);
      return lines.join('\n');
    });

    expect(validate(root).errors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ruleId: 'LAYER_MACRO_DOC',
        file: '04_Impl/impl_bsp/externflash/W25Q64/Inc/impl_w25q64_config.h'
      })
    ]));
  });

  test('accepts an SSD1306 display slice with OSAL mutex injection and style profile documentation', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mcu-ssd1306-layer-contract-'));
    const files = [
      ...(await generateCorePeripheral('i2c', 'stm32f4')),
      ...(await generateBspDriver({
        deviceType: 'display', device: 'SSD1306', cores: ['i2c'], platform: 'stm32f4'
      }))
    ];
    for (const file of files) {
      const target = path.join(root, file.path);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, file.content, 'utf8');
    }

    const result = validateLayerContract({
      root, core: 'i2c', deviceType: 'display', device: 'SSD1306'
    });
    expect(result).toMatchObject({ valid: true, errors: [] });
  });

  test('generates the Port as the resource, Driver, Handle, and Platform Model composition root', async () => {
    const root = await createSlice();
    const port = await fs.readFile(
      path.join(root, '04_Impl/impl_bsp/impl_bsp_port/externflash/Src/impl_externflash_handle_port.c'),
      'utf8'
    );

    expect(port).toContain('externflash_resource_get_ops');
    expect(port).toContain('impl_w25q64_driver_construct');
    expect(port).toContain('impl_externflash_handle_construct');
    expect(port).toContain('.read_id = impl_externflash_handle_read_id');
    expect(port).toContain('platform_externflash_register_default');
    expect(port).not.toContain('platform_externflash_wrapper');
    expect(validate(root)).toMatchObject({ valid: true, errors: [] });
  });

  test('checks the generated Handle path and requires effective injected Ops calls', async () => {
    const root = await createSlice();
    const driver = await fs.readFile(
      path.join(root, '04_Impl/impl_bsp/externflash/W25Q64/Src/impl_w25q64_driver.c'), 'utf8'
    );
    const handler = await fs.readFile(
      path.join(root, '04_Impl/impl_bsp/impl_bsp_handle/externflash/Src/impl_externflash_handle.c'), 'utf8'
    );

    expect(driver).toContain('p_driver->ctx.pf_transaction(p_driver->ctx.p_context)');
    const driverMcuCalls = (driver.match(/p_driver->ctx\.pf_chip_feature\(p_driver->ctx\.p_mcu_context\)/g) || []).length;
    expect(driverMcuCalls).toBeGreaterThanOrEqual(1);
    expect(handler).toContain('p_handle->cfg->p_drivers[driver_index]');
    expect(handler).toContain('p_ref->read_id(p_ref->p_context, p_device_id)');

    await mutate(root, '04_Impl/impl_bsp/impl_bsp_handle/externflash/Src/impl_externflash_handle.c', (content) => (
      `#include <platform_i2c.h>\n${content}`
    ));
    expect(validateArchitectureContract({ root }).errors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        file: '04_Impl/impl_bsp/impl_bsp_handle/externflash/Src/impl_externflash_handle.c',
        ruleId: 'BSP_HANDLER_INJECTION_DEPENDENCY'
      })
    ]));
  });

  test('rejects generated sources that retain injected Ops but never call them', async () => {
    const root = await createSlice();
    await mutate(root, '04_Impl/impl_bsp/externflash/W25Q64/Src/impl_w25q64_driver.c', (content) => content
      .replace('p_driver->ctx.pf_transaction(p_driver->ctx.p_context)', 'driver_core_ops_not_used'));
    await mutate(root, '04_Impl/impl_bsp/impl_bsp_handle/externflash/Src/impl_externflash_handle.c', (content) => content
      .replace('p_ref->read_id(p_ref->p_context, p_device_id)', 'handler_driver_ops_not_used'));
    await mutate(root, '04_Impl/impl_bsp/externflash/W25Q64/Src/impl_w25q64_driver.c', (content) => content
      .replace('p_driver->ctx.pf_chip_feature(p_driver->ctx.p_mcu_context)', 'driver_mcu_ops_not_used'));

    expect(validate(root).errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ ruleId: 'LAYER_HAL_DRIVER_EFFECTIVE_CORE_OPS' }),
      expect.objectContaining({ ruleId: 'LAYER_HAL_DRIVER_EFFECTIVE_MCU_OPS' }),
      expect.objectContaining({ ruleId: 'LAYER_HANDLE_EFFECTIVE_DRIVER_SET' })
    ]));
  });

  test('rejects a Port that omits the resource operation binding', async () => {
    const root = await createSlice();
    await mutate(root, '04_Impl/impl_bsp/impl_bsp_port/externflash/Src/impl_externflash_handle_port.c', (content) => content
      .replace('externflash_resource_get_ops()', 'externflash_resource_get_ops_not_used()'));

    expect(validate(root).errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ ruleId: 'LAYER_PORT_RESOURCE_INJECTION' })
    ]));
  });

  test('does not require a legacy Port callback bridge', async () => {
    const root = await createSlice();
    const port = await fs.readFile(path.join(root, '04_Impl/impl_bsp/impl_bsp_port/externflash/Src/impl_externflash_handle_port.c'), 'utf8');
    expect(port).not.toMatch(/static\s+platform_err_t\s+externflash_port_/);
    expect(validate(root)).toMatchObject({ valid: true, errors: [] });
  });

  test('rejects a Port that omits direct Handle binding', async () => {
    const root = await createSlice();
    await mutate(root, '04_Impl/impl_bsp/impl_bsp_port/externflash/Src/impl_externflash_handle_port.c', (content) => content
      .replace('.read_id = impl_externflash_handle_read_id,', '.read_id = NULL,'));

    expect(validate(root).errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ ruleId: 'LAYER_PORT_HANDLE_BINDING' })
    ]));
  });

  test('rejects a Port that omits Platform Model registration', async () => {
    const root = await createSlice();
    await mutate(root, '04_Impl/impl_bsp/impl_bsp_port/externflash/Src/impl_externflash_handle_port.c', (content) => content
      .replace('platform_externflash_register_default', 'platform_externflash_register_default_not_used'));

    expect(validate(root).errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ ruleId: 'LAYER_PORT_MODEL_REGISTRATION' })
    ]));
  });

  test('rejects a Port that omits Driver construction', async () => {
    const root = await createSlice();
    await mutate(root, '04_Impl/impl_bsp/impl_bsp_port/externflash/Src/impl_externflash_handle_port.c', (content) => content
      .replace('impl_w25q64_driver_construct', 'impl_w25q64_driver_build_not_used'));

    expect(validate(root).errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ ruleId: 'LAYER_PORT_DRIVER_CONSTRUCTION' })
    ]));
  });

  test('reports a Core vendor leak, extra Port export, and forbidden Model include', async () => {
    const root = await createSlice();
    await mutate(root, '03_Platform/platform_mcu/Inc/platform_spi.h', (content) => `${content}\n#include "stm32f4xx_hal.h"\n`);
    await mutate(root, '04_Impl/impl_bsp/impl_bsp_port/externflash/Src/impl_externflash_handle_port.c', (content) => `${content}\nint32_t extra_port_export(void) { return 0; }\n`);
    await mutate(root, '03_Platform/platform_bsp/externflash/Src/platform_externflash_model.c', (content) => content.replace('#include "platform_externflash_model.h"', '#include "impl_w25q64_driver.h"'));
    expect(validate(root).errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ ruleId: 'LAYER_CORE_PUBLIC_LEAK' }),
      expect.objectContaining({ ruleId: 'LAYER_PORT_PUBLIC_API' }),
      expect.objectContaining({ ruleId: 'LAYER_MODEL_DEPENDENCY' })
    ]));
  });

  test('reports a Handle that no longer selects from its Driver set', async () => {
    const root = await createSlice();
    await mutate(root, '04_Impl/impl_bsp/impl_bsp_handle/externflash/Src/impl_externflash_handle.c', (content) => content
      .replace('p_ref->read_id(p_ref->p_context, p_device_id)', 'handle_driver_not_used'));
    expect(validate(root).errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ ruleId: 'LAYER_HANDLE_EFFECTIVE_DRIVER_SET' })
    ]));
  });

  async function createWrapperSlice(header, source) {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mcu-wrapper-slice-'));
    const files = {
      '03_Platform/platform_bsp/externflash/Inc/platform_externflash_wrapper.h': header,
      '03_Platform/platform_bsp/externflash/Src/platform_externflash_wrapper.c': source
    };
    for (const [relative, content] of Object.entries(files)) {
      const target = path.join(root, relative);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, content, 'utf8');
    }
    return root;
  }

  const wrapperSourceFullProfile = `/* @file platform_externflash_wrapper.c
 * @brief 平台无关的 externflash 封装层实现。
 * @par dependencies platform_externflash_wrapper.h
 * Processing flow: 通过已注册的上下文优先 Ops 转发 API 调用。
 */
#include "platform_externflash_wrapper.h"
/* Includes */
/* Private Defines */
/* Private Types */
/* Private State */
static platform_externflash_wrapper_ops_t s_externflash_ops;
/* Private Functions */
/* Public Functions */
int32_t platform_externflash_wrapper_register(const platform_externflash_wrapper_ops_t *p_ops) {
    if (p_ops == 0) return -1;
    s_externflash_ops = *p_ops;
    return 0;
}`;

  const pureForwardWrapperHeader = `/* @file platform_externflash_wrapper.h
 * @brief 平台无关的 externflash 封装层（纯转发，无对象标识）。
 * @par dependencies platform_error.h, platform_type.h
 * Processing flow: 注册上下文优先 Ops 后再转发 API 调用。
 */
#ifndef PLATFORM_EXTERNFLASH_WRAPPER_H
#define PLATFORM_EXTERNFLASH_WRAPPER_H
#include <stdint.h>
/* Includes */
/* Public Types */
typedef struct {
    void *p_context;
    int32_t (*pf_read_id)(void *p_context, uint32_t *device_id);
} platform_externflash_wrapper_ops_t;
/* Public Functions */
int32_t platform_externflash_wrapper_register(const platform_externflash_wrapper_ops_t *p_ops);
#endif`;

  const fourTupleBrokenWrapperHeader = `/* @file platform_externflash_wrapper.h
 * @brief 携带 platform_device_t 标识的设备对象封装层。
 * @par dependencies platform_error.h, platform_type.h
 * Processing flow: 对象标识加四元组槽位。
 */
#ifndef PLATFORM_EXTERNFLASH_WRAPPER_H
#define PLATFORM_EXTERNFLASH_WRAPPER_H
#include <stdint.h>
/* Includes */
/* Public Types */
typedef struct {
    platform_device_t base;
    const externflash_cfg_t *cfg;
    externflash_ctx_t *ctx;
    externflash_data_t *data;
} platform_externflash_t;
/* Public Functions */
int32_t platform_externflash_wrapper_register(const void *p_ops);
#endif`;

  const noProfileWrapperHeader = `/* @file platform_externflash_wrapper.h
 * @brief 只有统一 style-profile 最小头信息的头文件。
 */
#ifndef PLATFORM_EXTERNFLASH_WRAPPER_H
#define PLATFORM_EXTERNFLASH_WRAPPER_H
#include <stdint.h>
/* Includes */
/* Public Types */
typedef struct {
    void *p_context;
    int32_t (*pf_read_id)(void *p_context, uint32_t *device_id);
} platform_externflash_wrapper_ops_t;
/* Public Functions */
int32_t platform_externflash_wrapper_register(const platform_externflash_wrapper_ops_t *p_ops);
#endif`;

  test('accepts a pure-forward wrapper slice with --slice wrapper and style profile documentation', async () => {
    const root = await createWrapperSlice(pureForwardWrapperHeader, wrapperSourceFullProfile);
    const result = validateLayerContract({
      root, core: 'spi', deviceType: 'externflash', device: 'W25Q64', slice: 'wrapper',
      strictGeneratedStyle: false
    });
    expect(result).toMatchObject({ valid: true, errors: [] });
  });

  test('rejects a device-object wrapper that omits a four-tuple slot', async () => {
    const root = await createWrapperSlice(fourTupleBrokenWrapperHeader, wrapperSourceFullProfile);
    const result = validateLayerContract({
      root, core: 'spi', deviceType: 'externflash', device: 'W25Q64', slice: 'wrapper',
      strictGeneratedStyle: false
    });
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ ruleId: 'LAYER_WRAPPER_FOUR_TUPLE' })
    ]));
  });

  test('accepts a wrapper with minimal style profile documentation in wrapper slice', async () => {
    const root = await createWrapperSlice(noProfileWrapperHeader, wrapperSourceFullProfile);
    const result = validateLayerContract({
      root, core: 'spi', deviceType: 'externflash', device: 'W25Q64', slice: 'wrapper',
      strictGeneratedStyle: false
    });
    expect(result).toMatchObject({ valid: true, errors: [] });
  });

  test('does not require sibling slice files when --slice wrapper is used', async () => {
    const root = await createWrapperSlice(pureForwardWrapperHeader, wrapperSourceFullProfile);
    const result = validateLayerContract({
      root, core: 'spi', deviceType: 'externflash', device: 'W25Q64', slice: 'wrapper',
      strictGeneratedStyle: false
    });
    expect(result.errors).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ ruleId: 'LAYER_REQUIRED_FILE' })
    ]));
  });

  test('rejects an unknown --slice value', () => {
    expect(() => parseArgs(['--root', 'x', '--core', 'spi', '--device-type', 'externflash', '--device', 'W25Q64', '--slice', 'bogus']))
      .toThrow(/Unknown --slice value/);
  });

  test('tolerates the injected --self-check default when real arguments are attached via npm run', () => {
    const parsed = parseArgs(
      ['--self-check', '--root', 'x', '--core', 'spi', '--device-type', 'externflash', '--device', 'W25Q64', '--slice', 'wrapper'],
      'C:/firmware'
    );
    expect(parsed).toEqual({
      root: path.resolve('C:/firmware', 'x'),
      core: 'spi',
      deviceType: 'externflash',
      device: 'W25Q64',
      json: false,
      slice: 'wrapper'
    });
  });

  const compliantWrapperHeader = `/* @file platform_externflash_wrapper.h
 * @brief 平台无关的 externflash 封装层（纯转发，无对象标识）。
 * @par dependencies platform_error.h, platform_type.h
 * Processing flow: 注册上下文优先 Ops 后再转发 API 调用。
 */
#ifndef PLATFORM_EXTERNFLASH_WRAPPER_H
#define PLATFORM_EXTERNFLASH_WRAPPER_H
#include <stdint.h>
#include "platform_type.h"
#include "platform_def.h"
#include "platform_error.h"
/* Includes */
/* Public Types */
typedef struct {
    void *p_context;
    platform_err_t (*pf_read_id)(void *p_context, uint32_t *device_id);
} platform_externflash_wrapper_ops_t;
/* Public Functions */
platform_err_t platform_externflash_wrapper_register(const platform_externflash_wrapper_ops_t *p_ops);
#endif`;

  const compliantWrapperSource = `/* @file platform_externflash_wrapper.c
 * @brief 平台无关的 externflash 封装层实现。
 * @par dependencies platform_externflash_wrapper.h, platform_error.h
 * Processing flow: 通过已注册的上下文优先 Ops 转发 API 调用。
 */
#include "platform_externflash_wrapper.h"
#include "platform_def.h"
#include "platform_error.h"
/* Includes */
/* Private Defines */
/* Private Types */
/* Private State */
static platform_externflash_wrapper_ops_t s_externflash_ops;
static platform_bool_t s_externflash_registered;
/* Private Functions */
/* Public Functions */
platform_err_t platform_externflash_wrapper_register(const platform_externflash_wrapper_ops_t *p_ops) {
    if (p_ops == 0) return PLATFORM_ERR_PARAM;
    s_externflash_ops = *p_ops;
    return PLATFORM_ERR_OK;
}`;

  test('accepts a compliant wrapper that includes Platform Common type headers', async () => {
    const root = await createWrapperSlice(compliantWrapperHeader, compliantWrapperSource);
    const result = validateLayerContract({
      root, core: 'spi', deviceType: 'externflash', device: 'W25Q64', slice: 'wrapper',
      strictGeneratedStyle: false
    });
    expect(result.errors).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ ruleId: 'LAYER_WRAPPER_DEPENDENCY' }),
      expect.objectContaining({ ruleId: 'LAYER_WRAPPER_FOUR_TUPLE' })
    ]));
  });

  test('flags English-only comments and accepts Chinese or symbolic comments', () => {
    const errors = [];
    const files = {
      zh: { relative: 'zh.h', content: '/* @brief 初始化设备。 */\nint f(void);' },
      en: { relative: 'en.h', content: '/* @brief Initializes the device. */\nint f(void);' },
      symbolic: { relative: 'symbolic.h', content: '/* ------------------ */\nint f(void);' },
      mixed: { relative: 'mixed.h', content: '/* @brief 初始化 MCU Workbench backend。 */\nint f(void);' }
    };
    validateCommentLanguage(files, errors);
    expect(errors).toEqual([
      expect.objectContaining({ ruleId: 'LAYER_COMMENT_LANGUAGE', file: 'en.h' })
    ]);
  });

  test('rejects a generated file whose comments are written in English', async () => {
    const root = await createSlice();
    await mutate(root, '04_Impl/impl_bsp/externflash/W25Q64/Inc/impl_w25q64_config.h', (content) => content
      .replace('生成的 Platform、Impl 或公共接口', 'generated Platform, Impl, or public interfaces')
      .replace('生成的切片参与已声明的分层契约。', 'Generated slice participates in the declared layered contract.')
      .replace('W25Q64 器件配置。', 'W25Q64 device configuration.')
      .replace('@par 依赖关系', '@par dependencies')
      .replace('处理流程：', 'Processing flow:')
      .replace('研发部门', 'Research Department')
      .replace('项目名称', 'ProjectName')
      .replace('缩进使用 4 个空格，禁止使用 TAB。', 'Use four spaces and no TAB characters.'));
    expect(validate(root).errors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        ruleId: 'LAYER_COMMENT_LANGUAGE',
        file: '04_Impl/impl_bsp/externflash/W25Q64/Inc/impl_w25q64_config.h'
      })
    ]));
  });

  test('rejects an English-comment wrapper slice', async () => {
    const englishWrapperHeader = `/* @file platform_externflash_wrapper.h
 * @brief Platform-independent externflash Wrapper (pure forward, no object identity).
 * @par dependencies platform_error.h, platform_type.h
 * Processing flow: register context-first Ops then forward API calls.
 */
#ifndef PLATFORM_EXTERNFLASH_WRAPPER_H
#define PLATFORM_EXTERNFLASH_WRAPPER_H
#include <stdint.h>
/* Includes */
/* Public Types */
typedef struct {
    void *p_context;
    int32_t (*pf_read_id)(void *p_context, uint32_t *device_id);
} platform_externflash_wrapper_ops_t;
/* Public Functions */
int32_t platform_externflash_wrapper_register(const platform_externflash_wrapper_ops_t *p_ops);
#endif`;
    const root = await createWrapperSlice(englishWrapperHeader, wrapperSourceFullProfile);
    const result = validateLayerContract({
      root, core: 'spi', deviceType: 'externflash', device: 'W25Q64', slice: 'wrapper',
      strictGeneratedStyle: false
    });
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ ruleId: 'LAYER_WRAPPER_COMMENT_LANGUAGE' })
    ]));
  });
});
