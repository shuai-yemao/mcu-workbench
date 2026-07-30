const fs = require('fs').promises;
const os = require('os');
const path = require('path');
const { generateBspDriver, generateCorePeripheral } = require('../lib/generator');
const { validateLayerContract } = require('../scripts/validate-layer-contract');

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
  test('accepts a generated Core and BSP slice', async () => {
    const root = await createSlice();
    expect(validate(root)).toMatchObject({ valid: true, errors: [] });
  });

  test('reports a Core vendor leak, extra Port export, and forbidden Wrapper include', async () => {
    const root = await createSlice();
    await mutate(root, 'Core/Inc/core_spi.h', (content) => `${content}\n#include "stm32f4xx_hal.h"\n`);
    await mutate(root, 'Bsp/Porting/externflash/Src/drv_adapter_port_externflash.c', (content) => `${content}\nint32_t extra_port_export(void) { return 0; }\n`);
    await mutate(root, 'Bsp/Wrapper/externflash/Src/drv_adapter_wrapper_externflash.c', (content) => content.replace('#include "drv_adapter_wrapper_externflash.h"', '#include "bsp_w25q64_driver.h"'));
    expect(validate(root).errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ ruleId: 'LAYER_CORE_PUBLIC_LEAK' }),
      expect.objectContaining({ ruleId: 'LAYER_PORT_PUBLIC_API' }),
      expect.objectContaining({ ruleId: 'LAYER_WRAPPER_DEPENDENCY' })
    ]));
  });

  test('reports a synchronous ISR callback and a missing deferred state release', async () => {
    const root = await createSlice();
    await mutate(root, 'Bsp/BoardDriver/externflash/Handle/Src/bsp_externflash_handle.c', (content) => content
      .replace('handle->event_pending = true;', 'handle->event_callback(handle->event_context, event_id, status);')
      .replace('handle->event_pending = false;', 'handle->event_pending = true;'));
    expect(validate(root).errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ ruleId: 'LAYER_HANDLE_ISR_DEFERRAL' }),
      expect.objectContaining({ ruleId: 'LAYER_HANDLE_TASK_CALLBACK' })
    ]));
  });
});
