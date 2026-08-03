const fs = require('fs');
const path = require('path');
const { validatePlugin, parseAgentFrontmatter, AGENT_ROSTER } = require('../scripts/validate-plugin');
const { DOMAINS } = require('../lib/agent-domains');

const ROOT = path.resolve(__dirname, '..');

describe('Claude Code agent definitions', () => {
  test('contains exactly the registered roster agents', () => {
    const files = fs.readdirSync(path.join(ROOT, 'agents')).filter((name) => name.endsWith('.md'));
    expect(files).toHaveLength(AGENT_ROSTER.length);
    expect(new Set(files.map((name) => path.basename(name, '.md')))).toEqual(new Set(AGENT_ROSTER));
    expect(validatePlugin().errors).toEqual([]);
    expect(validatePlugin().summary.agents).toBe(AGENT_ROSTER.length);
  });

  test('frontmatter declares domain and scope and no skills list', () => {
    for (const file of fs.readdirSync(path.join(ROOT, 'agents')).filter((name) => name.endsWith('.md'))) {
      const content = fs.readFileSync(path.join(ROOT, 'agents', file), 'utf8');
      const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---/)[1];
      const parsed = parseAgentFrontmatter(frontmatter);
      expect(parsed.name).toBe(path.basename(file, '.md'));
      expect(DOMAINS[parsed.domain]).toBeTruthy();
      expect(parsed.scope).toBeTruthy();
      expect(parsed.skills).toBeUndefined();
    }
  });

  test('body keeps the unified protocol sections', () => {
    const sections = [
      /##\s+Inputs|##\s+输入/i,
      /##\s+Evidence|##\s+证据/i,
      /##\s+Scope and write policy|##\s+产出|##\s+写入/i,
      /##\s+Outputs and acceptance|##\s+验收/i,
      /##\s+Handoff|##\s+交接/i
    ];
    for (const file of fs.readdirSync(path.join(ROOT, 'agents')).filter((name) => name.endsWith('.md'))) {
      const content = fs.readFileSync(path.join(ROOT, 'agents', file), 'utf8');
      for (const section of sections) expect(content).toMatch(section);
    }
  });
});
