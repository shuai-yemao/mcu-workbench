const fs = require('fs');
const path = require('path');
const { ROOT } = require('./common');

const LVGL_SKILL_ROOT = path.join(ROOT, 'skills', 'middleware', 'middleware-lvgl');
const LVGL_GRAPH_PATH = path.join(LVGL_SKILL_ROOT, 'references', 'lvgl-knowledge-graph.json');
const ARCH_GRAPH_ROOT = path.join(ROOT, 'skills', 'workflow', 'workflow-project-integration', 'references');
const ARCH_GRAPH_PATH = path.join(ARCH_GRAPH_ROOT, 'software-architecture-knowledge-graph.json');

function readGraph(graphPath, label, errors) {
  try {
    return JSON.parse(fs.readFileSync(graphPath, 'utf8'));
  } catch (error) {
    errors.push(`${label}: 知识图谱 JSON 无法解析`);
    return null;
  }
}

function validateCommonGraph(graph, label, errors) {
  if (graph.schema_version !== 1) errors.push(`${label}: 知识图谱 schema_version 必须为 1`);
  for (const key of ['generated_at', 'sources', 'versions', 'nodes', 'edges']) {
    if (!Object.prototype.hasOwnProperty.call(graph, key)) errors.push(`${label}: 知识图谱缺少 ${key}`);
  }
  if (!Array.isArray(graph.sources) || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) return null;

  const sourceIds = new Set();
  for (const source of graph.sources) {
    if (!source || !source.id || sourceIds.has(source.id)) errors.push(`${label}: source id 缺失或重复`);
    if (source && source.id) sourceIds.add(source.id);
  }

  const nodeIds = new Set();
  for (const node of graph.nodes) {
    if (!node || !node.id || nodeIds.has(node.id)) errors.push(`${label}: node id 缺失或重复`);
    if (node && node.id) nodeIds.add(node.id);
    if (!node || !node.kind || !node.label || !node.path || !sourceIds.has(node.source_id)) {
      errors.push(`${label}: node 字段不完整或 source_id 无效`);
    }
  }

  const edgeIds = new Set();
  for (const edge of graph.edges) {
    if (!edge || !edge.id || edgeIds.has(edge.id)) errors.push(`${label}: edge id 缺失或重复`);
    if (edge && edge.id) edgeIds.add(edge.id);
    if (!edge || !nodeIds.has(edge.from) || !nodeIds.has(edge.to) || !edge.relation) {
      errors.push(`${label}: edge 引用无效或 relation 缺失`);
    }
  }
  return { sourceIds, nodeIds, edgeIds };
}

function validateLvglReferences(errors) {
  const requiredFiles = [
    'SKILL.md',
    'references/lvgl-knowledge-graph.md',
    'references/lvgl-knowledge-graph.json',
    'references/version-compatibility.md',
    'references/porting-contract.md',
    'references/ui-runtime-performance.md',
    'references/config-build-validation.md'
  ];
  for (const relative of requiredFiles) {
    if (!fs.existsSync(path.join(LVGL_SKILL_ROOT, relative))) {
      errors.push(`skills/middleware/middleware-lvgl: 缺少 ${relative}`);
    }
  }
  if (!fs.existsSync(LVGL_GRAPH_PATH)) return null;
  const graph = readGraph(LVGL_GRAPH_PATH, 'skills/middleware/middleware-lvgl', errors);
  if (!graph) return null;
  const ids = validateCommonGraph(graph, 'skills/middleware/middleware-lvgl', errors);
  if (!ids || !Array.isArray(graph.versions)) return graph;
  for (const source of graph.sources) {
    for (const key of ['repository', 'role', 'version']) {
      if (!source || !source[key]) errors.push(`skills/middleware/middleware-lvgl: source 缺少 ${key}`);
    }
  }
  const versionIds = new Set(graph.versions.map((version) => version && version.id));
  for (const required of ['lvgl-8.3', 'lvgl-9.3', 'lvgl-9-latest']) {
    if (!versionIds.has(required)) errors.push(`skills/middleware/middleware-lvgl: 缺少版本矩阵 ${required}`);
  }
  return graph;
}

function validateSoftwareArchitectureGraph(errors) {
  const requiredFiles = [
    'software-architecture-knowledge-graph.md',
    'software-architecture-knowledge-graph.json'
  ];
  for (const relative of requiredFiles) {
    if (!fs.existsSync(path.join(ARCH_GRAPH_ROOT, relative))) {
      errors.push(`workflow-project-integration: 缺少 references/${relative}`);
    }
  }
  if (!fs.existsSync(ARCH_GRAPH_PATH)) return null;
  const graph = readGraph(ARCH_GRAPH_PATH, 'workflow-project-integration', errors);
  if (!graph) return null;
  const ids = validateCommonGraph(graph, 'workflow-project-integration', errors);
  if (!ids) return graph;
  for (const source of graph.sources) {
    for (const key of ['repository', 'role', 'paths']) {
      if (!source || !source[key]) errors.push(`workflow-project-integration: source 缺少 ${key}`);
    }
    if (source && source.commit !== null && source.commit !== undefined && !/^[0-9a-f]{40}$/.test(source.commit)) {
      errors.push(`workflow-project-integration: source commit 格式无效 ${source.id}`);
    }
  }
  for (const edge of graph.edges) {
    if (!edge || !edge.evidence) errors.push('workflow-project-integration: edge 缺少 evidence');
  }
  for (const required of [
    'skill-app-architecture', 'skill-middleware-communication', 'skill-os-abstraction',
    'skill-bsp-adapter', 'skill-core-mcu', 'skill-driver-vendor', 'skill-tools-build',
    'skill-software-system'
  ]) {
    if (!ids.nodeIds.has(required)) errors.push(`workflow-project-integration: 缺少架构节点 ${required}`);
  }
  for (const required of ['app-forbids-core', 'app-forbids-driver', 'core-to-driver']) {
    if (!ids.edgeIds.has(required)) errors.push(`workflow-project-integration: 缺少架构边 ${required}`);
  }
  return graph;
}

module.exports = {
  validateLvglReferences,
  validateSoftwareArchitectureGraph
};
