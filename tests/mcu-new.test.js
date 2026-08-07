const { createProject } = require('../commands/mcu-new');

describe('MCU New Command', () => {
  test('createProject validates required options', async () => {
    await expect(createProject({})).rejects.toThrow('Name is required');
  });
});
