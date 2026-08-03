#!/usr/bin/env node

const { main } = require('../lib/cli');

main(['claude-layer', ...process.argv.slice(2)]);
