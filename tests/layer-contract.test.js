const fs = require('fs').promises;
const os = require('os');
const path = require('path');
const { generateBspDriver, generateCorePeripheral } = require('../lib/generator');
const { validateArchitectureContract } = require('../lib/architecture-contract');
const { parseArgs, validateLayerContract } = require('../scripts/validate-layer-contract');

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

  test('accepts an SSD1306 display slice with OSAL mutex injection and full documentation', async () => {
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
});
