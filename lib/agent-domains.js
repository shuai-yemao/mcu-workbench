/**
 * Agent 领域注册表 — Agent 团队的稳定契约与领域派生单一数据源。
 *
 * 职责分离：
 * - `agents/*.md` 只声明稳定身份信息（name / description / domain / scope），不含技能清单。
 * - 本模块定义领域(domain) → 技能派生规则与路由词汇；技能来自 `skills/catalog.js`。
 * - 技能目录更新后，`domainSkills()` 自动聚合新技能，agent 文件零改动，不产生功能退化。
 */
const { CANONICAL_SKILLS, SKILL_CATALOG, resolveSkillId } = require('../skills/catalog');

/**
 * 稳定团队名册（契约）。新增/移除 agent 需同时调整名册与 `agents/*.md`。
 */
const AGENT_ROSTER = [
  'embedded-lead',
  'system-architect',
  'firmware-engineer',
  'hardware-integration',
  'toolchain-engineer',
  'verification-engineer',
  'knowledge-engineer'
];

/**
 * 领域定义：`layers` 为技能目录层聚合，`extraSkills` 为跨层显式技能，
 * `keywords` 为领域级中英文路由词汇（OpenCode 路由与需求分诊使用）。
 */
const DOMAINS = {
  coordination: {
    label: '项目协调',
    layers: ['workflow'],
    extraSkills: ['tools-quality', 'tools-learning-tutor'],
    keywords: [
      '项目', '总览', '统筹', '编排', '协调', '初始化',
      'project', 'init', 'orchestrate', 'coordinate', 'overview'
    ]
  },
  architecture: {
    label: '分层架构',
    layers: ['workflow', 'app', 'os', 'core', 'mcu', 'middleware', 'system'],
    extraSkills: [],
    keywords: [
      '分层', '架构', '设计', '接口', '迁移', '解耦',
      'architecture', 'layer', 'design', 'interface', 'migration', 'decouple'
    ]
  },
  firmware: {
    label: '固件实现',
    layers: ['app', 'os', 'bsp', 'core', 'mcu', 'middleware', 'system'],
    extraSkills: [],
    keywords: [
      '固件', '驱动', 'hal', 'bsp', 'app', '实现', '代码', '编写', 'i2c', 'spi', 'uart', 'gpio', 'adc', '定时器',
      'firmware', 'driver', 'implement', 'code'
    ]
  },
  hardware: {
    label: '硬件集成',
    layers: ['hardware', 'bsp', 'core', 'mcu'],
    extraSkills: ['tools-debug', 'tools-observability'],
    keywords: [
      '硬件', '电路', '原理图', 'pcb', '引脚', '连接', '测量', '示波器',
      'hardware', 'schematic', 'pin', 'connection', 'measurement', 'oscilloscope'
    ]
  },
  toolchain: {
    label: '工具链',
    layers: [],
    extraSkills: ['tools-build', 'tools-flash', 'tools-linker', 'tools-debug', 'tools-observability'],
    keywords: [
      '编译', '构建', '烧录', 'flash', 'j-link', 'openocd', 'gdb', '调试', '链接', 'map',
      'build', 'compile', 'linker', 'toolchain', 'debug'
    ]
  },
  verification: {
    label: '验证质量',
    layers: [],
    extraSkills: ['tools-quality', 'tools-debug', 'tools-observability', 'tools-build'],
    keywords: [
      '测试', '验证', '回归', '质量', '审查', '静态分析',
      'test', 'verify', 'regression', 'quality', 'review', 'static analysis'
    ]
  },
  knowledge: {
    label: '知识沉淀',
    layers: [],
    extraSkills: ['tools-learning-tutor', 'workflow-project-integration'],
    keywords: [
      '文档', '笔记', '日志', '记录', '学习',
      'document', 'note', 'log', 'record', 'learn'
    ]
  }
};

/**
 * 派生某领域的有效技能集：
 * - 由技能目录按 `layers` 聚合（canonical 技能 + 该层活跃的非 canonical 技能，如 hardware-*）；
 * - 追加 `extraSkills`，经 `resolveSkillId` 归一化；
 * - 去重，保持 CANONICAL_ORDER 语义。
 */
function domainSkills(domainId) {
  const domain = DOMAINS[domainId];
  if (!domain) return [];
  const ids = new Set();
  for (const layer of domain.layers || []) {
    for (const skill of CANONICAL_SKILLS) {
      if (skill.layer === layer) ids.add(skill.id);
    }
    for (const skill of SKILL_CATALOG) {
      if (!skill.canonical && !skill.archived && skill.layer === layer) ids.add(skill.id);
    }
  }
  for (const skillId of domain.extraSkills || []) {
    const resolved = resolveSkillId(skillId);
    if (resolved) ids.add(resolved);
  }
  return [...ids];
}

/** agent 的有效技能集 = 其所属领域的派生技能。 */
function agentSkills(agentDomain) {
  return domainSkills(agentDomain);
}

/** 领域级路由关键词。 */
function keywordsForDomain(domainId) {
  return DOMAINS[domainId]?.keywords || [];
}

/**
 * 将用户请求分词后按领域关键词给每个 agent 打分并降序返回。
 * 精确命中 +3，包含命中 +1。`agents` 为已加载的 agent 数组（含 id / domain）。
 */
function rankAgentsForRequest(request, agents) {
  const keywords = String(request || '')
    .toLowerCase()
    .replace(/[，,。.；;！!？?\s]+/g, ' ')
    .split(' ')
    .filter((word) => word.length >= 2);
  return agents
    .map((agent) => {
      const domainKeywords = keywordsForDomain(agent.domain);
      let score = 0;
      for (const keyword of keywords) {
        if (domainKeywords.some((dk) => dk === keyword)) score += 3;
        else if (domainKeywords.some((dk) => dk.includes(keyword) || keyword.includes(dk))) score += 1;
      }
      return { agent, score };
    })
    .sort((a, b) => b.score - a.score);
}

module.exports = {
  AGENT_ROSTER,
  DOMAINS,
  domainSkills,
  agentSkills,
  keywordsForDomain,
  rankAgentsForRequest
};
