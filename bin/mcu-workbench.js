#!/usr/bin/env node

const { main } = require('../lib/cli');

main().catch((error) => {
  console.error(`Error: ${error.message}`);
  process.exitCode = 1;
});
