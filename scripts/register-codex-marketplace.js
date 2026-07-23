#!/usr/bin/env node

const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const options = { marketplaceRoot: path.resolve(ROOT, '..'), force: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--marketplace-root') options.marketplaceRoot = path.resolve(argv[++index]);
    else if (argument === '--force') options.force = true;
    else if (argument === '--help' || argument === '-h') return { ...options, help: true };
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

function registerMarketplace({ marketplaceRoot, force = false } = {}) {
  const root = path.resolve(marketplaceRoot || path.resolve(ROOT, '..'));
  if (path.dirname(ROOT) !== root) throw new Error(`marketplace root must be the parent of ${ROOT}`);
  const marketplacePath = path.join(root, '.agents', 'plugins', 'marketplace.json');
  fs.mkdirSync(path.dirname(marketplacePath), { recursive: true });
  let marketplace = { name: 'mcu-workbench-local', interface: { displayName: 'MCU-Workbench Local' }, plugins: [] };
  if (fs.existsSync(marketplacePath)) {
    marketplace = JSON.parse(fs.readFileSync(marketplacePath, 'utf8'));
    if (marketplace.name !== 'mcu-workbench-local' && !force) {
      throw new Error(`marketplace already exists with another name: ${marketplace.name}`);
    }
    marketplace.plugins = Array.isArray(marketplace.plugins) ? marketplace.plugins : [];
  }
  const entry = {
    name: 'mcu-workbench',
    version: '1.0.0',
    source: { source: 'local', path: './mcu-workbench' },
    policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' },
    category: 'Engineering'
  };
  marketplace.plugins = marketplace.plugins.filter((plugin) => plugin.name !== entry.name);
  marketplace.plugins.push(entry);
  fs.writeFileSync(marketplacePath, `${JSON.stringify(marketplace, null, 2)}\n`, 'utf8');
  return { marketplacePath, marketplace };
}

if (require.main === module) {
  try {
    const options = parseArgs(process.argv.slice(2));
    if (options.help) {
      console.log('Usage: node scripts/register-codex-marketplace.js [--marketplace-root <parent>] [--force]');
      process.exit(0);
    }
    const result = registerMarketplace(options);
    console.log(`Registered mcu-workbench marketplace: ${result.marketplacePath}`);
  } catch (error) {
    console.error(`Codex marketplace registration failed: ${error.message}`);
    process.exit(1);
  }
}

module.exports = { parseArgs, registerMarketplace };
