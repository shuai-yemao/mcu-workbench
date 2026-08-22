const fs = require('fs');
const path = require('path');
const { buildOpenCodeCommands } = require('../scripts/build-opencode-commands');

const ROOT = path.resolve(__dirname, '..');
const COMMANDS_DIR = path.join(ROOT, '.opencode', 'commands');

describe('.opencode/commands generated files', () => {
  test('generated command files exist and match the generator output', () => {
    const generated = buildOpenCodeCommands();
    for (const [name, content] of Object.entries(generated)) {
      const actual = fs.readFileSync(path.join(COMMANDS_DIR, name), 'utf8');
      expect(actual).toBe(content);
    }
  });

  test('every agent has exactly one command file', () => {
    const generated = buildOpenCodeCommands();
    const agentCommandNames = Object.keys(generated).filter((name) => name !== 'mcu-team.md');
    expect(agentCommandNames).toHaveLength(7);
  });
});
