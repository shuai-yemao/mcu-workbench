const fs = require('fs');
const path = require('path');
const { getSkillContent } = require('../skills/loader');
const { validateSoftwareArchitectureGraph } = require('../scripts/validate-plugin');

const ROOT = path.resolve(__dirname, '..');
const GRAPH_PATH = path.join(ROOT, 'skills', 'workflow', 'workflow-review-gate', 'references', 'software-architecture-knowledge-graph.json');

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
    expect(graph.edges.find((edge) => edge.id === 'app-main-to-service')).toEqual(
      expect.objectContaining({ from: 'app-main', to: 'service-api', relation: 'calls-contract' })
    );
    expect(graph.edges).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'main-to-os-wrapper' }),
      expect.objectContaining({ id: 'main-to-bsp-wrapper' })
    ]));
    expect(graph.edges.find((edge) => edge.id === 'service-to-platform-os')).toEqual(
      expect.objectContaining({ from: 'service-api', to: 'platform-os-contract', relation: 'uses-contract' })
    );
    expect(graph.edges.find((edge) => edge.id === 'service-to-platform-bsp')).toEqual(
      expect.objectContaining({ from: 'service-api', to: 'platform-bsp-contract', relation: 'uses-contract' })
    );
    expect(graph.edges.find((edge) => edge.id === 'app-forbids-core').to).toBe('skill-core-mcu');
    expect(graph.edges.find((edge) => edge.id === 'app-forbids-driver').to).toBe('skill-mcu-platform');
    expect(graph.edges.find((edge) => edge.id === 'core-to-driver').relation).toBe('uses-native-api');
    expect(graph.edges.find((edge) => edge.id === 'platform-bsp-to-port')).toEqual(
      expect.objectContaining({ from: 'platform-bsp-contract', to: 'bsp-port' })
    );
    expect(graph.edges.find((edge) => edge.id === 'bsp-port-to-handler')).toEqual(
      expect.objectContaining({ from: 'bsp-port', to: 'bsp-handler-contract' })
    );
    expect(graph.edges.find((edge) => edge.id === 'bsp-handler-to-driver')).toEqual(
      expect.objectContaining({ from: 'bsp-handler-contract', to: 'bsp-driver-contract' })
    );
    expect(graph.edges.find((edge) => edge.id === 'bsp-handle-to-platform-device')).toEqual(
      expect.objectContaining({ from: 'bsp-handler-contract', to: 'platform-bsp-contract' })
    );
    expect(graph.edges.find((edge) => edge.id === 'bsp-driver-to-core-bus')).toEqual(
      expect.objectContaining({ from: 'bsp-driver-contract', to: 'core-bus' })
    );
    expect(graph.edges.find((edge) => edge.id === 'bsp-port-injects-driver')).toEqual(
      expect.objectContaining({ from: 'skill-bsp-port', to: 'skill-bsp-hal-driver' })
    );
    expect(graph.edges.find((edge) => edge.id === 'bsp-port-injects-handler')).toEqual(
      expect.objectContaining({ from: 'skill-bsp-port', to: 'skill-bsp-handler' })
    );
  });
});
