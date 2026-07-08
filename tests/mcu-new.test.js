const { createProject } = require('../commands/mcu-new');

describe('MCU New Command', () => {
  test('createProject creates project structure', async () => {
    const result = await createProject({
      name: 'test-project',
      platform: 'stm32f4',
      rtos: 'freertos'
    });

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.path).toContain('test-project');
  });

  test('createProject validates required options', async () => {
    await expect(createProject({})).rejects.toThrow('Name is required');
  });
});
