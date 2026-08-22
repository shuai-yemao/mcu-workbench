#!/usr/bin/env node
/**
 * 从 `agents/*.md` 与 `lib/agent-domains.js` 生成 `.opencode/commands/*.md`。
 *
 * 单一数据源：agent 正文、领域、写入范围全部来自 agent 定义与领域注册表，
 * 命令文件是派生产物，不得手工编辑。`tests/opencode-commands.test.js` 保证同步。
 */
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const { DOMAINS } = require('../lib/agent-domains');

const ROOT = path.resolve(__dirname, '..');
const AGENTS_DIR = path.join(ROOT, 'agents');
const COMMANDS_DIR = path.join(ROOT, '.opencode', 'commands');

function parseAgentFile(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return null;
  const frontmatter = yaml.load(match[1]);
  return { frontmatter, body: match[2].trim() };
}

function loadAgents() {
  const agents = [];
  for (const name of fs.readdirSync(AGENTS_DIR)) {
    if (!name.endsWith('.md')) continue;
    const content = fs.readFileSync(path.join(AGENTS_DIR, name), 'utf8');
    const parsed = parseAgentFile(content);
    if (!parsed) continue;
    agents.push({
      id: parsed.frontmatter.name,
      domain: parsed.frontmatter.domain,
      description: parsed.frontmatter.description,
      scope: parsed.frontmatter.scope,
      body: parsed.body
    });
  }
  return agents;
}

function domainLabel(domainId) {
  return DOMAINS[domainId]?.label || domainId;
}

function buildAgentCommand(agent) {
  return [
    '---',
    `description: MCU-Workbench「${agent.id}」：${domainLabel(agent.domain)}领域`,
    'agent: general',
    '---',
    '',
    agent.body,
    '',
    '---',
    '',
    'Task: $ARGUMENTS',
    ''
  ].join('\n');
}

function buildTeamCommand(agents) {
  const rows = agents
    .map((a) => `| ${a.id} | ${domainLabel(a.domain)} | ${a.scope} | /mcu-${a.id} |`)
    .join('\n');
  return [
    '---',
    `description: 列出 MCU-Workbench 嵌入式开发 agent 团队（${agents.length} 个）`,
    'agent: general',
    '---',
    '',
    'You are using the MCU-Workbench embedded development agent team. Here is the team roster:',
    '',
    '| Agent | 领域 | 写入范围 | 命令 |',
    '|---|---|---|---|',
    rows,
    '',
    '推荐工作流：',
    '1. embedded-lead 分析需求和项目状态',
    '2. system-architect 设计软件分层和接口',
    '3. firmware-engineer 实现固件代码',
    '4. hardware-integration 验证板级连接',
    '5. toolchain-engineer 管理构建/烧录/调试',
    '6. verification-engineer 执行测试和回归',
    '7. knowledge-engineer 整理开发日志和笔记',
    '',
    '根据用户需求 $ARGUMENTS，推荐最合适的 agent 并建议使用对应命令。',
    ''
  ].join('\n');
}

/** 返回 { 文件名: 内容 }，供写入与同步测试共用。 */
function buildOpenCodeCommands() {
  const agents = loadAgents();
  const files = {};
  for (const agent of agents) files[`mcu-${agent.id}.md`] = buildAgentCommand(agent);
  files['mcu-team.md'] = buildTeamCommand(agents);
  return files;
}

function writeOpenCodeCommands(files) {
  fs.mkdirSync(COMMANDS_DIR, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(COMMANDS_DIR, name), content);
  }
}

if (require.main === module) {
  const files = buildOpenCodeCommands();
  writeOpenCodeCommands(files);
  console.log(`已生成 ${Object.keys(files).length} 个 OpenCode 命令文件：`);
  for (const name of Object.keys(files).sort()) console.log(`- .opencode/commands/${name}`);
}

module.exports = { buildOpenCodeCommands, writeOpenCodeCommands };
