const fs = require('fs');
const path = require('path');
const { validateProfile } = require('../scripts/validate-flash-algorithm-profile');

const profilePath = path.join(__dirname, '..', 'skills', 'tools', 'tools-flash', 'references',
  'capabilities', 'tool-flash-algorithm', 'profiles', 'w25q64-ui-3m-stm32f411-pb12-15.json');

describe('W25Q64 UI download-algorithm profile', () => {
  test('declares a safe PB12-PB15 UI-only profile', () => {
    const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
    expect(validateProfile(profile)).toEqual([]);
    expect(profile.keil_window.base).toBe(0x90000000);
    expect(profile.physical_window.offset).toBe(0x300000);
  });

  test('rejects a profile that exposes chip erase or exceeds capacity', () => {
    const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
    profile.safety.erase_chip = true;
    profile.physical_window.size = profile.flash.physical_size;
    expect(validateProfile(profile)).toEqual(expect.arrayContaining([
      'physical window exceeds flash capacity',
      'erase_chip must be false for a partitioned algorithm'
    ]));
  });
});
