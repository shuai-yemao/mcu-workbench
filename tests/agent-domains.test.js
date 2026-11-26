const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const {
  AGENT_ROSTER,
  DOMAINS,
  domainSkills,
  rankAgentsForRequest
} = require('../lib/agent-domains');
const { SKILL_CATALOG, resolveSkillId, SKILL_BY_CANONICAL_ID } = require('../skills/catalog');

const ROOT = path.resolve(__dirname, '..');

function loadAgentDomains() {
  const map = {};
  for (const name of fs.readdirSync(path.join(ROOT, 'agents'))) {
    if (!name.endsWith('.md')) continue;
    const content = fs.readFileSync(path.join(ROOT, 'agents', name), 'utf8');
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) continue;
    const frontmatter = yaml.load(match[1]);
    map[frontmatter.name] = frontmatter.domain;
  }
  return map;
}

describe('agent domain registry', () => {
  test('every roster agent resolves to a known domain', () => {
    const map = loadAgentDomains();
    for (const id of AGENT_ROSTER) {
      expect(map[id]).toBeTruthy();
      expect(DOMAINS[map[id]]).toBeTruthy();
    }
  });

  test('every derived domain skill resolves to canonical or hardware-* skill', () => {
    for (const domainId of Object.keys(DOMAINS)) {
      for (const skillId of domainSkills(domainId)) {
        const resolved = resolveSkillId(skillId);
        const hardwareSkill = resolved && resolved.startsWith('hardware-');
        expect(SKILL_BY_CANONICAL_ID[resolved] || hardwareSkill).toBeTruthy();
      }
    }
  });

  test('derived skills are unique per domain', () => {
    for (const domainId of Object.keys(DOMAINS)) {
      const skills = domainSkills(domainId);
      expect(new Set(skills).size).toBe(skills.length);
    }
  });

  test('every domain layer is an active catalog layer (no stale legacy layer names)', () => {
    const activeLayers = [...new Set(SKILL_CATALOG.filter((s) => !s.archived).map((s) => s.layer))];
    for (const domainId of Object.keys(DOMAINS)) {
      for (const layer of DOMAINS[domainId].layers) {
        expect(activeLayers).toContain(layer);
      }
    }
  });

  test('every active skill is covered by at least one domain (complete union)', () => {
    const union = new Set();
    for (const domainId of Object.keys(DOMAINS)) {
      for (const skillId of domainSkills(domainId)) union.add(skillId);
    }
    const activeSkills = SKILL_CATALOG.filter((s) => !s.archived).map((s) => s.id);
    for (const id of activeSkills) {
      expect(union.has(id)).toBe(true);
    }
  });

  test('routing is deterministic', () => {
    const map = loadAgentDomains();
    const agents = AGENT_ROSTER.map((id) => ({ id, domain: map[id] }));
    const request = '给这个嵌入式项目添加一个 I2C 驱动并分层';
    const first = rankAgentsForRequest(request, agents).map((r) => r.agent.id);
    const second = rankAgentsForRequest(request, agents).map((r) => r.agent.id);
    expect(first).toEqual(second);
  });
});
