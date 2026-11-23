const fs = require('fs');
const path = require('path');
const { getSkillContent } = require('../skills/loader');
const { validateSoftwareArchitectureGraph } = require('../scripts/validate-plugin');

const ROOT = path.resolve(__dirname, '..');
const GRAPH_PATH = path.join(ROOT, 'skills', 'workflow', 'workflow-project-integration', 'references', 'software-architecture-knowledge-graph.json');

describe('software layered architecture knowledge graph', () => {
  const graph = JSON.parse(fs.readFileSync(GRAPH_PATH, 'utf8'));

  test('validates pinned sources, nodes and evidence edges', () => {
    expect(validateSoftwareArchitectureGraph([])).toEqual(expect.objectContaining({ schema_version: 1 }));
    expect(graph.sources).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'freertos-kernel' }),
      expect.objectContaining({ id: 'coremqtt' }),
      expect.objectContaining({ id: 'stm32f4-hal' }),
      expect.objectContaining({ id: 'esp-idf' }),
      expect.objectContaining({ id: 'cmsis-6' }),
      expect.objectContaining({ id: 'cmake' })
    ]));
    expect(graph.sources.filter((source) => source.commit).every((source) => /^[0-9a-f]{40}$/.test(source.commit))).toBe(true);
    expect(new Set(graph.nodes.map((node) => node.id)).size).toBe(graph.nodes.length);
    expect(new Set(graph.edges.map((edge) => edge.id)).size).toBe(graph.edges.length);
  });

  test('keeps APP evidence distinct from the generated project skeleton', () => {
    const content = getSkillContent('app-architecture');
    expect(content).toContain('app-architecture-evidence.md');
    expect(content).toContain('App/main.c');
    expect(content).toContain('manager/');
    expect(content).toContain('software-architecture-knowledge-graph.md');
  });

  test('preserves layer boundaries and adapter placement', () => {
    const relations = new Set(graph.edges.map((edge) => edge.relation));
    expect(relations.has('must-not-call')).toBe(true);
    expect(graph.edges.find((edge) => edge.id === 'app-forbids-core').to).toBe('skill-core-mcu');
    expect(graph.edges.find((edge) => edge.id === 'app-forbids-driver').to).toBe('skill-driver-vendor');
    expect(graph.edges.find((edge) => edge.id === 'core-to-driver').relation).toBe('uses-native-api');
  });
});
