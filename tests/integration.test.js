const { createProject } = require('../commands/mcu-new');
const { generateDriver } = require('../commands/mcu-driver');

describe('Integration Tests', () => {
  test('create project and generate driver', async () => {
    const projectResult = await createProject({
      name: 'integration-test',
      platform: 'stm32f4',
      rtos: 'freertos'
    });

    expect(projectResult.success).toBe(true);

    const driverResult = await generateDriver({
      peripheral: 'oled',
      platform: 'stm32f4'
    });

    expect(driverResult.success).toBe(true);
    expect(driverResult.files.length).toBeGreaterThan(0);

    const headerFile = driverResult.files.find(f => f.path.includes('bsp_oled_driver.h'));
    expect(headerFile.content).toContain('oled_operations_t');
  });
});
