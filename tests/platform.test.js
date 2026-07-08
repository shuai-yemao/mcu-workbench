const { detectPlatform, getPlatformConfig, listSupportedPlatforms } = require('../lib/platform');

describe('Platform Module', () => {
  test('listSupportedPlatforms returns array of platforms', () => {
    const platforms = listSupportedPlatforms();
    expect(Array.isArray(platforms)).toBe(true);
    expect(platforms.length).toBeGreaterThan(0);
    expect(platforms).toContain('stm32f4');
  });

  test('getPlatformConfig returns config for valid platform', () => {
    const config = getPlatformConfig('stm32f4');
    expect(config).toBeDefined();
    expect(config.name).toBe('STM32F4');
    expect(config.arch).toBe('arm_cortex_m4');
    expect(config.vendorLib).toBe('stm32f4_hal');
  });

  test('getPlatformConfig throws for invalid platform', () => {
    expect(() => getPlatformConfig('invalid')).toThrow('Unsupported platform');
  });

  test('detectPlatform detects from project files', () => {
    const result = detectPlatform({ vendorFiles: ['stm32f4xx_hal'] });
    expect(result).toBe('stm32f4');
  });
});
