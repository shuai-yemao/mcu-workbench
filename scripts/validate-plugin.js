#!/usr/bin/env node

const { SKILL_CATALOG } = require('../skills/catalog');
const { ROOT, NAME_PATTERN, readJson, summarize } = require('./validators/common');
const { EXPECTED_AGENTS, parseAgentFrontmatter, validateAgents } = require('./validators/agents');
const { validateCodexManifest } = require('./validators/manifest');
const {
  validateLvglReferences,
  validateSoftwareArchitectureGraph
} = require('./validators/knowledge-graphs');
const { validateLearningTutorReferences } = require('./validators/learning-tutor');
const { validateCapabilityMigration } = require('./validators/capability-migration');
const { validateSkillCatalogAndFilesystem } = require('./validators/skill-catalog');

function validatePlugin() {
  const errors = [];
  const agentSummary = validateAgents(errors);
  const codexManifest = validateCodexManifest(errors);
  validateLvglReferences(errors);
  validateSoftwareArchitectureGraph(errors);
  validateLearningTutorReferences(errors);
  validateCapabilityMigration(errors);

  const manifest = readJson('.claude-plugin/plugin.json', errors);
  if (manifest) {
    if (manifest.name !== 'mcu-workbench') errors.push('manifest: name 必须为 mcu-workbench');
    if (!Array.isArray(manifest.skills)) errors.push('manifest: skills 必须为数组');
  }
  validateSkillCatalogAndFilesystem(manifest, errors);

  return {
    errors,
    summary: {
      ...summarize(SKILL_CATALOG),
      agents: agentSummary.count,
      agentNames: agentSummary.names,
      codexManifest
    }
  };
}

if (require.main === module) {
  const result = validatePlugin();
  if (result.errors.length) {
    console.error(`插件结构校验失败（${result.errors.length} 项）：`);
    for (const error of result.errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log(`插件结构校验通过：${result.summary.count} 个 skills，${result.summary.agents} 个 agents，${Object.keys(result.summary.countByLayer).length} 个架构层。`);
    console.log(`按层级统计：${JSON.stringify(result.summary.countByLayer)}`);
    console.log(`按名称前缀统计：${JSON.stringify(result.summary.countByPrefix)}`);
  }
}

module.exports = {
  ROOT,
  NAME_PATTERN,
  EXPECTED_AGENTS,
  parseAgentFrontmatter,
  summarize,
  validateLvglReferences,
  validateSoftwareArchitectureGraph,
  validateLearningTutorReferences,
  validateCapabilityMigration,
  validatePlugin
};
