#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function fail(errors, condition, message) {
  if (!condition) errors.push(message);
}

function validateProfile(profile) {
  const errors = [];
  const flash = profile && profile.flash;
  const keil = profile && profile.keil_window;
  const physical = profile && profile.physical_window;
  const pins = profile && profile.pins;
  const safety = profile && profile.safety;

  fail(errors, Number.isInteger(profile && profile.schema_version), 'schema_version must be an integer');
  fail(errors, typeof (profile && profile.id) === 'string' && profile.id.length > 0, 'id is required');
  for (const [name, value] of Object.entries({
    'flash.physical_size': flash && flash.physical_size,
    'flash.sector_size': flash && flash.sector_size,
    'flash.page_size': flash && flash.page_size,
    'keil_window.base': keil && keil.base,
    'keil_window.size': keil && keil.size,
    'physical_window.offset': physical && physical.offset,
    'physical_window.size': physical && physical.size
  })) fail(errors, Number.isInteger(value) && value > 0, `${name} must be a positive integer`);

  if (!errors.length) {
    fail(errors, keil.size === physical.size, 'Keil and physical window sizes must match');
    fail(errors, physical.offset + physical.size <= flash.physical_size, 'physical window exceeds flash capacity');
    fail(errors, physical.offset % flash.sector_size === 0 && physical.size % flash.sector_size === 0,
      'physical window must be 4 KiB sector aligned');
    fail(errors, flash.page_size === 256, 'W25Q64 profile must use 256-byte physical pages');
  }
  fail(errors, pins && pins.transport === 'gpio-soft-spi-mode-0', 'transport must be gpio-soft-spi-mode-0');
  for (const [name, expected] of Object.entries({ cs: 'PB12', sck: 'PB13', miso: 'PB14', mosi: 'PB15' })) {
    fail(errors, pins && pins[name] === expected, `pins.${name} must be ${expected}`);
  }
  fail(errors, safety && safety.erase_chip === false, 'erase_chip must be false for a partitioned algorithm');
  fail(errors, safety && safety.reject_outside_window === true, 'reject_outside_window must be true');
  return errors;
}

function parseArgs(argv) {
  if (argv.length !== 2 || argv[0] !== '--profile') {
    throw new Error('Usage: node scripts/validate-flash-algorithm-profile.js --profile <profile.json>');
  }
  return path.resolve(argv[1]);
}

if (require.main === module) {
  try {
    const profilePath = parseArgs(process.argv.slice(2));
    const errors = validateProfile(JSON.parse(fs.readFileSync(profilePath, 'utf8')));
    if (errors.length) {
      for (const error of errors) console.error(`- ${error}`);
      process.exitCode = 1;
    } else {
      console.log(`Flash algorithm profile valid: ${profilePath}`);
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}

module.exports = { parseArgs, validateProfile };
