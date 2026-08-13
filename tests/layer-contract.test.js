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

  test('rejects a generated function when its Doxygen block is removed', async () => {
    const root = await createSlice();
    await mutate(root, '03_Platform/platform_mcu/Inc/platform_spi.h', (content) => content
      .replace(/\/\*\*\n \* @brief 以毫秒超时执行同步事务。[\s\S]*?\*\//, ''));

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

  test('generates the Port as the Core, MCU, OS Wrapper, Driver, Handler, and Wrapper composition root', async () => {
    const root = await createSlice();
    const port = await fs.readFile(
      path.join(root, '04_Impl/impl_board/externflash/Src/impl_externflash_port.c'),
      'utf8'
    );

    expect(port).toContain('impl_w25q64_driver_register_core_ops');
    expect(port).toContain('impl_w25q64_driver_register_mcu_ops');
    expect(port).toContain('impl_externflash_handle_register_osal_ops');
    expect(port).toContain('impl_externflash_handle_register_driver');
    expect(port).toContain('platform_externflash_wrapper_register');
    expect(validate(root)).toMatchObject({ valid: true, errors: [] });
  });

  test('checks the generated Handler path and requires effective injected Ops calls', async () => {
    const root = await createSlice();
    const driver = await fs.readFile(
      path.join(root, '04_Impl/impl_bsp/externflash/W25Q64/Src/impl_w25q64_driver.c'), 'utf8'
    );
    const handler = await fs.readFile(
      path.join(root, '04_Impl/impl_bsp_handler/externflash/Src/impl_externflash_handle.c'), 'utf8'
    );

    expect(driver).toContain('driver->core_ops.pf_transaction(driver->core_ops.context)');
    const driverMcuCalls = (driver.match(/driver->mcu_ops\.pf_chip_feature\(driver->mcu_ops\.context\)/g) || []).length;
    expect(driverMcuCalls).toBeGreaterThanOrEqual(1);
    expect(handler).toContain('handle->osal_ops.pf_notify_from_isr(handle->osal_ops.context)');
    expect(handler).toContain('handle->driver_ops.pf_read_id(handle->driver_ops.context, device_id)');

    await mutate(root, '04_Impl/impl_bsp_handler/externflash/Src/impl_externflash_handle.c', (content) => (
      `#include <platform_i2c.h>\n${content}`
    ));
    expect(validateArchitectureContract({ root }).errors).toEqual(expect.arrayContaining([
      expect.objectContaining({
        file: '04_Impl/impl_bsp_handler/externflash/Src/impl_externflash_handle.c',
        ruleId: 'BSP_HANDLER_INJECTION_DEPENDENCY'
      })
    ]));
  });

  test('rejects generated sources that retain injected Ops but never call them', async () => {
    const root = await createSlice();
    await mutate(root, '04_Impl/impl_bsp/externflash/W25Q64/Src/impl_w25q64_driver.c', (content) => content
      .replace('driver->core_ops.pf_transaction(driver->core_ops.context)', 'driver_core_ops_not_used'));
    await mutate(root, '04_Impl/impl_bsp_handler/externflash/Src/impl_externflash_handle.c', (content) => content
      .replace('handle->osal_ops.pf_notify_from_isr(handle->osal_ops.context)', 'handler_osal_ops_not_used'));
    await mutate(root, '04_Impl/impl_bsp/externflash/W25Q64/Src/impl_w25q64_driver.c', (content) => content
      .replace('driver->mcu_ops.pf_chip_feature(driver->mcu_ops.context)', 'driver_mcu_ops_not_used'));

    expect(validate(root).errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ ruleId: 'LAYER_HAL_DRIVER_EFFECTIVE_CORE_OPS' }),
      expect.objectContaining({ ruleId: 'LAYER_HAL_DRIVER_EFFECTIVE_MCU_OPS' }),
      expect.objectContaining({ ruleId: 'LAYER_HANDLER_EFFECTIVE_OS_WRAPPER_OPS' })
    ]));
  });

  test('rejects a Port that injects a no-op callback instead of a platform binding', async () => {
    const root = await createSlice();
    await mutate(root, '04_Impl/impl_board/externflash/Src/impl_externflash_port.c', (content) => content
      .replace('return externflash_platform_core_transaction(context);', 'return 0;'));

    expect(validate(root).errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ ruleId: 'LAYER_PORT_STUB_OPS' })
    ]));
  });

  test('allows a Core call when a static Port callback binds it into Core Ops', async () => {
    const root = await createSlice();
    await mutate(root, '04_Impl/impl_board/externflash/Src/impl_externflash_port.c', (content) => content
      .replace('return externflash_platform_core_transaction(context);', 'return platform_spi_transaction(context);'));

    expect(validate(root).errors).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ ruleId: 'LAYER_PORT_RUNTIME_BYPASS' })
    ]));
  });

  test('rejects a static Port runtime helper that bypasses Handle with a Core call', async () => {
    const root = await createSlice();
    await mutate(root, '04_Impl/impl_board/externflash/Src/impl_externflash_port.c', (content) => content
      .replace('return impl_externflash_handle_read_id(s_externflash_handle, device_id);', 'return platform_spi_transaction(device_id);'));

    expect(validate(root).errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ ruleId: 'LAYER_PORT_RUNTIME_BYPASS' })
    ]));
  });

  test('rejects equivalent unsigned no-op success callbacks in a Port', async () => {
    const root = await createSlice();
    await mutate(root, '04_Impl/impl_board/externflash/Src/impl_externflash_port.c', (content) => content
      .replace('return externflash_platform_mcu_feature(context);', 'return (int32_t)0U;'));

    expect(validate(root).errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ ruleId: 'LAYER_PORT_STUB_OPS' })
    ]));
  });

  test('rejects a Port that omits a required injected operation table', async () => {
    const root = await createSlice();
    await mutate(root, '04_Impl/impl_board/externflash/Src/impl_externflash_port.c', (content) => content
      .replace(/\s*impl_w25q64_driver_register_mcu_ops\([^;]+;\n/, '\n'));

    expect(validate(root).errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ ruleId: 'LAYER_PORT_MCU_OPS_INJECTION' })
    ]));
  });

  test('reports a Core vendor leak, extra Port export, and forbidden Wrapper include', async () => {
    const root = await createSlice();
    await mutate(root, '03_Platform/platform_mcu/Inc/platform_spi.h', (content) => `${content}\n#include "stm32f4xx_hal.h"\n`);
    await mutate(root, '04_Impl/impl_board/externflash/Src/impl_externflash_port.c', (content) => `${content}\nint32_t extra_port_export(void) { return 0; }\n`);
    await mutate(root, '03_Platform/platform_bsp/externflash/Src/platform_externflash_wrapper.c', (content) => content.replace('#include "platform_externflash_wrapper.h"', '#include "impl_w25q64_driver.h"'));
    expect(validate(root).errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ ruleId: 'LAYER_CORE_PUBLIC_LEAK' }),
      expect.objectContaining({ ruleId: 'LAYER_PORT_PUBLIC_API' }),
      expect.objectContaining({ ruleId: 'LAYER_WRAPPER_DEPENDENCY' })
    ]));
  });

  test('reports a synchronous ISR callback and a missing deferred state release', async () => {
    const root = await createSlice();
    await mutate(root, '04_Impl/impl_bsp_handler/externflash/Src/impl_externflash_handle.c', (content) => content
      .replace('handle->event_pending = true;', 'handle->event_callback(handle->event_context, event_id, status);')
      .replace('handle->event_pending = false;', 'handle->event_pending = true;'));
    expect(validate(root).errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ ruleId: 'LAYER_HANDLE_ISR_DEFERRAL' }),
      expect.objectContaining({ ruleId: 'LAYER_HANDLE_TASK_CALLBACK' })
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
      root, core: 'spi', deviceType: 'externflash', device: 'W25Q64', slice: 'wrapper'
    });
    expect(result).toMatchObject({ valid: true, errors: [] });
  });

  test('rejects a device-object wrapper that omits a four-tuple slot', async () => {
    const root = await createWrapperSlice(fourTupleBrokenWrapperHeader, wrapperSourceFullProfile);
    const result = validateLayerContract({
      root, core: 'spi', deviceType: 'externflash', device: 'W25Q64', slice: 'wrapper'
    });
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ ruleId: 'LAYER_WRAPPER_FOUR_TUPLE' })
    ]));
  });

  test('accepts a wrapper with minimal style profile documentation in wrapper slice', async () => {
    const root = await createWrapperSlice(noProfileWrapperHeader, wrapperSourceFullProfile);
    const result = validateLayerContract({
      root, core: 'spi', deviceType: 'externflash', device: 'W25Q64', slice: 'wrapper'
    });
    expect(result).toMatchObject({ valid: true, errors: [] });
  });

  test('does not require sibling slice files when --slice wrapper is used', async () => {
    const root = await createWrapperSlice(pureForwardWrapperHeader, wrapperSourceFullProfile);
    const result = validateLayerContract({
      root, core: 'spi', deviceType: 'externflash', device: 'W25Q64', slice: 'wrapper'
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
      root, core: 'spi', deviceType: 'externflash', device: 'W25Q64', slice: 'wrapper'
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
      .replace('W25Q64 器件配置。', 'W25Q64 device configuration.'));
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
      root, core: 'spi', deviceType: 'externflash', device: 'W25Q64', slice: 'wrapper'
    });
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ ruleId: 'LAYER_WRAPPER_COMMENT_LANGUAGE' })
    ]));
  });
});
