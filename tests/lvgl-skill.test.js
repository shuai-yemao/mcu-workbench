const fs = require('fs');
const path = require('path');
const { CANONICAL_SKILLS } = require('../skills/catalog');
const { getSkillContent } = require('../skills/loader');
const { validateLvglReferences } = require('../scripts/validate-plugin');

const ROOT = path.resolve(__dirname, '..');
const SKILL_ROOT = path.join(ROOT, 'skills', 'middleware', 'middleware-lvgl');
const GRAPH_PATH = path.join(SKILL_ROOT, 'references', 'lvgl-knowledge-graph.json');

describe('LVGL skill knowledge graph and boundaries', () => {
  const content = getSkillContent('middleware-lvgl');
  const graph = JSON.parse(fs.readFileSync(GRAPH_PATH, 'utf8'));

  test('keeps one canonical LVGL skill and all references', () => {
    expect(CANONICAL_SKILLS.filter((skill) => skill.id === 'middleware-lvgl')).toHaveLength(1);
    expect(content).toContain('references/lvgl-knowledge-graph.md');
    expect(content).toContain('references/version-compatibility.md');
    expect(content).toContain('references/porting-contract.md');
    expect(content).toContain('references/ui-runtime-performance.md');
    expect(content).toContain('references/config-build-validation.md');
  });

  test('uses the stable graph schema and unique references', () => {
    expect(validateLvglReferences([])).toEqual(expect.objectContaining({ schema_version: 1 }));
    expect(graph.sources.length).toBeGreaterThanOrEqual(2);
    expect(new Set(graph.sources.map((source) => source.id)).size).toBe(graph.sources.length);
    expect(new Set(graph.nodes.map((node) => node.id)).size).toBe(graph.nodes.length);
    expect(new Set(graph.edges.map((edge) => edge.id)).size).toBe(graph.edges.length);
    const nodeIds = new Set(graph.nodes.map((node) => node.id));
    for (const edge of graph.edges) {
      expect(nodeIds.has(edge.from)).toBe(true);
      expect(nodeIds.has(edge.to)).toBe(true);
    }
  });

  test('covers the three supported version baselines', () => {
    const versions = graph.versions.map((version) => version.id);
    expect(versions).toEqual(expect.arrayContaining(['lvgl-8.3', 'lvgl-9.3', 'lvgl-9-latest']));
    expect(graph.sources.find((source) => source.id === 'lvgl-100ask').commit).toMatch(/^[0-9a-f]{40}$/);
    expect(graph.sources.find((source) => source.id === 'lvgl-upstream').commit).toMatch(/^[0-9a-f]{40}$/);
  });

  test('keeps LVGL below the BSP and OS Wrapper boundaries', () => {
    expect(content).toMatch(/BSP Wrapper/);
    expect(content).toMatch(/OS Wrapper/);
    expect(content).toMatch(/不直接调用 FreeRTOS、Core、Driver/);
    expect(content).not.toMatch(/Adapter/);
    expect(content).toMatch(/bsp-adapter/);
    expect(content).toMatch(/os-abstraction/);
    expect(content).toMatch(/app-architecture/);
  });

  test('documents the GR5526 routing scenario', () => {
    expect(content).toMatch(/GR5526/);
    expect(content).toMatch(/lv_init/);
    expect(content).toMatch(/Flush Callback/);
    expect(content).toMatch(/Input Callback/);
    expect(content).toMatch(/版本/);
  });
});
